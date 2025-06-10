
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: ReactNode;
}

const unprotectedPaths = ['/login', '/signup'];

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticating) {
      const pathIsProtected = !unprotectedPaths.includes(pathname);
      
      if (pathIsProtected && !user) {
        router.push('/login');
      } else if (!pathIsProtected && user) {
        // If user is logged in and tries to access login/signup, redirect to home
        router.push('/');
      }
    }
  }, [isAuthenticating, user, router, pathname]);

  if (isAuthenticating) {
    // You can render a global loading spinner here if desired
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">Loading QuickBill...</p>
      </div>
    );
  }
  
  // Allow access to login/signup pages regardless of auth state until redirect kicks in
  if (unprotectedPaths.includes(pathname)) {
    return <>{children}</>;
  }

  // If on a protected page and no user, children won't be rendered due to redirect.
  // If user exists or page is unprotected, render children.
  return <>{user ? children : null}</>;
}
