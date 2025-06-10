
'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { FileText, UserCircle, LogOut, ListChecks, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Header: FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Logout Failed', description: error.message });
    }
  };

  return (
    <header className="py-4 sm:py-6 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-0 flex items-center justify-between">
        <Link href="/" className="flex items-center group">
          <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-primary group-hover:text-primary/90 transition-colors" />
          <h1 className="ml-2 sm:ml-3 text-2xl sm:text-4xl font-headline font-bold text-primary group-hover:text-primary/90 transition-colors">
            QuickBill
          </h1>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : user ? (
            <>
              <Button variant="ghost" asChild className="text-sm sm:text-base">
                <Link href="/my-invoices">
                  <ListChecks className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> My Invoices
                </Link>
              </Button>
              <Button variant="outline" onClick={handleLogout} className="text-sm sm:text-base">
                <LogOut className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="text-sm sm:text-base">
                <Link href="/login">
                  <UserCircle className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Login
                </Link>
              </Button>
              <Button asChild className="text-sm sm:text-base">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
