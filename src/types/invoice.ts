
import type { InvoiceScenarioId } from '@/config/invoice-scenarios';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

// This type is derived from the form schema, useful for props
export interface InvoiceFormValues {
  id: string; // UUID for the invoice
  invoiceType: InvoiceScenarioId;
  invoiceNumber: string;
  businessName?: string;
  businessAddress?: string;
  clientName: string;
  clientAddress?: string;
  invoiceDate: Date;
  lineItems: LineItem[];
  invoiceText?: string; // For smart fill
  
  // Scenario-specific fields
  rentPeriod?: string;

  userId?: string; // For Firestore
  createdAt?: any; // Firestore Timestamp or Date
  updatedAt?: any; // Firestore Timestamp or Date
}
