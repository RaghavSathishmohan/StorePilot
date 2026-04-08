'use client'

import { ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { signOut } from '@/app/actions/auth'
import { useStore } from '@/lib/store-context'
import { sampleStore } from '@/lib/sample-store-data'
import {
  BarChart3,
  Building2,
  ChevronDown,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Tag,
  Upload,
  Users,
  Warehouse,
} from 'lucide-react'

interface Store {
  id: string
  name: string
  slug: string
  role?: string
}

interface DashboardShellProps {
  children: ReactNode
  user: User
  stores: Store[]
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/dashboard/products', icon: Tag },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse },
  { name: 'Sales', href: '/dashboard/sales', icon: ShoppingCart },
  { name: 'Stores', href: '/dashboard/stores', icon: Store },
  { name: 'Locations', href: '/dashboard/locations', icon: MapPin },
  { name: 'Imports', href: '/dashboard/imports', icon: Upload },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardShell({ children, user, stores }: DashboardShellProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { selectedStore, isSampleStore, selectStore } = useStore()

  // Use selected store from context, or fall back to first real store
  const currentStore = selectedStore || (stores.length > 0 ? stores[0] : null)

  const userInitials = user.email
    ?.split('@')[0]
    ?.slice(0, 2)
    ?.toUpperCase() || 'U'

  const handleStoreChange = (value: string | null) => {
    if (value) {
      selectStore(value, stores)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden"
      >
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <MobileSidebar
              navigation={navigation}
              pathname={pathname}
              stores={stores}
              currentStore={currentStore}
              user={user}
              onClose={() => setIsOpen(false)}
              onStoreChange={handleStoreChange}
              isSampleStore={isSampleStore}
            />
          </SheetContent>
        </Sheet>

        <motion.div
          className="flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Package className="h-5 w-5 text-primary" />
          </motion.div>
          <span className="font-bold">StorePilot</span>
        </motion.div>

        <div className="flex-1" />

        <UserDropdown user={user} userInitials={userInitials} />
      </motion.header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <motion.aside
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="hidden lg:flex w-64 flex-col fixed inset-y-0 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <div className="flex h-14 items-center gap-2 px-4 border-b">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Package className="h-5 w-5 text-primary" />
            </motion.div>
            <span className="font-bold">StorePilot</span>
          </div>

          <div className="p-4">
            <Select value={isSampleStore ? 'sample-store' : (currentStore?.id || '')} onValueChange={handleStoreChange}>
              <SelectTrigger className="hover:border-primary/50 transition-colors">
                <SelectValue>
                  {isSampleStore ? (
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">★</span>
                      Sample Store
                    </div>
                  ) : currentStore ? (
                    currentStore.name
                  ) : (
                    'Select a store'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sample-store">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500">★</span>
                    Sample Store
                  </div>
                </SelectItem>
                {stores.length > 0 && <SelectSeparator />}
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navigation.map((item, index) => (
              <NavLink key={item.name} item={item} pathname={pathname} index={index} />
            ))}
          </nav>

          <div className="border-t p-4">
            <UserDropdown user={user} userInitials={userInitials} />
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="hidden lg:flex h-14 items-center border-b px-6 bg-background/95 backdrop-blur">
            <motion.h1
              key={pathname}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-lg font-semibold"
            >
              {navigation.find((item) =>
                pathname === item.href || pathname.startsWith(item.href + '/')
              )?.name || 'Dashboard'}
            </motion.h1>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="p-4 lg:p-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function NavLink({ item, pathname, index }: { item: typeof navigation[0]; pathname: string; index: number }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <Link href={item.href}>
        <motion.div
          className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors overflow-hidden ${
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          {/* Active indicator */}
          {isActive && (
            <motion.div
              layoutId="activeNav"
              className="absolute left-0 w-0.5 h-6 bg-primary rounded-r-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}

          <motion.div
            animate={isActive ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <item.icon className="h-4 w-4" />
          </motion.div>
          {item.name}
        </motion.div>
      </Link>
    </motion.div>
  )
}

function UserDropdown({ user, userInitials }: { user: User; userInitials: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-purple-500/20">{userInitials}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.user_metadata?.full_name || user.email}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.location.href = '/dashboard/settings'} className="cursor-pointer">
          <motion.div className="flex items-center w-full" whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </motion.div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-red-600 cursor-pointer"
        >
          <motion.div className="flex items-center w-full" whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </motion.div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface MobileSidebarProps {
  navigation: typeof navigation
  pathname: string
  stores: Store[]
  currentStore: Store | null
  user: User
  onClose: () => void
  onStoreChange: (value: string | null) => void
  isSampleStore: boolean
}

function MobileSidebar({ navigation, pathname, stores, currentStore, user, onClose, onStoreChange, isSampleStore }: MobileSidebarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
    >
      <div className="flex h-14 items-center gap-2 px-4 border-b">
        <Package className="h-5 w-5 text-primary" />
        <span className="font-bold">StorePilot</span>
      </div>

      <div className="p-4">
        <Select value={isSampleStore ? 'sample-store' : (currentStore?.id || '')} onValueChange={onStoreChange}>
          <SelectTrigger>
            <SelectValue>
              {isSampleStore ? (
                <div className="flex items-center gap-2">
                  <span className="text-amber-500">★</span>
                  Sample Store
                </div>
              ) : currentStore ? (
                currentStore.name
              ) : (
                'Select a store'
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sample-store">
              <span className="text-amber-500 mr-2">★</span>
              Sample Store
            </SelectItem>
            {stores.length > 0 && <SelectSeparator />}
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          </motion.div>
        ))}
      </nav>
    </motion.div>
  )
}
