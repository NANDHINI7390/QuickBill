'use client';

import type { FC } from 'react';
import { useFormContext, Controller, useFieldArray } from 'react-hook-form';
import type { InvoiceFormValues } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, PlusCircle, Save, Sparkles, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface InvoiceFormProps {
  onSmartFill: () => Promise<void>;
  onDownloadPDF: () => void;
  onSaveTemplate: () => void;
}

const InvoiceForm: FC<InvoiceFormProps> = ({ onSmartFill, onDownloadPDF, onSaveTemplate }) => {
  const { control, register, formState: { errors } } = useFormContext<InvoiceFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const addNewLineItem = () => {
    append({ id: uuidv4(), description: '', quantity: 1, price: 0 });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create New Invoice</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Business Details */}
        <section className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-semibold text-primary">Your Details</h3>
          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input id="businessName" {...register('businessName')} placeholder="Your Company LLC" />
            {errors.businessName && <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>}
          </div>
          <div>
            <Label htmlFor="businessAddress">Business Address</Label>
            <Textarea id="businessAddress" {...register('businessAddress')} placeholder="123 Main St, Anytown, USA" />
            {errors.businessAddress && <p className="text-sm text-destructive mt-1">{errors.businessAddress.message}</p>}
          </div>
        </section>

        {/* Client Details */}
        <section className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-semibold text-primary">Client Details</h3>
          <div>
            <Label htmlFor="clientName">Client Name</Label>
            <Input id="clientName" {...register('clientName')} placeholder="Client Co." />
            {errors.clientName && <p className="text-sm text-destructive mt-1">{errors.clientName.message}</p>}
          </div>
          <div>
            <Label htmlFor="clientAddress">Client Address</Label>
            <Textarea id="clientAddress" {...register('clientAddress')} placeholder="456 Client Ave, Otherville, USA" />
            {errors.clientAddress && <p className="text-sm text-destructive mt-1">{errors.clientAddress.message}</p>}
          </div>
        </section>
        
        {/* Invoice Date */}
         <section className="space-y-2 p-4 border rounded-md">
           <h3 className="text-lg font-semibold text-primary">Invoice Date</h3>
            <Controller
                name="invoiceDate"
                control={control}
                render={({ field }) => (
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                        )}
                    >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                )}
            />
            {errors.invoiceDate && <p className="text-sm text-destructive mt-1">{errors.invoiceDate.message}</p>}
        </section>

        {/* Line Items */}
        <section className="space-y-4 p-4 border rounded-md">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-primary">Line Items</h3>
            <Button type="button" variant="outline" size="sm" onClick={addNewLineItem}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>
          {fields.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-2 border-b last:border-b-0">
              <div className="col-span-12 sm:col-span-5">
                <Label htmlFor={`lineItems.${index}.description`} className="sr-only">Description</Label>
                <Input
                  id={`lineItems.${index}.description`}
                  {...register(`lineItems.${index}.description`)}
                  placeholder="Item Description"
                  className="w-full"
                />
                 {errors.lineItems?.[index]?.description && <p className="text-sm text-destructive mt-1">{errors.lineItems[index]?.description?.message}</p>}
              </div>
              <div className="col-span-4 sm:col-span-2">
                 <Label htmlFor={`lineItems.${index}.quantity`} className="sr-only">Quantity</Label>
                <Input
                  id={`lineItems.${index}.quantity`}
                  type="number"
                  step="0.01"
                  {...register(`lineItems.${index}.quantity`)}
                  placeholder="Qty"
                  className="w-full"
                />
                {errors.lineItems?.[index]?.quantity && <p className="text-sm text-destructive mt-1">{errors.lineItems[index]?.quantity?.message}</p>}
              </div>
              <div className="col-span-4 sm:col-span-3">
                <Label htmlFor={`lineItems.${index}.price`} className="sr-only">Price</Label>
                <Input
                  id={`lineItems.${index}.price`}
                  type="number"
                  step="0.01"
                  {...register(`lineItems.${index}.price`)}
                  placeholder="Price"
                  className="w-full"
                />
                {errors.lineItems?.[index]?.price && <p className="text-sm text-destructive mt-1">{errors.lineItems[index]?.price?.message}</p>}
              </div>
              <div className="col-span-4 sm:col-span-2 flex items-center justify-end pt-1 sm:pt-0">
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Remove item">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {errors.lineItems && typeof errors.lineItems.message === 'string' && (
            <p className="text-sm text-destructive mt-1">{errors.lineItems.message}</p>
          )}
        </section>

        {/* Smart Fill Text Area */}
        <section className="space-y-2 p-4 border rounded-md">
          <h3 className="text-lg font-semibold text-primary">Smart Fill Assistant</h3>
          <Label htmlFor="invoiceText">Paste any invoice text or notes here for AI assistance:</Label>
          <Textarea
            id="invoiceText"
            {...register('invoiceText')}
            placeholder="e.g., 'Invoice for John Doe, 123 Apple Street for 2 hours of consulting at $50/hr.'"
            rows={3}
          />
           {errors.invoiceText && <p className="text-sm text-destructive mt-1">{errors.invoiceText.message}</p>}
        </section>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 p-6 border-t">
        <Button type="button" variant="outline" onClick={onSmartFill} className="w-full sm:w-auto">
          <Sparkles className="mr-2 h-4 w-4" /> Smart Fill
        </Button>
        <Button type="button" onClick={onSaveTemplate} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
          <Save className="mr-2 h-4 w-4" /> Save Template
        </Button>
        <Button type="button" onClick={onDownloadPDF} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InvoiceForm;
