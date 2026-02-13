
import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData } from "../types";

export const analyzeReceipt = async (base64Image: string): Promise<ReceiptData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: "Analyze this receipt image and extract details in a structured JSON format. Pay special attention to 'category'. Categorize the expense into exactly one of these: 'Dining', 'Groceries', 'Travel', 'Shopping', 'Utilities', 'Health', 'Entertainment', 'Services', or 'Other' based on the merchant and items."
        }
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          merchantName: { type: Type.STRING, description: "Name of the store or restaurant" },
          date: { type: Type.STRING, description: "Date of the transaction (YYYY-MM-DD)" },
          totalAmount: { type: Type.NUMBER, description: "The final total paid" },
          currency: { type: Type.STRING, description: "Currency symbol or code (e.g., USD, EUR, $)" },
          category: { 
            type: Type.STRING, 
            description: "Categorize as: Dining, Groceries, Travel, Shopping, Utilities, Health, Entertainment, Services, or Other" 
          },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                price: { type: Type.NUMBER }
              },
              required: ["name", "price"]
            }
          }
        },
        required: ["merchantName", "totalAmount", "category", "items"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No data returned from AI");
  
  return JSON.parse(text) as ReceiptData;
};
