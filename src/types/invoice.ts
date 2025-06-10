export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

// This type is derived from the form schema, useful for props
export interface InvoiceFormValues {
  businessName: string;
  businessAddress?: string;
  clientName: string;
  clientAddress?: string;
  invoiceDate: Date;
  lineItems: LineItem[];
  invoiceText?: string; // For smart fill
}
