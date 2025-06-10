
import type { ScenarioId } from '@/config/invoice-scenarios'; // Updated import
import type { Timestamp } from 'firebase/firestore';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

// This type is derived from the form schema, useful for props
export interface InvoiceFormValues {
  // Common fields
  id: string; // Internal UUID for the invoice
  publicInvoiceId?: string; // Shareable, shorter ID
  invoiceType: ScenarioId; // e.g., 'rent', 'freelance'
  invoiceNumber?: string; // Optional, can be auto-generated or scenario-specific
  userId?: string; // For Firestore, if user is logged in
  createdAt?: Timestamp | Date | any; // Firestore Timestamp or Date
  updatedAt?: Timestamp | Date | any; // Firestore Timestamp or Date
  
  // Scenario-specific fields will be dynamically added based on selection
  // These are examples of how they might be structured in the flat form data
  // Party Details (dynamic labels based on scenario)
  issuerName?: string; // General term, can be Landlord, Freelancer, Seller, Company
  issuerAddress?: string;
  clientName?: string; // General term, can be Tenant, Client, Buyer
  clientAddress?: string;

  // Rent Scenario
  landlordName?: string;
  tenantName?: string;
  propertyAddress?: string;
  rentAmount?: number;
  paymentDate?: Date;
  rentDuration?: string; // e.g. June 2025

  // Freelance Work Scenario
  freelancerName?: string;
  // clientName already covered
  serviceDescription?: string;
  rate?: number; // Can be per hour, per project
  hoursWorked?: number;
  // totalAmount for freelance might be calculated or use lineItems

  // Product Sale Scenario
  sellerName?: string;
  buyerName?: string;
  productDescription?: string; // For single product sale
  quantity?: number; // For single product sale
  unitPrice?: number; // For single product sale
  // total for product sale might be calculated or use lineItems
  paymentMethod?: string;
  saleDate?: Date;

  // Custom Invoice / General Use
  invoiceDate?: Date; // Common date field
  lineItems?: LineItem[];
  tax?: string; // Can be amount or percentage string
  grandTotal?: number; // Calculated
  invoiceNotes?: string;

  // For Smart Fill / AI
  invoiceText?: string; 
}
