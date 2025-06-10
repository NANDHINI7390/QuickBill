
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react'; // Assuming Loader2 is used for loading state

interface AuthGuardProps {
  children: ReactNode;
}

// Paths accessible to everyone, logged in or not (actions on these pages might still require auth)
const publicAccessPaths = ['/']; 
// Paths specifically for authentication (login, signup)
const authSpecificPaths = ['/login', '/signup'];

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticating) {
      const isPublicAccessPath = publicAccessPaths.includes(pathname);
      const isAuthSpecificPath = authSpecificPaths.includes(pathname);

      if (!isPublicAccessPath && !isAuthSpecificPath && !user) {
        // Trying to access a protected page (not public, not auth-specific) without being logged in
        router.push('/login');
      } else if (isAuthSpecificPath && user) {
        // Trying to access login/signup when already logged in
        router.push('/');
      }
      // If it's a publicAccessPath (like '/'), allow access regardless of auth state.
      // Actions on these pages will handle their own auth checks if needed.
    }
  }, [isAuthenticating, user, router, pathname]);

  // Show loading state while authentication is in progress, unless it's an auth-specific page
  // or a public access page which should render immediately.
  if (isAuthenticating && !authSpecificPaths.includes(pathname) && !publicAccessPaths.includes(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading QuickBill...</p>
      </div>
    );
  }
  
  // If on an auth-specific path (login/signup), render children.
  // If user is logged in, the useEffect above will redirect them.
  if (authSpecificPaths.includes(pathname)) {
    return <>{children}</>;
  }

  // If on a public access path, render children. Page-specific actions will handle auth.
  if (publicAccessPaths.includes(pathname)) {
    return <>{children}</>;
  }

  // For protected paths, render children only if user is authenticated.
  // If no user, the useEffect should have redirected to login.
  return <>{user ? children : null}</>;
}
