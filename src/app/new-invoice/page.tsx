
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { serverTimestamp, doc, writeBatch, Timestamp } from 'firebase/firestore';

import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { rentInvoiceFormSchema, type RentInvoiceFormValues } from '@/lib/schemas';
import { Loader2, Send, FileText, Home, User, Users, Phone, CalendarDays, Banknote, Edit2, MapPin } from 'lucide-react';

function generatePublicInvoiceId(length = 8): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'QB-RENT-';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result.toUpperCase();
}

const formContainerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const fieldVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } },
};

export default function NewRentInvoicePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const methods = useForm<RentInvoiceFormValues>({
    resolver: zodResolver(rentInvoiceFormSchema),
    mode: 'onChange',
    defaultValues: {
      invoiceDate: new Date(), 
      signatureStatus: 'awaiting_landlord_signature',
      linkStatus: 'active',
    }
  });

  const { control, register, handleSubmit, formState: { errors, isValid } } = methods;

  const onSubmit = async (data: RentInvoiceFormValues) => {
    setIsSubmitting(true);
    
    const publicId = generatePublicInvoiceId();
    const internalId = uuidv4(); 
    const signatureToken = uuidv4().replace(/-/g, '').substring(0, 12); 

    const invoiceData: RentInvoiceFormValues = {
      ...data,
      id: internalId,
      publicInvoiceId: publicId,
      userId: user?.uid || undefined,
      invoiceNumber: `RENT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${publicId.slice(-4)}`,
      invoiceDate: Timestamp.fromDate(new Date(data.invoiceDate || new Date())), 
      signatureToken: signatureToken,
      signatureStatus: 'awaiting_landlord_signature',
      linkStatus: 'active',
      signatureRequestedAt: serverTimestamp() as any,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    try {
      const batch = writeBatch(db);
      
      const publicInvoiceRef = doc(db, 'invoices', publicId);
      batch.set(publicInvoiceRef, invoiceData);

      if (user) {
        const userInvoiceRef = doc(db, `users/${user.uid}/invoices`, internalId);
        batch.set(userInvoiceRef, invoiceData);
      }

      await batch.commit();

      toast({ 
        title: "Rent Invoice Initiated!", 
        description: `Signing link for landlord will be generated. Invoice ID: ${publicId}`, 
        className: "bg-primary text-primary-foreground" 
      });
      router.push(`/preview/${publicId}`);
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast({ title: "Error", description: "Could not save invoice. " + (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="max-w-2xl mx-auto py-8 px-4">
          <motion.div
            variants={formContainerVariants}
            initial="hidden"
            animate="visible"
            id="invoice-form-section"
          >
            <form onSubmit={handleSubmit(onSubmit)}>
              <Card className="shadow-xl border-border bg-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary"/>
                    <CardTitle className="font-headline text-2xl sm:text-3xl text-primary">Create Secure Rent Invoice</CardTitle>
                  </div>
                  <CardDescription className="text-muted-foreground">
                    Fill in the details below. A secure signing link will be sent to the landlord's mobile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  
                  <motion.section variants={fieldVariants} className="space-y-4 p-4 border rounded-md bg-muted/20">
                    <h3 className="text-lg font-semibold text-primary mb-3 border-b pb-2 flex items-center gap-2">
                      <Home className="h-5 w-5" /> Property & Rent Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="propertyPlotNo">Plot/House No.</Label>
                        <Input id="propertyPlotNo" {...register('propertyPlotNo')} placeholder="e.g., A-101" className={`focus:ring-primary focus:border-primary ${errors.propertyPlotNo ? 'border-destructive ring-destructive ring-1' : 'border-border'}`} />
                        {errors.propertyPlotNo && <p className="text-xs text-destructive mt-1">{errors.propertyPlotNo.message}</p>}
                      </div>
                       <div className="space-y-1.5">
                        <Label htmlFor="propertyStreet">Street/Road Name</Label>
                        <Input id="propertyStreet" {...register('propertyStreet')} placeholder="e.g., Main Street" className={`focus:ring-primary focus:border-primary ${errors.propertyStreet ? 'border-destructive ring-destructive ring-1' : 'border-border'}`} />
                        {errors.propertyStreet && <p className="text-xs text-destructive mt-1">{errors.propertyStreet.message}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="propertyArea">Area/Locality</Label>
                        <Input id="propertyArea" {...register('propertyArea')} placeholder="e.g., Sunshine Colony" className={`focus:ring-primary focus:border-primary ${errors.propertyArea ? 'border-destructive ring-destructive ring-1' : 'border-border'}`} />
                        {errors.propertyArea && <p className="text-xs text-destructive mt-1">{errors.propertyArea.message}</p>}
                      </div>
                       <div className="space-y-1.5">
                        <Label htmlFor="propertyCity">City</Label>
                        <Input id="propertyCity" {...register('propertyCity')} placeholder="e.g., Anytown" className={`focus:ring-primary focus:border-primary ${errors.propertyCity ? 'border-destructive ring-destructive ring-1' : 'border-border'}`} />
                        {errors.propertyCity && <p className="text-xs text-destructive mt-1">{errors.propertyCity.message}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="rentAmount">Rent Amount (₹)</Label>
                        <Input id="rentAmount" type="number" {...register('rentAmount')} placeholder="e.g., 15000" className={`focus:ring-primary focus:border-primary ${errors.rentAmount ? 'border-destructive ring-destructive ring-1' : 'border-border'}`} />
                        {errors.rentAmount && <p className="text-xs text-destructive mt-1">{errors.rentAmount.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="rentPeriod">Rent Period</Label>
                        <Input id="rentPeriod" {...register('rentPeriod')} placeholder="e.g., July 2024" className={`focus:ring-primary focus:border-primary ${errors.rentPeriod ? 'border-destructive ring-destructive ring-1' : 'border-border'}`} />
                        {errors.rentPeriod && <p className="text-xs text-destructive mt-1">{errors.rentPeriod.message}</p>}
                      </div>
                    </div>
                  </motion.section>
                  
                  <motion.section variants={fieldVariants} className="space-y-4 p-4 border rounded-md bg-muted/20">
                    <h3 className="text-lg font-semibold text-primary mb-3 border-b pb-2 flex items-center gap-2">
                      <Users className="h-5 w-5" /> Party Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="tenantName">Tenant Name</Label>
                        <Input id="tenantName" {...register('tenantName')} placeholder="Full name of the tenant" className={`focus:ring-primary focus:border-primary ${errors.tenantName ? 'border-destructive ring-destructive ring-1' : 'border-border'}`} />
                        {errors.tenantName && <p className="text-xs text-destructive mt-1">{errors.tenantName.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="landlordName">Landlord Name</Label>
                        <Input id="landlordName" {...register('landlordName')} placeholder="Full name of the landlord" className={`focus:ring-primary focus:border-primary ${errors.landlordName ? 'border-destructive ring-destructive ring-1' : 'border-border'}`} />
                        {errors.landlordName && <p className="text-xs text-destructive mt-1">{errors.landlordName.message}</p>}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="landlordMobileNumber">Landlord&apos;s Mobile Number (for Signature)</Label>
                      <Input id="landlordMobileNumber" type="tel" {...register('landlordMobileNumber')} placeholder="e.g., 9876543210 (10 digits)" className={`focus:ring-primary focus:border-primary ${errors.landlordMobileNumber ? 'border-destructive ring-destructive ring-1' : 'border-border'}`} />
                      {errors.landlordMobileNumber && <p className="text-xs text-destructive mt-1">{errors.landlordMobileNumber.message}</p>}
                       <p className="text-xs text-muted-foreground">A secure link to sign this invoice will be sent here.</p>
                    </div>
                  </motion.section>

                  <motion.section variants={fieldVariants} className="space-y-4 p-4 border rounded-md bg-muted/20">
                     <h3 className="text-lg font-semibold text-primary mb-3 border-b pb-2 flex items-center gap-2">
                      <Edit2 className="h-5 w-5" /> Optional Notes
                    </h3>
                    <div className="space-y-1.5">
                      <Label htmlFor="invoiceNotes">Additional Notes or Terms</Label>
                      <Textarea id="invoiceNotes" {...register('invoiceNotes')} placeholder="e.g., Payment due by 5th of the month. Late fee of ₹500 applies." className={`focus:ring-primary focus:border-primary ${errors.invoiceNotes ? 'border-destructive ring-destructive ring-1' : 'border-border'}`} rows={3}/>
                      {errors.invoiceNotes && <p className="text-xs text-destructive mt-1">{errors.invoiceNotes.message}</p>}
                    </div>
                  </motion.section>

                </CardContent>
                <CardFooter>
                  <motion.div 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }} 
                    transition={{ type: "spring", stiffness: 400, damping: 17 }} 
                    className="w-full"
                  >
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 transition-all duration-300 ease-in-out" 
                      disabled={isSubmitting || !isValid}
                    >
                      {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                      Initiate Invoice & Get Signing Link
                    </Button>
                  </motion.div>
                </CardFooter>
              </Card>
            </form>
          </motion.div>
        </main>
      </div>
    </FormProvider>
  );
}
