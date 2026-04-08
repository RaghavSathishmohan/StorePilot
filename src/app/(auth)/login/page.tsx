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
import { signIn } from '@/app/actions/auth'
import { Loader2, Mail, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [demoEmail, setDemoEmail] = useState('')
  const [demoPassword, setDemoPassword] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await signIn(formData)

      if (result.error) {
        setError('message' in result.error ? result.error.message : 'Invalid email or password')
        setIsLoading(false)
        return
      }

      if (result.success) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(
        'Unable to connect to the server. This usually means:\n\n' +
        '1. Your Supabase project is paused (free tier projects pause after 7 days)\n' +
        '2. Network connectivity issues\n\n' +
        'Try: Go to Supabase dashboard → Resume project, then refresh this page.'
      )
      setIsLoading(false)
    }
  }

  async function demoLogin() {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('email', 'demo@storepilot.app')
      formData.append('password', 'Demo123!')

      const result = await signIn(formData)

      if (result.error) {
        const errorMessage = 'message' in result.error ? result.error.message : ''
        if (errorMessage?.includes('fetch') || errorMessage?.includes('network')) {
          setError(
            'Connection failed. Your Supabase project may be paused.\n\n' +
            'To fix:\n' +
            '1. Go to https://app.supabase.com\n' +
            '2. Find your project (vqglrexlyzngnmridscf)\n' +
            '3. Click "Resume Project"\n' +
            '4. Refresh this page'
          )
        } else {
          setError(errorMessage || 'Demo account not found. Please create one on the signup page.')
        }
        setIsLoading(false)
        return
      }

      if (result.success) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      console.error('Demo login error:', err)
      setError(
        'Unable to connect. Please check:\n\n' +
        '1. Is your Supabase project running?\n' +
        '2. Check /api/debug/connection for diagnostics\n\n' +
        'The project may need to be resumed from the Supabase dashboard.'
      )
      setIsLoading(false)
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
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <CardDescription>
              Enter your email and password to sign in to your account
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
                  <AlertDescription className="whitespace-pre-line">
                    {error}
                  </AlertDescription>
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
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
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
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                type="submit"
                className="w-full group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
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
            transition={{ delay: 0.6 }}
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
            transition={{ delay: 0.7 }}
          >
            <Button variant="outline" className="w-full" disabled={isLoading}>
              <Mail className="mr-2 h-4 w-4" />
              Magic Link
            </Button>
          </motion.div>

          {/* Demo Login Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <Button
              variant="secondary"
              className="w-full"
              disabled={isLoading}
              onClick={demoLogin}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Sign in with Demo Account
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              No signup required - just click to try the demo
            </p>
          </motion.div>

          <motion.p
            className="text-center text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-primary hover:underline font-medium inline-flex items-center group"
            >
              Sign up
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
