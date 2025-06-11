
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import type { StoredInvoice } from '@/types/invoice'; // Updated type
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge'; // For status
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Eye, Trash2, PlusCircle, Loader2, ListChecks, ShieldCheck, ShieldAlert } from 'lucide-react';

interface DisplayInvoice extends StoredInvoice {
  formattedInvoiceDate: string; 
  formattedCreatedAt?: string;
}

const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined) return 'N/A';
  if (isNaN(amount)) return formatCurrency(0);
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
};

const getStatusBadgeVariant = (status: StoredInvoice['signatureStatus']): "default" | "destructive" | "secondary" | "outline" | undefined => {
  switch (status) {
    case 'signed_by_landlord':
      return 'default'; // Green (primary)
    case 'awaiting_landlord_signature':
      return 'secondary'; // Blue (or yellow if warning is preferred)
    case 'expired':
    case 'declined':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusText = (status: StoredInvoice['signatureStatus']): string => {
    switch (status) {
        case 'awaiting_landlord_signature': return 'Awaiting Landlord Signature';
        case 'signed_by_landlord': return 'Signed by Landlord';
        case 'expired': return 'Expired';
        case 'declined': return 'Declined';
        default: return 'Unknown Status';
    }
};
const getStatusIcon = (status: StoredInvoice['signatureStatus']) => {
    switch (status) {
        case 'awaiting_landlord_signature': return <ShieldAlert className="h-4 w-4 mr-1 text-amber-500" />;
        case 'signed_by_landlord': return <ShieldCheck className="h-4 w-4 mr-1 text-primary" />;
        default: return null;
    }
}


export default function MyInvoicesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<DisplayInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const invoicesRef = collection(db, `users/${user.uid}/invoices`);
      // For rent invoices, we might sort by invoiceDate (which is creation date) or rentPeriod if that makes more sense
      const q = query(invoicesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedInvoices: DisplayInvoice[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as StoredInvoice;
        // Ensure invoiceDate is consistently a Date object before formatting
        let invoiceDateForFormat: Date | string = data.invoiceDate instanceof Timestamp ? data.invoiceDate.toDate() : data.invoiceDate;
        
        fetchedInvoices.push({
          ...data,
          // id is already part of StoredInvoice if taken from docSnap.id
          // publicInvoiceId is also part of StoredInvoice
          formattedInvoiceDate: format(new Date(invoiceDateForFormat), 'PPP'),
          formattedCreatedAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), 'PPpp') : (data.createdAt ? format(new Date(data.createdAt as any), 'PPpp') : undefined),
        });
      });
      setInvoices(fetchedInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch your rent invoices." });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    } else if (!authLoading) {
      // If not loading and no user, redirect to login
      router.push('/login');
    }
  }, [user, authLoading, router, fetchInvoices]);

  const handleDeleteInvoice = async (invoicePublicId: string, userInvoiceDocId: string) => {
    if (!user) return;
    try {
      // Delete from user's subcollection
      await deleteDoc(doc(db, `users/${user.uid}/invoices`, userInvoiceDocId));
      // Optionally, delete or mark as deleted in the public 'invoices' collection
      // For now, we only delete the user's copy.
      // await deleteDoc(doc(db, 'invoices', invoicePublicId)); 
      toast({ title: "Invoice Deleted", description: "The rent invoice has been successfully deleted from your list." });
      fetchInvoices(); 
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({ variant: "destructive", title: "Delete Error", description: "Could not delete the invoice." });
    }
  };

  const handleViewInvoice = (publicId: string) => {
    router.push(`/preview/${publicId}`);
  };


  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 font-body flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
           <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card className="shadow-xl border-border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-3xl font-headline text-primary">My Rent Invoices</CardTitle>
                <CardDescription>View and manage your initiated/received rent invoices.</CardDescription>
              </div>
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link href="/new-invoice">
                  <PlusCircle className="mr-2 h-5 w-5" /> Create New Rent Invoice
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <ListChecks className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-muted-foreground">No rent invoices yet.</p>
                <p className="text-sm text-muted-foreground mb-6">Create your first rent invoice to see it here.</p>
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                  <Link href="/new-invoice">Create Rent Invoice</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Landlord</TableHead>
                      <TableHead>Rent Period</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.tenantName}</TableCell>
                        <TableCell>{invoice.landlordName}</TableCell>
                        <TableCell>{invoice.rentPeriod}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.rentAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(invoice.signatureStatus)} className="flex items-center gap-1">
                            {getStatusIcon(invoice.signatureStatus)}
                            {getStatusText(invoice.signatureStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center items-center gap-1 sm:gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleViewInvoice(invoice.publicInvoiceId)} title="View Details">
                              <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Delete">
                                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete invoice {invoice.invoiceNumber} from your list.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.publicInvoiceId, invoice.id)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

