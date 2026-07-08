import {
  AtSign,
  BarChart3,
  Calendar,
  LayoutDashboard,
  Library,
  Settings,
  SquarePlus,
  Target,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/create", label: "Create Post", icon: SquarePlus },
  { href: "/app/calendar", label: "Calendar", icon: Calendar },
  { href: "/app/library", label: "Content Library", icon: Library },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/recommendations", label: "Recommendations", icon: Target, badge: "AI" },
  { href: "/app/accounts", label: "Accounts", icon: AtSign },
  { href: "/app/settings", label: "Settings", icon: Settings },
];
