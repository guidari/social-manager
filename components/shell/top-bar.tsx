"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/navigation/nav-items";

export interface TopBarUser {
  name: string;
  email: string;
}

interface TopBarProps {
  user: TopBarUser;
}

function screenTitleFor(pathname: string) {
  const match = NAV_ITEMS.find((item) =>
    item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href),
  );
  return match?.label ?? "Dashboard";
}

export function TopBar({ user }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex h-[68px] shrink-0 items-center justify-between border-b border-border bg-card px-6 lg:px-8">
      <h1 className="text-lg font-bold tracking-tight">{screenTitleFor(pathname)}</h1>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="User menu"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-indigo-400 text-xs font-bold text-primary-foreground"
        >
          {getInitials(user.name)}
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-border bg-card p-1 shadow-lg">
              <div className="truncate px-2 py-1.5 text-sm font-medium">{user.name}</div>
              <div className="truncate px-2 pb-1.5 text-xs text-muted-foreground">{user.email}</div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground/80 hover:bg-accent"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
