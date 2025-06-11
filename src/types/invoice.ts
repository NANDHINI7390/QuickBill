
import type { Timestamp } from 'firebase/firestore';

export interface RentInvoiceDetails {
  // Fields for the rent invoice creation form
  propertyAddress: string;
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
  // tenantWhatsAppForNotification?: string; // Future enhancement
  // tenantSmsForNotification?: string; // Future enhancement

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Optional notes
  invoiceNotes?: string;
}

export type StoredInvoice = InvoiceFormValues;
