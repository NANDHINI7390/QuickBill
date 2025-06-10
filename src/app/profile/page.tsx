
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit3, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const profileFormSchema = z.object({
  displayName: z.string().min(1, "Display name cannot be empty.").max(50, "Display name too long."),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface UserProfileData {
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  createdAt?: string; // Formatted date string
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        setIsLoadingProfile(true);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setProfileData({
              email: user.email,
              displayName: data.displayName || user.displayName,
              photoURL: data.photoURL || user.photoURL,
              createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), 'PPP') : 'N/A',
            });
            setValue('displayName', data.displayName || user.displayName || '');
          } else {
            // Fallback if Firestore doc doesn't exist (shouldn't happen with current signup flow)
             setProfileData({
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              createdAt: user.metadata.creationTime ? format(new Date(user.metadata.creationTime), 'PPP') : 'N/A',
            });
            setValue('displayName', user.displayName || '');
             toast({variant: 'destructive', title: 'Profile Incomplete', description: 'User profile data not found in database.'});
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not fetch your profile data." });
        } finally {
          setIsLoadingProfile(false);
        }
      }
    };

    if (!authLoading) {
      fetchUserProfile();
    }
  }, [user, authLoading, toast, setValue]);

  const getInitials = (name?: string | null) => {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const onSubmitDisplayName = async (data: ProfileFormValues) => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateFirebaseAuthProfile(auth.currentUser, { displayName: data.displayName });
      }
      // Update Firestore document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { displayName: data.displayName });

      setProfileData(prev => prev ? { ...prev, displayName: data.displayName } : null);
      setIsEditingDisplayName(false);
      toast({ title: "Profile Updated", description: "Your display name has been successfully updated." });
    } catch (error: any) {
      console.error("Error updating display name:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update display name." });
    } finally {
      setIsSaving(false);
    }
  };


  if (authLoading || isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 font-body flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user || !profileData) {
     return (
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 font-body flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <p>User not found or profile could not be loaded. Please try logging in again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <Avatar className="mx-auto h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2 ring-offset-background">
              <AvatarImage src={profileData.photoURL || undefined} alt={profileData.displayName || 'User'} />
              <AvatarFallback className="text-3xl">{getInitials(profileData.displayName || profileData.email)}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl font-headline text-primary">{profileData.displayName || 'Your Profile'}</CardTitle>
            <CardDescription>Manage your account information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={profileData.email || ''} readOnly disabled className="cursor-not-allowed" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              {isEditingDisplayName ? (
                <form onSubmit={handleSubmit(onSubmitDisplayName)} className="flex items-center gap-2">
                  <Input
                    id="displayName"
                    {...register('displayName')}
                    autoFocus
                    onBlur={() => setTimeout(() => { if (!isSaving) setIsEditingDisplayName(false)}, 200)}
                  />
                  <Button type="submit" size="icon" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  </Button>
                </form>
              ) : (
                <div className="flex items-center justify-between p-2 border rounded-md min-h-[40px]">
                  <span>{profileData.displayName || 'Not set'}</span>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditingDisplayName(true)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="createdAt">Account Created</Label>
              <Input id="createdAt" type="text" value={profileData.createdAt || 'N/A'} readOnly disabled className="cursor-not-allowed" />
            </div>

          </CardContent>
          <CardFooter>
            {/* Future actions like change password could go here */}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

