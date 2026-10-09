"use client";

import {
  ChevronsUpDownIcon,
  LogOutIcon,
  MenuIcon,
  MonitorIcon,
  MoonIcon,
  PlusIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { useActiveSource } from "@/components/active-source";
import { ConnectionBadge, MockBanner } from "@/components/provenance";
import { useSession, useSignOut } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sourceKindLabel } from "@/lib/contracts/catalog";
import { cn } from "@/lib/utils";

import {
  isActive,
  navigation,
  workspaceFor,
  workspaceHome,
  workspaceLabel,
  type Workspace,
} from "./nav";
import { useTheme } from "./theme";

function Logo() {
  return (
    <Link
      href="/app/operations/overview"
      className="flex items-center gap-2 font-semibold tracking-tight"
    >
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-md bg-primary font-mono text-sm text-primary-foreground"
      >
        Δ
      </span>
      MechaDelta
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const workspace = workspaceFor(pathname);
  return (
    <nav
      aria-label={`${workspaceLabel[workspace]} navigation`}
      className="flex flex-1 flex-col gap-5"
    >
      {navigation[workspace].map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <p className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-surface-muted hover:text-foreground",
                  active &&
                    "bg-primary-soft font-medium text-primary hover:bg-primary-soft hover:text-primary",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="mt-auto border-t border-border pt-3">
        <Link
          href="/app/settings"
          onClick={onNavigate}
          aria-current={isActive(pathname, "/app/settings") ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-surface-muted hover:text-foreground",
            isActive(pathname, "/app/settings") && "bg-primary-soft font-medium text-primary",
          )}
        >
          <SettingsIcon className="size-4" aria-hidden="true" />
          Settings
        </Link>
      </div>
    </nav>
  );
}

function WorkspaceSwitcher() {
  const pathname = usePathname();
  const current = workspaceFor(pathname);
  return (
    <nav
      aria-label="Workspace"
      className="flex rounded-lg border border-border bg-surface-muted p-0.5 text-sm"
    >
      {(Object.keys(workspaceHome) as Workspace[]).map((workspace) => (
        <Link
          key={workspace}
          href={workspaceHome[workspace]}
          aria-current={current === workspace ? "page" : undefined}
          className={cn(
            "rounded-md px-2.5 py-1 whitespace-nowrap text-muted-foreground hover:text-foreground",
            current === workspace && "bg-surface font-medium text-foreground shadow-sm",
          )}
        >
          <span className="sm:hidden">
            {workspace === "operations" ? "Operations" : "Research"}
          </span>
          <span className="hidden sm:inline">{workspaceLabel[workspace]}</span>
        </Link>
      ))}
    </nav>
  );
}

function SourceSelector() {
  const { source, sources, isPending, select } = useActiveSource();
  if (isPending)
    return (
      <div className="h-9 w-44 animate-pulse rounded-md bg-surface-muted" aria-hidden="true" />
    );
  if (!source) {
    return (
      <Button variant="secondary" size="sm" asChild>
        <Link href="/app/operations/robots?register=1">
          <PlusIcon /> Add a source
        </Link>
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="max-w-64 justify-between gap-2"
          aria-label={`Active source: ${source.name}. Change source`}
        >
          <span className="truncate">{source.name}</span>
          <ConnectionBadge state={source.connectionState} className="hidden md:inline-flex" />
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Active robot or source</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={source.id} onValueChange={select}>
          {sources.map((s) => (
            <DropdownMenuRadioItem key={s.id} value={s.id} className="justify-between">
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground">{sourceKindLabel[s.kind]}</span>
              </span>
              <ConnectionBadge state={s.connectionState} />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/operations/robots">Manage robots and sources</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const session = useSession();
  const signOut = useSignOut();
  const [theme, setTheme] = useTheme();
  const name = session.user.displayName ?? session.user.email;
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Account menu for ${name}`}>
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {initials || <UserIcon />}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
          <DropdownMenuRadioItem value="light">
            <SunIcon aria-hidden="true" /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon aria-hidden="true" /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon aria-hidden="true" /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings">
            <SettingsIcon aria-hidden="true" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOutIcon aria-hidden="true" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const workspace = workspaceFor(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <MockBanner />
      <div className="flex flex-1">
        <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-surface px-3 py-4 lg:flex">
          <div className="px-2">
            <Logo />
          </div>
          <SidebarNav />
        </aside>

        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogContent side="left" aria-describedby={undefined} className="gap-6 px-3">
            <DialogTitle className="px-2">
              <Logo />
            </DialogTitle>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </DialogContent>
        </Dialog>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur sm:px-5">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </Button>
            <WorkspaceSwitcher />
            <div className="ml-auto flex items-center gap-2">
              <SourceSelector />
              <UserMenu />
            </div>
          </header>
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 outline-none sm:px-6"
          >
            <span className="sr-only" aria-live="polite">
              {workspaceLabel[workspace]}
            </span>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
