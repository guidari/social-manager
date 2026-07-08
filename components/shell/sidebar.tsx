"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/navigation/nav-items";

const COLLAPSE_STORAGE_KEY = "postpilot:sidebar-collapsed";

export interface SidebarUser {
  name: string;
  email: string;
}

interface SidebarProps {
  user: SidebarUser;
}

function isActiveRoute(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  // Below the `lg` breakpoint the rail is always icon-only regardless of the
  // manual toggle; `collapsed` only forces that state at wider widths too.
  const labelVisibility = collapsed ? "hidden" : "hidden lg:inline";

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-150",
        collapsed ? "w-[76px]" : "w-[76px] lg:w-60",
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="h-7 w-7 shrink-0 rounded-md bg-primary" aria-hidden />
        <span className={cn("text-base font-bold tracking-tight", labelVisibility)}>PostPilot</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "mb-0.5 flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center" : "justify-start",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className={cn("truncate", labelVisibility)}>{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "ml-auto shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground",
                    labelVisibility,
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="mb-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden />
          )}
          <span className={labelVisibility}>Collapse</span>
        </button>

        <div className="flex items-center gap-2.5 rounded-md p-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-indigo-400 text-xs font-bold text-primary-foreground">
            {getInitials(user.name)}
          </div>
          <div className={cn("min-w-0", collapsed ? "hidden" : "hidden lg:block")}>
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
