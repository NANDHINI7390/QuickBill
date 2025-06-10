
'use server';

import { smartFill, type SmartFillInput, type SmartFillOutput } from '@/ai/flows/smart-fill';
import type { InvoiceFormValues } from '@/lib/schemas';
import type { InvoiceScenarioId } from '@/config/invoice-scenarios';


export async function handleSmartFillServerAction(
  currentFormData: Partial<InvoiceFormValues> & { invoiceType: InvoiceScenarioId }
): Promise<Partial<InvoiceFormValues>> {
  try {
    // Include invoiceType in the input for the AI, if desired for context
    const inputForAI: SmartFillInput = {
      businessName: currentFormData.businessName,
      businessAddress: currentFormData.businessAddress,
      clientName: currentFormData.clientName,
      clientAddress: currentFormData.clientAddress,
      invoiceText: currentFormData.invoiceText,
      itemDescription: currentFormData.lineItems?.[0]?.description,
      quantity: currentFormData.lineItems?.[0]?.quantity,
      price: currentFormData.lineItems?.[0]?.price,
      // You could add invoiceType to SmartFillInput if the AI model should be aware of it
      // For example: invoiceType: currentFormData.invoiceType
    };

    const aiOutput: SmartFillOutput = await smartFill(inputForAI);

    const suggestedData: Partial<InvoiceFormValues> = {};
    if (aiOutput.businessName) suggestedData.businessName = aiOutput.businessName;
    if (aiOutput.businessAddress) suggestedData.businessAddress = aiOutput.businessAddress;
    if (aiOutput.clientName) suggestedData.clientName = aiOutput.clientName;
    if (aiOutput.clientAddress) suggestedData.clientAddress = aiOutput.clientAddress;
    
    // If AI returns item details, you might want to update the first line item,
    // especially if it's still the default/empty.
    if (aiOutput.itemDescription || aiOutput.quantity !== undefined || aiOutput.price !== undefined) {
      if (currentFormData.lineItems && currentFormData.lineItems.length > 0) {
        const firstItem = currentFormData.lineItems[0];
        const updatedItem = { ...firstItem };
        let itemChanged = false;

        if (aiOutput.itemDescription && (!firstItem.description || firstItem.description === "Service/Product Description" || firstItem.description.startsWith("Rent for "))) {
          updatedItem.description = aiOutput.itemDescription;
          itemChanged = true;
        }
        if (aiOutput.quantity !== undefined && (firstItem.quantity === 1 || firstItem.quantity === 0)) {
           updatedItem.quantity = aiOutput.quantity;
           itemChanged = true;
        }
        if (aiOutput.price !== undefined && firstItem.price === 0) {
           updatedItem.price = aiOutput.price;
           itemChanged = true;
        }
        
        if (itemChanged) {
          suggestedData.lineItems = [updatedItem, ...currentFormData.lineItems.slice(1)];
        }
      }
    }
    // Smart fill could also suggest a rentPeriod if invoiceType is 'rent'
    // if (currentFormData.invoiceType === 'rent' && aiOutput.rentPeriod) {
    //   suggestedData.rentPeriod = aiOutput.rentPeriod;
    // }


    return suggestedData;
  } catch (error) {
    console.error("Smart Fill Error:", error);
    return {};
  }
}
