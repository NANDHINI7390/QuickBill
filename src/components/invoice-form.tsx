
'use client';

import type { FC } from 'react';
import { useFormContext, Controller, useFieldArray } from 'react-hook-form';
import type { InvoiceFormValues, LineItemFormValues } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, PlusCircle, Save, Sparkles, Trash2, Download, FilePlus2, Share2, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import type { InvoiceScenarioId } from '@/config/invoice-scenarios';
import { getScenarioConfig, getScenarioTag } from '@/config/invoice-scenarios';

interface InvoiceFormProps {
  selectedScenarioId: InvoiceScenarioId;
  onSmartFill: () => Promise<void>;
  onDownloadPDF: () => void;
  onSaveInvoice: () => Promise<void>;
  onNewInvoice: () => void;
  isSaving: boolean;
  isSmartFilling: boolean;
}

const InvoiceForm: FC<InvoiceFormProps> = ({ 
  selectedScenarioId,
  onSmartFill, 
  onDownloadPDF, 
  onSaveInvoice, 
  onNewInvoice,
  isSaving,
  isSmartFilling
}) => {
  const { control, register, formState: { errors, isDirty, isValid }, getValues, trigger } = useFormContext<InvoiceFormValues>();
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const scenarioConfig = getScenarioConfig(selectedScenarioId);
  const scenarioTag = getScenarioTag(selectedScenarioId);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const addNewLineItem = () => {
    let description = "Service/Product Description";
    if (selectedScenarioId === 'rent' && scenarioConfig?.lineItemSuggestion) {
      description = scenarioConfig.lineItemSuggestion + (getValues('rentPeriod') || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
    }
    append({ id: uuidv4(), description, quantity: 1, price: 0 });
  };
  
  const calculateTotalForSharing = (items: LineItemFormValues[] | undefined): number => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
  };

  const formatCurrencyForSharing = (amount: number): string => {
    return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };

  const handleShare = async (type: 'whatsapp' | 'email') => {
    if (!user && selectedScenarioId !== 'delivery_receipt') {
      toast({ variant: "destructive", title: "Login Required", description: "Please log in to share invoices." });
      router.push('/login?redirect=/');
      return;
    }

    const isValidForm = await trigger(); // Manually trigger validation
    if (!isValidForm) {
      toast({ title: "Cannot Share", description: "Please complete the invoice with valid details before sharing.", variant: "destructive" });
      return;
    }

    const formData = getValues();
    const total = calculateTotalForSharing(formData.lineItems);
    const invoiceDateFormatted = formData.invoiceDate ? format(new Date(formData.invoiceDate), 'PPP') : 'N/A';
    const businessDisplayName = formData.businessName || "Your Business";
    const clientDisplayName = formData.clientName || "Valued Client";
    
    let message: string;
    let subject: string | undefined;

    if (type === 'whatsapp') {
      message = 
`Invoice Details ${scenarioTag}:
Number: ${formData.invoiceNumber || 'N/A'}
For: ${clientDisplayName}
Date: ${invoiceDateFormatted}
Total: ${formatCurrencyForSharing(total)}

Sent via QuickBill`;
      window.open(`whatsapp://send?text=${encodeURIComponent(message)}`, '_blank');
    } else if (type === 'email') {
      subject = `Invoice ${formData.invoiceNumber || ''} ${scenarioTag} from ${businessDisplayName}`;
      message = 
`Hello ${clientDisplayName},

Please find your invoice details below ${scenarioTag}:

Invoice Number: ${formData.invoiceNumber || 'N/A'}
Invoice Date: ${invoiceDateFormatted}
Total Amount: ${formatCurrencyForSharing(total)}

Line Items:
${(formData.lineItems || []).map(item => `- ${item.description} (Qty: ${item.quantity}, Price: ${formatCurrencyForSharing(Number(item.price) || 0)})`).join('\n')}

Thank you for your business!

Regards,
${businessDisplayName}
(Sent via QuickBill)`;
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`, '_blank');
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="font-headline text-2xl">Create / Edit {scenarioConfig?.label || 'Invoice'}</CardTitle>
           <Button type="button" variant="outline" size="sm" onClick={onNewInvoice}>
              <FilePlus2 className="mr-2 h-4 w-4" /> New {scenarioConfig?.label || 'Invoice'}
            </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {scenarioConfig?.showBusinessFields && (
          <section className="space-y-4 p-4 border rounded-md">
            <h3 className="text-lg font-semibold text-primary">{scenarioConfig?.businessNameLabel || 'Your Details'}</h3>
            <div>
              <Label htmlFor="businessName">{scenarioConfig?.businessNameLabel || 'Business Name'}</Label>
              <Input id="businessName" {...register('businessName')} placeholder="Your Company LLC" />
              {errors.businessName && <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>}
            </div>
            <div>
              <Label htmlFor="businessAddress">{scenarioConfig?.businessAddressLabel || 'Business Address'}</Label>
              <Textarea id="businessAddress" {...register('businessAddress')} placeholder="123 Main St, Anytown, USA" />
              {errors.businessAddress && <p className="text-sm text-destructive mt-1">{errors.businessAddress.message}</p>}
            </div>
          </section>
        )}

        <section className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-semibold text-primary">{scenarioConfig?.clientNameLabel ? 'Details for ' + scenarioConfig.clientNameLabel : 'Client Details'}</h3>
          <div>
            <Label htmlFor="clientName">{scenarioConfig?.clientNameLabel || 'Client Name'}</Label>
            <Input id="clientName" {...register('clientName')} placeholder="Client Co." />
            {errors.clientName && <p className="text-sm text-destructive mt-1">{errors.clientName.message}</p>}
          </div>
          <div>
            <Label htmlFor="clientAddress">{scenarioConfig?.clientAddressLabel || 'Client Address'}</Label>
            <Textarea id="clientAddress" {...register('clientAddress')} placeholder="456 Client Ave, Otherville, USA" />
            {errors.clientAddress && <p className="text-sm text-destructive mt-1">{errors.clientAddress.message}</p>}
          </div>
        </section>
        
         <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-md items-start">
           <div>
             <Label htmlFor="invoiceDate" className="font-semibold text-primary block mb-1">Invoice Date</Label>
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
                          {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                      </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                      <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={field.onChange}
                          initialFocus
                      />
                      </PopoverContent>
                  </Popover>
                  )}
              />
              {errors.invoiceDate && <p className="text-sm text-destructive mt-1">{errors.invoiceDate.message}</p>}
           </div>
            <div>
              <Label htmlFor="invoiceNumber" className="font-semibold text-primary block mb-1">Invoice Number</Label>
              <Input id="invoiceNumber" {...register('invoiceNumber')} placeholder="e.g. INV-001" />
              {errors.invoiceNumber && <p className="text-sm text-destructive mt-1">{errors.invoiceNumber.message}</p>}
            </div>
             {scenarioConfig?.showRentPeriod && (
                <div className="col-span-1 sm:col-span-2">
                    <Label htmlFor="rentPeriod" className="font-semibold text-primary block mb-1">Rent Period</Label>
                    <Input id="rentPeriod" {...register('rentPeriod')} placeholder="e.g., October 2024" />
                    {errors.rentPeriod && <p className="text-sm text-destructive mt-1">{errors.rentPeriod.message}</p>}
                </div>
            )}
        </section>

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
                  step="any" // Allow decimals
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
                  step="any" // Allow decimals
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
          {errors.lineItems && typeof errors.lineItems.message === 'string' && ( // For array-level errors
            <p className="text-sm text-destructive mt-1">{errors.lineItems.message}</p>
          )}
           {errors.lineItems?.root && <p className="text-sm text-destructive mt-1">{errors.lineItems.root.message}</p>}
        </section>

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
      <CardFooter className="flex flex-col sm:flex-row flex-wrap justify-end gap-3 p-6 border-t">
        <Button type="button" variant="outline" onClick={onSmartFill} className="w-full sm:w-auto" disabled={isSmartFilling || isSaving}>
          <Sparkles className="mr-2 h-4 w-4" /> {isSmartFilling ? 'Filling...' : 'Smart Fill'}
        </Button>
        <Button type="button" onClick={onSaveInvoice} className="w-full sm:w-auto bg-accent hover:bg-accent/90" disabled={isSaving || (!isDirty && !isValid) || !isValid}>
          <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Invoice'}
        </Button>
        <Button type="button" onClick={onDownloadPDF} className="w-full sm:w-auto" disabled={isSaving}>
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
        <Button type="button" variant="outline" onClick={() => handleShare('whatsapp')} className="w-full sm:w-auto" disabled={isSaving || !isValid}>
          <Share2 className="mr-2 h-4 w-4" /> Share via WhatsApp
        </Button>
        <Button type="button" variant="outline" onClick={() => handleShare('email')} className="w-full sm:w-auto" disabled={isSaving || !isValid}>
          <Mail className="mr-2 h-4 w-4" /> Share via Email
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InvoiceForm;
