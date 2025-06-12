
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle, AlertTriangle, ArrowLeft, Edit3, Trash2, RefreshCcw, ShieldCheck, KeyRound, Lock } from 'lucide-react';
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

const maskMobileNumber = (mobile?: string): string => {
  if (!mobile || mobile.length < 4) return 'N/A';
  return `******${mobile.slice(-4)}`;
};

const formatPropertyAddress = (invoice: StoredInvoice): string => {
  if (!invoice) return 'N/A';
  const parts = [
    invoice.propertyPlotNo,
    invoice.propertyStreet,
    invoice.propertyArea,
    invoice.propertyCity,
  ].filter(Boolean);
  return parts.join(', ') || 'Address not specified';
};

export default function SignInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const signatureToken = params.signatureToken as string;

  const [invoiceData, setInvoiceData] = useState<StoredInvoice | null>(null);
  const [invoiceDocId, setInvoiceDocId] = useState<string | null>(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  
  const [currentStep, setCurrentStep] = useState<'otpVerification' | 'attestation' | 'signature' | 'signed'>('otpVerification');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [attestationChecked, setAttestationChecked] = useState(false);

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
            const data = docSnap.data() as StoredInvoice;
            setInvoiceData(data);
            setInvoiceDocId(docSnap.id); 

            if (data.signatureStatus === 'signed_by_landlord') {
              setCurrentStep('signed');
            } else if (data.linkStatus === 'used' || data.linkStatus === 'expired') {
              setError("This signing link is no longer valid." + (data.signingError ? ` Details: ${data.signingError}`: ""));
              setCurrentStep('signed'); // Or a specific 'link_invalid' step
            } else if (data.otpVerifiedAt) { // If OTP was (conceptually) verified before
                setCurrentStep('attestation');
            } else {
                setCurrentStep('otpVerification');
            }

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

  const handleOtpSubmit = async () => {
    // --- Backend OTP Verification Would Happen Here ---
    // For now, simulate success if OTP is not empty
    setIsOtpVerifying(true);
    setOtpError('');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    if (!otp.trim()) {
      setOtpError('OTP cannot be empty.');
      setIsOtpVerifying(false);
      return;
    }
    // In a real scenario, you'd call a backend function to verify OTP.
    // If successful, the backend would set `otpVerifiedAt` and perhaps `linkStatus='active_verified'`
    // For simulation:
    if (invoiceDocId) {
        // Simulate backend setting otpVerifiedAt - this would normally be done by the backend after successful OTP
        // await updateDoc(doc(db, 'invoices', invoiceDocId), { otpVerifiedAt: serverTimestamp() }); 
        // For frontend testing, we just update the step:
        setCurrentStep('attestation');
         toast({ title: "OTP Verified (Simulated)", description: "Proceed to review and sign."});
    }
    setIsOtpVerifying(false);
  };

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
      const updateData: Partial<StoredInvoice> = {
        signatureStatus: "signed_by_landlord",
        signedByLandlordAt: serverTimestamp() as Timestamp,
        landlordSignatureDataUrl: signatureDataUrl,
        linkStatus: 'used', // Mark link as used
        // signerIpAddress: (would be set by backend)
        // signingUserAgent: (would be set by backend)
        updatedAt: serverTimestamp() as Timestamp,
      };

      await updateDoc(invoiceRef, updateData);
      
      if (invoiceData.userId && invoiceData.id) {
        const userInvoiceRef = doc(db, `users/${invoiceData.userId}/invoices`, invoiceData.id);
         await updateDoc(userInvoiceRef, updateData).catch(err => console.warn("Could not update user-specific invoice copy:", err));
      }

      setInvoiceData(prev => prev ? ({ 
        ...prev, 
        ...updateData,
        signedByLandlordAt: new Date(), // Approximate for UI
      }) : null);
      setCurrentStep('signed');
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

  if (error || !invoiceData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <Header />
        <Card className="w-full max-w-md mt-8">
          <CardHeader>
            <CardTitle className="text-destructive text-2xl">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || "Invoice data could not be loaded."}</p>
            <Button onClick={() => router.push('/')} className="mt-6 bg-primary hover:bg-primary/90">
              <ArrowLeft className="mr-2 h-4 w-4" /> Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const propertyFullAddress = formatPropertyAddress(invoiceData);

  return (
    <div className="min-h-screen bg-background text-foreground pb-12 font-body">
      <Header />
      <main className="max-w-3xl mx-auto py-8 px-2 sm:px-4">
        <AnimatePresence mode="wait">
          {currentStep === 'signed' ? (
            <motion.div
              key="signed_confirmation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <Card className="shadow-xl border-primary bg-green-50 dark:bg-green-900/30">
                <CardHeader>
                  <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
                  <CardTitle className="text-2xl font-headline text-primary">Invoice Signed Successfully!</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-2">
                    This invoice for {propertyFullAddress} was signed by landlord <strong>{invoiceData.landlordName}</strong> on {formatDateSafely(invoiceData.signedByLandlordAt, true)}.
                  </p>
                   <p className="text-sm text-muted-foreground">
                     Verified via Mobile: {maskMobileNumber(invoiceData.landlordMobileNumber)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The tenant will be notified (simulated). You can now view the final invoice.
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
              key="pending_signature_flow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
             {currentStep === 'otpVerification' && (
                <Card className="shadow-xl border-border bg-card mb-8">
                    <CardHeader className="text-center">
                        <KeyRound className="h-10 w-10 text-primary mx-auto mb-3" />
                        <CardTitle className="text-xl font-headline text-foreground">Secure Verification</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            An OTP has been sent to the mobile number ending in {maskMobileNumber(invoiceData.landlordMobileNumber)}. Please enter it below to proceed.
                            <br/> (This is a UI simulation. No actual OTP is sent.)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 max-w-sm mx-auto">
                        <div className="space-y-1.5">
                            <Label htmlFor="otp">One-Time Password (OTP)</Label>
                            <Input 
                                id="otp" 
                                type="text" 
                                value={otp} 
                                onChange={(e) => setOtp(e.target.value)} 
                                placeholder="Enter OTP" 
                                maxLength={6}
                                className="text-center text-lg tracking-widest"
                            />
                            {otpError && <p className="text-xs text-destructive">{otpError}</p>}
                        </div>
                         <Button onClick={handleOtpSubmit} disabled={isOtpVerifying || !otp} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                            {isOtpVerifying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                            Verify & Proceed
                        </Button>
                    </CardContent>
                </Card>
             )}

            {currentStep === 'attestation' && (
                 <Card className="shadow-xl border-warning bg-yellow-50 dark:bg-yellow-900/30 mb-8">
                    <CardHeader className="text-center">
                        <Lock className="h-10 w-10 text-warning mx-auto mb-3" />
                        <CardTitle className="text-xl font-headline text-yellow-700 dark:text-yellow-200">Confirm Your Identity</CardTitle>
                        <CardDescription className="text-yellow-600 dark:text-yellow-300">
                           Please confirm you are authorized to sign this rent invoice.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-yellow-700 dark:text-yellow-200">
                        <p>
                            You are about to sign the rent invoice for property: <strong className="block my-1">{propertyFullAddress}</strong>
                            for tenant: <strong>{invoiceData.tenantName}</strong>.
                        </p>
                        <p>
                            This signing link was intended for the mobile number ending in <strong>{maskMobileNumber(invoiceData.landlordMobileNumber)}</strong> associated with landlord <strong>{invoiceData.landlordName}</strong>.
                        </p>
                        <div className="flex items-start space-x-2 p-3 border border-dashed border-yellow-400 rounded-md bg-yellow-100 dark:bg-yellow-800/50">
                            <Checkbox 
                                id="attestationCheckbox" 
                                checked={attestationChecked} 
                                onCheckedChange={(checked) => setAttestationChecked(Boolean(checked))}
                                className="mt-1 border-yellow-500 data-[state=checked]:bg-yellow-600 data-[state=checked]:text-yellow-50"
                            />
                            <Label htmlFor="attestationCheckbox" className="text-sm font-medium leading-snug text-yellow-800 dark:text-yellow-100">
                                I, {invoiceData.landlordName}, confirm I am authorized to sign this invoice using the secure link sent to the designated mobile number.
                            </Label>
                        </div>
                        <Button 
                            onClick={() => setCurrentStep('signature')} 
                            disabled={!attestationChecked} 
                            className="w-full bg-warning hover:bg-warning/90 text-yellow-900 dark:text-yellow-50 dark:hover:bg-yellow-500/90"
                        >
                            Proceed to Sign
                        </Button>
                    </CardContent>
                 </Card>
            )}

            {currentStep === 'signature' && (
              <>
                <Card className="shadow-xl border-warning bg-yellow-50 dark:bg-yellow-900/30 mb-8">
                    <CardHeader className="text-center">
                        <Edit3 className="h-10 w-10 text-warning mx-auto mb-3" />
                        <CardTitle className="text-xl font-headline text-yellow-700 dark:text-yellow-200">
                            Digitally Sign Rent Invoice
                        </CardTitle>
                        <CardDescription className="text-yellow-600 dark:text-yellow-300">
                            Invoice for: {propertyFullAddress} <br/>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                        <h4 className="font-semibold text-muted-foreground">Tenant:</h4>
                        <p className="text-foreground">{invoiceData.tenantName}</p>
                        </div>
                        <div>
                        <h4 className="font-semibold text-muted-foreground">Property:</h4>
                        <p className="text-foreground whitespace-pre-line">{propertyFullAddress}</p>
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
              </>
            )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
