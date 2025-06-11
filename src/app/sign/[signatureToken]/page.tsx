
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { InvoiceFormValues, LineItem } from '@/types/invoice';
import Header from '@/components/header';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle, AlertTriangle, ArrowLeft, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { getScenario, type Scenario } from '@/config/invoice-scenarios';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';

const formatDateSafely = (dateInput: any): string => {
  if (!dateInput) return 'N/A';
  try {
    if (dateInput instanceof Timestamp) {
      return format(dateInput.toDate(), 'PPP p');
    }
    if (dateInput instanceof Date && !isNaN(dateInput.valueOf())) {
        return format(dateInput, 'PPP p');
    }
    if (typeof dateInput === 'string') {
      const parsedDate = new Date(dateInput);
      if (!isNaN(parsedDate.valueOf())) {
        return format(parsedDate, 'PPP p');
      }
    }
    const fallbackDate = new Date(dateInput);
    if (!isNaN(fallbackDate.valueOf())) {
        return format(fallbackDate, 'PPP p');
    }
    return 'Invalid Date';
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
  const signatureToken = params.signatureToken as string;

  const [invoiceData, setInvoiceData] = useState<InvoiceFormValues | null>(null);
  const [invoiceDocId, setInvoiceDocId] = useState<string | null>(null);
  const [scenarioConfig, setScenarioConfig] = useState<Scenario | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

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
            const data = docSnap.data() as InvoiceFormValues;
            setInvoiceData(data);
            setInvoiceDocId(docSnap.id); // Store the actual document ID (which is publicInvoiceId)
            setScenarioConfig(getScenario(data.invoiceType));
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

  const handleSignInvoice = async () => {
    if (!invoiceDocId || !invoiceData || invoiceData.signatureStatus === 'signed') {
      setError("This invoice cannot be signed or is already signed.");
      return;
    }
    setIsSigning(true);
    try {
      const invoiceRef = doc(db, 'invoices', invoiceDocId);
      await updateDoc(invoiceRef, {
        signatureStatus: "signed",
        signedAt: serverTimestamp(),
        signerConfirmed: true, // Assuming signerName and signerEmail were set during request
      });
      setInvoiceData(prev => prev ? ({ ...prev, signatureStatus: "signed", signedAt: new Date(), signerConfirmed: true }) : null);
      // toast({ title: "Invoice Signed!", description: "Thank you for signing the invoice." });
    } catch (err) {
      console.error("Error signing invoice:", err);
      setError('Failed to sign the invoice. Please try again.');
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
            <Button onClick={() => router.push('/')} className="mt-6">
              <ArrowLeft className="mr-2 h-4 w-4" /> Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoiceData || !scenarioConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <Header />
        <p className="text-lg text-muted-foreground mt-8">Invoice data could not be loaded.</p>
        <Button onClick={() => router.push('/')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go to Homepage
        </Button>
      </div>
    );
  }

  // Copied from preview page for consistency
  let issuerDisplayName = 'N/A';
  let clientDisplayName = 'N/A';
  let issuerAddressDisplay = '';
  let clientAddressDisplay = '';
  let invoiceMainDate = invoiceData.invoiceDate;

  if (invoiceData.invoiceType === 'rent') {
    issuerDisplayName = invoiceData.landlordName || 'Landlord';
    clientDisplayName = invoiceData.tenantName || 'Tenant';
    issuerAddressDisplay = invoiceData.propertyAddress || '';
    invoiceMainDate = invoiceData.paymentDate || invoiceData.invoiceDate;
  } else if (invoiceData.invoiceType === 'freelance') {
    issuerDisplayName = invoiceData.freelancerName || 'Freelancer';
    clientDisplayName = invoiceData.clientName || 'Client';
    issuerAddressDisplay = invoiceData.issuerAddress || ''; 
    clientAddressDisplay = invoiceData.clientAddress || '';
    invoiceMainDate = invoiceData.invoiceDate;
  } else if (invoiceData.invoiceType === 'product_sale') {
    issuerDisplayName = invoiceData.sellerName || 'Seller';
    clientDisplayName = invoiceData.buyerName || 'Buyer';
    issuerAddressDisplay = invoiceData.issuerAddress || ''; 
    clientAddressDisplay = invoiceData.clientAddress || '';
    invoiceMainDate = invoiceData.saleDate || invoiceData.invoiceDate;
  } else if (invoiceData.invoiceType === 'custom') {
    issuerDisplayName = invoiceData.issuerName || 'Issuer';
    clientDisplayName = invoiceData.clientName || 'Client';
    issuerAddressDisplay = invoiceData.issuerAddress || ''; 
    clientAddressDisplay = invoiceData.clientAddress || '';
    invoiceMainDate = invoiceData.invoiceDate;
  }

  const subtotal = invoiceData.lineItems?.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0) || 0;
  let taxAmount = 0;
  if (invoiceData.tax) {
    if (invoiceData.tax.includes('%')) {
      taxAmount = subtotal * (parseFloat(invoiceData.tax.replace('%', '')) / 100);
    } else {
      taxAmount = parseFloat(invoiceData.tax) || 0;
    }
  }
  const finalGrandTotal = invoiceData.grandTotal !== undefined ? invoiceData.grandTotal : (scenarioConfig.hasLineItems ? subtotal + taxAmount : 0);


  return (
    <div className="min-h-screen bg-background text-foreground pb-12 font-body">
      <Header />
      <main className="max-w-4xl mx-auto py-8 px-2 sm:px-4">
        <AnimatePresence mode="wait">
          {invoiceData.signatureStatus === 'signed' ? (
            <motion.div
              key="signed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="shadow-xl border-border bg-card text-center">
                <CardHeader>
                  <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                  <CardTitle className="text-2xl font-headline text-primary">Invoice Signed Successfully!</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-2">
                    This invoice was signed by {invoiceData.signerName || 'the recipient'} on {formatDateSafely(invoiceData.signedAt)}.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    A notification has been sent to the issuer.
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
                   <Button onClick={() => router.push('/')} variant="outline">Go to Homepage</Button>
                </CardFooter>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="shadow-xl border-yellow-400 bg-yellow-50/50 mb-8">
                <CardHeader className="text-center">
                    <AlertTriangle className="h-10 w-10 text-yellow-600 mx-auto mb-3" />
                    <CardTitle className="text-xl font-headline text-yellow-700">
                        Confirm & Sign Invoice for {issuerDisplayName}
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-yellow-700 mb-1">You are about to sign invoice number: <strong>{invoiceData.invoiceNumber || 'N/A'}</strong></p>
                    <p className="text-sm text-yellow-600 mb-6">
                        By clicking "Sign Invoice", you, <strong>{invoiceData.signerName || 'Recipient'}</strong>, confirm your approval of this document.
                    </p>
                    <Button 
                        onClick={handleSignInvoice} 
                        disabled={isSigning} 
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        {isSigning ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                        Sign Invoice
                    </Button>
                </CardContent>
              </Card>

              {/* Invoice Preview Section - Copied and adapted from main preview page */}
              <Card className="shadow-xl border-border bg-card" id="invoice-preview-area-signing">
                <CardHeader className="bg-muted/30 p-6 rounded-t-lg border-b border-border">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                      <h1 className="text-3xl font-bold font-headline text-primary">{scenarioConfig.label.toUpperCase()}</h1>
                      <p className="text-sm text-muted-foreground">Invoice #: {invoiceData.invoiceNumber || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">Date: {formatDateSafely(invoiceMainDate)}</p>
                      {invoiceData.invoiceType === 'rent' && invoiceData.rentDuration && (
                        <p className="text-sm text-muted-foreground">Duration: {invoiceData.rentDuration}</p>
                      )}
                    </div>
                    <div className="text-left sm:text-right mt-4 sm:mt-0">
                      <h2 className="text-xl font-semibold text-foreground">{issuerDisplayName}</h2>
                      {issuerAddressDisplay && <p className="text-sm text-muted-foreground whitespace-pre-line">{issuerAddressDisplay}</p>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div>
                      <h3 className="text-md font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        { (invoiceData.invoiceType === 'rent' && 'Tenant Details') ||
                          (invoiceData.invoiceType === 'freelance' && 'Client Details') ||
                          (invoiceData.invoiceType === 'product_sale' && 'Buyer Details') ||
                          (invoiceData.invoiceType === 'custom' && 'Billed To') ||
                          'Recipient Details'
                        }
                      </h3>
                      <p className="font-medium text-foreground">{clientDisplayName}</p>
                      {clientAddressDisplay && <p className="text-sm text-muted-foreground whitespace-pre-line">{clientAddressDisplay}</p>}
                    </div>
                     {invoiceData.invoiceType === 'product_sale' && invoiceData.paymentMethod && (
                        <div>
                            <h3 className="text-md font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Payment Method</h3>
                            <p className="text-sm text-muted-foreground">{invoiceData.paymentMethod}</p>
                        </div>
                    )}
                  </div>
                  {/* Scenario Specific Fields Display */}
                    {invoiceData.invoiceType === 'rent' && (
                        <div className="mb-6 p-4 border rounded-md bg-muted/20">
                            <h4 className="font-semibold mb-1 text-neutral-800 dark:text-neutral-100">Rent Details</h4>
                            <p className="text-sm text-muted-foreground">Amount: <span className="font-medium text-foreground">{formatCurrency(invoiceData.rentAmount)}</span></p>
                            <p className="text-sm text-muted-foreground">For: <span className="font-medium text-foreground">{invoiceData.rentDuration}</span></p>
                        </div>
                    )}
                    {invoiceData.invoiceType === 'freelance' && (
                        <div className="mb-6 p-4 border rounded-md bg-muted/20">
                            <h4 className="font-semibold mb-1 text-neutral-800 dark:text-neutral-100">Service Details</h4>
                            <p className="text-sm text-muted-foreground">Description: <span className="font-medium text-foreground">{invoiceData.serviceDescription}</span></p>
                            {invoiceData.rate !== undefined && <p className="text-sm text-muted-foreground">Rate: <span className="font-medium text-foreground">{formatCurrency(invoiceData.rate)}</span></p>}
                            {invoiceData.hoursWorked !== undefined && <p className="text-sm text-muted-foreground">Hours: <span className="font-medium text-foreground">{invoiceData.hoursWorked}</span></p>}
                        </div>
                    )}
                    {invoiceData.invoiceType === 'product_sale' && (
                        <div className="mb-6 p-4 border rounded-md bg-muted/20">
                            <h4 className="font-semibold mb-1 text-neutral-800 dark:text-neutral-100">Product Details</h4>
                            <p className="text-sm text-muted-foreground">Description: <span className="font-medium text-foreground">{invoiceData.productDescription}</span></p>
                            <p className="text-sm text-muted-foreground">Quantity: <span className="font-medium text-foreground">{invoiceData.quantity}</span></p>
                            <p className="text-sm text-muted-foreground">Unit Price: <span className="font-medium text-foreground">{formatCurrency(invoiceData.unitPrice)}</span></p>
                        </div>
                    )}
                    {scenarioConfig.hasLineItems && invoiceData.lineItems && invoiceData.lineItems.length > 0 && (
                    <>
                        <Separator className="my-6" />
                        <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Itemized Details</h3>
                        <div className="flow-root">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead className="text-left text-muted-foreground">Description</TableHead>
                                <TableHead className="text-center text-muted-foreground">Quantity</TableHead>
                                <TableHead className="text-right text-muted-foreground">Unit Price</TableHead>
                                <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {invoiceData.lineItems.map((item: LineItem) => (
                                <TableRow key={item.id}>
                                <TableCell className="font-medium text-left text-foreground">{item.description}</TableCell>
                                <TableCell className="text-center text-foreground">{item.quantity}</TableCell>
                                <TableCell className="text-right text-foreground">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right text-foreground">{formatCurrency(item.quantity * item.price)}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </div>
                    </>
                    )}
                    <Separator className="my-8" />
                    <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2">
                        {scenarioConfig.hasLineItems && (
                        <>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Subtotal</dt>
                            <dd className="text-sm font-medium text-foreground">{formatCurrency(subtotal)}</dd>
                        </div>
                        {invoiceData.tax && (
                            <div className="flex justify-between">
                                <dt className="text-sm text-muted-foreground">Tax ({invoiceData.tax.includes('%') ? invoiceData.tax : 'Fixed'})</dt>
                                <dd className="text-sm font-medium text-foreground">{formatCurrency(taxAmount)}</dd>
                            </div>
                        )}
                        </>
                        )}
                        {(invoiceData.invoiceType === 'rent' || invoiceData.invoiceType === 'product_sale' || invoiceData.invoiceType === 'freelance' || scenarioConfig.hasLineItems) && (
                            <div className="flex justify-between border-t pt-2 mt-2">
                                <dt className="text-base font-semibold text-foreground">Grand Total</dt>
                                <dd className="text-base font-semibold text-primary">{formatCurrency(finalGrandTotal)}</dd>
                            </div>
                        )}
                    </div>
                    </div>
                    {invoiceData.invoiceNotes && (
                        <>
                            <Separator className="my-6" />
                            <div>
                                <h3 className="text-md font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Notes</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-line">{invoiceData.invoiceNotes}</p>
                            </div>
                        </>
                    )}
                </CardContent>
                <CardFooter className="p-6 border-t border-border bg-muted/30 rounded-b-lg">
                  <p className="text-xs text-muted-foreground">
                    Signing from IP: (Placeholder for server-side capture) &bull; Device: (Placeholder for basic info)
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
