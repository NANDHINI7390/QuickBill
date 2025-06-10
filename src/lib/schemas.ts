
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export const lineItemSchema = z.object({
  id: z.string().default(() => uuidv4()), 
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  quantity: z.coerce.number().min(0.01, "Quantity must be positive"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
});

export type LineItemFormValues = z.infer<typeof lineItemSchema>;

export const invoiceFormSchema = z.object({
  id: z.string().default(() => uuidv4()), // Unique ID for the invoice itself
  invoiceNumber: z.string().min(1, "Invoice number is required").default(''), // Will be auto-generated or user-set
  businessName: z.string().min(1, "Business name is required").max(100, "Business name too long"),
  businessAddress: z.string().max(200, "Business address too long").optional(),
  clientName: z.string().min(1, "Client name is required").max(100, "Client name too long"),
  clientAddress: z.string().max(200, "Client address too long").optional(),
  invoiceDate: z.date({ required_error: "Invoice date is required" }),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  invoiceText: z.string().max(1000, "Invoice text too long").optional(),
  // Fields for Firestore, not directly in form but part of the data structure
  userId: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
