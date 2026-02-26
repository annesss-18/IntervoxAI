"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Compass,
  PlusCircle,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/client";
import { Button } from "@/components/atoms/button";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";
import { UserMenu } from "@/components/molecules/UserMenu";
import {
  BrandLogo,
  BrandIcon,
  BrandWordmark,
} from "@/components/molecules/BrandLogo";
import { Avatar, AvatarFallback } from "@/components/atoms/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/atoms/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";

interface NavbarProps {
  user?: { name: string; email: string; id: string } | null;
}

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/create", label: "Create", icon: PlusCircle },
];

export function Navbar({ user: initialUser }: NavbarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { user: authUser, loading: authLoading } = useAuth();

  React.useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const user = authLoading
    ? initialUser
    : authUser
      ? {
          name: authUser.displayName || "User",
          email: authUser.email || "",
          id: authUser.uid,
        }
      : null;

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
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "bg-background/85 backdrop-blur-xl border-b border-border/60 shadow-[var(--shadow-sm)]"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <Link
          href={user ? "/dashboard" : "/"}
          className="group flex shrink-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="IntervoxAI home"
        >
          <span className="transition-transform duration-200 group-hover:scale-105">
            <BrandIcon size={28} priority />
          </span>

          <span className="hidden transition-opacity duration-200 group-hover:opacity-70 sm:block">
            <BrandWordmark height={20} />
          </span>
        </Link>

        {user && (
          <nav className="hidden items-center gap-0.5 md:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-2",
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded-full bg-brand-gradient opacity-10"
                      aria-hidden
                    />
                  )}
                  <Icon className={cn("size-4", isActive && "text-primary")} />
                  <span
                    className={cn(
                      isActive && "text-gradient-brand font-semibold",
                    )}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <>
              <div className="hidden md:block">
                <UserMenu user={user} />
              </div>

              <div className="md:hidden">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-9">
                      <Menu className="size-5" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="flex w-80 flex-col">
                    <SheetHeader className="pb-4">
                      <SheetTitle className="text-left">
                        <BrandLogo size="sm" />
                      </SheetTitle>
                    </SheetHeader>

                    <div className="flex flex-1 flex-col gap-5">
                      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/60 p-3">
                        <Avatar size="sm">
                          <AvatarFallback>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <nav className="flex flex-col gap-1">
                        {navLinks.map((link) => {
                          const Icon = link.icon;
                          const isActive =
                            pathname === link.href ||
                            pathname.startsWith(`${link.href}/`);
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                  ? "text-foreground"
                                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                              )}
                            >
                              {isActive && (
                                <span className="absolute inset-0 rounded-xl bg-brand-gradient opacity-10" />
                              )}
                              <Icon
                                className={cn(
                                  "relative size-4",
                                  isActive && "text-primary",
                                )}
                              />
                              <span
                                className={cn(
                                  "relative",
                                  isActive &&
                                    "text-gradient-brand font-semibold",
                                )}
                              >
                                {link.label}
                              </span>
                            </Link>
                          );
                        })}
                      </nav>

                      <div className="mt-auto border-t border-border pt-4">
                        <Button
                          variant="ghost"
                          className="w-full justify-start rounded-xl text-error hover:bg-error/10 hover:text-error"
                          onClick={handleSignOut}
                        >
                          <LogOut className="size-4" />
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
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm" variant="gradient">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
