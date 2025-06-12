
import type { Timestamp } from 'firebase/firestore';

export interface RentInvoiceDetails {
  // Property Address Fields
  propertyPlotNo: string;
  propertyStreet: string;
  propertyArea: string;
  propertyCity: string;
  
  // Other rent invoice fields
  rentAmount: number;
  rentPeriod: string; // e.g., "July 2024"
  tenantName: string;
  landlordName: string;
  landlordMobileNumber: string; // For sending the verification link
}

export interface InvoiceFormValues extends RentInvoiceDetails {
  id: string; // Internal UUID for the document in users collection (if saved by user)
  publicInvoiceId: string; // Publicly shareable/referenceable ID (used as doc ID in top-level 'invoices' collection)
  
  userId?: string; // Creator's Firebase UID, if they are logged in
  invoiceNumber?: string; // Auto-generated or user-input
  invoiceDate: Date | Timestamp; // Date of invoice creation or effective date
  
  // Signature Flow Fields
  signatureToken?: string; // Unique token for the signing link
  signatureRequestedAt?: Timestamp; // When the signature request was initiated (effectively invoice creation time)
  
  // Statuses: "awaiting_landlord_signature", "signed_by_landlord", "expired", "declined"
  signatureStatus: 'awaiting_landlord_signature' | 'signed_by_landlord' | 'expired' | 'declined';
  
  signedByLandlordAt?: Timestamp; // When the landlord signed
  landlordSignatureDataUrl?: string; // The actual signature image as a Data URL
  
  // Tenant Notification Preferences
  notifyTenant?: boolean;
  tenantEmailForNotification?: string;

  // Optional notes
  invoiceNotes?: string;

  // Fields for backend automation
  sentToMobileAt?: Timestamp;
  otpVerifiedAt?: Timestamp;
  pdfStoragePath?: string;
  linkStatus?: 'active' | 'used' | 'expired';
  signingError?: string;
  signerIpAddress?: string;
  signingUserAgent?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type StoredInvoice = InvoiceFormValues;
