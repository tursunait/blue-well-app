"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

// BlueWell Navigation - Bottom nav, 3-4 items max, calm, minimal
const navItems = [
  { href: "/home", label: "home", icon: Home },
  { href: "/planner", label: "planner", icon: Calendar },
  { href: "/ai", label: "ai", icon: MessageCircle },
  { href: "/profile", label: "profile", icon: User },
];

export function Nav() {
  const pathname = usePathname();

  // Don't show nav on welcome/onboarding pages
  if (pathname === "/welcome" || pathname === "/onboarding" || pathname === "/") {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-border bg-neutral-white shadow-soft">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-4 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-colors min-w-[60px]",
                isActive
                  ? "text-bluewell-royal"
                  : "text-neutral-muted hover:text-neutral-text"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="text-xs font-medium lowercase">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
