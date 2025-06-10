
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { SCENARIOS, type ScenarioId } from '@/config/invoice-scenarios';

const scenarioIds = SCENARIOS.map(s => s.id) as [ScenarioId, ...ScenarioId[]];

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
  invoiceNumber: z.string().optional(), // Made optional, can be auto-generated
  userId: z.string().optional(),
  createdAt: z.custom<any>().optional(),
  updatedAt: z.custom<any>().optional(),

  // Party details (general terms, labels will be dynamic)
  issuerName: z.string().max(100, "Issuer name too long").optional(), // Covers Landlord, Freelancer, Seller, Company
  issuerAddress: z.string().max(200, "Issuer address too long").optional(),
  clientName: z.string().max(100, "Client name too long").optional(), // Covers Tenant, Client, Buyer
  clientAddress: z.string().max(200, "Client address too long").optional(),

  // Rent Scenario Specific
  landlordName: z.string().max(100).optional(),
  tenantName: z.string().max(100).optional(),
  propertyAddress: z.string().max(200).optional(),
  rentAmount: z.coerce.number().positive("Rent amount must be positive.").optional(),
  paymentDate: z.date().optional(),
  rentDuration: z.string().max(50, "Duration too long").optional(),

  // Freelance Work Specific
  freelancerName: z.string().max(100).optional(),
  // clientName is shared
  serviceDescription: z.string().max(500, "Service description too long").optional(),
  rate: z.coerce.number().nonnegative("Rate cannot be negative.").optional(),
  hoursWorked: z.coerce.number().positive("Hours worked must be positive.").optional(),
  // totalAmount can be calculated or part of lineItems if scenario evolves

  // Product Sale Specific
  sellerName: z.string().max(100).optional(),
  buyerName: z.string().max(100).optional(),
  productDescription: z.string().max(200).optional(), // For single product entry
  quantity: z.coerce.number().min(0.01).optional(), // For single product entry
  unitPrice: z.coerce.number().nonnegative().optional(), // For single product entry
  paymentMethod: z.string().max(50).optional(),
  saleDate: z.date().optional(),

  // Custom Invoice / Common
  invoiceDate: z.date().optional(), // Common invoice date
  lineItems: z.array(lineItemSchema).optional(), // Optional for scenarios not using it
  tax: z.string().max(50).optional(), // e.g., "18%" or "500"
  grandTotal: z.coerce.number().optional(), // Could be calculated
  invoiceNotes: z.string().max(1000, "Notes too long").optional(),
  
  invoiceText: z.string().max(1000, "Invoice text for AI too long").optional(),

}).superRefine((data, ctx) => {
  const scenario = SCENARIOS.find(s => s.id === data.invoiceType);
  if (!scenario) {
    // Should not happen if invoiceType is from the enum
    return;
  }

  // Example conditional validation:
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
    if (!data.issuerName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Issuer Name is required.", path: ['issuerName'] });
    if (!data.clientName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Client Name is required.", path: ['clientName'] });
    if (!data.invoiceDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invoice Date is required.", path: ['invoiceDate'] });
    if (!data.lineItems || data.lineItems.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one line item is required for custom invoices.",
        path: ['lineItems'],
      });
    }
  }
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
