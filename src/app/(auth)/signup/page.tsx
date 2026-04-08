'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { signUp } from '@/app/actions/auth'
import { Loader2, Mail, ArrowRight, Eye, EyeOff, CheckCircle2, XCircle, Sparkles } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingDemo, setIsCreatingDemo] = useState(false)
  const [demoCredentials, setDemoCredentials] = useState<{ email: string; password: string } | null>(null)
  const [error, setError] = useState<string | Record<string, string[]> | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')

  // Password strength calculation
  const passwordStrength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy')
      setIsLoading(false)
      return
    }

    const formData = new FormData(event.currentTarget)
    const result = await signUp(formData)

    if (result.error) {
      if (typeof result.error === 'object' && 'message' in result.error) {
        setError(result.error.message)
      } else {
        setError('Please check your input and try again')
      }
      setIsLoading(false)
      return
    }

    if (result.success) {
      router.push('/onboarding')
      router.refresh()
    }
  }

  async function createDemoAccount() {
    setIsCreatingDemo(true)
    setError(null)
    setDemoCredentials(null)

    try {
      const response = await fetch('/api/demo/setup', { method: 'POST' })
      const result = await response.json()

      if (result.success) {
        setDemoCredentials(result.credentials)
      } else {
        setError(result.message || 'Failed to create demo account')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsCreatingDemo(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full max-w-md"
    >
      <Card className="relative overflow-hidden">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 5, repeat: Infinity }}
        />

        <CardHeader className="space-y-1 relative">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <CardDescription>
              Enter your information to get started with StorePilot
            </CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          <AnimatePresence>
            {error && typeof error === 'string' && (
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

          <form onSubmit={onSubmit} className="space-y-4">
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="John Doe"
                required
                disabled={isLoading}
                className="transition-all focus:scale-[1.02]"
              />
            </motion.div>

            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                disabled={isLoading}
                className="transition-all focus:scale-[1.02]"
              />
            </motion.div>

            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="transition-all focus:scale-[1.02] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 pt-2"
                >
                  <Progress value={(passwordStrength / 4) * 100} className="h-1" />
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {[
                      { label: '8+ characters', met: password.length >= 8 },
                      { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
                      { label: 'Number', met: /[0-9]/.test(password) },
                      { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
                    ].map((req) => (
                      <motion.div
                        key={req.label}
                        className="flex items-center gap-1"
                        animate={{ color: req.met ? '#22c55e' : '#9ca3af' }}
                      >
                        {req.met ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        <span>{req.label}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>

            <motion.div
              className="flex items-start space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <Label htmlFor="terms" className="text-sm font-normal leading-normal">
                I agree to the{' '}
                <Link href="#" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button type="submit" className="w-full group" disabled={isLoading || !agreed}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
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

          <motion.div
            className="relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Button variant="outline" className="w-full" disabled={isLoading}>
              <Mail className="mr-2 h-4 w-4" />
              Magic Link
            </Button>
          </motion.div>

          {/* Demo Account Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
          >
            <Button
              variant="secondary"
              className="w-full"
              disabled={isCreatingDemo}
              onClick={createDemoAccount}
            >
              {isCreatingDemo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up demo...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Demo Account
                </>
              )}
            </Button>
          </motion.div>

          {/* Demo Credentials Display */}
          {demoCredentials && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-green-50 border border-green-200 rounded-lg p-4"
            >
              <p className="text-sm font-medium text-green-800 mb-2">
                Demo account created!
              </p>
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>Email:</strong> {demoCredentials.email}</p>
                <p><strong>Password:</strong> {demoCredentials.password}</p>
              </div>
              <Link href="/login">
                <Button size="sm" className="mt-3 w-full">
                  Sign In to Demo Account
                </Button>
              </Link>
            </motion.div>
          )}

          <motion.p
            className="text-center text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium inline-flex items-center group"
            >
              Sign in
              <motion.span
                className="ml-1 inline-block"
                animate={{ x: [0, 2, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                →
              </motion.span>
            </Link>
          </motion.p>
        </CardContent>
      </Card>

      {/* Floating decorative elements */}
      <motion.div
        className="absolute -top-10 -right-10 w-20 h-20 bg-primary/10 rounded-full blur-xl pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-10 -left-10 w-20 h-20 bg-purple-500/10 rounded-full blur-xl pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, delay: 2 }}
      />
    </motion.div>
  )
}
