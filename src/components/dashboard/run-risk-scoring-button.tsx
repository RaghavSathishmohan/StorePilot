'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { generateAllRiskAlerts } from '@/app/actions/alert-generation'

export function RunRiskScoringButton() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    totalCreated: number
  } | null>(null)

  async function handleRunScoring() {
    setIsRunning(true)
    setResult(null)

    try {
      const response = await generateAllRiskAlerts()

      setResult({
        success: true,
        message: `Created ${response.totalCreated} alerts`,
        totalCreated: response.totalCreated,
      })
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to run risk scoring',
        totalCreated: 0,
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleRunScoring}
        disabled={isRunning}
        variant="outline"
        size="sm"
      >
        <motion.div
          animate={isRunning ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 1, repeat: isRunning ? Infinity : 0, ease: 'linear' }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
        </motion.div>
        {isRunning ? 'Running Risk Analysis...' : 'Run Risk Analysis'}
      </Button>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-1 text-sm ${
            result.success ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {result.success ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>{result.message}</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>{result.message}</span>
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}
