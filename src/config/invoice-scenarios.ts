
export const SCENARIOS = [
  {
    id: 'rent',
    label: 'Rent Invoice',
    tag: '[Rent Invoice]',
    fields: [
      { name: 'landlordName', label: 'Landlord Name', placeholder: 'Enter landlord name', type: 'text', section: 'party_details' },
      { name: 'tenantName', label: 'Tenant Name', placeholder: 'Enter tenant name', type: 'text', section: 'party_details' },
      { name: 'propertyAddress', label: 'Property Address', placeholder: 'Enter property address', type: 'textarea', section: 'party_details' },
      { name: 'rentAmount', label: 'Rent Amount (₹)', placeholder: 'Enter rent amount in ₹', type: 'number', section: 'invoice_details' },
      { name: 'paymentDate', label: 'Payment Date', type: 'date', section: 'invoice_details' },
      { name: 'rentDuration', label: 'Duration (e.g., June 2025)', placeholder: 'e.g., June 2025', type: 'text', section: 'invoice_details' },
    ],
    defaultValues: {
      landlordName: '',
      tenantName: '',
      propertyAddress: '',
      rentAmount: undefined,
      paymentDate: new Date(),
      rentDuration: '',
    }
  },
  {
    id: 'freelance',
    label: 'Freelance Work',
    tag: '[Freelance Work]',
    fields: [
      { name: 'freelancerName', label: 'Freelancer Name', placeholder: 'Your name or company', type: 'text', section: 'party_details' },
      { name: 'clientName', label: 'Client Name', placeholder: 'Enter client name', type: 'text', section: 'party_details' },
      { name: 'serviceDescription', label: 'Service Description', placeholder: 'e.g., Web Development Services', type: 'textarea', section: 'invoice_details' },
      { name: 'rate', label: 'Rate (e.g., per hour, ₹)', placeholder: 'Enter rate in ₹', type: 'number', section: 'invoice_details' },
      { name: 'hoursWorked', label: 'Hours Worked', placeholder: 'Enter hours worked', type: 'number', section: 'invoice_details' },
      { name: 'invoiceDate', label: 'Invoice Date', type: 'date', section: 'invoice_details' },
    ],
    defaultValues: {
      freelancerName: '',
      clientName: '',
      serviceDescription: '',
      rate: undefined,
      hoursWorked: undefined,
      invoiceDate: new Date(),
    }
  },
  {
    id: 'product_sale',
    label: 'Product Sale',
    tag: '[Product Sale]',
    fields: [
      { name: 'sellerName', label: 'Seller Name', placeholder: 'Your business name', type: 'text', section: 'party_details' },
      { name: 'buyerName', label: 'Buyer Name', placeholder: 'Enter buyer name', type: 'text', section: 'party_details' },
      { name: 'productDescription', label: 'Product Description', placeholder: 'Enter product name or description', type: 'text', section: 'invoice_details' },
      { name: 'quantity', label: 'Quantity', placeholder: 'Enter quantity', type: 'number', section: 'invoice_details' },
      { name: 'unitPrice', label: 'Rate per Unit (₹)', placeholder: 'Enter rate per unit in ₹', type: 'number', section: 'invoice_details' },
      { name: 'paymentMethod', label: 'Payment Method', placeholder: 'e.g., Cash, UPI, Card', type: 'text', section: 'invoice_details' },
      { name: 'saleDate', label: 'Sale Date', type: 'date', section: 'invoice_details' },
    ],
    defaultValues: {
      sellerName: '',
      buyerName: '',
      productDescription: '',
      quantity: 1,
      unitPrice: undefined,
      paymentMethod: '',
      saleDate: new Date(),
    }
  },
  {
    id: 'custom',
    label: 'Custom Invoice',
    tag: '[Custom Invoice]',
    fields: [ 
      { name: 'issuerName', label: 'Company/Issuer Name', placeholder: 'Your company name', type: 'text', section: 'party_details' },
      { name: 'clientName', label: 'Client Name', placeholder: 'Enter client name', type: 'text', section: 'party_details' },
      { name: 'invoiceDate', label: 'Invoice Date', type: 'date', section: 'invoice_details' },
      { name: 'tax', label: 'Tax (Amount or %)', placeholder: 'e.g., 500 or 18%', type: 'text', section: 'summary_details' }, 
      { name: 'invoiceNotes', label: 'Invoice Notes', placeholder: 'Optional notes or terms', type: 'textarea', section: 'summary_details' },
    ],
    hasLineItems: true, 
    defaultValues: {
      issuerName: '',
      clientName: '',
      invoiceDate: new Date(),
      lineItems: [{ id: '1', description: '', quantity: 1, price: 0 }],
      tax: '',
      invoiceNotes: '',
    }
  },
] as const;

export type ScenarioId = typeof SCENARIOS[number]['id'];

export interface ScenarioField {
  name: string;
  label: string;
  placeholder?: string;
  type: 'text' | 'number' | 'textarea' | 'date' | 'select'; 
  options?: { value: string; label: string }[]; 
  section: 'party_details' | 'invoice_details' | 'summary_details' | 'line_items';
}

export interface Scenario {
  id: ScenarioId;
  label: string;
  tag: string;
  fields: ScenarioField[];
  hasLineItems?: boolean;
  defaultValues: Record<string, any>;
}

export const getScenario = (id: ScenarioId | null | undefined): Scenario | undefined => {
  if (!id) return undefined;
  return SCENARIOS.find(s => s.id === id);
};


// Keeping old structure for compatibility if other parts of the app use it, but primary config is SCENARIOS
export const INVOICE_SCENARIOS_OLD = [
  { 
    id: 'rent', 
    label: 'Rent Invoice', 
    tag: '[Rent Invoice]',
    fields: {
      clientNameLabel: 'Tenant Name',
      businessNameLabel: 'Landlord/Property Manager Name',
      businessAddressLabel: 'Property Address',
      showBusinessFields: true,
      showRentPeriod: true,
      lineItemSuggestion: 'Rent for '
    }
  },
  { 
    id: 'freelance', 
    label: 'Freelance Work', 
    tag: '[Freelance Work]',
    fields: {
      clientNameLabel: 'Client Name',
      businessNameLabel: 'Freelancer Name',
      businessAddressLabel: 'Freelancer Address',
      showBusinessFields: true,
      showRentPeriod: false,
    }
  },
   { 
    id: 'product_sale', 
    label: 'Product Sale', 
    tag: '[Product Sale]',
    fields: {
      clientNameLabel: 'Customer Name',
      businessNameLabel: 'Business Name',
      businessAddressLabel: 'Business Address',
      showBusinessFields: true,
      showRentPeriod: false,
    }
  },
  { 
    id: 'custom', 
    label: 'Custom Invoice', 
    tag: '[Custom Invoice]',
    fields: { 
      clientNameLabel: 'Client Name',
      businessNameLabel: 'Business Name',
      businessAddressLabel: 'Business Address',
      showBusinessFields: true,
      showRentPeriod: false, 
    }
  },
] as const;

export type OldInvoiceScenarioId = typeof INVOICE_SCENARIOS_OLD[number]['id'];

export const getOldScenarioConfig = (scenarioId: OldInvoiceScenarioId | null | undefined) => {
  if (!scenarioId) return INVOICE_SCENARIOS_OLD.find(s => s.id === 'custom')?.fields;
  return INVOICE_SCENARIOS_OLD.find(s => s.id === scenarioId)?.fields || INVOICE_SCENARIOS_OLD.find(s => s.id === 'custom')?.fields;
};

export const getScenarioTag = (scenarioId: ScenarioId | null | undefined) => {
  if (!scenarioId) return '';
  const scenario = getScenario(scenarioId);
  return scenario?.tag || '';
};
