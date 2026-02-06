'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, Compass, PlusCircle, LogOut, LayoutDashboard } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebase/client'
import { Button } from '@/components/atoms/button'
import { ThemeToggle, UserMenu } from '@/components/molecules'
import { Avatar, AvatarFallback } from '@/components/atoms/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/atoms/sheet'
import { cn } from '@/lib/utils'

import { useAuth } from '@/components/providers/AuthProvider'

// ... imports

interface NavbarProps {
  user?: {
    name: string
    email: string
    id: string
  } | null
}

const navLinks = [
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/create', label: 'New Interview', icon: PlusCircle },
]

export function Navbar({ user: initialUser }: NavbarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)
  const { user: authUser, loading: authLoading } = useAuth()

  // Use client-side auth state if available (and not loading), otherwise fall back to server-side initialUser
  // This ensures that updates (like logout in another tab) are reflected immediately
  const user = authLoading
    ? initialUser
    : authUser
      ? {
          name: authUser.displayName || 'User',
          email: authUser.email || '',
          id: authUser.uid,
        }
      : null

  const handleSignOut = async () => {
    await signOut(auth)
    // Clear session cookie
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/sign-in'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container-app flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className="group flex items-center gap-3">
          <Image
            src="/icon.png"
            alt="IntervoxAI"
            width={40}
            height={40}
            className="transition-transform group-hover:scale-105"
          />
          <Image
            src="/wordmark.png"
            alt="IntervoxAI"
            width={130}
            height={32}
            className="hidden sm:block dark:brightness-0 dark:invert"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {user &&
            navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-2'
                  )}
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              )
            })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <>
              {/* User Menu - Desktop */}
              <div className="hidden md:block">
                <UserMenu user={user} />
              </div>

              {/* Mobile Menu */}
              <div className="md:hidden">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-10">
                      <Menu className="size-5" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72">
                    <SheetHeader className="pb-6">
                      <SheetTitle className="flex items-center gap-3">
                        <Image src="/icon.png" alt="IntervoxAI" width={32} height={32} />
                        <Image
                          src="/wordmark.png"
                          alt="IntervoxAI"
                          width={100}
                          height={24}
                          className="dark:brightness-0 dark:invert"
                        />
                      </SheetTitle>
                    </SheetHeader>

                    <div className="flex flex-col gap-6">
                      {/* User info */}
                      <div className="bg-surface-2 flex items-center gap-3 rounded-xl p-3">
                        <Avatar size="md">
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{user.name}</p>
                          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                        </div>
                      </div>

                      {/* Nav links */}
                      <nav className="flex flex-col gap-1">
                        <Link
                          href="/dashboard"
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors',
                            pathname === '/dashboard'
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-surface-2'
                          )}
                        >
                          <LayoutDashboard className="size-5" />
                          Dashboard
                        </Link>
                        {navLinks.map((link) => {
                          const Icon = link.icon
                          const isActive = pathname === link.href
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors',
                                isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-2'
                              )}
                            >
                              <Icon className="size-5" />
                              {link.label}
                            </Link>
                          )
                        })}
                      </nav>

                      {/* Sign out */}
                      <div className="border-border mt-auto border-t pt-6">
                        <Button
                          variant="ghost"
                          className="text-error-500 hover:text-error-500 hover:bg-error-100 dark:hover:bg-error-500/10 w-full justify-start"
                          onClick={handleSignOut}
                        >
                          <LogOut className="mr-3 size-5" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          ) : (
            <>
              {/* Auth buttons for non-logged in users */}
              <Link href="/sign-in" className="hidden sm:block">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
