'use client'

import * as React from 'react'
import Link from 'next/link'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebase/client'
import { LogOut, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu'

interface UserMenuProps {
  user: {
    name: string
    email: string
    id: string
  }
  /** Optional avatar URL */
  avatarUrl?: string
}

/**
 * UserMenu molecule - displays user avatar with dropdown menu.
 * Extracted from Navbar for reusability.
 */
export function UserMenu({ user, avatarUrl }: UserMenuProps) {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-10 rounded-xl border border-border bg-card p-0 hover:border-primary/30">
          <Avatar size="md">
            <AvatarImage src={avatarUrl ?? ''} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-muted-foreground truncate text-xs">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 size-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-error focus:text-error">
          <LogOut className="mr-2 size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserMenu
