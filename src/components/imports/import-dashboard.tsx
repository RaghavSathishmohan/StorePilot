'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ImportType,
  QueuedFile,
  ImportStatus,
  IMPORT_FIELDS,
  ParsedCSV,
  ColumnMapping,
} from '@/types/imports'
import {
  parseCSV,
  suggestColumnMapping,
  previewImport,
  createImport,
  processImport,
  getImports,
} from '@/app/actions/imports'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FileUpload } from './file-upload'
import { ImportHistory } from './import-history'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Zap,
  Settings2,
  ChevronRight,
  Database,
  Download,
  FileSpreadsheet,
  Wand2,
  Edit3,
  X,
  Check,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'

interface Store {
  id: string
  name: string
}

interface ImportDashboardProps {
  stores: Store[]
  initialImports: ImportStatus[]
}

interface FileAnalysis {
  detectedType: ImportType
  confidence: 'high' | 'medium' | 'low'
  suggestedMapping: ColumnMapping[]
  mappingQuality: number
  manualMapping?: ColumnMapping[]
}

export function ImportDashboard({ stores, initialImports }: ImportDashboardProps) {
  const router = useRouter()
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id || '')
  const [isProcessing, setIsProcessing] = useState(false)
  const [imports, setImports] = useState<ImportStatus[]>(initialImports)
  const [activeView, setActiveView] = useState<'upload' | 'analysis' | 'processing' | 'history'>('upload')

  // File queue state
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([])
  const [fileAnalysis, setFileAnalysis] = useState<Record<string, FileAnalysis>>({})
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(-1)
  const [overallProgress, setOverallProgress] = useState(0)
  const [showMappingDetails, setShowMappingDetails] = useState(false)

  // Manual mapping dialog state
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [manualMapping, setManualMapping] = useState<ColumnMapping[]>([])
  const [selectedImportType, setSelectedImportType] = useState<ImportType>('products')

  const handleFilesSelected = useCallback(async (files: QueuedFile[]) => {
    setQueuedFiles(files)
    if (files.length > 0) {
      setActiveView('analysis')
      // Analyze files directly with the data
      await analyzeFilesWithData(files)
    }
  }, [])

  // Detect import type based on CSV headers
  const detectImportType = (parsedCSV: ParsedCSV): { type: ImportType; confidence: 'high' | 'medium' | 'low' } => {
    const headers = parsedCSV.headers.map(h => h.toLowerCase().trim())
    const headerSet = new Set(headers)

    // Check for unified format - has BOTH product AND sales fields
    const hasProductFields = headerSet.has('sku') || headerSet.has('name') || headerSet.has('product_name') || headerSet.has('selling_price')
    const hasSalesFields = headerSet.has('receipt_number') || headerSet.has('transaction_date') || headerSet.has('transaction_id')
    const hasStockFields = headerSet.has('stock') || headerSet.has('quantity')

    // If it has both product and sales fields, it's unified
    if (hasProductFields && hasSalesFields) {
      return { type: 'unified', confidence: 'high' }
    }

    // Check for sales indicators
    const salesIndicators = ['receipt_number', 'transaction_number', 'transaction_id', 'receipt', 'transaction', 'sale_date', 'sale_datetime']
    const salesMatches = salesIndicators.filter(h => headerSet.has(h)).length
    if (salesMatches >= 1) {
      return { type: 'sales', confidence: 'high' }
    }

    // Check for inventory indicators
    const inventoryIndicators = ['quantity', 'stock', 'inventory', 'available_quantity', 'stock_level', 'on_hand']
    const inventoryMatches = inventoryIndicators.filter(h => headerSet.has(h)).length
    if (inventoryMatches >= 1 && !hasProductFields) {
      return { type: 'inventory', confidence: 'high' }
    }

    // Check for product indicators
    const productIndicators = ['sku', 'name', 'product_name', 'selling_price', 'price', 'cost_price', 'category']
    const productMatches = productIndicators.filter(h => headerSet.has(h)).length
    if (productMatches >= 2) {
      return { type: 'products', confidence: 'high' }
    }

    // Default to unified with medium confidence if it has any recognizable fields
    if (hasProductFields || hasStockFields) {
      return { type: 'unified', confidence: 'medium' }
    }

    return { type: 'unified', confidence: 'low' }
  }

  // Calculate mapping quality
  const calculateMappingQuality = (mapping: ColumnMapping[], importType: ImportType): number => {
    const requiredFields = IMPORT_FIELDS[importType].filter(f => f.required).map(f => f.name)
    const mappedFields = mapping.map(m => m.dbField)
    const matchedRequired = requiredFields.filter(f => mappedFields.includes(f)).length
    return requiredFields.length > 0 ? Math.round((matchedRequired / requiredFields.length) * 100) : 100
  }

  // Analyze files with provided data (avoids state dependency issues)
  const analyzeFilesWithData = async (files: QueuedFile[]) => {
    const analysis: Record<string, FileAnalysis> = {}
    const updatedFiles: QueuedFile[] = []

    for (const file of files) {
      if (!file.parsedCSV) {
        updatedFiles.push(file)
        continue
      }

      // Skip if already analyzed
      if (fileAnalysis[file.id]) {
        updatedFiles.push(file)
        continue
      }

      try {
        const detection = detectImportType(file.parsedCSV)
        const suggested = await suggestColumnMapping(file.parsedCSV.headers, detection.type)
        const quality = calculateMappingQuality(suggested, detection.type)

        analysis[file.id] = {
          detectedType: detection.type,
          confidence: detection.confidence,
          suggestedMapping: suggested,
          mappingQuality: quality,
        }

        // Update file with detected type and mapping
        updatedFiles.push({
          ...file,
          columnMapping: suggested,
          status: quality >= 80 ? 'pending' : 'mapping',
        })
      } catch (error) {
        console.error('Error analyzing file:', file.name, error)
        updatedFiles.push({
          ...file,
          status: 'error',
          error: error instanceof Error ? error.message : 'Analysis failed',
        })
      }
    }

    setFileAnalysis(prev => ({ ...prev, ...analysis }))
    setQueuedFiles(updatedFiles)
  }

  // Get confidence color
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  // Get status badge
  const getFileStatusBadge = (file: QueuedFile) => {
    const analysis = fileAnalysis[file.id]
    if (!analysis) return <Badge variant="outline">Analyzing...</Badge>

    const quality = analysis.manualMapping ? calculateMappingQuality(analysis.manualMapping, analysis.detectedType) : analysis.mappingQuality

    if (quality >= 80) {
      return <Badge className="bg-green-500"><CheckCircle2 className="mr-1 h-3 w-3" />Ready</Badge>
    } else if (quality >= 50) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><AlertCircle className="mr-1 h-3 w-3" />Review Needed</Badge>
    } else {
      return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Manual Mapping Required</Badge>
    }
  }

  // Open manual mapping dialog
  const openManualMapping = (fileId: string) => {
    const file = queuedFiles.find(f => f.id === fileId)
    const analysis = fileAnalysis[fileId]
    if (!file || !analysis) return

    setEditingFileId(fileId)
    setSelectedImportType(analysis.detectedType)
    // Start with suggested mapping or empty
    setManualMapping(analysis.suggestedMapping?.length > 0 ? [...analysis.suggestedMapping] : [])
  }

  // Save manual mapping
  const saveManualMapping = () => {
    if (!editingFileId) return

    const quality = calculateMappingQuality(manualMapping, selectedImportType)

    setFileAnalysis(prev => ({
      ...prev,
      [editingFileId]: {
        ...prev[editingFileId],
        detectedType: selectedImportType,
        suggestedMapping: manualMapping,
        mappingQuality: quality,
        manualMapping: manualMapping,
      }
    }))

    // Update file status
    const newStatus: QueuedFile['status'] = quality >= 80 ? 'pending' : 'mapping'
    const updatedFiles: QueuedFile[] = queuedFiles.map(f =>
      f.id === editingFileId
        ? { ...f, columnMapping: manualMapping, status: newStatus }
        : f
    )
    setQueuedFiles(updatedFiles)

    toast.success('Mapping saved')
    setEditingFileId(null)
  }

  // Add mapping row
  const addMappingRow = () => {
    setManualMapping([...manualMapping, { csvColumn: '', dbField: '' }])
  }

  // Update mapping row
  const updateMappingRow = (index: number, field: 'csvColumn' | 'dbField', value: string) => {
    const updated = [...manualMapping]
    updated[index] = { ...updated[index], [field]: value }
    setManualMapping(updated)
  }

  // Remove mapping row
  const removeMappingRow = (index: number) => {
    setManualMapping(manualMapping.filter((_, i) => i !== index))
  }

  // Get available CSV columns for the current file
  const getAvailableCsvColumns = () => {
    if (!editingFileId) return []
    const file = queuedFiles.find(f => f.id === editingFileId)
    return file?.parsedCSV?.headers || []
  }

  // Get available DB fields for selected import type
  const getAvailableDbFields = () => {
    return IMPORT_FIELDS[selectedImportType] || []
  }

  // Import type priority: products must be imported before inventory/sales
  const IMPORT_PRIORITY: Record<ImportType, number> = {
    unified: 0,   // Contains products - import first
    products: 0,  // Highest priority - import first
    inventory: 1, // Depends on products
    sales: 2,     // Depends on products
  }

  // Start batch import with automatic dependency sorting
  const startBatchImport = async () => {
    setIsProcessing(true)
    setActiveView('processing')

    // Sort files by dependency order (products first)
    const sortedFiles = [...queuedFiles].sort((a, b) => {
      const aAnalysis = fileAnalysis[a.id]
      const bAnalysis = fileAnalysis[b.id]
      if (!aAnalysis || !bAnalysis) return 0
      return IMPORT_PRIORITY[aAnalysis.detectedType] - IMPORT_PRIORITY[bAnalysis.detectedType]
    })

    const totalFiles = sortedFiles.length
    let processedCount = 0
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < sortedFiles.length; i++) {
      setCurrentFileIndex(i)
      const file = sortedFiles[i]
      const analysis = fileAnalysis[file.id]

      if (!file.parsedCSV || !analysis) {
        errorCount++
        continue
      }

      // Update file status
      updateFileStatus(file.id, 'processing')

      try {
        // Create import record
        const { id: importId } = await createImport(
          selectedStoreId,
          analysis.detectedType,
          file.name,
          file.content,
          analysis.suggestedMapping,
          file.parsedCSV?.headers
        )

        // Process the import
        const result = await processImport(
          importId,
          file.parsedCSV,
          analysis.detectedType,
          analysis.suggestedMapping
        )

        if (result.success) {
          updateFileStatus(file.id, 'completed')
          successCount++
          toast.success(`"${file.name}" imported successfully`)
        } else {
          updateFileStatus(file.id, 'error', result.error)
          errorCount++
          toast.error(`"${file.name}" failed: ${result.error}`)
        }
      } catch (error) {
        updateFileStatus(file.id, 'error', error instanceof Error ? error.message : 'Unknown error')
        errorCount++
        toast.error(`"${file.name}" error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      processedCount++
      setOverallProgress(Math.round((processedCount / totalFiles) * 100))
    }

    // Update queuedFiles to reflect sorted order for the processing view
    setQueuedFiles(sortedFiles)

    setIsProcessing(false)

    // Refresh imports list from server
    try {
      const refreshedImports = await getImports(selectedStoreId)
      setImports(refreshedImports)
    } catch (error) {
      console.error('Failed to refresh imports:', error)
    }

    setActiveView('history')

    // Force refresh of server data so dashboard shows imported data
    router.refresh()

    // Show summary
    if (errorCount === 0) {
      toast.success(`All ${successCount} files imported successfully! Refreshing data...`)
    } else {
      toast.info(`Import complete: ${successCount} succeeded, ${errorCount} failed`)
    }
  }

  const updateFileStatus = (fileId: string, status: QueuedFile['status'], error?: string) => {
    setQueuedFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, status, error } : f)
    )
  }

  const handleReset = () => {
    setQueuedFiles([])
    setFileAnalysis({})
    setCurrentFileIndex(-1)
    setOverallProgress(0)
    setActiveView('upload')
  }

  const getEffectiveQuality = (fileId: string) => {
    const analysis = fileAnalysis[fileId]
    if (!analysis) return 0
    const mapping = analysis.manualMapping || analysis.suggestedMapping
    return calculateMappingQuality(mapping, analysis.detectedType)
  }

  const readyFiles = queuedFiles.filter(f => getEffectiveQuality(f.id) >= 80).length
  const needsReviewFiles = queuedFiles.filter(f => {
    const q = getEffectiveQuality(f.id)
    return q >= 50 && q < 80
  }).length
  const manualMappingFiles = queuedFiles.filter(f => getEffectiveQuality(f.id) < 50).length

  // Current file being processed
  const currentFile = currentFileIndex >= 0 ? queuedFiles[currentFileIndex] : null

  // Template download function
  const downloadTemplate = (type: ImportType) => {
    const headers = IMPORT_FIELDS[type]
    const requiredHeaders = headers.filter(f => f.required).map(f => f.name)
    const optionalHeaders = headers.filter(f => !f.required).map(f => f.name)

    // Create sample row
    let sampleRow: Record<string, string> = {}
    headers.forEach(field => {
      switch (field.name) {
        case 'sku': sampleRow[field.name] = 'SKU-001'; break
        case 'name': sampleRow[field.name] = 'Sample Product'; break
        case 'selling_price': sampleRow[field.name] = '9.99'; break
        case 'stock': sampleRow[field.name] = '100'; break
        case 'quantity': sampleRow[field.name] = '100'; break
        case 'receipt_number': sampleRow[field.name] = 'RCP-001'; break
        case 'transaction_date': sampleRow[field.name] = '2025-03-25 10:00:00'; break
        case 'unit_price': sampleRow[field.name] = '9.99'; break
        default: sampleRow[field.name] = ''
      }
    })

    const allHeaders = [...requiredHeaders, ...optionalHeaders]
    const csvContent = [
      allHeaders.join(','),
      allHeaders.map(h => sampleRow[h] || '').join(',')
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-template.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(`${type} template downloaded`)
  }

  return (
    <div className="space-y-6">
      {/* Store Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Select Store</CardTitle>
          <CardDescription>Choose which store to import data into</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stores.map((store) => (
              <Button
                key={store.id}
                variant={selectedStoreId === store.id ? 'default' : 'outline'}
                onClick={() => setSelectedStoreId(store.id)}
                className="min-w-[140px]"
              >
                {store.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload View */}
      {activeView === 'upload' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Smart Import
              </CardTitle>
              <CardDescription>
                Upload CSV files and let StorePilot automatically detect the data type and map columns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <Zap className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900">Unified Import</AlertTitle>
                <AlertDescription className="text-blue-800">
                  Upload ONE file with all your data. StorePilot automatically detects products, inventory,
                  and sales rows. Product rows have sku/name/price, sales rows add receipt_number. Simple!
                </AlertDescription>
              </Alert>

              <FileUpload
                onFilesSelected={handleFilesSelected}
                maxFiles={20}
                disabled={isProcessing}
              />
            </CardContent>
          </Card>

          {/* Templates Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Download Template
              </CardTitle>
              <CardDescription>
                One unified CSV template for all your data. StorePilot automatically detects products, inventory, and sales.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <Card className="border-dashed border-2">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg">
                        <Database className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">Unified Import Template</p>
                        <p className="text-xs text-muted-foreground">30 columns • Products + Inventory + Sales</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">How it works:</p>
                      <ul className="text-xs text-muted-foreground space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500">•</span>
                          <span><strong>Product rows:</strong> sku, name, selling_price (add stock to create inventory)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-500">•</span>
                          <span><strong>Sale rows:</strong> Include receipt_number + transaction_date</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500">•</span>
                          <span>Mix products and sales in one file</span>
                        </li>
                      </ul>
                    </div>
                    <Button variant="default" size="lg" className="w-full" onClick={() => downloadTemplate('unified')}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Unified Template
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Analysis View */}
      {activeView === 'analysis' && queuedFiles.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Analysis Summary
                  </CardTitle>
                  <CardDescription>
                    {queuedFiles.length} file{queuedFiles.length !== 1 ? 's' : ''} analyzed
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {readyFiles > 0 && (
                    <Badge className="bg-green-500">{readyFiles} Ready</Badge>
                  )}
                  {needsReviewFiles > 0 && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      {needsReviewFiles} Review
                    </Badge>
                  )}
                  {manualMappingFiles > 0 && (
                    <Badge variant="destructive">{manualMappingFiles} Manual</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dependency Notice */}
              {queuedFiles.some(f =>
                ['sales', 'inventory', 'unified'].includes(fileAnalysis[f.id]?.detectedType || '')
              ) && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Database className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900">Smart Processing</AlertTitle>
                  <AlertDescription className="text-blue-800">
                    Unified imports automatically process products first, then sales.
                    This ensures SKUs exist before being referenced in transactions.
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{readyFiles}</p>
                  <p className="text-sm text-green-600">Ready to Import</p>
                  <p className="text-xs text-green-500 mt-1">Auto-mapped ≥80%</p>
                </div>
                <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
                  <p className="text-2xl font-bold text-yellow-700">{needsReviewFiles}</p>
                  <p className="text-sm text-yellow-600">Needs Review</p>
                  <p className="text-xs text-yellow-500 mt-1">Auto-mapped 50-79%</p>
                </div>
                <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                  <p className="text-2xl font-bold text-red-700">{manualMappingFiles}</p>
                  <p className="text-sm text-red-600">Manual Mapping</p>
                  <p className="text-xs text-red-500 mt-1">Auto-mapped &lt;50%</p>
                </div>
              </div>

              {/* File Details Table */}
              <div className="rounded-md border">
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Detected Type</TableHead>
                        <TableHead>Mapping Quality</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queuedFiles.map((file) => {
                        const analysis = fileAnalysis[file.id]
                        const quality = getEffectiveQuality(file.id)
                        return (
                          <TableRow key={file.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="font-medium">{file.name}</span>
                                  <p className="text-xs text-muted-foreground">{file.parsedCSV?.totalRows || 0} rows</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {analysis ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="capitalize">
                                    {analysis.detectedType}
                                  </Badge>
                                  <div className={`h-2 w-2 rounded-full ${getConfidenceColor(analysis.confidence)}`} />
                                </div>
                              ) : (
                                <Badge variant="secondary">Analyzing...</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {analysis ? (
                                <div className="flex items-center gap-2">
                                  <Progress value={quality} className="w-20 h-2" />
                                  <span className="text-sm text-muted-foreground">
                                    {quality}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{getFileStatusBadge(file)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openManualMapping(file.id)}
                              >
                                <Edit3 className="mr-1 h-3 w-3" />
                                Edit Mapping
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={handleReset}>
                  Start Over
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={startBatchImport}
                    disabled={readyFiles === 0 && needsReviewFiles === 0}
                    size="lg"
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Import {readyFiles + needsReviewFiles} File{readyFiles + needsReviewFiles !== 1 ? 's' : ''}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mapping Details */}
          {showMappingDetails && (
            <Card>
              <CardHeader>
                <CardTitle>Column Mapping Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {queuedFiles.map((file) => {
                    const analysis = fileAnalysis[file.id]
                    if (!analysis) return null

                    return (
                      <div key={file.id} className="rounded-lg border p-4">
                        <h4 className="font-medium mb-2">{file.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Detected as: <span className="capitalize font-medium">{analysis.detectedType}</span>
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {(analysis.manualMapping || analysis.suggestedMapping).map((mapping, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <code className="bg-muted px-1 rounded">{mapping.csvColumn}</code>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              <code className="bg-blue-50 text-blue-700 px-1 rounded">{mapping.dbField}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => setShowMappingDetails(!showMappingDetails)}>
              {showMappingDetails ? 'Hide' : 'Show'} Mapping Details
            </Button>
          </div>
        </>
      )}

      {/* Processing View */}
      {activeView === 'processing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Importing Files
            </CardTitle>
            <CardDescription>
              Processing {queuedFiles.length} file{queuedFiles.length !== 1 ? 's' : ''}...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>

            {/* Current File */}
            {currentFile && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground mb-1">Currently Processing</p>
                <p className="font-medium">{currentFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  File {currentFileIndex + 1} of {queuedFiles.length}
                </p>
              </div>
            )}

            {/* File Status List */}
            <div className="space-y-2">
              {queuedFiles.map((file, index) => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    index === currentFileIndex ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-8">{index + 1}.</span>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                  <div>
                    {file.status === 'completed' && (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Done
                      </Badge>
                    )}
                    {file.status === 'processing' && (
                      <Badge variant="outline" className="text-blue-600">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Processing
                      </Badge>
                    )}
                    {file.status === 'error' && (
                      <Badge variant="destructive">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                    {(file.status === 'pending' || file.status === 'mapping') && (
                      <Badge variant="secondary">Waiting</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History View */}
      {activeView === 'history' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Import History</CardTitle>
                <CardDescription>View past imports and their status</CardDescription>
              </div>
              <Button onClick={handleReset} variant="outline">
                Import More Files
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ImportHistory imports={imports} storeId={selectedStoreId} />
          </CardContent>
        </Card>
      )}

      {/* Manual Mapping Dialog */}
      <Dialog open={!!editingFileId} onOpenChange={(open) => !open && setEditingFileId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Manual Column Mapping
            </DialogTitle>
            <DialogDescription>
              Map CSV columns to database fields for accurate importing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Import Type Selector */}
            <div className="space-y-2">
              <Label>Import Type</Label>
              <Select value={selectedImportType} onValueChange={(v) => setSelectedImportType(v as ImportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unified">Unified (Products + Sales)</SelectItem>
                  <SelectItem value="products">Products Only</SelectItem>
                  <SelectItem value="inventory">Inventory Only</SelectItem>
                  <SelectItem value="sales">Sales Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Required Fields */}
            <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-1">Required Fields</p>
              <p className="text-xs text-blue-700">
                {IMPORT_FIELDS[selectedImportType].filter(f => f.required).map(f => f.name).join(', ')}
              </p>
            </div>

            {/* Current Quality */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Mapping Quality:</span>
              <Progress value={calculateMappingQuality(manualMapping, selectedImportType)} className="w-32 h-2" />
              <span className="text-sm font-medium">{calculateMappingQuality(manualMapping, selectedImportType)}%</span>
            </div>

            {/* Mapping Rows */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Column Mappings</Label>
                <Button variant="outline" size="sm" onClick={addMappingRow}>
                  + Add Mapping
                </Button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {manualMapping.map((mapping, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-lg border">
                    <Select
                      value={mapping.csvColumn || undefined}
                      onValueChange={(v) => updateMappingRow(index, 'csvColumn', v || '')}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="CSV Column" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableCsvColumns().map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />

                    <Select
                      value={mapping.dbField || undefined}
                      onValueChange={(v) => updateMappingRow(index, 'dbField', v || '')}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Database Field" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableDbFields().map(field => (
                          <SelectItem key={field.name} value={field.name}>
                            <div className="flex items-center gap-2">
                              <span>{field.name}</span>
                              {field.required && <span className="text-destructive">*</span>}
                              <span className="text-xs text-muted-foreground">({field.type})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeMappingRow(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {manualMapping.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    <p>No mappings yet. Click "Add Mapping" to start.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Available CSV Columns */}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium mb-2">Available CSV Columns:</p>
              <div className="flex flex-wrap gap-1">
                {getAvailableCsvColumns().map(col => (
                  <Badge key={col} variant="secondary" className="cursor-pointer" onClick={() => {
                    const unmapped = manualMapping.filter(m => !m.csvColumn)
                    if (unmapped.length > 0) {
                      const idx = manualMapping.indexOf(unmapped[0])
                      updateMappingRow(idx, 'csvColumn', col)
                    } else {
                      setManualMapping([...manualMapping, { csvColumn: col, dbField: '' }])
                    }
                  }}>
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingFileId(null)}>
              Cancel
            </Button>
            <Button onClick={saveManualMapping}>
              <Check className="mr-2 h-4 w-4" />
              Save Mapping
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
