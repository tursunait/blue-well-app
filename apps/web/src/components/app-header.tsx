"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

interface AppHeaderProps {
  title?: string;
  showLogo?: boolean;
  logoSize?: "small" | "medium" | "large";
  className?: string;
}

export function AppHeader({ 
  title, 
  showLogo = true, 
  logoSize = "medium",
  className = "" 
}: AppHeaderProps) {
  const pathname = usePathname();
  
  // Don't show header on welcome/onboarding pages
  if (pathname === "/welcome" || pathname === "/onboarding" || pathname === "/") {
    return null;
  }

  const logoDimensions = {
    small: { width: 32, height: 32 },
    medium: { width: 40, height: 40 },
    large: { width: 48, height: 48 },
  };

  const { width, height } = logoDimensions[logoSize];

  return (
    <header className={`pt-8 pb-4 ${className}`}>
      <div className="flex items-center justify-center gap-3">
        {showLogo && (
          <Image
            src="/img/logo_icon.png"
            alt="BlueWell"
            width={width}
            height={height}
            className="object-contain"
            priority
          />
        )}
        {title && (
          <h1 className="text-3xl font-semibold text-neutral-dark">{title}</h1>
        )}
      </div>
    </header>
  );
}

