
'use client';

import React, { type FC } from 'react'; // Imported React
import type { InvoiceFormValues, LineItem } from '@/types/invoice'; // Ensure LineItem is imported
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface InvoicePreviewProps {
  formData: InvoiceFormValues;
}

const InvoicePreviewComponent: FC<InvoicePreviewProps> = ({ formData }) => {
  const {
    businessName,
    businessAddress,
    clientName,
    clientAddress,
    invoiceDate,
    invoiceNumber,
    lineItems,
  } = formData;

  const calculateSubtotal = (items: LineItem[] = []): number => { // Default to empty array
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
  };

  const subtotal = calculateSubtotal(lineItems);
  const totalAmount = subtotal;

  const formatDate = (date: Date | string | Timestamp | undefined): string => {
    if (!date) return 'N/A';
    try {
      const d = date instanceof Timestamp ? date.toDate() : new Date(date);
      return format(d, 'PPP');
    } catch {
      return 'Invalid Date';
    }
  };
  
  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || isNaN(amount)) return formatCurrency(0); // Default to $0.00 if NaN
    return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };


  return (
    <Card className="shadow-lg h-fit" id="invoice-preview-area">
      <CardHeader className="bg-muted/30 p-6">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-3xl font-headline text-primary">INVOICE</CardTitle>
            <p className="text-sm text-muted-foreground">
              Invoice #: {invoiceNumber || 'N/A'}
            </p>
            <p className="text-sm text-muted-foreground">
              Date: {formatDate(invoiceDate)}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold text-foreground">{businessName || 'Your Business Name'}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{businessAddress || 'Your Business Address'}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">Bill To:</h3>
          <p className="font-medium text-foreground">{clientName || 'Client Name'}</p>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{clientAddress || 'Client Address'}</p>
        </div>

        <Separator className="my-6" />

        <div className="flow-root">
            <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/20">
                <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Item</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Qty</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Price</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-foreground sm:pr-6">Amount</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-border">
                {(lineItems && lineItems.length > 0) ? lineItems.map((item) => (
                    <tr key={item.id || Math.random().toString()}> {/* Fallback key if id is missing */}
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">{item.description || 'Item Description'}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{item.quantity || 0}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatCurrency(Number(item.price) || 0)}</td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium text-foreground sm:pr-6">{formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0))}</td>
                    </tr>
                )) : (
                    <tr>
                        <td colSpan={4} className="text-center py-4 text-muted-foreground">No items added yet.</td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
        
        <Separator className="my-6" />

        <div className="flex justify-end">
          <div className="w-full max-w-xs">
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Subtotal</dt>
                <dd className="text-sm font-medium text-foreground">{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-base font-semibold text-foreground">Total</dt>
                <dd className="text-base font-semibold text-primary">{formatCurrency(totalAmount)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">Thank you for your business!</p>
      </CardFooter>
    </Card>
  );
};

const InvoicePreview = React.memo(InvoicePreviewComponent);
InvoicePreview.displayName = 'InvoicePreview'; // Optional: for better debugging

export default InvoicePreview;
