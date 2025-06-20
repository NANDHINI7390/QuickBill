
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Basic mobile number validation (e.g., for India, 10 digits, can be expanded)
const mobileRegex = /^[6-9]\d{9}$/; // Example for Indian mobile numbers

export const rentInvoiceFormSchema = z.object({
  // Property Address Fields
  propertyPlotNo: z.string().min(1, "Plot number is required.").max(50, "Plot number too long."),
  propertyStreet: z.string().min(1, "Street is required.").max(100, "Street too long."),
  propertyArea: z.string().min(1, "Area/Locality is required.").max(100, "Area/Locality too long."),
  propertyCity: z.string().min(1, "City is required.").max(100, "City too long."),

  // Fields from RentInvoiceDetails for the form
  rentAmount: z.coerce.number().positive("Rent amount must be a positive number."),
  rentPeriod: z.string().min(3, "Rent period is required, e.g., July 2024.").max(50, "Rent period too long."),
  tenantName: z.string().min(1, "Tenant name is required.").max(100, "Tenant name too long."),
  landlordName: z.string().min(1, "Landlord name is required.").max(100, "Landlord name too long."),
  landlordMobileNumber: z.string()
    .min(10, "Mobile number must be at least 10 digits.")
    .max(15, "Mobile number too long.")
    .regex(mobileRegex, "Invalid mobile number format. Please enter a valid 10-digit mobile number."),
  invoiceNotes: z.string().max(1000, "Notes too long").optional(),
  
  // These fields will be set programmatically or are not part of the initial user form
  id: z.string().default(() => uuidv4()), // Internal ID, not form field
  publicInvoiceId: z.string().optional(), // Will be generated
  userId: z.string().optional(), // If user is logged in
  invoiceNumber: z.string().optional(), // Will be auto-generated
  invoiceDate: z.date().default(() => new Date()), // Defaults to now, not a direct form field

  signatureToken: z.string().optional(),
  signatureRequestedAt: z.custom<any>().optional(), // Firestore Timestamp
  signatureStatus: z.enum(['awaiting_landlord_signature', 'signed_by_landlord', 'expired', 'declined']).default('awaiting_landlord_signature'),
  signedByLandlordAt: z.custom<any>().optional(), // Firestore Timestamp
  landlordSignatureDataUrl: z.string().optional(),
  
  // Tenant Notification Preferences - not part of the main form, but part of the schema for storage
  notifyTenant: z.boolean().optional(),
  tenantEmailForNotification: z.string().email("Invalid email address.").optional().or(z.literal('')),

  // Fields for backend automation (placeholders for now)
  sentToMobileAt: z.custom<any>().optional(),
  otpVerifiedAt: z.custom<any>().optional(),
  pdfStoragePath: z.string().optional(),
  linkStatus: z.enum(['active', 'used', 'expired']).optional().default('active'),
  signingError: z.string().optional(),
  signerIpAddress: z.string().optional(),
  signingUserAgent: z.string().optional(),

  createdAt: z.custom<any>().optional(), // Firestore Timestamp
  updatedAt: z.custom<any>().optional(), // Firestore Timestamp
});

export type RentInvoiceFormValues = z.infer<typeof rentInvoiceFormSchema>;
