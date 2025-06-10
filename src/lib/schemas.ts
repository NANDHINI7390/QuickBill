
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { INVOICE_SCENARIOS } from '@/config/invoice-scenarios';

const scenarioIds = INVOICE_SCENARIOS.map(s => s.id) as [string, ...string[]]; // Type assertion for z.enum

export const lineItemSchema = z.object({
  id: z.string().default(() => uuidv4()), 
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  quantity: z.coerce.number().min(0.01, "Quantity must be positive"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
});

export type LineItemFormValues = z.infer<typeof lineItemSchema>;

export const invoiceFormSchema = z.object({
  id: z.string().default(() => uuidv4()),
  invoiceType: z.enum(scenarioIds).default('custom'),
  invoiceNumber: z.string().min(1, "Invoice number is required").default(''),
  
  businessName: z.string().max(100, "Business name too long").optional(),
  businessAddress: z.string().max(200, "Business address too long").optional(),
  
  clientName: z.string().min(1, "Client name is required").max(100, "Client name too long"),
  clientAddress: z.string().max(200, "Client address too long").optional(),
  
  invoiceDate: z.date({ required_error: "Invoice date is required" }),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  
  invoiceText: z.string().max(1000, "Invoice text too long").optional(),
  
  // Scenario-specific fields
  rentPeriod: z.string().max(100, "Rent period too long").optional(),

  userId: z.string().optional(),
  createdAt: z.custom<any>().optional(), // Allow serverTimestamp
  updatedAt: z.custom<any>().optional(), // Allow serverTimestamp
}).superRefine((data, ctx) => {
  // Conditional validation based on invoiceType
  const scenarioConfig = INVOICE_SCENARIOS.find(s => s.id === data.invoiceType)?.fields;

  if (scenarioConfig?.showBusinessFields) {
    if (!data.businessName || data.businessName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Business name is required for this invoice type.",
        path: ['businessName'],
      });
    }
  }
  if (data.invoiceType === 'rent' && (!data.rentPeriod || data.rentPeriod.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Rent period is required for Rent Invoices.",
      path: ['rentPeriod'],
    });
  }
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
