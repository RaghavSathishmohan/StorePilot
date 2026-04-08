'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, Sparkles, TrendingUp, Package, AlertCircle } from 'lucide-react'
import { useStore } from '@/lib/store-context'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const suggestedQuestions = [
  'What are my top selling products this week?',
  'Which items are running low on stock?',
  'How did my sales compare to last month?',
  'What products should I reorder soon?',
]

export function AskStoreContent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m your StorePilot AI assistant. Ask me anything about your store\'s sales, inventory, or performance.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { isSampleStore, sampleData } = useStore()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const response = generateResponse(input, isSampleStore, sampleData)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }

  const generateResponse = (query: string, isSample: boolean, data: typeof sampleData): string => {
    const lowerQuery = query.toLowerCase()

    if (!isSample || !data) {
      return 'I can see you don\'t have any store data yet. Connect your store to get personalized insights!'
    }

    if (lowerQuery.includes('top selling') || lowerQuery.includes('best selling')) {
      const topProducts = data.topSelling.slice(0, 3)
      return `Your top selling products are:\n\n${topProducts.map((p, i) => `${i + 1}. ${p.name} - ${p.quantity} units sold ($${p.revenue.toFixed(2)})`).join('\n')}`
    }

    if (lowerQuery.includes('stock') || lowerQuery.includes('low') || lowerQuery.includes('inventory')) {
      const lowStock = data.lowStockAlerts
      if (lowStock.length === 0) {
        return 'Good news! All your items are well stocked. No low stock alerts at the moment.'
      }
      return `You have ${lowStock.length} items running low:\n\n${lowStock.slice(0, 5).map((item) => `• ${item.product} - Only ${item.current} left (threshold: ${item.threshold})`).join('\n')}`
    }

    if (lowerQuery.includes('sales') || lowerQuery.includes('revenue')) {
      return `Your store performance:\n\n• Total Sales: $${data.metrics.total_sales.toLocaleString()}\n• Total Transactions: ${data.metrics.total_transactions}\n• Average Transaction: $${data.metrics.average_transaction_value.toFixed(2)}\n• Refunds: ${data.metrics.total_refunds}`
    }

    if (lowerQuery.includes('reorder')) {
      const reorderItems = data.products.filter((p) => p.quantity <= p.min_stock_level)
      if (reorderItems.length === 0) {
        return 'No items need reordering at the moment. Your inventory looks healthy!'
      }
      return `You should reorder these items soon:\n\n${reorderItems.slice(0, 5).map((p) => `• ${p.name} (${p.quantity} remaining)`).join('\n')}`
    }

    return 'I\'m not sure about that. Try asking about your sales, inventory, top products, or what items need reordering!'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          Ask Your Store
        </h1>
        <p className="text-muted-foreground">
          Chat with your AI assistant to get insights about sales, inventory, and more.
        </p>
      </motion.div>

      {/* Chat Interface */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="h-[500px] flex flex-col">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                        <span className="text-xs opacity-50 mt-1 block">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex gap-1">
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.5 }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t flex gap-2">
              <Input
                placeholder="Ask about sales, inventory, or products..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Suggested Questions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {suggestedQuestions.map((question, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => {
                setInput(question)
              }}
            >
              <CardContent className="p-4 flex items-center gap-3">
                {question.includes('selling') ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : question.includes('stock') ? (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Package className="h-4 w-4 text-blue-500" />
                )}
                <span className="text-sm">{question}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
