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
  prompt: `You are an AI assistant designed to intelligently fill in invoice fields based on the provided text or existing field values.
Your goal is to extract relevant information and populate the corresponding fields in a structured JSON format, adhering strictly to the output schema.

Analyze the combined information from any existing fields and the 'Invoice Text'.
Existing Business Name: {{{businessName}}}
Existing Business Address: {{{businessAddress}}}
Existing Client Name: {{{clientName}}}
Existing Client Address: {{{clientAddress}}}
Example Item Description (from first item, if any): {{{itemDescription}}}
Example Quantity (from first item, if any): {{{quantity}}}
Example Price (from first item, if any): {{{price}}}

Primary source for extraction is the 'Invoice Text':
{{{invoiceText}}}

Based on your analysis of ALL provided information, determine values for the fields defined in the output schema (businessName, businessAddress, clientName, clientAddress, itemDescription, quantity, price).
If a specific piece of information for a field is not found or cannot be reliably extracted, OMIT that field entirely from your JSON output. Do not include it with an empty string or a placeholder unless that placeholder is the actual extracted value.
Focus on extracting information explicitly present. Do not invent information.

Your output MUST be a valid JSON object.
  `,
});

const smartFillFlow = ai.defineFlow(
  {
    name: 'smartFillFlow',
    inputSchema: SmartFillInputSchema,
    outputSchema: SmartFillOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
