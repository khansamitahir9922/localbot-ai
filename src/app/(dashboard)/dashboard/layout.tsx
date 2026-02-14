"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  BookOpen,
  CreditCard,
  Home,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ────────────────────────── NAV ITEMS ────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <Home className="size-5" /> },
  {
    label: "My Chatbots",
    href: "/dashboard/chatbots",
    icon: <MessageSquare className="size-5" />,
  },
  {
    label: "Knowledge Base",
    href: "/dashboard/knowledge",
    icon: <BookOpen className="size-5" />,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: <BarChart3 className="size-5" />,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="size-5" />,
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    icon: <CreditCard className="size-5" />,
  },
];

/* ────────────────────────── USER DATA ────────────────────────── */

interface UserInfo {
  email: string;
  name: string;
  initials: string;
}

function getInitials(name: string, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD LAYOUT
   ═══════════════════════════════════════════════════════════════════ */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── Fetch user on mount ── */
  useEffect(() => {
    async function fetchUser(): Promise<void> {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        window.location.href = "/login";
        return;
      }

      const email = authUser.email ?? "";
      const name =
        authUser.user_metadata?.full_name ??
        authUser.user_metadata?.name ??
        "";

      setUser({
        email,
        name,
        initials: getInitials(name, email),
      });
    }
    fetchUser();
  }, []);

  /* ── Sign out ── */
  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  /* ── Loading state while fetching user ── */
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ════════════ DESKTOP SIDEBAR ════════════ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 px-6">
          <Bot className="size-7 text-[#2563EB]" />
          <span className="text-lg font-bold tracking-tight text-[#1E3A5F]">
            LocalBot AI
          </span>
        </div>

        <Separator />

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#2563EB]/10 text-[#2563EB]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[#1E3A5F]"
                )}
              >
                <span
                  className={cn(
                    isActive ? "text-[#2563EB]" : "text-slate-400"
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom user section */}
        <div className="border-t border-slate-200 px-3 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-100"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-[#2563EB] text-xs font-semibold text-white">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                  <p className="truncate text-sm font-medium text-[#1E3A5F]">
                    {user.name || user.email}
                  </p>
                  {user.name && (
                    <p className="truncate text-xs text-slate-400">
                      {user.email}
                    </p>
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{user.name || user.email}</p>
                {user.name && (
                  <p className="text-xs text-slate-500">{user.email}</p>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing">
                  <CreditCard className="mr-2 size-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="text-red-600 focus:text-red-600"
              >
                {isSigningOut ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 size-4" />
                )}
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ════════════ MAIN AREA ════════════ */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* ──── TOP BAR ──── */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="flex h-16 flex-row items-center gap-2.5 px-6">
                <Bot className="size-7 text-[#2563EB]" />
                <SheetTitle className="text-lg font-bold tracking-tight text-[#1E3A5F]">
                  LocalBot AI
                </SheetTitle>
              </SheetHeader>

              <Separator />

              <nav className="flex flex-col gap-1 px-3 py-4">
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-[#2563EB]/10 text-[#2563EB]"
                          : "text-slate-600 hover:bg-slate-100 hover:text-[#1E3A5F]"
                      )}
                    >
                      <span
                        className={cn(
                          isActive ? "text-[#2563EB]" : "text-slate-400"
                        )}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <Separator />

              {/* Mobile sign-out */}
              <div className="px-3 py-3">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  {isSigningOut ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <LogOut className="size-5" />
                  )}
                  Sign Out
                </button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Page title area (left of topbar) */}
          <div className="hidden lg:block">
            <h1 className="text-lg font-semibold text-[#1E3A5F]">
              {NAV_ITEMS.find(
                (item) =>
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href))
              )?.label ?? "Dashboard"}
            </h1>
          </div>

          {/* Right side of topbar */}
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">
              {user.email}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full ring-2 ring-transparent transition-all hover:ring-[#2563EB]/20"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-[#2563EB] text-xs font-semibold text-white">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">
                    {user.name || user.email}
                  </p>
                  {user.name && (
                    <p className="text-xs text-slate-500">{user.email}</p>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/billing">
                    <CreditCard className="mr-2 size-4" />
                    Billing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="text-red-600 focus:text-red-600"
                >
                  {isSigningOut ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 size-4" />
                  )}
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ──── CONTENT ──── */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
