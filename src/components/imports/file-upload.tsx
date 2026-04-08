'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { QueuedFile, ParsedCSV } from '@/types/imports'
import { Card, CardContent } from '@/components/ui/card'
import { FileUp, X, Loader2, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface FileUploadProps {
  onFilesSelected: (files: QueuedFile[]) => void
  maxFiles?: number
  disabled?: boolean
}

export function FileUpload({ onFilesSelected, maxFiles = 20, disabled = false }: FileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [localFiles, setLocalFiles] = useState<QueuedFile[]>([])

  const generateId = () => Math.random().toString(36).substring(2, 15)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    // Check total files limit
    if (localFiles.length + acceptedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    setIsProcessing(true)
    const newQueuedFiles: QueuedFile[] = []

    for (const file of acceptedFiles) {
      // Validate file type
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
        toast.error(`"${file.name}" is not a CSV file`)
        continue
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 10MB limit`)
        continue
      }

      try {
        const content = await readFileAsText(file)
        const parsed = parseCSVPreview(content)

        newQueuedFiles.push({
          id: generateId(),
          file,
          content,
          name: file.name,
          status: 'pending',
          parsedCSV: parsed,
        })
      } catch (err) {
        toast.error(`Failed to parse "${file.name}": ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    if (newQueuedFiles.length > 0) {
      const updatedFiles = [...localFiles, ...newQueuedFiles]
      setLocalFiles(updatedFiles)
      onFilesSelected(updatedFiles)
      toast.success(`${newQueuedFiles.length} file(s) added to queue`)
    }

    setIsProcessing(false)
  }, [localFiles, maxFiles, onFilesSelected])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
    },
    multiple: true,
    maxFiles: maxFiles - localFiles.length,
    disabled: isProcessing || disabled || localFiles.length >= maxFiles,
    noClick: localFiles.length > 0, // Don't open dialog when clicking on file list
  })

  const removeFile = (id: string) => {
    const updated = localFiles.filter(f => f.id !== id)
    setLocalFiles(updated)
    onFilesSelected(updated)
  }

  const clearAll = () => {
    setLocalFiles([])
    onFilesSelected([])
  }

  const getStatusBadge = (status: QueuedFile['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'mapping':
        return <Badge variant="outline" className="text-blue-500">Mapping</Badge>
      case 'preview':
        return <Badge variant="outline" className="text-purple-500">Preview</Badge>
      case 'processing':
        return <Badge variant="outline" className="text-yellow-500"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Processing</Badge>
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card
        {...getRootProps()}
        className={`cursor-pointer border-2 border-dashed transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        } ${localFiles.length >= maxFiles || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <CardContent className="flex flex-col items-center justify-center py-10">
          <input {...getInputProps()} />
          <FileUp className="mb-4 h-10 w-10 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-lg font-medium">Drop the files here...</p>
          ) : (
            <>
              <p className="text-lg font-medium">Drag & drop CSV files here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Maximum {maxFiles} files, 10MB each
              </p>
              {localFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {localFiles.length} of {maxFiles} files selected
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* File Queue */}
      {localFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Selected Files ({localFiles.length})</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => open()}>
                Add More
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {localFiles.map((queuedFile) => (
              <Card key={queuedFile.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{queuedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {queuedFile.parsedCSV?.totalRows || 0} rows
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(queuedFile.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(queuedFile.id)
                        }}
                        disabled={disabled}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to read file as text
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// Parse CSV (all rows)
function parseCSVPreview(content: string): ParsedCSV {
  const lines = content.split('\n').filter(line => line.trim() !== '')
  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  // Parse ALL rows, not just first 6
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
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
