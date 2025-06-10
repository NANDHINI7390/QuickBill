
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { serverTimestamp, doc, writeBatch } from 'firebase/firestore';

import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { invoiceFormSchema, type InvoiceFormValues, type LineItemFormValues } from '@/lib/schemas';
import { SCENARIOS, getScenario, type Scenario, type ScenarioId, type ScenarioField } from '@/config/invoice-scenarios';
import { Loader2, CalendarDays, PlusCircle, Trash2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function generatePublicInvoiceId(length = 8): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `QB-${result.toUpperCase()}`;
}

const formContainerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const fieldVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } },
  exit: { opacity: 0, x: 10, transition: { duration: 0.15 } },
};

export default function NewInvoicePage() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId | null>(null);
  const [currentScenario, setCurrentScenario] = useState<Scenario | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const methods = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    mode: 'onChange', // Validate on change for better UX
  });

  const { control, register, handleSubmit, reset, watch, setValue, formState: { errors, isValid } } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  useEffect(() => {
    if (selectedScenarioId) {
      const scenarioConfig = getScenario(selectedScenarioId);
      setCurrentScenario(scenarioConfig);
      if (scenarioConfig) {
        const defaultValues: Partial<InvoiceFormValues> = {
          ...scenarioConfig.defaultValues, // Spread scenario defaults first
          id: uuidv4(), // New internal ID for this form session
          invoiceType: selectedScenarioId,
          invoiceNumber: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${generatePublicInvoiceId(4).substring(3)}`, // Example INV-202407-ABCD
          // Ensure date fields are initialized properly based on scenario
          invoiceDate: scenarioConfig.defaultValues.invoiceDate || scenarioConfig.defaultValues.paymentDate || scenarioConfig.defaultValues.saleDate || new Date(),
        };
        if (scenarioConfig.hasLineItems && (!defaultValues.lineItems || defaultValues.lineItems.length === 0)) {
          defaultValues.lineItems = [{ id: uuidv4(), description: '', quantity: 1, price: 0 }];
        }
        reset(defaultValues as InvoiceFormValues); // Reset form with new defaults
        setValue('invoiceType', selectedScenarioId); // Ensure invoiceType is explicitly set
      }
    } else {
      setCurrentScenario(undefined);
      reset({ id: uuidv4(), invoiceType: undefined } as any); // Reset to a base state if no scenario
    }
  }, [selectedScenarioId, reset, setValue]);
  
  useEffect(() => {
    if (selectedScenarioId) {
      document.getElementById('invoice-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedScenarioId]);

  const onSubmit = async (data: InvoiceFormValues) => {
    setIsSubmitting(true);
    
    const publicId = generatePublicInvoiceId();
    const internalId = data.id || uuidv4(); // Should always have an ID from reset

    // Calculate grandTotal
    let calculatedGrandTotal = 0;
    if (data.invoiceType === 'rent' && data.rentAmount) {
        calculatedGrandTotal = data.rentAmount;
    } else if (data.invoiceType === 'freelance' && data.rate && data.hoursWorked) {
        calculatedGrandTotal = data.rate * data.hoursWorked;
    } else if (data.invoiceType === 'product_sale' && data.quantity && data.unitPrice) {
        calculatedGrandTotal = data.quantity * data.unitPrice;
    } else if (data.invoiceType === 'custom' && data.lineItems) {
        let subtotal = data.lineItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        let taxAmount = 0;
        if (data.tax) {
            if (data.tax.includes('%')) {
                taxAmount = subtotal * (parseFloat(data.tax.replace('%','')) / 100);
            } else {
                taxAmount = parseFloat(data.tax) || 0; // Default to 0 if parse fails
            }
        }
        calculatedGrandTotal = subtotal + taxAmount;
    }
    
    const invoiceData: InvoiceFormValues = {
      ...data,
      id: internalId, // This is the internal form session ID, might not be the final invoice ID
      publicInvoiceId: publicId,
      userId: user?.uid || undefined, // Store userId if logged in
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
      invoiceNumber: data.invoiceNumber || `INV-${publicId.slice(3)}`, // Ensure invoiceNumber
      grandTotal: calculatedGrandTotal, // Store the calculated grand total
    };
    
    // Ensure correct date field is primary based on type for preview consistency
    if (data.invoiceType === 'rent' && data.paymentDate) invoiceData.invoiceDate = data.paymentDate;
    else if (data.invoiceType === 'product_sale' && data.saleDate) invoiceData.invoiceDate = data.saleDate;
    // For freelance and custom, invoiceDate is already the primary date field.

    try {
      const batch = writeBatch(db);
      
      // Save to public 'invoices' collection (primary for preview)
      const publicInvoiceRef = doc(db, 'invoices', publicId);
      batch.set(publicInvoiceRef, invoiceData);

      // If user is logged in, save a reference or copy to their user-specific collection
      if (user) {
        const userInvoiceDocId = uuidv4(); // Use a new UUID for the user-specific doc if needed or use internalId
        const userInvoiceRef = doc(db, `users/${user.uid}/invoices`, userInvoiceDocId);
        // Store full data or a subset/reference. For now, storing full data for consistency.
        batch.set(userInvoiceRef, { ...invoiceData, id: userInvoiceDocId }); // Ensure this doc has its own unique ID
      }

      await batch.commit();

      toast({ title: "Invoice Saved!", description: "Redirecting to preview...", className: "bg-primary text-primary-foreground" });
      router.push(`/preview/${publicId}`);
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast({ title: "Error", description: "Could not save invoice. " + (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderField = (fieldConfig: ScenarioField) => {
    const fieldError = errors[fieldConfig.name as keyof InvoiceFormValues];
    const commonInputProps = {
      id: fieldConfig.name,
      placeholder: fieldConfig.placeholder,
      ...register(fieldConfig.name as keyof InvoiceFormValues, {
          valueAsNumber: fieldConfig.type === 'number',
          valueAsDate: fieldConfig.type === 'date', // RHF handles date string to Date object
      }),
      className: `transition-all duration-300 ease-in-out focus:ring-primary focus:border-primary ${fieldError ? 'border-destructive ring-destructive ring-1' : 'border-border'}`
    };

    return (
      <motion.div key={fieldConfig.name} variants={fieldVariants} className="space-y-1.5 mb-4">
        <Label htmlFor={fieldConfig.name} className="text-neutral-700 dark:text-neutral-300">{fieldConfig.label}</Label>
        {fieldConfig.type === 'textarea' ? (
          <Textarea {...commonInputProps} rows={3} />
        ) : fieldConfig.type === 'date' ? (
          <Controller
            name={fieldConfig.name as keyof InvoiceFormValues}
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 text-base md:text-sm",
                      !field.value && "text-muted-foreground",
                       fieldError ? 'border-destructive ring-destructive ring-1' : 'border-border'
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {field.value ? format(new Date(field.value as string | number | Date), "PPP") : <span>{fieldConfig.placeholder || 'Pick a date'}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value as string | number | Date) : undefined}
                    onSelect={(date) => field.onChange(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        ) : (
          <Input {...commonInputProps} type={fieldConfig.type} />
        )}
        {fieldError && <p className="text-xs text-destructive mt-1">{fieldError.message}</p>}
      </motion.div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="max-w-3xl mx-auto py-8 px-4">
          <Card className="shadow-xl mb-8 border-border bg-card">
            <CardHeader>
              <CardTitle className="font-headline text-2xl sm:text-3xl text-primary">Create New Invoice</CardTitle>
              <CardDescription className="text-muted-foreground">
                Select the type of invoice you want to create.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                onValueChange={(value) => setSelectedScenarioId(value as ScenarioId)}
                className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                value={selectedScenarioId || ""}
              >
                {SCENARIOS.map((scenario) => (
                  <motion.div
                    key={scenario.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <RadioGroupItem
                      value={scenario.id}
                      id={scenario.id}
                      className="sr-only"
                      aria-label={scenario.label}
                    />
                    <Label
                      htmlFor={scenario.id}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 h-24 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all duration-300 ease-in-out",
                        selectedScenarioId === scenario.id && "border-primary ring-2 ring-primary shadow-lg bg-primary/10"
                      )}
                    >
                      <span className="block text-sm font-semibold text-center">{scenario.label}</span>
                    </Label>
                  </motion.div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {selectedScenarioId && currentScenario && (
              <motion.div
                key={selectedScenarioId} // Ensures re-animation on scenario change
                variants={formContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                id="invoice-form-section"
              >
                <form onSubmit={handleSubmit(onSubmit)}>
                  <Card className="shadow-xl border-border bg-card">
                    <CardHeader>
                      <CardTitle className="font-headline text-xl text-primary">{currentScenario.label} Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Generic fields applicable to most scenarios */}
                      <motion.section variants={fieldVariants}>
                        <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-3 border-b pb-2">Invoice Setup</h3>
                        {renderField({ name: 'invoiceNumber', label: 'Invoice Number', placeholder: 'e.g., INV-2024-001', type: 'text', section: 'invoice_details'})}
                      </motion.section>
                      
                      {/* Party Details Section */}
                      <motion.section variants={fieldVariants}>
                        <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-3 border-b pb-2">Party Details</h3>
                         {currentScenario.fields.filter(f => f.section === 'party_details').map(renderField)}
                      </motion.section>

                      {/* Invoice Details Section */}
                      <motion.section variants={fieldVariants}>
                        <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-3 border-b pb-2">Invoice Details</h3>
                          {currentScenario.fields.filter(f => f.section === 'invoice_details').map(renderField)}
                      </motion.section>
                      
                      {currentScenario.hasLineItems && (
                        <motion.section variants={fieldVariants}>
                          <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-3 border-b pb-2">Line Items</h3>
                          <AnimatePresence>
                          {fields.map((item, index) => (
                            <motion.div 
                              key={item.id} 
                              className="grid grid-cols-12 gap-2 items-start p-2 border-b last:border-b-0"
                              variants={fieldVariants} initial="hidden" animate="visible" exit={{ opacity: 0, x: 10, transition: { duration: 0.15 } }}
                              layout // Animate layout changes
                            >
                              <div className="col-span-12 sm:col-span-5 space-y-1">
                                <Label htmlFor={`lineItems.${index}.description`} className="sr-only">Description</Label>
                                <Input {...register(`lineItems.${index}.description`)} placeholder="Item Description" className="w-full"/>
                                {errors.lineItems?.[index]?.description && <p className="text-xs text-destructive mt-1">{errors.lineItems[index]?.description?.message}</p>}
                              </div>
                              <div className="col-span-4 sm:col-span-2 space-y-1">
                                <Label htmlFor={`lineItems.${index}.quantity`} className="sr-only">Quantity</Label>
                                <Input type="number" {...register(`lineItems.${index}.quantity`, {valueAsNumber: true})} placeholder="Qty" className="w-full"/>
                                 {errors.lineItems?.[index]?.quantity && <p className="text-xs text-destructive mt-1">{errors.lineItems[index]?.quantity?.message}</p>}
                              </div>
                              <div className="col-span-4 sm:col-span-3 space-y-1">
                                 <Label htmlFor={`lineItems.${index}.price`} className="sr-only">Price</Label>
                                <Input type="number" {...register(`lineItems.${index}.price`, {valueAsNumber: true})} placeholder="Price (₹)" className="w-full"/>
                                {errors.lineItems?.[index]?.price && <p className="text-xs text-destructive mt-1">{errors.lineItems[index]?.price?.message}</p>}
                              </div>
                              <div className="col-span-4 sm:col-span-2 flex items-center justify-end pt-1 sm:pt-0">
                                {fields.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Remove item">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                )}
                              </div>
                            </motion.div>
                          ))}
                          </AnimatePresence>
                           {errors.lineItems && typeof errors.lineItems.message === 'string' && !errors.lineItems.root && ( // Array-level error message
                            <p className="text-sm text-destructive mt-1">{errors.lineItems.message}</p>
                          )}
                          {errors.lineItems?.root && ( // Root error (e.g. minLength)
                             <p className="text-sm text-destructive mt-1">{errors.lineItems.root.message}</p>
                          )}
                          <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), description: '', quantity: 1, price: 0 })} className="mt-3 transition-colors duration-300 ease-in-out">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                          </Button>
                        </motion.section>
                      )}

                       {currentScenario.fields.some(f => f.section === 'summary_details') && (
                        <motion.section variants={fieldVariants}>
                            <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-3 border-b pb-2">Summary & Notes</h3>
                            {currentScenario.fields.filter(f => f.section === 'summary_details').map(renderField)}
                        </motion.section>
                       )}
                    </CardContent>
                    <CardFooter>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 17 }} className="w-full">
                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 transition-all duration-300 ease-in-out" disabled={isSubmitting || !isValid}>
                          {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                          Save & Proceed to Preview
                        </Button>
                      </motion.div>
                    </CardFooter>
                  </Card>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </FormProvider>
  );
}
