
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { SCENARIOS, type ScenarioId } from '@/config/invoice-scenarios';

const scenarioIds = SCENARIOS.map(s => s.id) as [ScenarioId, ...ScenarioId[]]; // Ensures at least one, and type safety

export const lineItemSchema = z.object({
  id: z.string().default(() => uuidv4()),
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  quantity: z.coerce.number().min(0.01, "Quantity must be positive"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
});
export type LineItemFormValues = z.infer<typeof lineItemSchema>;

export const invoiceFormSchema = z.object({
  id: z.string().default(() => uuidv4()),
  publicInvoiceId: z.string().optional(),
  invoiceType: z.enum(scenarioIds),
  invoiceNumber: z.string().max(50, "Invoice number too long").optional(),
  userId: z.string().optional(),
  createdAt: z.custom<any>().optional(), // Firestore Timestamp or Date
  updatedAt: z.custom<any>().optional(), // Firestore Timestamp or Date

  // Party details (general terms, specific labels handled by UI)
  issuerName: z.string().max(100, "Issuer name too long").optional(), // For 'custom' scenario: Company/Issuer Name
  clientName: z.string().max(100, "Client name too long").optional(), // Common client name field

  // Rent Scenario Specific
  landlordName: z.string().max(100, "Landlord name too long").optional(),
  tenantName: z.string().max(100, "Tenant name too long").optional(),
  propertyAddress: z.string().max(200, "Property address too long").optional(),
  rentAmount: z.coerce.number().positive("Rent amount must be positive.").optional(),
  paymentDate: z.date().optional(),
  rentDuration: z.string().max(50, "Duration too long").optional(),

  // Freelance Work Specific
  freelancerName: z.string().max(100, "Freelancer name too long").optional(),
  // clientName is shared
  serviceDescription: z.string().max(500, "Service description too long").optional(),
  rate: z.coerce.number().nonnegative("Rate cannot be negative.").optional(),
  hoursWorked: z.coerce.number().positive("Hours worked must be positive.").optional(),
  // Total Amount for freelance is calculated, stored in grandTotal

  // Product Sale Specific
  sellerName: z.string().max(100, "Seller name too long").optional(),
  buyerName: z.string().max(100, "Buyer name too long").optional(),
  productDescription: z.string().max(200, "Product description too long").optional(), // For single product entry
  quantity: z.coerce.number().min(0.01, "Quantity must be positive.").optional(), // For single product entry
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative.").optional(), // For single product entry
  // Total for product sale is calculated, stored in grandTotal
  paymentMethod: z.string().max(50, "Payment method too long.").optional(),
  saleDate: z.date().optional(),

  // Common/Custom Invoice fields
  invoiceDate: z.date().optional(), // Common invoice date; for Rent it's paymentDate, for Product it's saleDate
  lineItems: z.array(lineItemSchema).min(0).optional(), 
  tax: z.string().max(50, "Tax value too long").optional(), // e.g., "18%" or "500" (string to allow '%')
  grandTotal: z.coerce.number().optional(), // Will be calculated and stored
  invoiceNotes: z.string().max(1000, "Notes too long").optional(),
  
  // For Smart Fill / AI (keeping for potential future use if old form elements are reused)
  invoiceText: z.string().max(1000, "Invoice text for AI too long").optional(),

}).superRefine((data, ctx) => {
  // Conditional validation based on invoiceType
  if (data.invoiceType === 'rent') {
    if (!data.landlordName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Landlord Name is required.", path: ['landlordName'] });
    if (!data.tenantName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tenant Name is required.", path: ['tenantName'] });
    if (!data.propertyAddress) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Property Address is required.", path: ['propertyAddress'] });
    if (data.rentAmount === undefined || data.rentAmount <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valid Rent Amount is required.", path: ['rentAmount'] });
    if (!data.paymentDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Payment Date is required.", path: ['paymentDate'] });
    if (!data.rentDuration) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Rent Duration is required.", path: ['rentDuration'] });
  }

  if (data.invoiceType === 'freelance') {
    if (!data.freelancerName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Freelancer Name is required.", path: ['freelancerName'] });
    if (!data.clientName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Client Name is required.", path: ['clientName'] });
    if (!data.serviceDescription) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Service Description is required.", path: ['serviceDescription'] });
    // Rate and Hours can be optional if total is directly entered or calculated via line items later
    if (!data.invoiceDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invoice Date is required.", path: ['invoiceDate'] });
  }

  if (data.invoiceType === 'product_sale') {
    if (!data.sellerName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Seller Name is required.", path: ['sellerName'] });
    if (!data.buyerName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Buyer Name is required.", path: ['buyerName'] });
    if (!data.productDescription) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Product Description is required.", path: ['productDescription'] });
    if ((data.quantity === undefined || data.quantity <= 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valid Quantity is required.", path: ['quantity'] });
    if ((data.unitPrice === undefined || data.unitPrice < 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valid Unit Price is required.", path: ['unitPrice'] });
    if (!data.saleDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sale Date is required.", path: ['saleDate'] });
  }
  
  if (data.invoiceType === 'custom') {
    if (!data.issuerName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Company/Issuer Name is required.", path: ['issuerName'] });
    if (!data.clientName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Client Name is required.", path: ['clientName'] });
    if (!data.invoiceDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invoice Date is required.", path: ['invoiceDate'] });
    if (!data.lineItems || data.lineItems.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one line item is required for custom invoices.",
        path: ['lineItems'], // Points to the array itself
      });
    }
  }
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
