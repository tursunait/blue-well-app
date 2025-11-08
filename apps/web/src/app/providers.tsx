"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";

// Auto-sign-in component for dev mode
function AutoSignIn({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  useEffect(() => {
    // In dev mode, automatically sign in if not already signed in
    if (skipAuth && status === "unauthenticated") {
      signIn("credentials", { redirect: false }).catch(() => {
        // Ignore errors - might already be signing in
      });
    }
  }, [status, skipAuth]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <AutoSignIn>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AutoSignIn>
    </SessionProvider>
  );
}

