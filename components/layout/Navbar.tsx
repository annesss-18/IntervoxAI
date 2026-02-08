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

interface NavbarProps {
  user?: {
    name: string
    email: string
    id: string
  } | null
}

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/create', label: 'Create', icon: PlusCircle },
]

export function Navbar({ user: initialUser }: NavbarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)
  const { user: authUser, loading: authLoading } = useAuth()

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
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container-app flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className="group flex items-center gap-2.5">
          <div className="rounded-xl border border-border bg-card p-1.5 transition-colors group-hover:border-primary/30">
            <Image
              src="/icon.png"
              alt="IntervoxAI"
              width={28}
              height={28}
              className="transition-transform duration-200 group-hover:scale-105"
            />
          </div>
          <Image
            src="/wordmark.png"
            alt="IntervoxAI"
            width={110}
            height={26}
            className="hidden dark:brightness-0 dark:invert sm:block"
          />
        </Link>

        {/* Desktop Navigation */}
        {user && (
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <>
              <div className="hidden md:block">
                <UserMenu user={user} />
              </div>

              {/* Mobile Menu */}
              <div className="md:hidden">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-9">
                      <Menu className="size-5" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 border-border bg-background">
                    <SheetHeader className="pb-6">
                      <SheetTitle className="flex items-center gap-2.5 text-left">
                        <Image src="/icon.png" alt="IntervoxAI" width={24} height={24} />
                        <span className="font-semibold">IntervoxAI</span>
                      </SheetTitle>
                    </SheetHeader>

                    <div className="flex flex-col gap-6">
                      {/* User Info */}
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
                        <Avatar size="sm">
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>

                      {/* Navigation Links */}
                      <nav className="flex flex-col gap-1">
                        {navLinks.map((link) => {
                          const Icon = link.icon
                          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <Icon className="size-4" />
                              {link.label}
                            </Link>
                          )
                        })}
                      </nav>

                      {/* Sign Out */}
                      <div className="mt-auto border-t border-border pt-4">
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={handleSignOut}
                        >
                          <LogOut className="mr-2 size-4" />
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
              <Link href="/sign-in" className="hidden sm:block">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
