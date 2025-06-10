
import type { ScenarioId } from '@/config/invoice-scenarios';
import type { Timestamp } from 'firebase/firestore';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export interface InvoiceFormValues {
  // Common fields
  id: string; 
  publicInvoiceId?: string; 
  invoiceType: ScenarioId; 
  invoiceNumber?: string; 
  userId?: string; 
  createdAt?: Timestamp | Date | any; 
  updatedAt?: Timestamp | Date | any; 
  
  // Party details (general terms, labels will be dynamic)
  issuerName?: string; // Covers Landlord, Freelancer, Seller, Company for Custom
  issuerAddress?: string; // Not always needed, e.g., for simple product sale if sellerName is enough
  clientName?: string; // Covers Tenant, Client, Buyer
  clientAddress?: string; // Not always needed

  // Rent Scenario
  landlordName?: string;
  tenantName?: string;
  propertyAddress?: string;
  rentAmount?: number;
  paymentDate?: Date;
  rentDuration?: string; 

  // Freelance Work Scenario
  freelancerName?: string;
  // clientName is shared
  serviceDescription?: string;
  rate?: number; 
  hoursWorked?: number;
  // totalAmount for freelance might be calculated and stored in grandTotal

  // Product Sale Scenario
  sellerName?: string;
  buyerName?: string;
  productDescription?: string; 
  quantity?: number; 
  unitPrice?: number; 
  // total for product sale might be calculated and stored in grandTotal
  paymentMethod?: string;
  saleDate?: Date;

  // Custom Invoice / General Use
  invoiceDate?: Date; // Common date field, can be paymentDate or saleDate for specific scenarios
  lineItems?: LineItem[];
  tax?: string; 
  grandTotal?: number; // Calculated or set
  invoiceNotes?: string;

  // For Smart Fill / AI (keeping for potential future use with new flow)
  invoiceText?: string; 

  // Fields for signature flow (to be added later, good to have in type)
  signatureRequested?: boolean;
  signatureStatus?: 'pending' | 'signed_by_issuer' | 'signed_by_client' | 'completed' | 'declined';
  signerEmail?: string; // Email of the party to sign
  signedAt?: Timestamp | Date;
  signerName?: string;
  signerMetadata?: Record<string, any>; // To store timestamp, IP (server-side), device info (basic)
}
