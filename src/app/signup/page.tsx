
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, db, googleProvider } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { FileText, Eye, EyeOff, ChromeIcon } from 'lucide-react'; // Added Eye, EyeOff, ChromeIcon

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      toast({ variant: 'destructive', title: 'Signup Failed', description: "Passwords don't match." });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: userCredential.user.email,
        displayName: userCredential.user.email?.split('@')[0], // Default display name
        createdAt: serverTimestamp(),
        photoURL: userCredential.user.photoURL,
      });
      toast({ title: 'Signup Successful', description: 'Welcome to QuickBill!' });
      router.push('/');
    } catch (err: any) {
      setError(err.message);
      toast({ variant: 'destructive', title: 'Signup Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0],
          createdAt: serverTimestamp(),
          photoURL: user.photoURL,
        });
      }
      toast({ title: 'Sign Up Successful', description: `Welcome, ${user.displayName || user.email}!` });
      router.push('/');
    } catch (err: any) {
      setError(err.message);
      toast({ variant: 'destructive', title: 'Google Sign-Up Failed', description: err.message });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
       <div className="flex items-center mb-8">
        <FileText className="h-10 w-10 text-primary" />
        <h1 className="ml-3 text-4xl font-headline font-bold text-primary">
          QuickBill
        </h1>
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Create Account</CardTitle>
          <CardDescription>Join QuickBill today.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="text-base pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="text-base pr-10"
                />
                 <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full text-base py-3" disabled={loading || googleLoading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>
          <div className="my-6 flex items-center">
            <Separator className="flex-grow" />
            <span className="mx-4 text-xs text-muted-foreground">OR SIGN UP WITH</span>
            <Separator className="flex-grow" />
          </div>
          <Button variant="outline" className="w-full text-base py-3" onClick={handleGoogleSignIn} disabled={loading || googleLoading}>
            <ChromeIcon className="mr-2 h-5 w-5" /> 
            {googleLoading ? 'Signing up with Google...' : 'Sign Up with Google'}
          </Button>
        </CardContent>
         <CardFooter className="text-center text-sm">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
