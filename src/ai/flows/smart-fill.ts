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
  prompt: `You are an AI assistant designed to intelligently fill in invoice fields.

  Given the following information, extract and fill in the missing fields. If a field cannot be determined, leave it blank.

  Business Name: {{{businessName}}}
  Business Address: {{{businessAddress}}}
  Client Name: {{{clientName}}}
  Client Address: {{{clientAddress}}}
  Item Description: {{{itemDescription}}}
  Quantity: {{{quantity}}}
  Price: {{{price}}}
  Invoice Text: {{{invoiceText}}}

  Output the extracted information in JSON format.
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
