
export const INVOICE_SCENARIOS = [
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
      lineItemSuggestion: 'Rent for ' // e.g., Rent for October 2024
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
    id: 'service_work', 
    label: 'Service Work', 
    tag: '[Service Work]',
    fields: {
      clientNameLabel: 'Client Name',
      businessNameLabel: 'Service Provider Name',
      businessAddressLabel: 'Service Provider Address',
      showBusinessFields: true,
      showRentPeriod: false,
    }
  },
  { 
    id: 'repair_service', 
    label: 'Repair Service', 
    tag: '[Repair Service]',
    fields: {
      clientNameLabel: 'Customer Name',
      businessNameLabel: 'Repair Shop Name',
      businessAddressLabel: 'Repair Shop Address',
      showBusinessFields: true,
      showRentPeriod: false,
      // Potentially add 'itemRepairedLabel' etc.
    }
  },
  { 
    id: 'delivery_receipt', 
    label: 'Delivery Receipt', 
    tag: '[Delivery Receipt]',
    fields: {
      clientNameLabel: 'Recipient Name',
      clientAddressLabel: 'Delivery Address',
      showBusinessFields: false, // Business details might be less relevant
      showRentPeriod: false,
      // Line items might not have prices
    }
  },
  { 
    id: 'custom', 
    label: 'Custom Invoice', 
    tag: '[Custom Invoice]',
    fields: { // Shows most fields by default
      clientNameLabel: 'Client Name',
      businessNameLabel: 'Business Name',
      businessAddressLabel: 'Business Address',
      showBusinessFields: true,
      showRentPeriod: false, // Custom can add it if needed via line items or notes
    }
  },
] as const;

export type InvoiceScenarioId = typeof INVOICE_SCENARIOS[number]['id'];

export const getScenarioConfig = (scenarioId: InvoiceScenarioId | null | undefined) => {
  if (!scenarioId) return INVOICE_SCENARIOS.find(s => s.id === 'custom')?.fields; // Default to custom or a generic set
  return INVOICE_SCENARIOS.find(s => s.id === scenarioId)?.fields || INVOICE_SCENARIOS.find(s => s.id === 'custom')?.fields;
};

export const getScenarioTag = (scenarioId: InvoiceScenarioId | null | undefined) => {
  if (!scenarioId) return '';
  return INVOICE_SCENARIOS.find(s => s.id === scenarioId)?.tag || '';
}
