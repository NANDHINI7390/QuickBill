
'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileText, UserCircle, LogOut, ListChecks, Loader2, Sun, Moon, Settings, User, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const getInitials = (name?: string | null) => {
  if (!name) return '';
  const names = name.split(' ');
  if (names.length > 1) {
    return names[0][0] + names[names.length - 1][0];
  }
  return name.substring(0, 2);
};

interface HeaderProps {
  onBackToScenarioSelection?: () => void;
  currentScenarioLabel?: string;
}

const Header: FC<HeaderProps> = ({ onBackToScenarioSelection, currentScenarioLabel }) => {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
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

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="py-4 sm:py-6 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-0 flex items-center justify-between">
        <div className="flex items-center">
          {onBackToScenarioSelection && (
            <Button variant="ghost" size="icon" onClick={onBackToScenarioSelection} className="mr-2 sm:mr-4" aria-label="Back to scenario selection">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Link href="/" className="flex items-center group">
            <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-primary group-hover:text-primary/90 transition-colors" />
            <div className="ml-2 sm:ml-3">
              <h1 className="text-2xl sm:text-4xl font-headline font-bold text-primary group-hover:text-primary/90 transition-colors">
                QuickBill
              </h1>
              {currentScenarioLabel && <span className="text-xs text-muted-foreground sm:text-sm">{currentScenarioLabel}</span>}
            </div>
          </Link>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : user ? (
            <>
              <Button variant="ghost" asChild className="text-sm sm:text-base hidden sm:inline-flex">
                <Link href="/my-invoices">
                  <ListChecks className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> My Invoices
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                      <AvatarFallback>{getInitials(user.displayName || user.email)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="sm:hidden">
                     <Link href="/my-invoices">
                        <ListChecks className="mr-2 h-4 w-4" />
                        <span>My Invoices</span>
                      </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings (soon)</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
