
'use server';

/**
 * @fileOverview Smart Fill AI agent.
 *
 * - smartFill - A function that handles the smart fill process for invoice fields.
 * - SmartFillInput - The input type for the smartFill function.
 * - SmartFillOutput - The return type for the smartFill function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartFillInputSchema = z.object({
  businessName: z.string().optional().describe('The name of the business.'),
  businessAddress: z.string().optional().describe('The address of the business.'),
  clientName: z.string().optional().describe('The name of the client.'),
  clientAddress: z.string().optional().describe('The address of the client.'),
  itemDescription: z.string().optional().describe('The description of the item.'),
  quantity: z.number().optional().describe('The quantity of the item.'),
  price: z.number().optional().describe('The price of the item.'),
  invoiceText: z.string().optional().describe('Free-form text from the invoice.'),
});

export type SmartFillInput = z.infer<typeof SmartFillInputSchema>;

const SmartFillOutputSchema = z.object({
  businessName: z.string().optional().describe('The name of the business.'),
  businessAddress: z.string().optional().describe('The address of the business.'),
  clientName: z.string().optional().describe('The name of the client.'),
  clientAddress: z.string().optional().describe('The address of the client.'),
  itemDescription: z.string().optional().describe('The description of the item.'),
  quantity: z.number().optional().describe('The quantity of the item.'),
  price: z.number().optional().describe('The price of the item.'),
});

export type SmartFillOutput = z.infer<typeof SmartFillOutputSchema>;

export async function smartFill(input: SmartFillInput): Promise<SmartFillOutput> {
  return smartFillFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartFillPrompt',
  input: {schema: SmartFillInputSchema},
  output: {schema: SmartFillOutputSchema},
  prompt: `You are an AI assistant specialized in extracting structured information from text for invoices.
Your task is to populate a JSON object with the following fields: 'businessName', 'businessAddress', 'clientName', 'clientAddress', 'itemDescription', 'quantity', and 'price'.

Guidelines:
1.  Analyze ALL provided information: existing field values AND the 'Invoice Text'.
    - Existing Business Name: {{{businessName}}}
    - Existing Business Address: {{{businessAddress}}}
    - Existing Client Name: {{{clientName}}}
    - Existing Client Address: {{{clientAddress}}}
    - Existing Item Description (if provided): {{{itemDescription}}}
    - Existing Quantity (if provided): {{{quantity}}}
    - Existing Price (if provided): {{{price}}}
    - Primary source for new extraction: 'Invoice Text': "{{{invoiceText}}}"

2.  Extraction Rules:
    - Prioritize information found in 'Invoice Text' for extraction.
    - Use existing field values as context or if the information is not present in 'InvoiceText'.
    - For 'quantity' and 'price' fields, ensure the output values are NUMBERS (e.g., 50, 12.75), not strings.
    - If 'Invoice Text' seems to describe multiple line items, extract details for only the most prominent or first clearly described item into 'itemDescription', 'quantity', and 'price'.

3.  Output Format:
    - Your output MUST be a single, valid JSON object.
    - Adhere strictly to the output schema (fields: businessName, businessAddress, clientName, clientAddress, itemDescription, quantity, price).
    - If, after analysis, a specific piece of information for a field cannot be reliably found or inferred, OMIT that field entirely from your JSON output. Do not include fields with empty strings or null values unless that is the actual extracted/inferred value.
    - Do not invent information. Only extract or infer from the provided inputs.
`,
});

const smartFillFlow = ai.defineFlow(
  {
    name: 'smartFillFlow',
    inputSchema: SmartFillInputSchema,
    outputSchema: SmartFillOutputSchema,
  },
  async input => {
    const response = await prompt(input);
    if (!response.output) {
      console.warn('Smart Fill AI did not return valid schema-compliant output. Input was:', JSON.stringify(input));
      // Return an empty object, which is valid for SmartFillOutputSchema as all fields are optional.
      return {}; 
    }
    return response.output;
  }
);

