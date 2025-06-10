'use server';

import { smartFill, type SmartFillInput, type SmartFillOutput } from '@/ai/flows/smart-fill';
import { invoiceFormSchema, type InvoiceFormValues } from '@/lib/schemas';

export async function handleSmartFillServerAction(
  currentFormData: Partial<InvoiceFormValues>
): Promise<Partial<InvoiceFormValues>> {
  try {
    const inputForAI: SmartFillInput = {
      businessName: currentFormData.businessName,
      businessAddress: currentFormData.businessAddress,
      clientName: currentFormData.clientName,
      clientAddress: currentFormData.clientAddress,
      invoiceText: currentFormData.invoiceText,
      // For line items, AI might suggest one item or common details.
      // Let's pass the first item's details if available, or keep it simple.
      itemDescription: currentFormData.lineItems?.[0]?.description,
      quantity: currentFormData.lineItems?.[0]?.quantity,
      price: currentFormData.lineItems?.[0]?.price,
    };

    const aiOutput: SmartFillOutput = await smartFill(inputForAI);

    const suggestedData: Partial<InvoiceFormValues> = {};
    if (aiOutput.businessName) suggestedData.businessName = aiOutput.businessName;
    if (aiOutput.businessAddress) suggestedData.businessAddress = aiOutput.businessAddress;
    if (aiOutput.clientName) suggestedData.clientName = aiOutput.clientName;
    if (aiOutput.clientAddress) suggestedData.clientAddress = aiOutput.clientAddress;
    
    // AI might suggest a single line item. We can decide how to merge this.
    // For now, if AI provides item details, we can update the first line item or add a new one.
    // This example updates fields but doesn't add/modify line items directly from AI to keep it simpler.
    // Users can manually adjust line items based on AI's general output in invoiceText.

    // The AI output schema has itemDescription, quantity, price.
    // If these are present, one strategy is to fill the first line item if it's empty,
    // or add a new line item. For this version, we'll primarily focus on the main contact fields.
    // The invoiceText from user input is the main source for AI to parse multiple items.

    // Potentially update/add a line item:
    // if (aiOutput.itemDescription && aiOutput.quantity && aiOutput.price) {
    //   if (suggestedData.lineItems && suggestedData.lineItems.length > 0) {
    //     suggestedData.lineItems[0] = {
    //       ...suggestedData.lineItems[0],
    //       description: aiOutput.itemDescription,
    //       quantity: aiOutput.quantity,
    //       price: aiOutput.price,
    //     };
    //   } else {
    //     suggestedData.lineItems = [{
    //       id: require('uuid').v4(), // Requires uuid on server or pass from client
    //       description: aiOutput.itemDescription,
    //       quantity: aiOutput.quantity,
    //       price: aiOutput.price,
    //     }];
    //   }
    // }


    return suggestedData;
  } catch (error) {
    console.error("Smart Fill Error:", error);
    // Return an empty object or throw a custom error to be handled by the client
    return {};
  }
}
