
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StoredInvoice } from '@/types/invoice';
import Header from '@/components/header';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Printer, ArrowLeft, Share2, ShieldCheck, ShieldAlert, Copy, CheckCircle, Bell, Mail, MessageSquareText } from 'lucide-react'; // Added MessageSquareText
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const formatDateSafely = (dateInput: any, includeTime = false): string => {
  if (!dateInput) return 'N/A';
  try {
    const d = dateInput instanceof Timestamp ? dateInput.toDate() : new Date(dateInput);
    if (isNaN(d.valueOf())) return 'Invalid Date';
    return format(d, includeTime ? 'PPP p' : 'PPP');
  } catch (error) {
    console.warn("Date formatting error:", error, "Input was:", dateInput);
    return 'Invalid Date';
  }
};

const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const maskMobileNumber = (mobile?: string): string => {
  if (!mobile) return 'N/A';
  if (mobile.length >= 10) {
    return `******${mobile.slice(-4)}`;
  }
  return 'Invalid Mobile';
};


export default function InvoicePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const publicInvoiceId = params.publicInvoiceId as string;

  const [invoice, setInvoice] = useState<StoredInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

  const [notifyTenant, setNotifyTenant] = useState(false);
  const [tenantEmailForNotification, setTenantEmailForNotification] = useState('');
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (publicInvoiceId) {
      const fetchInvoice = async () => {
        setLoading(true);
        setError(null);
        try {
          const invoiceRef = doc(db, 'invoices', publicInvoiceId);
          const docSnap = await getDoc(invoiceRef);

          if (docSnap.exists()) {
            const invoiceData = docSnap.data() as StoredInvoice;
            setInvoice(invoiceData);
            setNotifyTenant(invoiceData.notifyTenant || false);
            setTenantEmailForNotification(invoiceData.tenantEmailForNotification || '');
          } else {
            setError('Invoice not found. Please check the ID or create a new invoice.');
            setInvoice(null);
          }
        } catch (err) {
          console.error("Error fetching invoice:", err);
          setError('Failed to load invoice. Please try again.');
          setInvoice(null);
        } finally {
          setLoading(false);
        }
      };
      fetchInvoice();
    } else {
      setError('No invoice ID provided.');
      setLoading(false);
    }
  }, [publicInvoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const previewLink = baseUrl && publicInvoiceId ? `${baseUrl}/preview/${publicInvoiceId}` : '';

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${type} Copied!`, description: `The ${type.toLowerCase()} has been copied to your clipboard.` });
    }).catch(err => {
      toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy to clipboard." });
    });
  };
  
  const handleSaveNotificationPreferences = async () => {
    if (!invoice || !publicInvoiceId) return;
    if (notifyTenant && !tenantEmailForNotification) {
        toast({ variant: "destructive", title: "Email Required", description: "Please enter an email address for notifications." });
        return;
    }
    setIsSavingPreferences(true);
    try {
        const invoiceRef = doc(db, 'invoices', publicInvoiceId);
        await updateDoc(invoiceRef, {
            notifyTenant: notifyTenant,
            tenantEmailForNotification: notifyTenant ? tenantEmailForNotification : '',
            updatedAt: serverTimestamp()
        });
        setInvoice(prev => prev ? {...prev, notifyTenant, tenantEmailForNotification: notifyTenant ? tenantEmailForNotification : '' } : null);
        toast({ title: "Preferences Saved", description: "Notification settings have been updated."});
    } catch (error) {
        console.error("Error saving notification preferences:", error);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save notification preferences."});
    } finally {
        setIsSavingPreferences(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Rent Invoice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
         <Header />
        <Card className="w-full max-w-md mt-8">
            <CardHeader>
                <CardTitle className="text-destructive text-2xl">Error Loading Invoice</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => router.push('/new-invoice')} className="mt-6 bg-primary hover:bg-primary/90">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Create New Rent Invoice
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <Header />
        <p className="text-lg text-muted-foreground mt-8">Invoice data could not be loaded.</p>
         <Button onClick={() => router.push('/new-invoice')} className="mt-4 bg-primary hover:bg-primary/90">
            <ArrowLeft className="mr-2 h-4 w-4" /> Create New Rent Invoice
        </Button>
      </div>
    );
  }
  
  const isCreator = user && invoice.userId === user.uid;
  // Show this section if the current user is the creator, or if the invoice doesn't have a specific user ID (e.g., created anonymously)
  // and the signature is pending.
  const showSignatureStatusSection = (isCreator || !invoice.userId) && invoice.signatureStatus === 'awaiting_landlord_signature';
  const showTenantNotificationSection = (isCreator && invoice.signatureStatus === 'awaiting_landlord_signature');


  return (
    <div className="min-h-screen bg-background text-foreground pb-12 font-body">
      <Header />
      <main className="max-w-3xl mx-auto py-8 px-2 sm:px-4">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <Button variant="outline" onClick={() => router.push(user ? '/my-invoices' : '/')} className="transition-colors duration-300 ease-in-out">
                <ArrowLeft className="mr-2 h-4 w-4" /> {user ? "My Invoices" : "Back to Home"}
            </Button>
            <div className="flex gap-2">
                <Button onClick={handlePrint} className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-300 ease-in-out">
                    <Printer className="mr-2 h-4 w-4" /> Print / Download PDF
                </Button>
            </div>
        </div>

        <AnimatePresence>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
            data-signature-request-ui 
        >
            {showSignatureStatusSection && (
            <Card className="shadow-xl border-warning bg-yellow-50 dark:bg-yellow-900/30">
                <CardHeader>
                    <CardTitle className="text-xl font-headline text-yellow-700 dark:text-yellow-200 flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-warning" /> Awaiting Landlord&apos;s Signature
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-yellow-700 dark:text-yellow-300">
                        This invoice requires landlord <strong>{invoice.landlordName}</strong> to digitally sign it.
                    </p>
                    <div className="flex items-center gap-2 p-3 border border-dashed border-yellow-400 rounded-md bg-yellow-100 dark:bg-yellow-800/50">
                        <MessageSquareText className="h-6 w-6 text-yellow-700 dark:text-yellow-200 shrink-0" />
                        <p className="text-sm text-yellow-800 dark:text-yellow-100">
                            A secure signing link has been (or will be shortly) sent via SMS/WhatsApp to the landlord&apos;s mobile number: <strong>{maskMobileNumber(invoice.landlordMobileNumber)}</strong>.
                        </p>
                    </div>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        The landlord needs to open this link to review and sign the invoice.
                        (Actual SMS/WhatsApp sending needs backend integration.)
                    </p>
                </CardContent>
            </Card>
            )}
            {invoice.signatureStatus === 'signed_by_landlord' && (
                <Card className="shadow-xl border-primary bg-green-50 dark:bg-green-900/30">
                    <CardHeader>
                        <CardTitle className="text-xl font-headline text-primary flex items-center gap-2">
                            <ShieldCheck className="h-6 w-6" /> Invoice Signed & Verified
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-green-700 dark:text-green-200">
                            This invoice was digitally signed by landlord <strong>{invoice.landlordName}</strong> on {formatDateSafely(invoice.signedByLandlordAt, true)}.
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-300">
                            Verification via Mobile: {maskMobileNumber(invoice.landlordMobileNumber)}
                        </p>
                        {previewLink && (
                            <div className="mt-3 p-3 bg-white inline-block rounded-md shadow border">
                                <p className="text-xs text-center mb-1 text-muted-foreground">Scan QR for This Invoice</p>
                               <QRCodeCanvas value={previewLink} size={100} bgColor="#ffffff" fgColor="#000000" level="L" />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </motion.div>
        </AnimatePresence>

        {showTenantNotificationSection && (
            <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mb-8"
            >
                <Card className="shadow-lg border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg font-headline text-foreground flex items-center gap-2">
                           <Bell className="h-5 w-5 text-primary" /> Get Notified When Signed
                        </CardTitle>
                        <CardDescription>
                            Opt-in to receive an email once the landlord signs this invoice. (Email sending requires backend setup).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="notifyTenantCheckbox" 
                                checked={notifyTenant} 
                                onCheckedChange={(checked) => setNotifyTenant(Boolean(checked))}
                            />
                            <Label htmlFor="notifyTenantCheckbox" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Email me when the invoice is signed by the landlord.
                            </Label>
                        </div>
                        {notifyTenant && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1.5 overflow-hidden"
                            >
                                <Label htmlFor="tenantEmailForNotification">Your Email Address</Label>
                                <div className="flex items-center gap-2">
                                   <Mail className="h-5 w-5 text-muted-foreground" />
                                   <Input 
                                        id="tenantEmailForNotification" 
                                        type="email" 
                                        placeholder="you@example.com"
                                        value={tenantEmailForNotification}
                                        onChange={(e) => setTenantEmailForNotification(e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                                 {notifyTenant && !tenantEmailForNotification && <p className="text-xs text-destructive">Email is required for notifications.</p>}
                            </motion.div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button 
                            onClick={handleSaveNotificationPreferences} 
                            disabled={isSavingPreferences || (notifyTenant && !tenantEmailForNotification)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Save Notification Preferences
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
            </AnimatePresence>
        )}


        <Card className="shadow-xl border-border bg-card" id="invoice-preview-area">
          <CardHeader className="bg-muted/30 dark:bg-muted/10 p-6 rounded-t-lg border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold font-headline text-primary">RENT INVOICE</h1>
                <p className="text-sm text-muted-foreground">
                  Invoice #: {invoice.invoiceNumber || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Date Issued: {formatDateSafely(invoice.invoiceDate)}
                </p>
              </div>
              <div className="text-left sm:text-right mt-4 sm:mt-0">
                <h2 className="text-lg font-semibold text-foreground">{invoice.landlordName}</h2>
                <p className="text-sm text-muted-foreground">(Landlord)</p>
                {invoice.propertyAddress && <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{invoice.propertyAddress}</p>}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-md font-semibold text-foreground mb-1">Tenant Details</h3>
                <p className="font-medium text-foreground">{invoice.tenantName}</p>
              </div>
               <div>
                <h3 className="text-md font-semibold text-foreground mb-1">Property Address</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.propertyAddress}</p>
              </div>
            </div>
            
            <Separator className="my-6" />

            <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Rent Details</h3>
                <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-muted/20 dark:bg-muted/5 rounded-md">
                        <span className="text-sm text-muted-foreground">Rent Period:</span>
                        <span className="font-medium text-foreground">{invoice.rentPeriod}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/20 dark:bg-muted/5 rounded-md">
                        <span className="text-sm text-muted-foreground">Rent Amount:</span>
                        <span className="font-medium text-foreground text-lg text-primary">{formatCurrency(invoice.rentAmount)}</span>
                    </div>
                </div>
            </div>
            
            {invoice.invoiceNotes && (
                <>
                    <Separator className="my-6" />
                    <div>
                        <h3 className="text-md font-semibold text-foreground mb-1">Notes</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/20 dark:bg-muted/5 p-3 rounded-md">{invoice.invoiceNotes}</p>
                    </div>
                </>
            )}

            {invoice.signatureStatus === 'signed_by_landlord' && (
              <>
                <Separator className="my-8" />
                <div data-signature-display>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Landlord&apos;s Digital Signature</h3>
                  <div className="p-4 border rounded-md bg-muted/20 dark:bg-muted/5 text-center">
                    {invoice.landlordSignatureDataUrl ? (
                        <img 
                            src={invoice.landlordSignatureDataUrl} 
                            alt="Landlord's Signature" 
                            className="mx-auto max-w-xs h-auto border bg-white p-2 rounded shadow"
                            data-signature-image
                        />
                    ) : (
                        <p className="text-muted-foreground">Signature image not available.</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      Signed by: {invoice.landlordName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      On: {formatDateSafely(invoice.signedByLandlordAt, true)}
                    </p>
                     <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full border border-green-300 dark:bg-green-700 dark:text-green-100 dark:border-green-500" data-verified-badge>
                        <CheckCircle className="h-3 w-3"/> Digitally Signed by Landlord ({maskMobileNumber(invoice.landlordMobileNumber)})
                    </div>
                  </div>
                </div>
              </>
            )}

          </CardContent>
          <CardFooter className="p-6 border-t border-border bg-muted/30 dark:bg-muted/10 rounded-b-lg">
            <p className="text-xs text-muted-foreground">Thank you! Generated by QuickBill.</p>
             {invoice.publicInvoiceId && <p className="ml-auto text-xs text-muted-foreground">ID: {invoice.publicInvoiceId}</p>}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

