'use client'

import { ImportType, ImportPreviewResult, ImportPreviewRow, IMPORT_FIELDS } from '@/types/imports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { AlertCircle, CheckCircle2, AlertTriangle, FileText } from 'lucide-react'

interface ImportPreviewProps {
  preview: ImportPreviewResult
  importType: ImportType
  fileName: string
}

export function ImportPreview({ preview, importType, fileName }: ImportPreviewProps) {
  const fields = IMPORT_FIELDS[importType]
  const validRows = preview.previewRows.filter(r => r.errors.length === 0)
  const invalidRows = preview.previewRows.filter(r => r.errors.length > 0)
  const rowsWithWarnings = preview.previewRows.filter(r => r.warnings.length > 0 && r.errors.length === 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{preview.totalRows}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Valid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{preview.validRows}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">With Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold text-amber-600">{rowsWithWarnings.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Invalid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{preview.invalidRows}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Info */}
      <div className="flex items-center gap-2 text-sm">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{fileName}</span>
        <span className="text-muted-foreground">•</span>
        <Badge variant="outline">{importType}</Badge>
      </div>

      {/* Success Alert */}
      {preview.validRows > 0 && preview.invalidRows === 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">All rows are valid</AlertTitle>
          <AlertDescription className="text-green-700">
            Your CSV file passed all validation checks and is ready to import.
          </AlertDescription>
        </Alert>
      )}

      {/* Partial Success Alert */}
      {preview.validRows > 0 && preview.invalidRows > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Partial validation</AlertTitle>
          <AlertDescription className="text-amber-700">
            {preview.validRows} rows are ready to import, but {preview.invalidRows} rows have errors.
            Invalid rows will be skipped.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {preview.validRows === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No valid rows found</AlertTitle>
          <AlertDescription>
            All rows have validation errors. Please fix the errors in your CSV file before importing.
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Table - Show first 20 rows */}
      <div className="space-y-2">
        <h4 className="font-medium">Data Preview (First 20 rows)</h4>
        <div className="rounded-md border">
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Row</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  {fields
                    .filter(f => preview.columnMapping.some(m => m.dbField === f.name))
                    .map(field => (
                      <TableHead key={field.name}>
                        {field.name}
                        {field.required && <span className="ml-1 text-destructive">*</span>}
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.previewRows.slice(0, 20).map((row) => (
                  <TableRow key={row.rowNumber} className={row.errors.length > 0 ? 'bg-red-50/50' : row.warnings.length > 0 ? 'bg-amber-50/50' : ''}>
                    <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                    <TableCell>
                      {row.errors.length > 0 ? (
                        <Badge variant="destructive" className="text-xs">Error</Badge>
                      ) : row.warnings.length > 0 ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">Warning</Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-600 text-xs">Valid</Badge>
                      )}
                    </TableCell>
                    {fields
                      .filter(f => preview.columnMapping.some(m => m.dbField === f.name))
                      .map(field => (
                        <TableCell key={field.name} className="max-w-[150px] truncate">
                          {formatValue(row.data[field.name])}
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {preview.previewRows.length > 20 && (
            <div className="border-t bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
              Showing 20 of {preview.previewRows.length} preview rows
            </div>
          )}
        </div>
      </div>

      {/* Error Details Accordion */}
      {invalidRows.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-destructive">Validation Errors</h4>
          <Accordion type="single" collapsible className="w-full">
            {invalidRows.slice(0, 10).map((row) => (
              <AccordionItem key={row.rowNumber} value={row.rowNumber.toString()}>
                <AccordionTrigger className="text-sm hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span>Row {row.rowNumber}: {row.errors.length} error{row.errors.length > 1 ? 's' : ''}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1 text-sm">
                    {row.errors.map((error, index) => (
                      <li key={index} className="text-destructive">
                        <span className="font-medium">{error.field}:</span> {error.message}
                        {error.value && <span className="text-muted-foreground"> (value: "{error.value}")</span>}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
            {invalidRows.length > 10 && (
              <div className="py-2 text-center text-sm text-muted-foreground">
                + {invalidRows.length - 10} more rows with errors
              </div>
            )}
          </Accordion>
        </div>
      )}
    </div>
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}
