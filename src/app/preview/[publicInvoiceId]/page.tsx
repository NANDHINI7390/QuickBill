
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { InvoiceFormValues, LineItem } from '@/types/invoice';
import Header from '@/components/header';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer, ArrowLeft, Send, CheckCircle, AlertTriangle, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { getScenario, type Scenario } from '@/config/invoice-scenarios';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
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


export default function InvoicePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const publicInvoiceId = params.publicInvoiceId as string;

  const [invoice, setInvoice] = useState<InvoiceFormValues | null>(null);
  const [scenarioConfig, setScenarioConfig] = useState<Scenario | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isRequestingSignature, setIsRequestingSignature] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

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
            const data = docSnap.data() as InvoiceFormValues;
            setInvoice(data);
            setScenarioConfig(getScenario(data.invoiceType));
            if (data.signerName) setRecipientName(data.signerName);
            if (data.signerEmail) setRecipientEmail(data.signerEmail);
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

  const handleRequestSignature = async () => {
    if (!invoice || !user || invoice.userId !== user.uid) {
      toast({ variant: "destructive", title: "Error", description: "You are not authorized to request a signature for this invoice." });
      return;
    }
    if (!recipientName.trim() || !recipientEmail.trim()) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please enter recipient name and email." });
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid recipient email address." });
        return;
    }

    setIsRequestingSignature(true);
    const signatureToken = uuidv4().substring(0, 10); // Generate a 10-char token

    try {
      const invoiceRef = doc(db, 'invoices', publicInvoiceId);
      await updateDoc(invoiceRef, {
        signatureRequested: true,
        signatureStatus: "pending",
        signerName: recipientName.trim(),
        signerEmail: recipientEmail.trim(),
        signatureToken: signatureToken,
        signatureRequestedAt: serverTimestamp(),
      });
      setInvoice(prev => prev ? ({
        ...prev,
        signatureRequested: true,
        signatureStatus: "pending",
        signerName: recipientName.trim(),
        signerEmail: recipientEmail.trim(),
        signatureToken: signatureToken,
      }) : null);
      toast({ title: "Signature Requested", description: `A signature request has been prepared for ${recipientName}. Share the link or QR code.` });
    } catch (err) {
      console.error("Error requesting signature:", err);
      toast({ variant: "destructive", title: "Request Failed", description: "Could not request signature. Please try again." });
    } finally {
      setIsRequestingSignature(false);
    }
  };
  
  const signingLink = invoice?.signatureToken && baseUrl ? `${baseUrl}/sign/${invoice.signatureToken}` : '';
  const previewLink = baseUrl && publicInvoiceId ? `${baseUrl}/preview/${publicInvoiceId}` : '';


  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Invoice Preview...</p>
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
                <Button onClick={() => router.push('/new-invoice')} className="mt-6">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Create New Invoice
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice || !scenarioConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <Header />
        <p className="text-lg text-muted-foreground mt-8">Invoice data could not be loaded or is incomplete.</p>
         <Button onClick={() => router.push('/new-invoice')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Create New Invoice
        </Button>
      </div>
    );
  }
  
  let issuerDisplayName = 'N/A';
  let clientDisplayName = 'N/A';
  let issuerAddressDisplay = ''; 
  let clientAddressDisplay = ''; 
  let invoiceMainDate = invoice.invoiceDate; 

  if (invoice.invoiceType === 'rent') {
    issuerDisplayName = invoice.landlordName || 'Landlord';
    clientDisplayName = invoice.tenantName || 'Tenant';
    issuerAddressDisplay = invoice.propertyAddress || ''; 
    invoiceMainDate = invoice.paymentDate || invoice.invoiceDate;
  } else if (invoice.invoiceType === 'freelance') {
    issuerDisplayName = invoice.freelancerName || 'Freelancer';
    clientDisplayName = invoice.clientName || 'Client';
    issuerAddressDisplay = invoice.issuerAddress || ''; 
    clientAddressDisplay = invoice.clientAddress || '';
    invoiceMainDate = invoice.invoiceDate;
  } else if (invoice.invoiceType === 'product_sale') {
    issuerDisplayName = invoice.sellerName || 'Seller';
    clientDisplayName = invoice.buyerName || 'Buyer';
    issuerAddressDisplay = invoice.issuerAddress || ''; 
    clientAddressDisplay = invoice.clientAddress || '';
    invoiceMainDate = invoice.saleDate || invoice.invoiceDate;
  } else if (invoice.invoiceType === 'custom') {
    issuerDisplayName = invoice.issuerName || 'Issuer';
    clientDisplayName = invoice.clientName || 'Client';
    issuerAddressDisplay = invoice.issuerAddress || ''; 
    clientAddressDisplay = invoice.clientAddress || '';
    invoiceMainDate = invoice.invoiceDate;
  }

  const subtotal = invoice.lineItems?.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0) || 0;
  let taxAmount = 0;
  if (invoice.tax) {
    if (invoice.tax.includes('%')) {
      taxAmount = subtotal * (parseFloat(invoice.tax.replace('%', '')) / 100);
    } else {
      taxAmount = parseFloat(invoice.tax) || 0;
    }
  }
  const finalGrandTotal = invoice.grandTotal !== undefined ? invoice.grandTotal : (scenarioConfig.hasLineItems ? subtotal + taxAmount : 0);
  const isOwner = user && invoice.userId === user.uid;

  return (
    <div className="min-h-screen bg-background text-foreground pb-12 font-body">
      <Header />
      <main className="max-w-4xl mx-auto py-8 px-2 sm:px-4">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/new-invoice')} className="transition-colors duration-300 ease-in-out">
                <ArrowLeft className="mr-2 h-4 w-4" /> Create Another Invoice
            </Button>
            <div className="flex gap-2">
                <Button onClick={handlePrint} className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-300 ease-in-out">
                    <Printer className="mr-2 h-4 w-4" /> Print / Download PDF
                </Button>
            </div>
        </div>

        <Card className="shadow-xl border-border bg-card mb-8" id="invoice-preview-area">
          <CardHeader className="bg-muted/30 p-6 rounded-t-lg border-b border-border">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold font-headline text-primary">{scenarioConfig.label.toUpperCase()}</h1>
                <p className="text-sm text-muted-foreground">
                  Invoice #: {invoice.invoiceNumber || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Date: {formatDateSafely(invoiceMainDate)}
                </p>
                {invoice.invoiceType === 'rent' && invoice.rentDuration && (
                  <p className="text-sm text-muted-foreground">
                    Duration: {invoice.rentDuration}
                  </p>
                )}
                <div className="mt-2">
                    <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full border border-green-300">
                        QuickBill Verified Issuer (Placeholder)
                    </span>
                </div>
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
                  { (invoice.invoiceType === 'rent' && 'Tenant Details') ||
                    (invoice.invoiceType === 'freelance' && 'Client Details') ||
                    (invoice.invoiceType === 'product_sale' && 'Buyer Details') ||
                    (invoice.invoiceType === 'custom' && 'Billed To') ||
                    'Recipient Details'
                  }
                </h3>
                <p className="font-medium text-foreground">{clientDisplayName}</p>
                {clientAddressDisplay && <p className="text-sm text-muted-foreground whitespace-pre-line">{clientAddressDisplay}</p>}
              </div>
              {invoice.invoiceType === 'product_sale' && invoice.paymentMethod && (
                 <div>
                    <h3 className="text-md font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Payment Method</h3>
                    <p className="text-sm text-muted-foreground">{invoice.paymentMethod}</p>
                 </div>
              )}
            </div>
            
            {invoice.invoiceType === 'rent' && (
                 <div className="mb-6 p-4 border rounded-md bg-muted/20">
                    <h4 className="font-semibold mb-1 text-neutral-800 dark:text-neutral-100">Rent Details</h4>
                    <p className="text-sm text-muted-foreground">Amount: <span className="font-medium text-foreground">{formatCurrency(invoice.rentAmount)}</span></p>
                    <p className="text-sm text-muted-foreground">For: <span className="font-medium text-foreground">{invoice.rentDuration}</span></p>
                 </div>
            )}
            {invoice.invoiceType === 'freelance' && (
                 <div className="mb-6 p-4 border rounded-md bg-muted/20">
                    <h4 className="font-semibold mb-1 text-neutral-800 dark:text-neutral-100">Service Details</h4>
                    <p className="text-sm text-muted-foreground">Description: <span className="font-medium text-foreground">{invoice.serviceDescription}</span></p>
                    {invoice.rate !== undefined && <p className="text-sm text-muted-foreground">Rate: <span className="font-medium text-foreground">{formatCurrency(invoice.rate)}</span></p>}
                    {invoice.hoursWorked !== undefined && <p className="text-sm text-muted-foreground">Hours: <span className="font-medium text-foreground">{invoice.hoursWorked}</span></p>}
                 </div>
            )}
             {invoice.invoiceType === 'product_sale' && (
                 <div className="mb-6 p-4 border rounded-md bg-muted/20">
                    <h4 className="font-semibold mb-1 text-neutral-800 dark:text-neutral-100">Product Details</h4>
                    <p className="text-sm text-muted-foreground">Description: <span className="font-medium text-foreground">{invoice.productDescription}</span></p>
                    <p className="text-sm text-muted-foreground">Quantity: <span className="font-medium text-foreground">{invoice.quantity}</span></p>
                    <p className="text-sm text-muted-foreground">Unit Price: <span className="font-medium text-foreground">{formatCurrency(invoice.unitPrice)}</span></p>
                 </div>
            )}


            {scenarioConfig.hasLineItems && invoice.lineItems && invoice.lineItems.length > 0 && (
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
                      {invoice.lineItems.map((item: LineItem) => ( 
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
                  {invoice.tax && (
                    <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Tax ({invoice.tax.includes('%') ? invoice.tax : 'Fixed'})</dt>
                        <dd className="text-sm font-medium text-foreground">{formatCurrency(taxAmount)}</dd>
                    </div>
                  )}
                  </>
                )}
                 {(invoice.invoiceType === 'rent' || invoice.invoiceType === 'product_sale' || invoice.invoiceType === 'freelance' || scenarioConfig.hasLineItems) && (
                    <div className="flex justify-between border-t pt-2 mt-2">
                        <dt className="text-base font-semibold text-foreground">Grand Total</dt>
                        <dd className="text-base font-semibold text-primary">{formatCurrency(finalGrandTotal)}</dd>
                    </div>
                 )}
              </div>
            </div>
            
            {invoice.invoiceNotes && (
                <>
                    <Separator className="my-6" />
                    <div>
                        <h3 className="text-md font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Notes</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.invoiceNotes}</p>
                    </div>
                </>
            )}

          </CardContent>
          <CardFooter className="p-6 border-t border-border bg-muted/30 rounded-b-lg">
            <p className="text-xs text-muted-foreground">Thank you! Generated by QuickBill.</p>
          </CardFooter>
        </Card>

        {isOwner && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-xl border-border bg-card mt-8">
                <CardHeader>
                  <CardTitle className="text-xl font-headline text-primary">Digital Signature</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!invoice.signatureRequested && (
                    <form onSubmit={(e) => { e.preventDefault(); handleRequestSignature(); }} className="space-y-4">
                      <div>
                        <Label htmlFor="recipientName">Recipient Name</Label>
                        <Input
                          id="recipientName"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="Enter recipient's full name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="recipientEmail">Recipient Email</Label>
                        <Input
                          id="recipientEmail"
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="recipient@example.com"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full sm:w-auto" disabled={isRequestingSignature}>
                        {isRequestingSignature ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Request Signature
                      </Button>
                    </form>
                  )}

                  {invoice.signatureRequested && invoice.signatureStatus === 'pending' && (
                    <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md text-yellow-700 flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5" />
                      <div>
                        <p className="font-semibold">Awaiting signature from {invoice.signerName || 'recipient'}.</p>
                        <p className="text-sm">Share this link or QR code with them: <a href={signingLink} target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-800">{signingLink}</a></p>
                        {signingLink && (
                          <div className="mt-3 p-2 bg-white inline-block rounded-md shadow">
                            <QRCodeCanvas value={signingLink} size={128} bgColor="#ffffff" fgColor="#000000" level="L" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {invoice.signatureStatus === 'signed' && (
                     <div className="p-4 bg-green-50 border border-green-300 rounded-md text-green-700 flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">Invoice signed by {invoice.signerName || 'recipient'} on {formatDateSafely(invoice.signedAt)}.</p>
                        {previewLink && (
                           <div className="mt-3">
                             <p className="text-sm mb-1">QR Code for this signed invoice preview:</p>
                             <div className="p-2 bg-white inline-block rounded-md shadow">
                               <QRCodeCanvas value={previewLink} size={100} bgColor="#ffffff" fgColor="#000000" level="L" />
                             </div>
                           </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
