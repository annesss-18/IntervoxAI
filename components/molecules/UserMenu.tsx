"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/client";
import { LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";

interface UserMenuProps {
  user: { name: string; email: string; id: string };
  avatarUrl?: string;
}

export function UserMenu({ user, avatarUrl }: UserMenuProps) {
  const handleSignOut = async () => {
    await signOut(auth);
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/sign-in";
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative size-10 rounded-full p-0 hover:ring-2 hover:ring-primary/30 transition-all duration-200"
        >
          <Avatar size="md">
            <AvatarImage src={avatarUrl ?? ""} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <div className="px-3 py-3 flex items-center gap-3">
          <Avatar size="sm">
            <AvatarImage src={avatarUrl ?? ""} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="size-4 text-muted-foreground" />
            Dashboard
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-error focus:text-error focus:bg-error/8"
        >
          <LogOut className="size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
