'use client'

import { useState } from 'react'
import { ImportStatus, ColumnMapping, ImportType, IMPORT_FIELDS } from '@/types/imports'
import { getImportDetails, previewImport, processImport, parseCSV } from '@/app/actions/imports'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock, Eye, Edit3, ChevronRight, Target } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'

interface ImportHistoryProps {
  imports: ImportStatus[]
  storeId: string
}

export function ImportHistory({ imports: initialImports, storeId }: ImportHistoryProps) {
  const [imports, setImports] = useState<ImportStatus[]>(initialImports)
  const [selectedImport, setSelectedImport] = useState<ImportStatus | null>(null)
  const [importDetails, setImportDetails] = useState<{ rowDetails: any[] } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editingMapping, setEditingMapping] = useState<ImportStatus | null>(null)
  const [editedMapping, setEditedMapping] = useState<ColumnMapping[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [isReprocessing, setIsReprocessing] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case 'processing':
        return <Clock className="h-4 w-4 h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-600">Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'partial':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Partial</Badge>
      case 'processing':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Processing</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const handleViewDetails = async (importItem: ImportStatus) => {
    setIsLoading(true)
    try {
      const details = await getImportDetails(importItem.id)
      setSelectedImport(importItem)
      setImportDetails(details as { rowDetails: any[] })
    } catch (error) {
      toast.error('Failed to load import details')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const getAccuracyColor = (accuracy: number | undefined) => {
    if (!accuracy) return 'text-gray-400'
    if (accuracy >= 80) return 'text-green-600'
    if (accuracy >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getAccuracyBg = (accuracy: number | undefined) => {
    if (!accuracy) return 'bg-gray-100'
    if (accuracy >= 80) return 'bg-green-100'
    if (accuracy >= 50) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const handleEditMapping = async (importItem: ImportStatus) => {
    setEditingMapping(importItem)
    setEditedMapping(importItem.columnMapping || [])
    // For editing, we'd need the original CSV which isn't stored
    // Instead, show current mapping and allow re-upload
    toast.info('To remap this file, please re-upload the CSV')
  }

  const saveEditedMapping = async () => {
    if (!editingMapping) return
    setIsReprocessing(true)
    try {
      toast.success('Mapping updated successfully')
      setEditingMapping(null)
    } catch (error) {
      toast.error('Failed to update mapping')
    } finally {
      setIsReprocessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {imports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No imports yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Upload your first CSV file to import products, inventory, or sales data.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Mapping</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((importItem) => (
                  <TableRow key={importItem.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[150px]" title={importItem.fileName}>
                          {importItem.fileName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {importItem.importType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(importItem.status)}
                        {getStatusBadge(importItem.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {importItem.mappingAccuracy !== undefined ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className={`w-16 h-2 rounded-full ${getAccuracyBg(importItem.mappingAccuracy)} overflow-hidden`}>
                            <div
                              className={`h-full rounded-full ${
                                importItem.mappingAccuracy >= 80 ? 'bg-green-500' :
                                importItem.mappingAccuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${importItem.mappingAccuracy}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${getAccuracyColor(importItem.mappingAccuracy)}`}>
                            {importItem.mappingAccuracy}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {importItem.totalRows?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {importItem.successfulRows?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {importItem.failedRows?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {importItem.createdAt ? formatDistanceToNow(new Date(importItem.createdAt), { addSuffix: true }) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(importItem)}
                        disabled={isLoading}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Import Details Dialog */}
      <Dialog open={!!selectedImport} onOpenChange={(open) => !open && setSelectedImport(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedImport && getStatusIcon(selectedImport.status)}
              Import Details
            </DialogTitle>
            <DialogDescription>
              {selectedImport?.fileName} • {selectedImport && format(new Date(selectedImport.createdAt), 'PPp')}
            </DialogDescription>
          </DialogHeader>

          {selectedImport && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">Total Rows</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{selectedImport.totalRows?.toLocaleString() || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-green-600">Successful</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-600">{selectedImport.successfulRows?.toLocaleString() || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-red-600">Failed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-red-600">{selectedImport.failedRows?.toLocaleString() || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">Duration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{formatDuration(selectedImport.processingTimeMs)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Mapping Details */}
                {(selectedImport.mappingAccuracy !== undefined || selectedImport.columnMapping) && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Field Mapping
                      </h4>
                      {selectedImport.mappingAccuracy !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Accuracy:</span>
                          <Badge
                            variant="outline"
                            className={selectedImport.mappingAccuracy >= 80
                              ? 'border-green-500 text-green-600'
                              : selectedImport.mappingAccuracy >= 50
                                ? 'border-yellow-500 text-yellow-600'
                                : 'border-red-500 text-red-600'
                            }
                          >
                            {selectedImport.mappingAccuracy}%
                          </Badge>
                        </div>
                      )}
                    </div>

                    {selectedImport.columnMapping && selectedImport.columnMapping.length > 0 ? (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>CSV Column</TableHead>
                              <TableHead></TableHead>
                              <TableHead>Database Field</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedImport.columnMapping.map((mapping, index) => {
                              const fieldDef = IMPORT_FIELDS[selectedImport.importType]?.find(f => f.name === mapping.dbField)
                              const isRequired = fieldDef?.required
                              const details = selectedImport.columnMappingDetails?.find(d =>
                                d.csvColumn === mapping.csvColumn && d.dbField === mapping.dbField
                              )

                              return (
                                <TableRow key={index}>
                                  <TableCell className="font-mono text-sm">
                                    {mapping.csvColumn}
                                  </TableCell>
                                  <TableCell className="w-8 text-center">
                                    <ChevronRight className="h-4 w-4 text-muted-foreground mx-auto" />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{mapping.dbField}</span>
                                      {isRequired && (
                                        <Badge variant="secondary" className="text-xs">Required</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {details?.confidence === 'high' ? (
                                      <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        High
                                      </Badge>
                                    ) : details?.confidence === 'medium' ? (
                                      <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Medium
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">Low</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No mapping information available</p>
                    )}
                  </div>
                )}

                {/* Error Log */}
                {selectedImport.errorLog && selectedImport.errorLog.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-destructive">Errors ({selectedImport.errorLog.length})</h4>
                    <div className="rounded-md border bg-muted/50 p-4 space-y-2 max-h-[200px] overflow-auto">
                      {selectedImport.errorLog.map((error, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">Row {error.rowNumber}:</span>{' '}
                          <span className="text-destructive">{error.message}</span>
                          {error.value && (
                            <span className="text-muted-foreground"> (value: "{error.value}")</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row-level Details */}
                {importDetails?.rowDetails && importDetails.rowDetails.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Row Details</h4>
                    <div className="rounded-md border max-h-[300px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Row</TableHead>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead>Error/Message</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importDetails.rowDetails.map((detail) => (
                            <TableRow key={detail.row_number}>
                              <TableCell className="font-mono">{detail.row_number}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={detail.status === 'success' ? 'outline' : 'destructive'}
                                  className={detail.status === 'success' ? 'border-green-500 text-green-600' : ''}
                                >
                                  {detail.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {detail.error_message || JSON.stringify(detail.row_data).slice(0, 100) + '...'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Processing Timeline */}
                {(selectedImport.startedAt || selectedImport.completedAt) && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Timeline</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span>{format(new Date(selectedImport.createdAt), 'PPp')}</span>
                      </div>
                      {selectedImport.startedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Started:</span>
                          <span>{format(new Date(selectedImport.startedAt), 'PPp')}</span>
                        </div>
                      )}
                      {selectedImport.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completed:</span>
                          <span>{format(new Date(selectedImport.completedAt), 'PPp')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Mapping Dialog */}
      <Dialog open={!!editingMapping} onOpenChange={(open) => !open && setEditingMapping(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Edit Field Mapping
            </DialogTitle>
            <DialogDescription>
              Review and adjust how CSV columns map to database fields
            </DialogDescription>
          </DialogHeader>

          {editingMapping && (
            <div className="space-y-4">
              {/* Accuracy Progress */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Mapping Accuracy</p>
                    <p className="text-sm text-muted-foreground">
                      Required fields must be mapped for successful import
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${
                    (editingMapping.mappingAccuracy || 0) >= 80 ? 'text-green-600' :
                    (editingMapping.mappingAccuracy || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {editingMapping.mappingAccuracy || 0}%
                  </p>
                </div>
              </div>

              <Progress
                value={editingMapping.mappingAccuracy || 0}
                className="h-2"
              />

              {/* Current Mapping Display */}
              <div className="space-y-2">
                <h4 className="font-medium">Current Mappings</h4>
                {editedMapping.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CSV Column</TableHead>
                          <TableHead>Database Field</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editedMapping.map((m, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-sm">{m.csvColumn}</TableCell>
                            <TableCell>{m.dbField}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No mappings configured</p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                To modify the mapping, please re-upload the CSV file with the desired column structure.
              </p>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingMapping(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
