
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

// This type is derived from the form schema, useful for props
export interface InvoiceFormValues {
  id: string; // UUID for the invoice
  invoiceNumber: string;
  businessName: string;
  businessAddress?: string;
  clientName: string;
  clientAddress?: string;
  invoiceDate: Date;
  lineItems: LineItem[];
  invoiceText?: string; // For smart fill
  userId?: string; // For Firestore
  createdAt?: Date; // For Firestore
  updatedAt?: Date; // For Firestore
}
