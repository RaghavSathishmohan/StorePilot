'use client'

import { ImportType, ColumnMapping, IMPORT_FIELDS, FIELD_SYNONYMS } from '@/types/imports'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ColumnMapperProps {
  csvHeaders: string[]
  importType: ImportType
  mapping: ColumnMapping[]
  onMappingChange: (mapping: ColumnMapping[]) => void
}

export function ColumnMapper({ csvHeaders, importType, mapping, onMappingChange }: ColumnMapperProps) {
  const fields = IMPORT_FIELDS[importType]
  const requiredFields = fields.filter(f => f.required)
  const optionalFields = fields.filter(f => !f.required)

  const getMappedCsvColumn = (dbField: string): string | undefined => {
    return mapping.find(m => m.dbField === dbField)?.csvColumn
  }

  const handleMappingChange = (dbField: string, csvColumn: string | undefined) => {
    const newMapping = mapping.filter(m => m.dbField !== dbField)
    if (csvColumn && csvColumn !== '_none') {
      newMapping.push({ csvColumn, dbField })
    }
    onMappingChange(newMapping)
  }

  const handleAutoMap = () => {
    const newMapping: ColumnMapping[] = []
    const usedHeaders = new Set<string>()

    for (const field of fields) {
      const synonyms = FIELD_SYNONYMS[field.name] || [field.name]

      for (const header of csvHeaders) {
        if (usedHeaders.has(header)) continue

        const headerLower = header.toLowerCase().trim()
        const isMatch = synonyms.some(syn =>
          headerLower === syn.toLowerCase() ||
          headerLower.replace(/[_\s-]/g, '') === syn.toLowerCase().replace(/[_\s-]/g, '')
        )

        if (isMatch) {
          newMapping.push({
            csvColumn: header,
            dbField: field.name,
          })
          usedHeaders.add(header)
          break
        }
      }
    }

    onMappingChange(newMapping)
    toast.success(`Auto-mapped ${newMapping.length} columns`)
  }

  const getMappedCount = () => {
    const requiredMapped = requiredFields.filter(f => getMappedCsvColumn(f.name)).length
    const optionalMapped = optionalFields.filter(f => getMappedCsvColumn(f.name)).length
    return { requiredMapped, optionalMapped, total: mapping.length }
  }

  const counts = getMappedCount()
  const allRequiredMapped = counts.requiredMapped === requiredFields.length

  return (
    <div className="space-y-6">
      {/* Mapping Summary */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {allRequiredMapped ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            <span className="text-sm font-medium">
              {counts.requiredMapped} of {requiredFields.length} required fields mapped
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm text-muted-foreground">
            {counts.optionalMapped} optional fields mapped
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleAutoMap}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Auto-Map Columns
        </Button>
      </div>

      {/* Required Fields */}
      <div className="space-y-4">
        <h4 className="font-medium text-destructive">Required Fields</h4>
        <div className="grid gap-4 md:grid-cols-2">
          {requiredFields.map(field => {
            const mappedColumn = getMappedCsvColumn(field.name)
            const isMapped = !!mappedColumn

            return (
              <div key={field.name} className={`rounded-lg border p-3 ${isMapped ? 'bg-green-50/50 border-green-200' : 'bg-amber-50/50 border-amber-200'}`}>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="font-medium">
                    {field.name}
                    <span className="ml-1 text-destructive">*</span>
                  </Label>
                  <Badge variant={isMapped ? 'default' : 'secondary'} className="text-xs">
                    {field.type}
                  </Badge>
                </div>
                <Select
                  value={mappedColumn || '_none'}
                  onValueChange={(value) => handleMappingChange(field.name, (!value || value === '_none') ? undefined : value)}
                >
                  <SelectTrigger className={isMapped ? 'border-green-300' : 'border-amber-300'}>
                    <SelectValue placeholder="Select CSV column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">-- Not mapped --</SelectItem>
                    {csvHeaders.map(header => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {field.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Optional Fields */}
      <div className="space-y-4">
        <h4 className="font-medium text-muted-foreground">Optional Fields</h4>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {optionalFields.map(field => {
            const mappedColumn = getMappedCsvColumn(field.name)

            return (
              <div key={field.name} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-sm font-medium">{field.name}</Label>
                  <Badge variant="outline" className="text-xs">
                    {field.type}
                  </Badge>
                </div>
                <Select
                  value={mappedColumn || '_none'}
                  onValueChange={(value) => handleMappingChange(field.name, (!value || value === '_none') ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select CSV column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">-- Not mapped --</SelectItem>
                    {csvHeaders.map(header => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>
      </div>

      {/* Unmapped CSV Columns Warning */}
      {(() => {
        const mappedCsvColumns = new Set(mapping.map(m => m.csvColumn))
        const unmappedCsvColumns = csvHeaders.filter(h => !mappedCsvColumns.has(h))

        if (unmappedCsvColumns.length > 0) {
          return (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Unmapped CSV columns: {unmappedCsvColumns.join(', ')}
              </p>
            </div>
          )
        }
        return null
      })()}
    </div>
  )
}
