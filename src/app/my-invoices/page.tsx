
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import type { InvoiceFormValues } from '@/types/invoice';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Eye, Trash2, PlusCircle, Loader2, ListChecks } from 'lucide-react';

interface DisplayInvoice extends Omit<InvoiceFormValues, 'invoiceDate' | 'createdAt' | 'updatedAt'> {
  invoiceDate: string; // Formatted string
  createdAt?: string;
  totalAmount: number;
}

// Helper functions moved outside the component
const calculateTotal = (items: InvoiceFormValues['lineItems']): number => {
  return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
};

const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined) return 'N/A';
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
};

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
      const q = query(invoicesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedInvoices: DisplayInvoice[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as InvoiceFormValues;
        fetchedInvoices.push({
          ...data,
          id: docSnap.id, // Use Firestore doc ID as the invoice ID for operations
          invoiceDate: data.invoiceDate instanceof Timestamp ? format(data.invoiceDate.toDate(), 'PPP') : format(new Date(data.invoiceDate), 'PPP'),
          createdAt: data.createdAt instanceof Timestamp ? format(data.createdAt.toDate(), 'PPpp') : (data.createdAt ? format(new Date(data.createdAt), 'PPpp') : undefined),
          totalAmount: calculateTotal(data.lineItems || []),
        });
      });
      setInvoices(fetchedInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch your invoices." });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    } else if (!authLoading) {
      // If auth is done loading and still no user, redirect
      router.push('/login');
    }
  }, [user, authLoading, router, fetchInvoices]);

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/invoices`, invoiceId));
      toast({ title: "Invoice Deleted", description: "The invoice has been successfully deleted." });
      fetchInvoices(); // Refresh the list
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({ variant: "destructive", title: "Delete Error", description: "Could not delete the invoice." });
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    router.push(`/?loadInvoiceId=${invoiceId}`);
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
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-3xl font-headline text-primary">My Invoices</CardTitle>
                <CardDescription>View and manage your saved invoices.</CardDescription>
              </div>
              <Button asChild>
                <Link href="/">
                  <PlusCircle className="mr-2 h-5 w-5" /> Create New Invoice
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <ListChecks className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-muted-foreground">No invoices yet.</p>
                <p className="text-sm text-muted-foreground mb-6">Create your first invoice to see it here.</p>
                <Button asChild size="lg">
                  <Link href="/">Create Invoice</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.clientName}</TableCell>
                        <TableCell>{invoice.invoiceDate}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center items-center gap-1 sm:gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleViewInvoice(invoice.id)} title="View/Edit">
                              <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
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
                                    This action cannot be undone. This will permanently delete invoice {invoice.invoiceNumber}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)} className="bg-destructive hover:bg-destructive/90">
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
