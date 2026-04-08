'use client'

import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  BadgeCheck,
  BarChart3,
  MapPin,
  Package,
  Shield,
  Users,
  ArrowRight,
  Sparkles,
  Zap,
  Brain,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  Clock,
  CheckCircle2,
  ChevronRight,
  Star,
  MessageSquare,
  FileSpreadsheet,
  Building2,
  LineChart,
  Wallet,
  Bell,
  Search,
  Database,
  Lock,
  Globe,
  Play,
  Pause,
  ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

// Interactive Dashboard Preview Component
function DashboardPreview() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setActiveTab(prev => {
        const tabs = ['overview', 'analytics', 'ai', 'inventory']
        const currentIndex = tabs.indexOf(prev)
        return tabs[(currentIndex + 1) % tabs.length]
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [isPlaying])

  return (
    <div className="relative">
      {/* Dashboard Window */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="relative bg-background rounded-2xl border shadow-2xl overflow-hidden"
      >
        {/* Browser Chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 mx-4">
            <div className="flex items-center gap-2 bg-background rounded-md px-3 py-1.5 text-xs text-muted-foreground border">
              <Lock className="w-3 h-3" />
              <span>app.storepilot.io/dashboard</span>
            </div>
          </div>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        {/* Dashboard Content */}
        <div className="p-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold">Dashboard Overview</h3>
                    <p className="text-sm text-muted-foreground">Real-time store performance</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse" />
                    Live
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Revenue Today', value: '$1,245', change: '+12%', color: 'text-green-500' },
                    { label: 'Transactions', value: '23', change: '+5%', color: 'text-green-500' },
                    { label: 'Avg Order', value: '$54.13', change: '+8%', color: 'text-green-500' },
                    { label: 'Items Sold', value: '34', change: '+15%', color: 'text-green-500' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-4 rounded-xl bg-muted/50 border"
                    >
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className={`text-xs ${stat.color}`}>{stat.change}</p>
                    </motion.div>
                  ))}
                </div>
                {/* Chart Placeholder */}
                <div className="h-40 rounded-xl bg-gradient-to-br from-primary/5 to-purple-500/5 border p-4">
                  <div className="flex items-end justify-between h-full gap-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.05, duration: 0.5 }}
                        className="flex-1 bg-primary/20 rounded-t-sm"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold">Analytics</h3>
                    <p className="text-sm text-muted-foreground">Deep insights into performance</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">7 Days</Badge>
                    <Badge variant="secondary">30 Days</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50 border">
                    <h4 className="text-sm font-medium mb-4">Revenue by Category</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Electronics', value: 45, color: 'bg-blue-500' },
                        { name: 'Food & Bev', value: 30, color: 'bg-green-500' },
                        { name: 'Clothing', value: 15, color: 'bg-purple-500' },
                        { name: 'Home', value: 10, color: 'bg-orange-500' },
                      ].map((cat) => (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{cat.name}</span>
                            <span>{cat.value}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${cat.value}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className={`h-full ${cat.color}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 border">
                    <h4 className="text-sm font-medium mb-4">Top Products</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Wireless Headphones', sales: 45, trend: 'up' },
                        { name: 'Organic Coffee', sales: 38, trend: 'up' },
                        { name: 'Cotton T-Shirt', sales: 32, trend: 'stable' },
                        { name: 'LED Desk Lamp', sales: 28, trend: 'down' },
                      ].map((product, i) => (
                        <div key={product.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                            <span className="text-sm">{product.name}</span>
                          </div>
                          <span className="text-sm font-medium">{product.sales}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'ai' && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">AI Recommendations</h3>
                  </div>
                  <Badge className="bg-purple-500/10 text-purple-600">AI-Powered</Badge>
                </div>
                <div className="space-y-3">
                  {[
                    { type: 'reorder', product: 'Smart Watch', reason: 'Stock running low', priority: 'high' },
                    { type: 'bundle', product: 'Coffee + Mug', reason: 'Frequently bought together', priority: 'medium' },
                    { type: 'reduce', product: 'Garden Tools', reason: 'Low turnover', priority: 'low' },
                  ].map((rec, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        rec.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                        rec.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {rec.type === 'reorder' ? <Package className="w-5 h-5" /> :
                         rec.type === 'bundle' ? <Zap className="w-5 h-5" /> :
                         <TrendingUp className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rec.product}</p>
                        <p className="text-xs text-muted-foreground">{rec.reason}</p>
                      </div>
                      <Button size="sm" variant="outline">Apply</Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'inventory' && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold">Risk Alerts</h3>
                    <p className="text-sm text-muted-foreground">Inventory monitoring</p>
                  </div>
                  <Badge variant="destructive" className="animate-pulse">3 Alerts</Badge>
                </div>
                <div className="space-y-3">
                  {[
                    { product: 'Smart Watch', level: 8, max: 20, status: 'critical', message: 'Critical stock level' },
                    { product: 'Jeans', level: 3, max: 50, status: 'warning', message: 'Low stock warning' },
                    { product: 'Tea Set', level: 0, max: 15, status: 'out', message: 'Out of stock' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.product}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-4 rounded-xl border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{item.product}</span>
                        <Badge variant={
                          item.status === 'critical' ? 'destructive' :
                          item.status === 'warning' ? 'default' : 'secondary'
                        }>
                          {item.message}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={(item.level / item.max) * 100} className="flex-1" />
                        <span className="text-xs text-muted-foreground w-12 text-right">{item.level}/{item.max}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-2 p-4 border-t bg-muted/30">
          {[
            { id: 'overview', icon: BarChart3, label: 'Overview' },
            { id: 'analytics', icon: LineChart, label: 'Analytics' },
            { id: 'ai', icon: Brain, label: 'AI' },
            { id: 'inventory', icon: AlertTriangle, label: 'Alerts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIsPlaying(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Floating Elements */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-6 -right-6 bg-green-500 text-white p-3 rounded-xl shadow-lg"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-medium">+24%</span>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -bottom-4 -left-4 bg-background p-3 rounded-xl shadow-lg border"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium">AI Active</span>
        </div>
      </motion.div>
    </div>
  )
}

// Feature Card with Hover Effects
function FeatureCard({ feature, index }: { feature: any; index: number }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative"
    >
      <div className="relative overflow-hidden rounded-2xl border bg-background p-8 h-full transition-all duration-300 hover:shadow-xl hover:border-primary/20">
        {/* Animated Background Gradient */}
        <motion.div
          animate={{
            opacity: isHovered ? 1 : 0,
            scale: isHovered ? 1.5 : 1,
          }}
          transition={{ duration: 0.4 }}
          className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0`}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <motion.div
            animate={{ rotate: isHovered ? 5 : 0, scale: isHovered ? 1.1 : 1 }}
            transition={{ duration: 0.3 }}
            className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6`}
          >
            <feature.icon className="h-7 w-7 text-white" />
          </motion.div>

          {/* Badge */}
          {feature.badge && (
            <Badge className={`mb-3 ${feature.badgeClass}`}>
              {feature.badge}
            </Badge>
          )}

          <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
            {feature.name}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {feature.description}
          </p>

          {/* Feature Points */}
          <ul className="mt-4 space-y-2">
            {feature.points?.map((point: string, i: number) => (
              <motion.li
                key={point}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                {point}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Hover Arrow */}
        <motion.div
          animate={{ x: isHovered ? 0 : -10, opacity: isHovered ? 1 : 0 }}
          className="absolute bottom-6 right-6"
        >
          <ArrowRight className="w-5 h-5 text-primary" />
        </motion.div>
      </div>
    </motion.div>
  )
}

// Stats Counter Animation
function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          const duration = 2000
          const steps = 60
          const increment = value / steps
          let current = 0
          const timer = setInterval(() => {
            current += increment
            if (current >= value) {
              setCount(value)
              clearInterval(timer)
            } else {
              setCount(Math.floor(current))
            }
          }, duration / steps)
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, hasAnimated])

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}

// Main Page Component
export default function LandingPage() {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({ container: containerRef })
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 }
  const scaleSpring = useSpring(scale, springConfig)

  const features = [
    {
      name: 'AI-Powered Insights',
      description: 'Natural language queries and intelligent recommendations to optimize your inventory and sales.',
      icon: Brain,
      gradient: 'from-purple-500 to-blue-600',
      badge: 'New',
      badgeClass: 'bg-purple-500/10 text-purple-600',
      points: ['Ask questions in plain English', 'Get reorder recommendations', 'Identify bundling opportunities'],
    },
    {
      name: 'Multi-Store Management',
      description: 'Manage unlimited stores and locations from a single dashboard with role-based access control.',
      icon: Building2,
      gradient: 'from-blue-500 to-cyan-600',
      points: ['Unlimited stores & locations', 'Role-based permissions', 'Centralized reporting'],
    },
    {
      name: 'Smart Analytics',
      description: 'Real-time dashboards with revenue trends, product performance, and customer insights.',
      icon: LineChart,
      gradient: 'from-green-500 to-emerald-600',
      points: ['Real-time revenue tracking', 'Category performance', 'Hourly sales patterns'],
    },
    {
      name: 'Risk Scoring',
      description: 'AI-driven risk detection for stockouts, dead inventory, and low-performing products.',
      icon: AlertTriangle,
      gradient: 'from-orange-500 to-red-600',
      badge: 'AI',
      badgeClass: 'bg-orange-500/10 text-orange-600',
      points: ['Stockout predictions', 'Dead inventory alerts', 'Low performance detection'],
    },
    {
      name: 'Smart Inventory',
      description: 'Track stock levels across all locations with automated alerts and reorder points.',
      icon: Package,
      gradient: 'from-teal-500 to-cyan-600',
      points: ['Multi-location tracking', 'Automated alerts', 'Barcode support'],
    },
    {
      name: 'Bulk Import',
      description: 'Import products, inventory, and sales data via CSV with intelligent column mapping.',
      icon: FileSpreadsheet,
      gradient: 'from-indigo-500 to-purple-600',
      points: ['CSV import wizard', 'Smart column mapping', 'Duplicate detection'],
    },
  ]

  const stats = [
    { value: 10000, suffix: '+', label: 'Stores Managed' },
    { value: 50, suffix: 'M+', label: 'Transactions Processed' },
    { value: 99.9, suffix: '%', label: 'Uptime SLA' },
    { value: 24, suffix: '/7', label: 'AI Assistant' },
  ]

  const testimonials = [
    {
      quote: "StorePilot's AI recommendations increased our revenue by 23% in the first month. The stockout alerts alone saved us thousands.",
      author: "Sarah Chen",
      role: "Owner, QuickMart Chain",
      stores: "12 locations",
    },
    {
      quote: "Finally, a convenience store POS that understands multi-location management. The analytics are incredible.",
      author: "Marcus Johnson",
      role: "Operations Director",
      stores: "8 locations",
    },
    {
      quote: "The AI assistant is like having a data analyst on staff 24/7. It's transformed how we make inventory decisions.",
      author: "Elena Rodriguez",
      role: "Store Manager",
      stores: "3 locations",
    },
  ]

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen overflow-x-hidden">
      {/* Navigation */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Package className="h-6 w-6 text-primary" />
            </motion.div>
            <span className="font-bold text-xl">StorePilot</span>
            <Badge variant="secondary" className="ml-2 hidden sm:inline-flex">Beta</Badge>
          </motion.div>

          <nav className="hidden md:flex items-center gap-1">
            {['Features', 'AI Tools', 'Pricing', 'Demo'].map((item) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="px-4 py-2 text-sm font-medium hover:text-primary transition-colors rounded-lg hover:bg-muted"
                whileHover={{ y: -2 }}
              >
                {item}
              </motion.a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="group">
                Get Started
                <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-primary/20 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-purple-500/20 rounded-full blur-[120px]"
          />
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              style={{ opacity, scale: scaleSpring }}
              className="space-y-8"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Badge className="mb-4 px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Now with AI-Powered Insights
                </Badge>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                  Manage Your Stores{' '}
                  <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
                    with AI
                  </span>
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-muted-foreground max-w-xl leading-relaxed"
              >
                The all-in-one platform for convenience store owners. Track inventory,
                analyze sales, and get AI-powered recommendations to grow your business.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link href="/signup">
                  <Button size="lg" className="min-w-[200px] group text-lg">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button size="lg" variant="outline" className="min-w-[200px] text-lg group">
                    <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    Watch Demo
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-6 text-sm text-muted-foreground"
              >
                {[
                  { icon: CheckCircle2, text: 'No credit card' },
                  { icon: Clock, text: '14-day trial' },
                  { icon: Shield, text: 'SOC 2 compliant' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-primary" />
                    {item.text}
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Content - Interactive Dashboard */}
            <div className="relative lg:pl-8">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <Badge className="mb-4" variant="outline">Features</Badge>
            <h2 className="text-4xl font-bold mb-4">
              Everything you need to{' '}
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                scale your business
              </span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Powerful tools designed specifically for convenience store operations.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.name} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* AI Showcase Section */}
      <section id="ai-tools" className="py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <Badge className="bg-purple-500/10 text-purple-600">
                <Brain className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
              <h2 className="text-4xl font-bold">
                Ask Your Store{' '}
                <span className="text-purple-500">Anything</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Get instant answers about your inventory, sales, and performance using natural language.
                No more digging through spreadsheets.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: MessageSquare, text: 'Ask "What are my top selling items?"' },
                  { icon: AlertTriangle, text: 'Get alerts for low stock automatically' },
                  { icon: TrendingUp, text: 'Receive reorder recommendations' },
                  { icon: Zap, text: 'Discover bundling opportunities' },
                ].map((item, i) => (
                  <motion.li
                    key={item.text}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-purple-500" />
                    </div>
                    {item.text}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-background rounded-2xl border shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <Brain className="w-6 h-6 text-purple-500" />
                  <span className="font-semibold">Ask Your Store</span>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">You</div>
                    <div className="flex-1 bg-muted rounded-2xl rounded-tl-sm px-4 py-2 text-sm">
                      What products should I reorder this week?
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 bg-purple-500/5 border border-purple-500/20 rounded-2xl rounded-tl-sm px-4 py-3 text-sm space-y-2">
                      <p>Based on your sales velocity and current stock levels, here are my recommendations:</p>
                      <ul className="space-y-2 ml-4">
                        <li className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span><strong>Smart Watch</strong> - Only 8 units left (reorder: 50)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          <span><strong>Coffee Beans</strong> - Running low (reorder: 30)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {['Top products', 'Low stock', 'Sales trend', 'Recommendations'].map((suggestion) => (
                      <button key={suggestion} className="px-3 py-1 text-xs rounded-full bg-muted hover:bg-muted/80 transition-colors">
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Loved by store owners</h2>
            <p className="text-xl text-muted-foreground">Join thousands of successful convenience stores</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-muted/30 border"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {testimonial.author[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-muted-foreground">Start free, scale as you grow</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '$0',
                description: 'Perfect for single stores',
                features: ['1 store', '1 location', '100 products', 'Basic analytics', 'Email support'],
                cta: 'Get Started',
                variant: 'outline' as const,
              },
              {
                name: 'Professional',
                price: '$49',
                description: 'For growing businesses',
                features: ['Up to 5 stores', 'Unlimited locations', 'Unlimited products', 'AI insights', 'Priority support', 'Risk scoring'],
                cta: 'Start Free Trial',
                variant: 'default' as const,
                popular: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                description: 'For large chains',
                features: ['Unlimited stores', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'Onboarding assistance', 'Custom AI training'],
                cta: 'Contact Sales',
                variant: 'outline' as const,
              },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative p-8 rounded-2xl border ${plan.popular ? 'bg-background border-primary shadow-lg' : 'bg-muted/30'}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold mb-2">{plan.price}</div>
                  {plan.price !== 'Custom' && <span className="text-muted-foreground">/month</span>}
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.variant}>
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-purple-600 px-8 py-16 text-center"
          >
            {/* Animated Background */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-20 -right-20 w-40 h-40 border border-white/10 rounded-full"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              className="absolute -bottom-20 -left-20 w-60 h-60 border border-white/10 rounded-full"
            />

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to transform your store management?
              </h2>
              <p className="text-lg text-white/80 mb-8">
                Join thousands of convenience store owners who trust StorePilot.
                Start your free 14-day trial today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" variant="secondary" className="min-w-[200px]">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-w-[200px] border-white/30 text-white hover:bg-white/10"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="font-bold">StorePilot</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The modern platform for convenience store management.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
                <li><a href="#" className="hover:text-foreground">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} StorePilot. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
