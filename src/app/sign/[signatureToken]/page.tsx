
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StoredInvoice } from '@/types/invoice';
import Header from '@/components/header';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, AlertTriangle, ArrowLeft, Edit3, Trash2, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import SignatureCanvas from 'react-signature-canvas';
import { QRCodeCanvas } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';

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

export default function SignInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const signatureToken = params.signatureToken as string;

  const [invoiceData, setInvoiceData] = useState<StoredInvoice | null>(null);
  const [invoiceDocId, setInvoiceDocId] = useState<string | null>(null); // This will be the publicInvoiceId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  const sigCanvasRef = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (signatureToken) {
      const fetchInvoiceByToken = async () => {
        setLoading(true);
        setError(null);
        try {
          const invoicesRef = collection(db, 'invoices');
          const q = query(invoicesRef, where("signatureToken", "==", signatureToken));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            setInvoiceData(docSnap.data() as StoredInvoice);
            setInvoiceDocId(docSnap.id); // Store the actual document ID (publicInvoiceId)
          } else {
            setError('Invalid or expired signature link. Please contact the sender.');
            setInvoiceData(null);
          }
        } catch (err) {
          console.error("Error fetching invoice by token:", err);
          setError('Failed to load invoice for signing. Please try again or check the link.');
          setInvoiceData(null);
        } finally {
          setLoading(false);
        }
      };
      fetchInvoiceByToken();
    } else {
      setError('No signature token provided.');
      setLoading(false);
    }
  }, [signatureToken]);

  const clearSignature = () => {
    sigCanvasRef.current?.clear();
  };

  const handleSignInvoice = async () => {
    if (!invoiceDocId || !invoiceData || invoiceData.signatureStatus === 'signed_by_landlord') {
      toast({ variant: "destructive", title:"Error", description: "This invoice cannot be signed or is already signed."});
      return;
    }
    if (sigCanvasRef.current?.isEmpty()) {
        toast({ variant: "destructive", title: "Signature Required", description: "Please provide your signature before submitting." });
        return;
    }

    setIsSigning(true);
    const signatureDataUrl = sigCanvasRef.current?.getTrimmedCanvas().toDataURL('image/png');

    try {
      const invoiceRef = doc(db, 'invoices', invoiceDocId);
      await updateDoc(invoiceRef, {
        signatureStatus: "signed_by_landlord",
        signedByLandlordAt: serverTimestamp(),
        landlordSignatureDataUrl: signatureDataUrl,
        // Optionally, update the main user's subcollection document if userId exists
      });
      
      // If the invoice was also stored in a user's subcollection, update it there too.
      if (invoiceData.userId && invoiceData.id) {
        const userInvoiceRef = doc(db, `users/${invoiceData.userId}/invoices`, invoiceData.id);
         await updateDoc(userInvoiceRef, {
            signatureStatus: "signed_by_landlord",
            signedByLandlordAt: serverTimestamp(), // Use a new timestamp or mirror the public one
            landlordSignatureDataUrl: signatureDataUrl,
        }).catch(err => console.warn("Could not update user-specific invoice copy:", err)); // Non-critical error
      }


      setInvoiceData(prev => prev ? ({ 
        ...prev, 
        signatureStatus: "signed_by_landlord", 
        signedByLandlordAt: new Date(), // Approximate for UI, Firestore has server TS
        landlordSignatureDataUrl: signatureDataUrl 
      }) : null);
      toast({ title: "Invoice Signed!", description: "Thank you for signing the rent invoice.", className: "bg-primary text-primary-foreground" });
    } catch (err) {
      console.error("Error signing invoice:", err);
      toast({ variant: "destructive", title: "Signing Failed", description: "Could not save signature. Please try again."});
    } finally {
      setIsSigning(false);
    }
  };
  
  const previewLink = invoiceData?.publicInvoiceId && baseUrl ? `${baseUrl}/preview/${invoiceData.publicInvoiceId}` : '';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Invoice for Signing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <Header />
        <Card className="w-full max-w-md mt-8">
          <CardHeader>
            <CardTitle className="text-destructive text-2xl">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => router.push('/')} className="mt-6 bg-primary hover:bg-primary/90">
              <ArrowLeft className="mr-2 h-4 w-4" /> Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <Header />
        <p className="text-lg text-muted-foreground mt-8">Invoice data could not be loaded.</p>
        <Button onClick={() => router.push('/')} className="mt-4 bg-primary hover:bg-primary/90">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go to Homepage
        </Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground pb-12 font-body">
      <Header />
      <main className="max-w-3xl mx-auto py-8 px-2 sm:px-4">
        <AnimatePresence mode="wait">
          {invoiceData.signatureStatus === 'signed_by_landlord' ? (
            <motion.div
              key="signed_confirmation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <Card className="shadow-xl border-primary bg-green-50 dark:bg-green-900/30">
                <CardHeader>
                  <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
                  <CardTitle className="text-2xl font-headline text-primary">Invoice Signed Successfully!</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-2">
                    This invoice was signed by landlord <strong>{invoiceData.landlordName}</strong> on {formatDateSafely(invoiceData.signedByLandlordAt, true)}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The tenant has been notified (simulated). You can now view the final invoice.
                  </p>
                  {previewLink && (
                    <div className="mt-6">
                        <p className="text-sm font-medium mb-2">Access the signed invoice:</p>
                        <div className="flex flex-col items-center gap-2">
                            <a href={previewLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{previewLink}</a>
                            <div className="p-2 bg-white inline-block rounded-md shadow mt-2">
                                <QRCodeCanvas value={previewLink} size={128} bgColor="#ffffff" fgColor="#000000" level="L" />
                            </div>
                        </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="justify-center">
                   <Button onClick={() => router.push(previewLink || '/')} variant="outline" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">View Signed Invoice</Button>
                </CardFooter>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="pending_signature"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="shadow-xl border-warning bg-yellow-50 dark:bg-yellow-900/30 mb-8">
                <CardHeader className="text-center">
                    <Edit3 className="h-10 w-10 text-warning mx-auto mb-3" />
                    <CardTitle className="text-xl font-headline text-yellow-700 dark:text-yellow-200">
                        Digitally Sign Rent Invoice
                    </CardTitle>
                    <CardDescription className="text-yellow-600 dark:text-yellow-300">
                        Invoice for: {invoiceData.propertyAddress} <br/>
                        Tenant: {invoiceData.tenantName}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-sm text-yellow-700 dark:text-yellow-200">
                        You, <strong>{invoiceData.landlordName}</strong>, are about to digitally sign and approve this rent invoice.
                    </p>
                    <div className="border-2 border-dashed border-muted-foreground dark:border-gray-600 rounded-md p-1 mx-auto w-full max-w-md bg-white aspect-[2/1]">
                        <SignatureCanvas 
                            ref={sigCanvasRef}
                            penColor='black'
                            canvasProps={{className: 'w-full h-full rounded-md'}} 
                        />
                    </div>
                    <div className="flex justify-center gap-3">
                         <Button variant="outline" onClick={clearSignature} size="sm">
                            <Trash2 className="mr-2 h-4 w-4"/> Clear Signature
                        </Button>
                        <Button 
                            onClick={handleSignInvoice} 
                            disabled={isSigning} 
                            size="lg"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground animate-pulse"
                        >
                            {isSigning ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                            Approve & Sign Invoice
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">By signing, you confirm the details of this invoice are correct.</p>
                </CardContent>
              </Card>

              {/* Invoice Preview Section - Simplified for signing context */}
              <Card className="shadow-md border-border bg-card" id="invoice-preview-area-signing">
                <CardHeader className="bg-muted/30 dark:bg-muted/10 p-4 rounded-t-lg border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold font-headline text-primary">RENT INVOICE</h2>
                      <p className="text-xs text-muted-foreground">Invoice #: {invoiceData.invoiceNumber || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">Date Issued: {formatDateSafely(invoiceData.invoiceDate)}</p>
                    </div>
                    <div className="text-right">
                      <h3 className="text-md font-semibold text-foreground">{invoiceData.landlordName}</h3>
                      <p className="text-xs text-muted-foreground">(Landlord)</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 text-sm">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-semibold text-muted-foreground">Tenant:</h4>
                      <p className="text-foreground">{invoiceData.tenantName}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-muted-foreground">Property:</h4>
                      <p className="text-foreground whitespace-pre-line">{invoiceData.propertyAddress}</p>
                    </div>
                  </div>
                  <Separator className="my-3"/>
                  <h4 className="font-semibold text-muted-foreground mb-1">Rent Details:</h4>
                  <div className="flex justify-between p-2 bg-muted/20 dark:bg-muted/5 rounded-sm">
                    <span>Period: {invoiceData.rentPeriod}</span>
                    <span className="font-bold text-primary">{formatCurrency(invoiceData.rentAmount)}</span>
                  </div>
                  {invoiceData.invoiceNotes && (
                    <>
                      <Separator className="my-3"/>
                      <h4 className="font-semibold text-muted-foreground mb-1">Notes:</h4>
                      <p className="text-xs text-foreground bg-muted/20 dark:bg-muted/5 p-2 rounded-sm whitespace-pre-line">{invoiceData.invoiceNotes}</p>
                    </>
                  )}
                </CardContent>
                <CardFooter className="p-4 border-t border-border bg-muted/30 dark:bg-muted/10 rounded-b-lg">
                  <p className="text-xs text-muted-foreground">
                    Please review carefully before signing. This action is final.
                  </p>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
