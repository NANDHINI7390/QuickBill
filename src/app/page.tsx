'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceFormSchema, type InvoiceFormValues } from '@/lib/schemas';
import Header from '@/components/header';
import InvoiceForm from '@/components/invoice-form';
import InvoicePreview from '@/components/invoice-preview';
import { handleSmartFillServerAction } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

const defaultValues: InvoiceFormValues = {
  businessName: '',
  businessAddress: '',
  clientName: '',
  clientAddress: '',
  invoiceDate: new Date(),
  lineItems: [{ id: uuidv4(), description: '', quantity: 1, price: 0 }],
  invoiceText: '',
};

export default function QuickBillPage() {
  const methods = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { watch, reset, getValues, setValue } = methods;
  const formData = watch();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Load saved template from localStorage
    const savedTemplate = localStorage.getItem('quickbill-template');
    if (savedTemplate) {
      try {
        const parsedTemplate = JSON.parse(savedTemplate) as InvoiceFormValues;
        // Convert date strings back to Date objects
        if (parsedTemplate.invoiceDate) {
          parsedTemplate.invoiceDate = new Date(parsedTemplate.invoiceDate);
        }
        // Ensure line items have IDs if they are missing (e.g. from older saves)
        parsedTemplate.lineItems = parsedTemplate.lineItems.map(item => ({...item, id: item.id || uuidv4()}));
        
        // Validate before resetting (optional, but good practice)
        const validation = invoiceFormSchema.safeParse(parsedTemplate);
        if (validation.success) {
          reset(validation.data);
          toast({
            title: "Template Loaded",
            description: "Previously saved invoice data has been loaded.",
          });
        } else {
          console.warn("Saved template is invalid, loading default values.", validation.error.flatten());
          localStorage.removeItem('quickbill-template'); // Remove invalid data
          reset(defaultValues); // Reset to fresh defaults
        }
      } catch (error) {
        console.error("Failed to load or parse saved template:", error);
        localStorage.removeItem('quickbill-template'); // Clear corrupted data
        reset(defaultValues); // Reset to fresh defaults
      }
    }
  }, [reset, toast]);


  const handleSmartFill = async () => {
    const currentValues = getValues();
    toast({ title: "Smart Fill In Progress...", description: "AI is analyzing your input." });
    try {
      const suggestions = await handleSmartFillServerAction(currentValues);
      if (Object.keys(suggestions).length > 0) {
        // Selectively update fields. `reset` might overwrite user's deliberate choices.
        Object.entries(suggestions).forEach(([key, value]) => {
          if (value !== undefined && key in currentValues) {
             setValue(key as keyof InvoiceFormValues, value, { shouldValidate: true, shouldDirty: true });
          }
        });
        toast({ title: "Smart Fill Complete!", description: "Fields updated with AI suggestions." });
      } else {
        toast({ title: "Smart Fill", description: "No specific suggestions found, or an error occurred." });
      }
    } catch (error) {
      console.error("Smart Fill client-side error:", error);
      toast({ variant: "destructive", title: "Smart Fill Error", description: "Could not apply suggestions." });
    }
  };

  const handleDownloadPDF = () => {
    if (isClient) {
      toast({ title: "Preparing PDF...", description: "Your browser's print dialog will appear." });
      setTimeout(() => window.print(), 500); // Delay to allow toast to show
    }
  };

  const handleSaveTemplate = () => {
     if (isClient) {
      const currentFormValues = getValues();
      // Validate before saving
      const validation = invoiceFormSchema.safeParse(currentFormValues);
      if (validation.success) {
        localStorage.setItem('quickbill-template', JSON.stringify(validation.data));
        toast({
          title: "Template Saved",
          description: "Invoice data saved locally in your browser.",
        });
      } else {
         toast({
          variant: "destructive",
          title: "Save Error",
          description: "Could not save, form data is invalid. Please check errors.",
        });
        console.error("Form validation failed on save:", validation.error.flatten());
      }
    }
  };
  
  if (!isClient) {
    // Render a loading state or null until client-side hydration to avoid mismatches with localStorage
    return (
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 font-body flex flex-col items-center justify-center">
        <Header />
        <p className="text-lg text-muted-foreground mt-8">Loading QuickBill...</p>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 font-body">
        <Header />
        <main className="max-w-7xl mx-auto mt-4 sm:mt-8">
          {/* Form submission is handled by buttons, so <form> tag is for semantics and accessibility */}
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
              <div className="lg:col-span-3">
                <InvoiceForm
                  onSmartFill={handleSmartFill}
                  onDownloadPDF={handleDownloadPDF}
                  onSaveTemplate={handleSaveTemplate}
                />
              </div>
              <div className="lg:col-span-2">
                <InvoicePreview formData={formData} />
              </div>
            </div>
          </form>
        </main>
      </div>
    </FormProvider>
  );
}
