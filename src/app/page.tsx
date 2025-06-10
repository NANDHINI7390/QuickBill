
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceFormSchema, type InvoiceFormValues } from '@/lib/schemas';
import Header from '@/components/header';
import InvoiceForm from '@/components/invoice-form';
import InvoicePreview from '@/components/invoice-preview';
import { handleSmartFillServerAction } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, FileText } from 'lucide-react';
import { INVOICE_SCENARIOS, type InvoiceScenarioId, getScenarioConfig } from '@/config/invoice-scenarios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const generateInvoiceNumber = (): string => {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${datePart}-${randomPart}`;
};

const getFreshInvoice = (invoiceType: InvoiceScenarioId = 'custom'): InvoiceFormValues => {
  const scenarioDefaults = getScenarioConfig(invoiceType);
  let initialLineItemDescription = "Service/Product Description";
  if (invoiceType === 'rent' && scenarioDefaults?.lineItemSuggestion) {
    initialLineItemDescription = scenarioDefaults.lineItemSuggestion;
  }

  return {
    id: uuidv4(),
    invoiceType: invoiceType,
    invoiceNumber: generateInvoiceNumber(),
    businessName: '',
    businessAddress: '',
    clientName: '',
    clientAddress: '',
    invoiceDate: new Date(),
    lineItems: [{ id: uuidv4(), description: initialLineItemDescription, quantity: 1, price: 0 }],
    invoiceText: '',
    rentPeriod: '',
    userId: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  };
};

export default function QuickBillPage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedScenario, setSelectedScenario] = useState<InvoiceScenarioId | null>(null);
  
  const methods = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    // Default values will be set once a scenario is selected or loaded
    // defaultValues: getFreshInvoice(), // Remove initial default values here
    mode: 'onChange',
  });

  const { watch, reset, getValues, setValue, formState: {isDirty, isValid} } = methods;
  const formData = watch();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isClient, setIsClient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSmartFilling, setIsSmartFilling] = useState(false);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  const resetFormToFreshInvoice = useCallback((scenarioId: InvoiceScenarioId) => {
    const freshInvoice = getFreshInvoice(scenarioId);
    if (user) {
      freshInvoice.userId = user.uid;
    }
    reset(freshInvoice);
  }, [reset, user]);

  useEffect(() => {
    setIsClient(true);
    const invoiceIdToLoad = searchParams.get('loadInvoiceId');
    if (invoiceIdToLoad && user) {
      // If loading an existing invoice, scenario is part of the loaded data
      setIsLoadingInvoice(true);
      const fetchInvoice = async () => {
        try {
          const invoiceDocRef = doc(db, `users/${user.uid}/invoices`, invoiceIdToLoad);
          const invoiceSnap = await getDoc(invoiceDocRef);
          if (invoiceSnap.exists()) {
            const invoiceData = invoiceSnap.data() as InvoiceFormValues;
            setSelectedScenario(invoiceData.invoiceType); // Set scenario from loaded data
            
            if (invoiceData.invoiceDate && invoiceData.invoiceDate instanceof Timestamp) {
              invoiceData.invoiceDate = invoiceData.invoiceDate.toDate();
            }
            if (invoiceData.createdAt && invoiceData.createdAt instanceof Timestamp) {
              invoiceData.createdAt = invoiceData.createdAt.toDate();
            }
            if (invoiceData.updatedAt && invoiceData.updatedAt instanceof Timestamp) {
              invoiceData.updatedAt = invoiceData.updatedAt.toDate();
            }
            invoiceData.lineItems = (invoiceData.lineItems || []).map(item => ({...item, id: item.id || uuidv4()}));
            if (!invoiceData.rentPeriod) invoiceData.rentPeriod = ''; // Ensure optional fields are at least empty strings

            reset(invoiceData);
            toast({ title: "Invoice Loaded", description: `Invoice ${invoiceData.invoiceNumber} loaded.` });
          } else {
            toast({ variant: "destructive", title: "Not Found", description: "Could not find the invoice to load." });
            // Don't reset to fresh yet, let user pick scenario if load fails
          }
        } catch (error) {
          console.error("Error loading invoice:", error);
          toast({ variant: "destructive", title: "Load Error", description: "Failed to load the invoice." });
        } finally {
          setIsLoadingInvoice(false);
          router.replace('/', { scroll: false }); 
        }
      };
      fetchInvoice();
    } else if (!invoiceIdToLoad && selectedScenario) {
      // If no invoice to load but a scenario is selected, initialize form for that scenario
      resetFormToFreshInvoice(selectedScenario);
    }
    // If no invoice to load and no scenario selected, form remains uninitialized until scenario picked
  }, [user, searchParams, reset, toast, router, resetFormToFreshInvoice, selectedScenario]);

  const handleScenarioSelect = (scenarioId: InvoiceScenarioId) => {
    setSelectedScenario(scenarioId);
    resetFormToFreshInvoice(scenarioId);
  };
  
  const handleSmartFill = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Login Required", description: "Please log in to use Smart Fill." });
      router.push('/login?redirect=/'); 
      return;
    }
    const currentValues = getValues();
    setIsSmartFilling(true);
    toast({ title: "Smart Fill In Progress...", description: "AI is analyzing your input." });
    try {
      const suggestions = await handleSmartFillServerAction({...currentValues, invoiceType: selectedScenario!});
      if (Object.keys(suggestions).length > 0) {
        Object.entries(suggestions).forEach(([key, value]) => {
          if (value !== undefined && key in currentValues) {
             setValue(key as keyof InvoiceFormValues, value, { shouldValidate: true, shouldDirty: true });
          }
        });
        toast({ title: "Smart Fill Complete!", description: "Fields updated with AI suggestions." });
      } else {
        toast({ title: "Smart Fill", description: "No specific suggestions found." });
      }
    } catch (error) {
      console.error("Smart Fill client-side error:", error);
      toast({ variant: "destructive", title: "Smart Fill Error", description: "Could not apply suggestions." });
    } finally {
      setIsSmartFilling(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!user && selectedScenario !== 'delivery_receipt') { // Allow delivery receipt download without login as an example
      toast({ variant: "destructive", title: "Login Required", description: "Please log in to download the PDF." });
      router.push('/login?redirect=/');
      return;
    }
    if (isClient) {
      toast({ title: "Preparing PDF...", description: "Your browser's print dialog will appear." });
      setTimeout(() => window.print(), 500);
    }
  };

  const handleSaveInvoice = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Login Required", description: "Please log in to save invoices." });
      router.push('/login?redirect=/');
      return;
    }
    if (!isValid) {
       toast({ variant: "destructive", title: "Invalid Form", description: "Please correct the errors before saving." });
       // Trigger validation display
       methods.trigger();
       return;
    }

    setIsSaving(true);
    const currentFormValues = getValues();
    
    const invoiceDataToSave: InvoiceFormValues = {
      ...currentFormValues,
      invoiceType: selectedScenario!, // Ensure invoiceType is set
      userId: user.uid,
      updatedAt: serverTimestamp() as any, 
      ...(currentFormValues.createdAt ? {} : { createdAt: serverTimestamp() as any }),
    };
    if (!invoiceDataToSave.id) {
      invoiceDataToSave.id = uuidv4();
    }
    if (!invoiceDataToSave.invoiceNumber) {
      invoiceDataToSave.invoiceNumber = generateInvoiceNumber();
      setValue('invoiceNumber', invoiceDataToSave.invoiceNumber);
    }

    try {
      const invoiceDocRef = doc(db, `users/${user.uid}/invoices`, invoiceDataToSave.id);
      await setDoc(invoiceDocRef, invoiceDataToSave, { merge: true });
      
      // After successful save, reset form state while keeping values
      // Convert serverTimestamp to Date for client state
      const now = new Date();
      setValue('updatedAt', now, {shouldDirty: false}); 
      if (!getValues('createdAt')) {
         setValue('createdAt', now, {shouldDirty: false});
      }
      methods.reset(getValues(), { keepValues: true, keepDirty: false, keepDefaultValues: false });


      toast({
        title: "Invoice Saved",
        description: `Invoice ${invoiceDataToSave.invoiceNumber} has been saved.`,
      });
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast({ variant: "destructive", title: "Save Error", description: "Could not save the invoice." });
    } finally {
      setIsSaving(false);
    }
  };
  
  useEffect(() => {
    if (user && !getValues('userId') && selectedScenario) { // only set if a scenario is active
      setValue('userId', user.uid, { shouldDirty: false });
    }
  }, [user, setValue, getValues, selectedScenario]);

  if (authLoading || !isClient || isLoadingInvoice) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 font-body flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
           <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!selectedScenario) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 font-body">
        <Header />
        <main className="max-w-2xl mx-auto mt-8">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary flex items-center">
                <FileText className="mr-3 h-7 w-7" />
                What type of invoice are you creating?
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
              {INVOICE_SCENARIOS.map(scenario => (
                <Button
                  key={scenario.id}
                  variant="outline"
                  className="text-left justify-start py-6 text-base hover:bg-accent/80 hover:border-primary"
                  onClick={() => handleScenarioSelect(scenario.id)}
                >
                  {scenario.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 font-body">
        <Header onBackToScenarioSelection={() => setSelectedScenario(null)} currentScenarioLabel={INVOICE_SCENARIOS.find(s => s.id === selectedScenario)?.label} />
        <main className="max-w-7xl mx-auto mt-4 sm:mt-8">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
              <div className="lg:col-span-3">
                <InvoiceForm
                  selectedScenarioId={selectedScenario}
                  onSmartFill={handleSmartFill}
                  onDownloadPDF={handleDownloadPDF}
                  onSaveInvoice={handleSaveInvoice}
                  onNewInvoice={() => resetFormToFreshInvoice(selectedScenario)} // New invoice within current scenario
                  isSaving={isSaving}
                  isSmartFilling={isSmartFilling}
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
