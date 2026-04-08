'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { createStore, createStoreLocation } from '@/app/actions/stores'
import { Loader2, Store, MapPin, CheckCircle, ArrowRight, Sparkles } from 'lucide-react'

type Step = 'store' | 'location' | 'complete'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('store')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)

  async function handleStoreSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const result = await createStore(formData)

    if (result.error) {
      setError('message' in result.error ? result.error.message : 'Failed to create store')
      setIsLoading(false)
      return
    }

    if (result.success) {
      setStoreId(result.store.id)
      setStep('location')
      setIsLoading(false)
    }
  }

  async function handleLocationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!storeId) {
      setError('Store ID not found')
      setIsLoading(false)
      return
    }

    const formData = new FormData(event.currentTarget)
    formData.append('storeId', storeId)

    // Debug logging
    console.log('Submitting location form:', {
      storeId,
      name: formData.get('name'),
      address: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
    })

    const result = await createStoreLocation(formData)

    console.log('Location creation result:', result)

    if (result.error) {
      const errorMessage = typeof result.error === 'object' && result.error !== null && 'message' in result.error
        ? String((result.error as { message: string }).message)
        : 'Failed to create location'
      setError(errorMessage)
      setIsLoading(false)
      return
    }

    if (result.success) {
      setStep('complete')
      setIsLoading(false)
    }
  }

  function handleComplete() {
    router.push('/dashboard')
    router.refresh()
  }

  function handleSkip() {
    router.push('/dashboard')
    router.refresh()
  }

  const progressValue = step === 'store' ? 33 : step === 'location' ? 66 : 100

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b bg-background/80 backdrop-blur"
      >
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Store className="h-6 w-6 text-primary" />
            </motion.div>
            <span className="font-bold text-xl">StorePilot</span>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
          </motion.div>
        </div>
      </motion.header>

      <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorations */}
        <motion.div
          className="absolute -top-20 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, delay: 4 }}
        />

        <div className="w-full max-w-lg relative z-10">
          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Step {step === 'store' ? 1 : step === 'location' ? 2 : 3} of 3
              </span>
              <span className="text-sm text-muted-foreground">{progressValue}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressValue}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            {step === 'store' && (
              <motion.div
                key="store"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Card className="relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 5, repeat: Infinity }}
                  />

                  <CardHeader className="space-y-1 relative">
                    <motion.div variants={itemVariants} className="flex items-center gap-2">
                      <motion.div
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Store className="h-5 w-5 text-primary" />
                      </motion.div>
                      <CardTitle>Create your first store</CardTitle>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <CardDescription>
                        Let&apos;s set up your first store. You can add more later.
                      </CardDescription>
                    </motion.div>
                  </CardHeader>

                  <CardContent className="space-y-4 relative">
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <form onSubmit={handleStoreSubmit} className="space-y-4">
                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="name">Store Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="My Convenience Store"
                          required
                          disabled={isLoading}
                          className="transition-all focus:scale-[1.02]"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                          id="description"
                          name="description"
                          placeholder="Brief description of your store..."
                          disabled={isLoading}
                          className="transition-all focus:scale-[1.02]"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <Button type="submit" className="w-full group" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating store...
                            </>
                          ) : (
                            <>
                              Continue
                              <motion.span
                                className="ml-2 inline-block"
                                animate={{ x: [0, 4, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </motion.span>
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 'location' && (
              <motion.div
                key="location"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Card className="relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-teal-500/5"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 5, repeat: Infinity }}
                  />

                  <CardHeader className="space-y-1 relative">
                    <motion.div variants={itemVariants} className="flex items-center gap-2">
                      <motion.div
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <MapPin className="h-5 w-5 text-green-500" />
                      </motion.div>
                      <CardTitle>Add a location</CardTitle>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <CardDescription>
                        Add your first store location. You can add more locations later.
                      </CardDescription>
                    </motion.div>
                  </CardHeader>

                  <CardContent className="space-y-4 relative">
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <form onSubmit={handleLocationSubmit} className="space-y-4">
                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="name">Location Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Main Street Location"
                          required
                          disabled={isLoading}
                          className="transition-all focus:scale-[1.02]"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          name="address"
                          placeholder="123 Main St"
                          disabled={isLoading}
                          className="transition-all focus:scale-[1.02]"
                        />
                      </motion.div>

                      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input id="city" name="city" disabled={isLoading} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State/Province</Label>
                          <Input id="state" name="state" disabled={isLoading} />
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                          <Input id="zipCode" name="zipCode" disabled={isLoading} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Input id="country" name="country" disabled={isLoading} />
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" name="phone" type="tel" disabled={isLoading} />
                      </motion.div>

                      <motion.div variants={itemVariants} className="flex gap-4">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep('store')}
                            disabled={isLoading}
                          >
                            Back
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                          <Button type="submit" className="w-full group" disabled={isLoading}>
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                Complete Setup
                                <motion.span
                                  className="ml-2 inline-block"
                                  animate={{ x: [0, 4, 0] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </motion.span>
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </motion.div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 'complete' && (
              <motion.div
                key="complete"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <Card className="relative overflow-hidden">
                  {/* Celebration background */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-primary/5 to-purple-500/10"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />

                  {/* Floating confetti-like elements */}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-3 h-3 rounded-full bg-primary/30"
                      style={{
                        left: `${15 + i * 15}%`,
                        top: `${20 + (i % 3) * 20}%`,
                      }}
                      animate={{
                        y: [0, -20, 0],
                        rotate: [0, 360],
                        opacity: [0.3, 0.8, 0.3],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                    />
                  ))}

                  <CardContent className="pt-8 text-center relative">
                    <motion.div
                      className="flex flex-col items-center gap-4"
                      variants={containerVariants}
                    >
                      <motion.div
                        variants={itemVariants}
                        className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: 'spring' }}
                        >
                          <CheckCircle className="h-10 w-10 text-green-600" />
                        </motion.div>
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <CardTitle className="text-2xl">All set!</CardTitle>
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            🎉
                          </motion.div>
                        </div>
                        <CardDescription className="text-lg">
                          Your store has been created successfully.
                        </CardDescription>
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                          <Button onClick={handleComplete} size="lg" className="group">
                            Go to Dashboard
                            <motion.span
                              className="ml-2 inline-block"
                              animate={{ x: [0, 4, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </motion.span>
                          </Button>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
