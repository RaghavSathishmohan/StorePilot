'use server'

import { z } from 'zod'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import {
  CSVRow,
  ParsedCSV,
  ImportType,
  ColumnMapping,
  ImportValidationError,
  ImportPreviewRow,
  ImportPreviewResult,
  ImportStatus,
  IMPORT_FIELDS,
  FIELD_SYNONYMS
} from '@/types/imports'

// Parse CSV content
export async function parseCSV(fileContent: string): Promise<ParsedCSV> {
  const lines = fileContent.split('\n').filter(line => line.trim() !== '')
  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  // Parse headers
  const headers = parseCSVLine(lines[0])
  if (headers.length === 0) {
    throw new Error('CSV has no headers')
  }

  // Parse rows
  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length > 0) {
      const row: CSVRow = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      rows.push(row)
    }
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  }
}

// Parse a single CSV line (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

// Auto-generate column mapping suggestions
export async function suggestColumnMapping(headers: string[], importType: ImportType): Promise<ColumnMapping[]> {
  const fields = IMPORT_FIELDS[importType]
  const mapping: ColumnMapping[] = []
  const usedHeaders = new Set<string>()

  for (const field of fields) {
    const synonyms = FIELD_SYNONYMS[field.name] || [field.name]

    // Find matching header
    for (const header of headers) {
      if (usedHeaders.has(header)) continue

      const headerLower = header.toLowerCase().trim()
      const isMatch = synonyms.some(syn =>
        headerLower === syn.toLowerCase() ||
        headerLower.replace(/[_\s-]/g, '') === syn.toLowerCase().replace(/[_\s-]/g, '')
      )

      if (isMatch) {
        mapping.push({
          csvColumn: header,
          dbField: field.name,
        })
        usedHeaders.add(header)
        break
      }
    }
  }

  return mapping
}

// Validate and transform value based on field type
function validateAndTransformValue(value: string, fieldName: string, fieldType: string, required: boolean): { value: unknown; error?: string } {
  const trimmed = value.trim()

  if (!trimmed && required) {
    return { value: null, error: `${fieldName} is required` }
  }

  if (!trimmed && !required) {
    return { value: null }
  }

  switch (fieldType) {
    case 'string':
      return { value: trimmed }

    case 'number':
      const num = parseFloat(trimmed.replace(/[$,]/g, ''))
      if (isNaN(num)) {
        return { value: null, error: `${fieldName} must be a valid number` }
      }
      return { value: num }

    case 'integer':
      const int = parseInt(trimmed.replace(/[$,]/g, ''), 10)
      if (isNaN(int)) {
        return { value: null, error: `${fieldName} must be a valid integer` }
      }
      return { value: int }

    case 'boolean':
      const lower = trimmed.toLowerCase()
      if (['true', '1', 'yes', 'y', 'active', 'enabled'].includes(lower)) {
        return { value: true }
      } else if (['false', '0', 'no', 'n', 'inactive', 'disabled'].includes(lower)) {
        return { value: false }
      }
      return { value: null, error: `${fieldName} must be a valid boolean (true/false/yes/no/1/0)` }

    case 'date':
      const date = new Date(trimmed)
      if (isNaN(date.getTime())) {
        return { value: null, error: `${fieldName} must be a valid date (YYYY-MM-DD)` }
      }
      return { value: date.toISOString().split('T')[0] }

    case 'datetime':
      const dateTime = new Date(trimmed)
      if (isNaN(dateTime.getTime())) {
        // Try common formats
        const patterns = [
          /(\d{4}-\d{2}-\d{2})/, // YYYY-MM-DD
          /(\d{2}\/\d{2}\/\d{4})/, // MM/DD/YYYY
          /(\d{2}-\d{2}-\d{4})/, // DD-MM-YYYY
        ]
        for (const pattern of patterns) {
          const match = trimmed.match(pattern)
          if (match) {
            const parsed = new Date(match[1])
            if (!isNaN(parsed.getTime())) {
              return { value: parsed.toISOString() }
            }
          }
        }
        return { value: null, error: `${fieldName} must be a valid datetime` }
      }
      return { value: dateTime.toISOString() }

    default:
      return { value: trimmed }
  }
}

// Preview import with validation
export async function previewImport(
  parsedCSV: ParsedCSV,
  importType: ImportType,
  columnMapping: ColumnMapping[],
  storeId: string
): Promise<ImportPreviewResult> {
  const fields = IMPORT_FIELDS[importType]
  const previewRows: ImportPreviewRow[] = []
  let validCount = 0
  let invalidCount = 0

  // Limit preview to first 100 rows
  const previewLimit = Math.min(parsedCSV.rows.length, 100)

  for (let i = 0; i < previewLimit; i++) {
    const row = parsedCSV.rows[i]
    const rowNumber = i + 1
    const rowData: Record<string, unknown> = {}
    const errors: ImportValidationError[] = []
    const warnings: ImportValidationError[] = []

    // Apply column mapping and validate
    for (const mapping of columnMapping) {
      const fieldDef = fields.find(f => f.name === mapping.dbField)
      if (!fieldDef) continue

      const rawValue = row[mapping.csvColumn] || ''
      const result = validateAndTransformValue(rawValue, fieldDef.name, fieldDef.type, fieldDef.required)

      if (result.error) {
        if (fieldDef.required) {
          errors.push({
            rowNumber,
            field: fieldDef.name,
            value: rawValue,
            message: result.error,
          })
        } else {
          warnings.push({
            rowNumber,
            field: fieldDef.name,
            value: rawValue,
            message: result.error,
          })
        }
      }

      rowData[fieldDef.name] = result.value
    }

    // Check for missing required fields not in mapping
    for (const field of fields) {
      if (field.required && !(field.name in rowData)) {
        errors.push({
          rowNumber,
          field: field.name,
          value: '',
          message: `${field.name} is required but not mapped`,
        })
      }
    }

    if (errors.length === 0) {
      validCount++
    } else {
      invalidCount++
    }

    previewRows.push({
      rowNumber,
      data: rowData,
      errors,
      warnings,
    })
  }

  return {
    totalRows: parsedCSV.totalRows,
    validRows: validCount,
    invalidRows: invalidCount,
    previewRows,
    columnMapping,
  }
}

// Calculate mapping accuracy percentage
function calculateMappingAccuracy(columnMapping: ColumnMapping[], importType: ImportType): number {
  const fields = IMPORT_FIELDS[importType]
  const requiredFields = fields.filter(f => f.required).map(f => f.name)
  const mappedFields = columnMapping.map(m => m.dbField)
  const matchedRequired = requiredFields.filter(f => mappedFields.includes(f)).length
  return requiredFields.length > 0 ? Math.round((matchedRequired / requiredFields.length) * 100) : 100
}

// Build detailed column mapping with confidence scores
function buildColumnMappingDetails(
  columnMapping: ColumnMapping[],
  importType: ImportType,
  csvHeaders: string[]
): { csvColumn: string; dbField: string; isMatched: boolean; confidence: 'high' | 'medium' | 'low' }[] {
  const fields = IMPORT_FIELDS[importType]
  const requiredFields = new Set(fields.filter(f => f.required).map(f => f.name))

  return columnMapping.map(mapping => {
    const isRequired = requiredFields.has(mapping.dbField)
    const synonyms = FIELD_SYNONYMS[mapping.dbField] || [mapping.dbField]

    // Check confidence based on exact match vs synonym match
    const headerLower = mapping.csvColumn.toLowerCase().replace(/[_\s-]/g, '')
    const exactMatch = synonyms.some(s =>
      mapping.csvColumn.toLowerCase() === s.toLowerCase()
    )
    const normalizedMatch = synonyms.some(s =>
      headerLower === s.toLowerCase().replace(/[_\s-]/g, '')
    )

    let confidence: 'high' | 'medium' | 'low'
    if (exactMatch) confidence = 'high'
    else if (normalizedMatch) confidence = 'medium'
    else confidence = 'low'

    return {
      csvColumn: mapping.csvColumn,
      dbField: mapping.dbField,
      isMatched: true,
      confidence,
    }
  })
}

// Create import record
export async function createImport(
  storeId: string,
  importType: ImportType,
  fileName: string,
  fileContent: string,
  columnMapping: ColumnMapping[],
  csvHeaders?: string[]
): Promise<{ id: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in')
  }

  // Check access
  const hasAccess = await checkStoreAccess(supabase, storeId, user.id, 'manager')
  if (!hasAccess) {
    throw new Error('You do not have access to this store')
  }

  const fileSize = Buffer.byteLength(fileContent, 'utf8')

  // Calculate mapping accuracy
  const mappingAccuracy = calculateMappingAccuracy(columnMapping, importType)

  // Build detailed mapping info
  const mappingDetails = csvHeaders
    ? buildColumnMappingDetails(columnMapping, importType, csvHeaders)
    : columnMapping.map(m => ({ csvColumn: m.csvColumn, dbField: m.dbField, isMatched: true, confidence: 'medium' as const }))

  const { data: importRecord, error } = await (supabase
    .from('imports') as any)
    .insert({
      store_id: storeId,
      import_type: importType,
      file_name: fileName,
      file_size_bytes: fileSize,
      file_format: 'csv',
      status: 'pending',
      mapping_config: columnMapping,
      mapping_accuracy: mappingAccuracy,
      column_mapping_details: mappingDetails,
      initiated_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create import: ${error.message}`)
  }

  return { id: importRecord.id }
}

// Process import (called after preview is approved)
export async function processImport(
  importId: string,
  parsedCSV: ParsedCSV,
  importType: ImportType,
  columnMapping: ColumnMapping[]
): Promise<{ success: boolean; error?: string }> {
  const serviceClient = createServiceClient()

  // Get import details
  const { data: importRecord, error: importError } = await serviceClient
    .from('imports')
    .select('*')
    .eq('id', importId)
    .single()

  if (importError || !importRecord) {
    return { success: false, error: 'Import not found' }
  }

  const { store_id, initiated_by } = importRecord

  // Update status to processing
  await (serviceClient
    .from('imports') as any)
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .eq('id', importId)

  const startTime = Date.now()
  let processedRows = 0
  let successfulRows = 0
  let failedRows = 0
  const errorLog: ImportValidationError[] = []

  console.log(`[Server Import] Starting processing: type=${importType}, store=${store_id}, rows=${parsedCSV.rows.length}`)

  try {
    // Get or create category map for products
    const categoryMap = new Map<string, string>()
    if (importType === 'products' || importType === 'unified') {
      const { data: categoriesRaw } = await serviceClient
        .from('product_categories')
        .select('id, name')
        .eq('store_id', store_id)
      const categories = categoriesRaw as { id: string; name?: string }[] | null
      categories?.forEach(cat => { if (cat.name) categoryMap.set(cat.name.toLowerCase(), cat.id) })
    }

    // Get location map
    const locationMap = new Map<string, string>()
    if (importType === 'inventory' || importType === 'sales' || importType === 'unified') {
      const { data: locationsRaw } = await serviceClient
        .from('store_locations')
        .select('id, name')
        .eq('store_id', store_id)
      const locations = locationsRaw as { id: string; name?: string }[] | null
      locations?.forEach(loc => { if (loc.name) locationMap.set(loc.name.toLowerCase(), loc.id) })
      console.log(`[Server Import] Loaded ${locationMap.size} locations`)
    }

    // Get product map for inventory and sales
    const productMap = new Map<string, string>()
    if (importType === 'inventory' || importType === 'sales' || importType === 'unified') {
      console.log(`[Server Import] Loading products for ${importType} import...`)
      const { data: productsRaw } = await serviceClient
        .from('products')
        .select('id, sku, selling_price, cost_price')
        .eq('store_id', store_id)
      const products = productsRaw as { id: string; sku?: string }[] | null
      products?.forEach(prod => { if (prod.sku) productMap.set(prod.sku.toLowerCase(), prod.id) })

      // Debug: log if no products found
      if (!products || products.length === 0) {
        console.error(`No products found for store ${store_id}. ${importType} import will fail.`)
      } else {
        console.log(`Found ${products.length} products for ${importType} import`)
      }
    }

    console.log(`[Server Import] Starting to process ${parsedCSV.rows.length} rows using bulk inserts`)

    // Collect valid rows for bulk insert
    const productsToInsert: any[] = []
    const productsToUpdate: { id: string; data: any }[] = []
    const newProductStock: { sku: string; quantity: number; cost_price: number | null }[] = []
    const inventoryToInsert: any[] = []
    const receiptsToInsert: any[] = []
    const receiptUpdates = new Map<string, { id: string; data: any }>() // receipt_number -> update data
    const lineItemsToInsert: any[] = []
    const receiptLineItemMap = new Map<number, string>() // line item index -> receipt_number
    const existingReceiptMap = new Map<string, { id: string; subtotal: number; tax: number; discount: number } >()

    // Pre-fetch existing products for products import (to check for updates)
    const existingProductMap = new Map<string, string>() // sku -> id
    if (importType === 'products' || importType === 'unified') {
      const { data: existingProducts } = await serviceClient
        .from('products')
        .select('id, sku')
        .eq('store_id', store_id)
      existingProducts?.forEach((p: { sku?: string; id: string }) => {
        if (p.sku) existingProductMap.set(p.sku.toLowerCase(), p.id)
      })
      console.log(`[Server Import] Pre-loaded ${existingProductMap.size} existing products`)
    }

    // Pre-fetch existing receipts for sales import
    const existingReceiptNumbers = new Set<string>()
    if ((importType === 'sales' || importType === 'unified') && parsedCSV.rows.length > 0) {
      // Extract unique receipt numbers from CSV
      const receiptNumbers = new Set<string>()
      for (const row of parsedCSV.rows) {
        const transformed = transformRowData(row, columnMapping, importType)
        if (transformed.receipt_number) {
          receiptNumbers.add(transformed.receipt_number as string)
        }
      }

      if (receiptNumbers.size > 0) {
        const { data: existingReceipts } = await serviceClient
          .from('sales_receipts')
          .select('id, receipt_number, subtotal, tax_amount, discount_amount')
          .eq('store_id', store_id)
          .in('receipt_number', Array.from(receiptNumbers))
        existingReceipts?.forEach((r: { receipt_number: string; id: string; subtotal?: number; tax_amount?: number; discount_amount?: number }) => {
          existingReceiptMap.set(r.receipt_number, {
            id: r.id,
            subtotal: r.subtotal || 0,
            tax: r.tax_amount || 0,
            discount: r.discount_amount || 0,
          })
        })
        console.log(`[Server Import] Pre-loaded ${existingReceiptMap.size} existing receipts`)
      }
    }

    // Collect categories to create and SKUs to lookup during first pass
    const categoriesToCreate = new Map<string, string>() // name -> will get id after creation
    const skusNeedingLookup = new Set<string>()

    // First pass: collect all data and identify what we need
    for (let i = 0; i < parsedCSV.rows.length; i++) {
      try {
        const row = parsedCSV.rows[i]
        const transformedData = transformRowData(row, columnMapping, importType)

        // For unified imports, detect row type based on receipt_number
        const isSalesRow = importType === 'unified' && transformedData.receipt_number

        if (importType === 'products' || (importType === 'unified' && !isSalesRow)) {
          if (transformedData.sku) {
            skusNeedingLookup.add((transformedData.sku as string).toLowerCase())
          }
          if (transformedData.category) {
            const catName = transformedData.category as string
            if (!categoryMap.has(catName.toLowerCase())) {
              categoriesToCreate.set(catName.toLowerCase(), catName)
            }
          }
        }

        if (importType === 'inventory' || importType === 'sales' || (importType === 'unified' && isSalesRow)) {
          if (transformedData.sku) {
            skusNeedingLookup.add((transformedData.sku as string).toLowerCase())
          }
        }
      } catch {
        // Skip rows that fail transformation
      }
    }

    // Bulk create missing categories
    if (categoriesToCreate.size > 0) {
      console.log(`[Server Import] Creating ${categoriesToCreate.size} new categories...`)
      const newCategories = Array.from(categoriesToCreate.entries()).map(([key, name]) => ({
        store_id: store_id,
        name: name,
      }))

      const { data: createdCategories } = await (serviceClient
        .from('product_categories') as any)
        .insert(newCategories)
        .select('id, name')

      createdCategories?.forEach((cat: { id: string; name: string }) => {
        categoryMap.set(cat.name.toLowerCase(), cat.id)
      })
      console.log(`[Server Import] Created ${createdCategories?.length || 0} categories`)
    }

    // Pre-fetch any missing products by SKU
    if (skusNeedingLookup.size > 0) {
      const existingSkus = new Set(productMap.keys())
      const missingSkus = Array.from(skusNeedingLookup).filter(sku => !existingSkus.has(sku))

      if (missingSkus.length > 0) {
        console.log(`[Server Import] Looking up ${missingSkus.length} products by SKU...`)
        const { data: foundProducts } = await serviceClient
          .from('products')
          .select('id, sku')
          .eq('store_id', store_id)
          .in('sku', missingSkus)
        foundProducts?.forEach((p: { sku?: string; id: string }) => {
          if (p.sku) productMap.set(p.sku.toLowerCase(), p.id)
        })
      }
    }

    // Second pass: process all rows (now with all lookups ready)
    console.log(`[Server Import] Processing ${parsedCSV.rows.length} rows...`)
    for (let i = 0; i < parsedCSV.rows.length; i++) {
      const row = parsedCSV.rows[i]
      const rowNumber = i + 1

      try {
        const transformedData = transformRowData(row, columnMapping, importType)

        // For unified imports, detect row type
        const isSalesRowUnified = importType === 'unified' && transformedData.receipt_number

        if (importType === 'products' || (importType === 'unified' && !isSalesRowUnified)) {
          const sku = transformedData.sku as string
          if (!sku) throw new Error('SKU is required for product rows')

          // Check if product exists (using pre-fetched map)
          const existingId = existingProductMap.get(sku.toLowerCase())

          // Handle category (using pre-fetched map)
          let categoryId = null
          if (transformedData.category) {
            categoryId = categoryMap.get((transformedData.category as string).toLowerCase()) || null
          }

          const productData = {
            store_id: store_id,
            sku,
            name: transformedData.name as string,
            description: transformedData.description || null,
            category_id: categoryId,
            barcode: transformedData.barcode || null,
            cost_price: transformedData.cost_price || null,
            selling_price: transformedData.selling_price as number,
            tax_rate: transformedData.tax_rate || 0,
            min_stock_level: transformedData.min_stock_level || 0,
            max_stock_level: transformedData.max_stock_level || null,
            reorder_point: transformedData.reorder_point || 0,
            reorder_quantity: transformedData.reorder_quantity || null,
            supplier_name: transformedData.supplier_name || null,
            supplier_contact: transformedData.supplier_contact || null,
            unit_of_measure: transformedData.unit_of_measure || 'unit',
            weight_kg: transformedData.weight_kg || null,
            is_active: transformedData.is_active !== undefined ? transformedData.is_active : true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          if (existingId) {
            productsToUpdate.push({ id: existingId, data: productData })
          } else {
            productsToInsert.push(productData)
            // Add to map to prevent duplicates in this batch
            existingProductMap.set(sku.toLowerCase(), 'pending')
            // Track stock for new products (to create inventory snapshots after insert)
            if (transformedData.stock !== undefined && transformedData.stock !== null) {
              const stockQty = parseInt(String(transformedData.stock), 10)
              if (!isNaN(stockQty) && stockQty >= 0) {
                newProductStock.push({
                  sku: sku.toLowerCase(),
                  quantity: stockQty,
                  cost_price: transformedData.cost_price as number || null,
                })
              }
            }
          }
          successfulRows++
        }

        if (importType === 'inventory') {
          const sku = (transformedData.sku as string)?.toLowerCase()
          if (!sku) throw new Error('SKU is required')

          const productId = productMap.get(sku)
          if (!productId) {
            throw new Error(`Product SKU '${transformedData.sku}' not found`)
          }

          // Get location
          const locationName = transformedData.location_name as string | undefined
          let locationId = locationMap.get(locationName?.toLowerCase() || '') || null
          let physicalLocation: string | null = null

          if (!locationId && locationName) {
            physicalLocation = locationName
            const { data: firstLoc } = await serviceClient
              .from('store_locations')
              .select('id')
              .eq('store_id', store_id)
              .eq('is_active', true)
              .order('created_at', { ascending: true })
              .limit(1)
              .single()
            if (firstLoc) locationId = (firstLoc as any).id
          }

          if (!locationId) {
            const { data: firstLoc } = await serviceClient
              .from('store_locations')
              .select('id')
              .eq('store_id', store_id)
              .eq('is_active', true)
              .order('created_at', { ascending: true })
              .limit(1)
              .single()
            if (firstLoc) locationId = (firstLoc as any).id
          }

          inventoryToInsert.push({
            store_id: store_id,
            location_id: locationId,
            product_id: productId,
            quantity: transformedData.quantity as number,
            reserved_quantity: 0,
            unit_cost: transformedData.unit_cost || null,
            total_value: transformedData.unit_cost ? (transformedData.unit_cost as number) * (transformedData.quantity as number) : null,
            snapshot_date: transformedData.snapshot_date || new Date().toISOString(),
            notes: physicalLocation ? `Physical location: ${physicalLocation}` : (transformedData.notes || null),
            created_at: new Date().toISOString(),
          })
          successfulRows++
        }

        if (importType === 'sales' || isSalesRowUnified) {
          const receiptNumber = transformedData.receipt_number as string
          if (!receiptNumber) throw new Error('Receipt number is required for sales rows')

          // Check if receipt exists (using pre-fetched map)
          const existingReceipt = existingReceiptMap.get(receiptNumber)
          let receiptId = existingReceipt?.id || null

          // Get location
          const locationName = transformedData.location_name as string | undefined
          let locationId = locationMap.get(locationName?.toLowerCase() || '') || null
          let physicalLocation: string | null = null

          if (!locationId && locationName) {
            physicalLocation = locationName
            const { data: firstLoc } = await serviceClient
              .from('store_locations')
              .select('id')
              .eq('store_id', store_id)
              .eq('is_active', true)
              .order('created_at', { ascending: true })
              .limit(1)
              .single()
            if (firstLoc) locationId = (firstLoc as any).id
          }

          // Get product info (using pre-fetched map)
          let productId: string | null = null
          let productCost = 0
          let productName = transformedData.product_name as string || 'Unknown Product'

          if (transformedData.sku) {
            const sku = (transformedData.sku as string).toLowerCase()
            productId = productMap.get(sku) || null
          }

          const quantity = (transformedData.quantity as number) || 1
          const unitPrice = (transformedData.unit_price as number) || 0
          const discount = (transformedData.discount_amount as number) || 0
          const tax = (transformedData.tax_amount as number) || 0
          const total = (quantity * unitPrice) - discount + tax

          if (!receiptId) {
            // Check if we already have a pending receipt for this receipt number
            const pendingIndex = receiptsToInsert.findIndex(r => r.receipt_number === receiptNumber)

            if (pendingIndex === -1) {
              // New receipt - add to pending inserts
              const receiptData = {
                store_id: store_id,
                location_id: locationId,
                receipt_number: receiptNumber,
                transaction_date: transformedData.transaction_date as string,
                subtotal: total - tax,
                tax_amount: tax,
                discount_amount: discount,
                total_amount: total,
                payment_method: transformedData.payment_method || 'other',
                payment_status: 'completed',
                customer_name: transformedData.customer_name || null,
                customer_email: transformedData.customer_email || null,
                customer_phone: transformedData.customer_phone || null,
                cashier_id: initiated_by,
                notes: physicalLocation ? `Location: ${physicalLocation}` : (transformedData.notes || null),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
              receiptsToInsert.push(receiptData)

              // Store line item with receipt number reference (will update with ID after insert)
              receiptLineItemMap.set(lineItemsToInsert.length, receiptNumber)
              lineItemsToInsert.push({
                receipt_number: receiptNumber, // Temp field - will be replaced with receipt_id
                product_id: productId,
                product_name: productName,
                product_sku: transformedData.sku as string || null,
                quantity,
                unit_price: unitPrice,
                discount_amount: discount,
                tax_amount: tax,
                total_amount: total,
                cost_price: productCost,
                created_at: new Date().toISOString(),
              })
            } else {
              // Receipt already pending - update totals
              const pendingReceipt = receiptsToInsert[pendingIndex]
              pendingReceipt.subtotal += total - tax
              pendingReceipt.tax_amount += tax
              pendingReceipt.discount_amount += discount
              pendingReceipt.total_amount += total

              // Add line item with receipt number reference
              receiptLineItemMap.set(lineItemsToInsert.length, receiptNumber)
              lineItemsToInsert.push({
                receipt_number: receiptNumber, // Temp field
                product_id: productId,
                product_name: productName,
                product_sku: transformedData.sku as string || null,
                quantity,
                unit_price: unitPrice,
                discount_amount: discount,
                tax_amount: tax,
                total_amount: total,
                cost_price: productCost,
                created_at: new Date().toISOString(),
              })
            }
          } else {
            // Existing receipt - queue update
            const existingUpdate = receiptUpdates.get(receiptNumber)
            if (existingUpdate) {
              existingUpdate.data.subtotal += total - tax
              existingUpdate.data.tax_amount += tax
              existingUpdate.data.discount_amount += discount
              existingUpdate.data.total_amount = existingUpdate.data.subtotal + existingUpdate.data.tax_amount
            } else {
              const newSubtotal = (existingReceipt?.subtotal || 0) + (total - tax)
              const newTax = (existingReceipt?.tax || 0) + tax
              const newDiscount = (existingReceipt?.discount || 0) + discount
              receiptUpdates.set(receiptNumber, {
                id: receiptId,
                data: {
                  subtotal: newSubtotal,
                  tax_amount: newTax,
                  discount_amount: newDiscount,
                  total_amount: newSubtotal + newTax,
                  updated_at: new Date().toISOString(),
                }
              })
            }

            // Add line item with actual receipt_id
            lineItemsToInsert.push({
              receipt_id: receiptId,
              product_id: productId,
              product_name: productName,
              product_sku: transformedData.sku as string || null,
              quantity,
              unit_price: unitPrice,
              discount_amount: discount,
              tax_amount: tax,
              total_amount: total,
              cost_price: productCost,
              created_at: new Date().toISOString(),
            })
          }
          successfulRows++
        }
      } catch (err) {
        failedRows++
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[Server Import] Row ${rowNumber} failed:`, errorMsg)
        errorLog.push({
          rowNumber,
          field: 'general',
          value: JSON.stringify(row).slice(0, 200),
          message: errorMsg,
        })

        await (serviceClient.from('import_row_details') as any).insert({
          import_id: importId,
          row_number: rowNumber,
          row_data: row,
          status: 'error',
          error_message: errorMsg,
        })
      }
    }

    // Bulk insert operations
    console.log(`[Server Import] Bulk inserting ${productsToInsert.length} new products...`)
    if (productsToInsert.length > 0) {
      const { error: productsError } = await (serviceClient.from('products') as any).insert(productsToInsert)
      if (productsError) {
        console.error('Bulk product insert error:', productsError)
      } else if (newProductStock.length > 0) {
        // Fetch newly inserted products to get their IDs for inventory snapshots
        const newSkus = productsToInsert.map(p => p.sku)
        const { data: newProducts } = await serviceClient
          .from('products')
          .select('id, sku')
          .eq('store_id', store_id)
          .in('sku', newSkus)
        const newProductMap = new Map<string, string>()
        newProducts?.forEach((p: any) => {
          if (p.sku) newProductMap.set(p.sku.toLowerCase(), p.id)
        })

        // Get default location
        const { data: defaultLoc } = await serviceClient
          .from('store_locations')
          .select('id')
          .eq('store_id', store_id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .single()
        const defaultLocationId = (defaultLoc as { id: string } | null)?.id || null

        // Create inventory snapshots for new products with stock
        const stockSnapshots = newProductStock
          .map(stock => {
            const productId = newProductMap.get(stock.sku)
            if (!productId) return null
            return {
              store_id: store_id,
              location_id: defaultLocationId,
              product_id: productId,
              quantity: stock.quantity,
              reserved_quantity: 0,
              unit_cost: stock.cost_price,
              total_value: stock.cost_price ? stock.quantity * stock.cost_price : null,
              snapshot_date: new Date().toISOString().split('T')[0],
              notes: 'Imported from product CSV',
              created_at: new Date().toISOString(),
            }
          })
          .filter(Boolean)

        if (stockSnapshots.length > 0) {
          console.log(`[Server Import] Creating ${stockSnapshots.length} inventory snapshots from product stock data...`)
          await (serviceClient.from('inventory_snapshots') as any).insert(stockSnapshots)
        }
      }
    }

    console.log(`[Server Import] Updating ${productsToUpdate.length} existing products...`)
    if (productsToUpdate.length > 0) {
      // Update in batches of 50 to avoid too many concurrent requests
      const updateBatchSize = 50
      for (let i = 0; i < productsToUpdate.length; i += updateBatchSize) {
        const batch = productsToUpdate.slice(i, i + updateBatchSize)
        await Promise.all(batch.map(update =>
          (serviceClient.from('products') as any).update(update.data).eq('id', update.id)
        ))
      }
    }

    console.log(`[Server Import] Bulk inserting ${inventoryToInsert.length} inventory snapshots...`)
    console.log(`[Server Import] Sample inventory data:`, inventoryToInsert[0])
    if (inventoryToInsert.length > 0) {
      // Insert in chunks of 100 to avoid payload size limits
      for (let i = 0; i < inventoryToInsert.length; i += 100) {
        const chunk = inventoryToInsert.slice(i, i + 100)
        const { error: invError, data: invData } = await (serviceClient.from('inventory_snapshots') as any).insert(chunk).select()
        if (invError) {
          console.error(`[Server Import] Inventory chunk ${i} error:`, JSON.stringify(invError, null, 2))
          console.error(`[Server Import] Sample chunk data:`, JSON.stringify(chunk[0], null, 2))
        } else {
          console.log(`[Server Import] Inventory chunk ${i} inserted: ${invData?.length || 0} rows`)
        }
      }
    }

    console.log(`[Server Import] Bulk inserting ${receiptsToInsert.length} sales receipts...`)
    // Bulk insert receipts first, then update line items with receipt IDs
    if (receiptsToInsert.length > 0) {
      const { data: newReceipts, error: receiptsError } = await (serviceClient
        .from('sales_receipts') as any)
        .insert(receiptsToInsert)
        .select('id, receipt_number')

      if (receiptsError) {
        console.error('Bulk receipt insert error:', receiptsError)
      } else {
        // Create map of receipt_number to id
        const receiptIdMap = new Map<string, string>()
        newReceipts?.forEach((r: { id: string; receipt_number: string }) => {
          receiptIdMap.set(r.receipt_number, r.id)
        })

        // Update line items with receipt IDs
        for (const [index, receiptNumber] of receiptLineItemMap.entries()) {
          const receiptId = receiptIdMap.get(receiptNumber)
          if (receiptId) {
            lineItemsToInsert[index].receipt_id = receiptId
            delete lineItemsToInsert[index].receipt_number // Remove temp field
          }
        }
      }
    }

    console.log(`[Server Import] Updating ${receiptUpdates.size} existing receipts...`)
    if (receiptUpdates.size > 0) {
      for (const [receiptNumber, update] of receiptUpdates.entries()) {
        const { error: updateError } = await (serviceClient.from('sales_receipts') as any)
          .update(update.data)
          .eq('id', update.id)
        if (updateError) console.error(`Receipt update error for ${receiptNumber}:`, updateError)
      }
    }

    console.log(`[Server Import] Bulk inserting ${lineItemsToInsert.length} sale line items...`)
    if (lineItemsToInsert.length > 0) {
      // Validate line items before insert
      const invalidItems = lineItemsToInsert.filter((item: any) => !item.receipt_id)
      if (invalidItems.length > 0) {
        console.error(`[Server Import] ERROR: ${invalidItems.length} line items missing receipt_id:`, invalidItems.slice(0, 3))
      }

      for (let i = 0; i < lineItemsToInsert.length; i += 100) {
        const chunk = lineItemsToInsert.slice(i, i + 100)
        console.log(`[Server Import] Inserting chunk ${i}-${i + chunk.length}, sample:`, chunk[0])
        const { data: insertedData, error: lineError } = await (serviceClient.from('sale_line_items') as any)
          .insert(chunk)
          .select('id')
        if (lineError) {
          console.error(`[Server Import] Sale line items chunk ${i} error:`, lineError)
          console.error(`[Server Import] Chunk data sample:`, JSON.stringify(chunk[0], null, 2))
        } else {
          console.log(`[Server Import] Chunk ${i} inserted ${insertedData?.length || 0} items`)
        }
      }
    }

    console.log(`[Server Import] Complete. Success: ${successfulRows}, Failed: ${failedRows}`)

    // Update import status
    const processingTime = Date.now() - startTime
    const finalStatus = failedRows === 0 ? 'completed' : successfulRows > 0 ? 'partial' : 'failed'

    await (serviceClient
      .from('imports') as any)
      .update({
        status: finalStatus,
        total_rows: parsedCSV.totalRows,
        processed_rows: processedRows,
        successful_rows: successfulRows,
        failed_rows: failedRows,
        error_log: errorLog.slice(0, 100),
        completed_at: new Date().toISOString(),
        processing_time_ms: processingTime,
      })
      .eq('id', importId)

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/analytics')

    return { success: true }
  } catch (err) {
    await (serviceClient
      .from('imports') as any)
      .update({
        status: 'failed',
        error_log: [{ rowNumber: 0, field: 'system', value: '', message: err instanceof Error ? err.message : 'Unknown error' }],
        completed_at: new Date().toISOString(),
      })
      .eq('id', importId)

    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Transform row data based on mapping
function transformRowData(row: CSVRow, columnMapping: ColumnMapping[], importType: ImportType): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const fields = IMPORT_FIELDS[importType]

  for (const mapping of columnMapping) {
    const fieldDef = fields.find(f => f.name === mapping.dbField)
    if (!fieldDef) continue

    const rawValue = row[mapping.csvColumn] || ''
    const transformed = validateAndTransformValue(rawValue, fieldDef.name, fieldDef.type, fieldDef.required)

    if (transformed.value !== null) {
      result[fieldDef.name] = transformed.value
    }
  }

  return result
}

// Process product import row
async function processProductRow(
  client: ReturnType<typeof createServiceClient>,
  storeId: string,
  data: Record<string, unknown>,
  categoryMap: Map<string, string>
): Promise<void> {
  const sku = data.sku as string
  if (!sku) throw new Error('SKU is required')
  if (!data.name) throw new Error(`Name is required for SKU: ${sku}`)
  if (!data.selling_price) throw new Error(`Selling price is required for SKU: ${sku}`)

  console.log(`[Server Import] Processing product: ${sku} - ${data.name}`)

  // Check if product exists
  const { data: existingRaw } = await client
    .from('products')
    .select('id')
    .eq('store_id', storeId)
    .eq('sku', sku)
    .single()
  const existing = existingRaw as { id: string } | null

  // Handle category
  let categoryId = null
  if (data.category) {
    const categoryName = (data.category as string).toLowerCase()
    categoryId = categoryMap.get(categoryName)

    // Create category if not exists
    if (!categoryId && data.category) {
      const { data: newCategory } = await (client
        .from('product_categories') as any)
        .insert({
          store_id: storeId,
          name: data.category as string,
        })
        .select('id')
        .single()

      if (newCategory) {
        categoryId = newCategory.id
        categoryMap.set(categoryName, categoryId)
      }
    }
  }

  const productData = {
    store_id: storeId,
    sku,
    name: data.name as string,
    description: data.description || null,
    category_id: categoryId,
    barcode: data.barcode || null,
    cost_price: data.cost_price || null,
    selling_price: data.selling_price as number,
    tax_rate: data.tax_rate || 0,
    min_stock_level: data.min_stock_level || 0,
    max_stock_level: data.max_stock_level || null,
    reorder_point: data.reorder_point || 0,
    reorder_quantity: data.reorder_quantity || null,
    supplier_name: data.supplier_name || null,
    supplier_contact: data.supplier_contact || null,
    unit_of_measure: data.unit_of_measure || 'unit',
    weight_kg: data.weight_kg || null,
    is_active: data.is_active !== undefined ? data.is_active : true,
  }

  if (existing) {
    await (client.from('products') as any).update(productData).eq('id', existing.id)
  } else {
    await (client.from('products') as any).insert(productData)
  }

  // Create inventory snapshot if stock is provided
  if (data.stock !== undefined && data.stock !== null) {
    const stockQuantity = parseInt(String(data.stock), 10)
    if (!isNaN(stockQuantity) && stockQuantity >= 0) {
      // Get the product ID (either existing or newly created)
      let productId = existing?.id
      if (!productId) {
        const { data: newProduct } = await client
          .from('products')
          .select('id')
          .eq('store_id', storeId)
          .eq('sku', sku)
          .single()
        productId = (newProduct as { id: string } | null)?.id
      }

      if (productId) {
        // Get the first store location for inventory
        const { data: locationData } = await client
          .from('store_locations')
          .select('id')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .single()
        const locationId = (locationData as { id: string } | null)?.id

        // Create inventory snapshot
        await (client.from('inventory_snapshots') as any).insert({
          store_id: storeId,
          location_id: locationId || null,
          product_id: productId,
          quantity: stockQuantity,
          reserved_quantity: 0,
          unit_cost: data.cost_price || null,
          total_value: data.cost_price ? stockQuantity * (data.cost_price as number) : null,
          snapshot_date: new Date().toISOString().split('T')[0],
          notes: 'Imported from product CSV',
          created_at: new Date().toISOString(),
        })
      }
    }
  }
}

// Process inventory import row
async function processInventoryRow(
  client: ReturnType<typeof createServiceClient>,
  storeId: string,
  data: Record<string, unknown>,
  productMap: Map<string, string>,
  locationMap: Map<string, string>
): Promise<void> {
  const sku = (data.sku as string)?.toLowerCase()
  if (!sku) throw new Error('SKU is required')
  if (data.quantity === undefined || data.quantity === null) throw new Error(`Quantity is required for SKU: ${sku}`)

  console.log(`[Server Import] Processing inventory: ${sku}, qty=${data.quantity}`)

  // Try to get product ID from map first, then query database
  let productId = productMap.get(sku)
  if (!productId) {
    // Look up product directly
    const { data: productData } = await client
      .from('products')
      .select('id')
      .eq('store_id', storeId)
      .ilike('sku', data.sku as string)
      .single()

    const product = productData as { id: string } | null
    if (product) {
      productId = product.id
      // Add to map for future rows
      productMap.set(sku, productId)
    }
  }

  if (!productId) {
    console.error(`Inventory import failed: Product SKU '${data.sku}' not found in store ${storeId}`)
    console.error(`Available products in map: ${Array.from(productMap.keys()).slice(0, 10).join(', ')}...`)
    throw new Error(`Product with SKU '${data.sku}' not found. Make sure to import products before inventory.`)
  }

  // Get location - location_name in CSV can be either:
  // 1. A store_location name (matches store_locations table) -> maps to location_id
  // 2. A physical area (like "Cooler", "Main Floor") -> stored in physical_location field
  // 3. Empty -> uses first store location
  const locationNameFromCsv = data.location_name as string | undefined
  let locationId: string | null = null
  let physicalLocation: string | null = null

  if (locationNameFromCsv) {
    const locationNameLower = locationNameFromCsv.toLowerCase()
    // Try to match against store_locations first
    locationId = locationMap.get(locationNameLower) || null

    if (locationId) {
      // It's a valid store location - no physical location needed
      physicalLocation = null
    } else {
      // Not a store location - treat as physical area within the store
      physicalLocation = locationNameFromCsv
      // Use the first store location as the parent location
      const { data: firstLocationRaw } = await client
        .from('store_locations')
        .select('id')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const firstLocation = firstLocationRaw as { id: string } | null
      if (firstLocation) {
        locationId = firstLocation.id
      }
    }
  } else {
    // No location specified - get the first active location
    const { data: firstLocationRaw, error: locationError } = await client
      .from('store_locations')
      .select('id')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (locationError) {
      console.error('Location lookup error:', locationError)
      throw new Error(`No active location found for this store: ${locationError.message}`)
    }

    const firstLocation = firstLocationRaw as { id: string } | null

    if (!firstLocation) {
      console.error(`No active location found for store ${storeId}`)
      throw new Error('No active location found for this store. Please create a location first.')
    }
    locationId = firstLocation.id
  }

  try {
    const quantity = data.quantity as number
    const unitCost = data.unit_cost as number | null
    const { error: insertError } = await (client.from('inventory_snapshots') as any).insert({
      store_id: storeId,
      location_id: locationId,
      product_id: productId,
      quantity: quantity,
      reserved_quantity: 0,
      unit_cost: unitCost,
      total_value: unitCost ? unitCost * quantity : null,
      snapshot_date: data.snapshot_date || new Date().toISOString(),
      notes: physicalLocation ? `Physical location: ${physicalLocation}` : (data.notes || null),
    })

    if (insertError) {
      console.error('Inventory insert error:', insertError)
      throw new Error(`Failed to insert inventory: ${insertError.message}`)
    }
  } catch (err) {
    console.error('Inventory import error:', err)
    throw err
  }
}

// Process sales import row
async function processSalesRow(
  client: ReturnType<typeof createServiceClient>,
  storeId: string,
  userId: string,
  data: Record<string, unknown>,
  productMap: Map<string, string>,
  locationMap: Map<string, string>
): Promise<void> {
  const receiptNumber = data.receipt_number as string
  if (!receiptNumber) throw new Error('Receipt number is required')
  if (!data.transaction_date) throw new Error(`Transaction date is required for receipt: ${receiptNumber}`)
  if (data.quantity === undefined || data.quantity === null) throw new Error(`Quantity is required for receipt: ${receiptNumber}`)
  if (!data.unit_price) throw new Error(`Unit price is required for receipt: ${receiptNumber}`)

  console.log(`[Server Import] Processing sale: ${receiptNumber}, qty=${data.quantity}, price=${data.unit_price}`)

  // Check if receipt already exists
  const { data: existingReceiptRaw } = await client
    .from('sales_receipts')
    .select('id')
    .eq('store_id', storeId)
    .eq('receipt_number', receiptNumber)
    .single()
  const existingReceipt = existingReceiptRaw as { id: string } | null

  // Get location - location_name can be:
  // 1. A store_location name (matches store_locations table) -> maps to location_id
  // 2. A physical area (like "Cooler", "Main Floor") -> stored in physical_location field
  // 3. Empty -> uses first store location
  const locationNameFromCsv = data.location_name as string | undefined
  let locationId: string | null = null
  let physicalLocation: string | null = null

  if (locationNameFromCsv) {
    const locationNameLower = locationNameFromCsv.toLowerCase()
    // Try to match against store_locations first
    locationId = locationMap.get(locationNameLower) || null

    if (locationId) {
      // It's a valid store location
      physicalLocation = null
    } else {
      // Not a store location - treat as physical area within the store
      physicalLocation = locationNameFromCsv
      // Use the first store location as the parent location
      const { data: firstLocationRaw } = await client
        .from('store_locations')
        .select('id')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const firstLocation = firstLocationRaw as { id: string } | null
      if (firstLocation) {
        locationId = firstLocation.id
      }
    }
  }

  // Get product if SKU provided
  let productId = null
  let productCost = 0
  if (data.sku) {
    const sku = (data.sku as string).toLowerCase()

    // Try map first, then query
    let product: { id: string; cost_price?: number; selling_price?: number; name?: string } | null = null
    productId = productMap.get(sku)
    if (productId) {
      // Get product details from DB
      const { data: productData } = await client
        .from('products')
        .select('id, cost_price, selling_price, name')
        .eq('id', productId)
        .single()
      product = productData as { id: string; cost_price?: number; selling_price?: number; name?: string } | null
    } else {
      // Query by SKU
      const { data: productData } = await client
        .from('products')
        .select('id, cost_price, selling_price, name')
        .eq('store_id', storeId)
        .ilike('sku', data.sku as string)
        .single()
      product = productData as { id: string; cost_price?: number; selling_price?: number; name?: string } | null
      if (product) {
        productMap.set(sku, product.id)
      }
    }

    if (!product) {
      // Product not found - still record the sale with unknown product
      // This allows importing sales data before products are cataloged
      console.warn(`Sales import: Product SKU '${data.sku}' not found, recording as unknown product`)
      productId = null
      productCost = 0
      // Use provided product_name or default to "Unknown Product"
      if (!data.product_name) {
        data.product_name = `Unknown Product (${data.sku})`
      }
    } else {
      // Product found - use product details
      productId = product.id
      productCost = product.cost_price || 0

      // Use product name from catalog if not provided in CSV
      if (!data.product_name) {
        data.product_name = product.name
      }

      // Use product price from catalog if not provided in CSV
      if (!data.unit_price) {
        data.unit_price = product.selling_price
      }
    }
  }

  const quantity = (data.quantity as number) || 1
  const unitPrice = (data.unit_price as number) || 0
  const discountAmount = (data.discount_amount as number) || 0
  const taxAmount = (data.tax_amount as number) || 0
  const totalAmount = (quantity * unitPrice) - discountAmount + taxAmount

  if (existingReceipt) {
    // Add line item to existing receipt
    await (client.from('sale_line_items') as any).insert({
      receipt_id: existingReceipt.id,
      product_id: productId,
      product_name: data.product_name || 'Unknown Product',
      product_sku: data.sku as string || null,
      quantity,
      unit_price: unitPrice,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      cost_price: productCost,
    })

    // Update receipt totals
    const { data: lineItemsRaw } = await client
      .from('sale_line_items')
      .select('total_amount, tax_amount, discount_amount')
      .eq('receipt_id', existingReceipt.id)
    const lineItems = lineItemsRaw as { total_amount?: number; tax_amount?: number; discount_amount?: number }[] | null

    const newSubtotal = lineItems?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0
    const newTax = lineItems?.reduce((sum, item) => sum + (item.tax_amount || 0), 0) || 0
    const newDiscount = lineItems?.reduce((sum, item) => sum + (item.discount_amount || 0), 0) || 0

    await (client.from('sales_receipts') as any).update({
      subtotal: newSubtotal,
      tax_amount: newTax,
      discount_amount: newDiscount,
      total_amount: newSubtotal + newTax,
    }).eq('id', existingReceipt.id)
  } else {
    // Create new receipt
    try {
      const { data: newReceipt, error: receiptError } = await (client
        .from('sales_receipts') as any)
        .insert({
          store_id: storeId,
          location_id: locationId,
          receipt_number: receiptNumber,
          sale_datetime: data.transaction_date as string,
          subtotal: totalAmount - taxAmount,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          payment_method: data.payment_method || 'other',
          payment_status: 'completed',
          customer_name: data.customer_name || null,
          customer_email: data.customer_email || null,
          customer_phone: data.customer_phone || null,
          cashier_id: userId,
          notes: physicalLocation ? `Location: ${physicalLocation}` : (data.notes || null),
        })
        .select('id')
        .single()

      if (receiptError) {
        console.error('Sales receipt insert error:', receiptError)
        throw new Error(`Failed to create receipt: ${receiptError.message}`)
      }

      if (newReceipt) {
        await (client.from('sale_line_items') as any).insert({
          receipt_id: newReceipt.id,
          product_id: productId,
          product_name: data.product_name || 'Unknown Product',
          product_sku: data.sku as string || null,
          quantity,
          unit_price: unitPrice,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          cost_price: productCost,
        })
      }
    } catch (err) {
      console.error('Sales import error:', err)
      throw err
    }
  }
}

// Get imports for a store
export async function getImports(storeId: string): Promise<ImportStatus[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: imports, error } = await supabase
    .from('imports')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching imports:', error)
    return []
  }

  // Transform snake_case to camelCase
  return (imports || []).map((item: any) => ({
    id: item.id,
    storeId: item.store_id,
    importType: item.import_type,
    fileName: item.file_name,
    status: item.status,
    totalRows: item.total_rows || 0,
    processedRows: item.processed_rows || 0,
    successfulRows: item.successful_rows || 0,
    failedRows: item.failed_rows || 0,
    errorLog: item.error_log || [],
    startedAt: item.started_at,
    completedAt: item.completed_at,
    createdAt: item.created_at,
    processingTimeMs: item.processing_time_ms,
    mappingAccuracy: item.mapping_accuracy,
    columnMapping: item.mapping_config || [],
    columnMappingDetails: item.column_mapping_details || [],
  })) as ImportStatus[]
}

// Get import details with row errors
export async function getImportDetails(importId: string): Promise<{ import: ImportStatus | null; rowDetails: { row_number: number; row_data: CSVRow; status: string; error_message: string }[] }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { import: null, rowDetails: [] }
  }

  const { data: importRecord } = await supabase
    .from('imports')
    .select('*')
    .eq('id', importId)
    .single()

  if (!importRecord) {
    return { import: null, rowDetails: [] }
  }

  const { data: rowDetails } = await supabase
    .from('import_row_details')
    .select('row_number, row_data, status, error_message')
    .eq('import_id', importId)
    .order('row_number', { ascending: true })

  // Transform snake_case to camelCase
  const record = importRecord as any
  const transformedImport: ImportStatus = {
    id: record.id,
    storeId: record.store_id,
    importType: record.import_type,
    fileName: record.file_name,
    status: record.status,
    totalRows: record.total_rows || 0,
    processedRows: record.processed_rows || 0,
    successfulRows: record.successful_rows || 0,
    failedRows: record.failed_rows || 0,
    errorLog: record.error_log || [],
    startedAt: record.started_at,
    completedAt: record.completed_at,
    createdAt: record.created_at,
    processingTimeMs: record.processing_time_ms,
    mappingAccuracy: record.mapping_accuracy,
    columnMapping: record.mapping_config || [],
    columnMappingDetails: record.column_mapping_details || [],
  }

  return {
    import: transformedImport,
    rowDetails: rowDetails || [],
  }
}

// Helper function to check store access
async function checkStoreAccess(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storeId: string,
  userId: string,
  requiredRole: 'admin' | 'manager' | 'staff' = 'staff'
): Promise<boolean> {
  // Check if user is owner
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', userId)
    .single()

  if (store) return true

  // Check membership role
  const { data: membershipRaw } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', userId)
    .single()
  const membership = membershipRaw as { role: 'owner' | 'admin' | 'manager' | 'staff' } | null

  if (!membership) return false

  const roleHierarchy = { owner: 4, admin: 3, manager: 2, staff: 1 }
  const userRoleLevel = roleHierarchy[membership.role]
  const requiredRoleLevel = roleHierarchy[requiredRole]

  return userRoleLevel >= requiredRoleLevel
}
