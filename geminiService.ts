
import { GoogleGenAI, Type } from "@google/genai";
import { getDB } from './db';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAIInsights = async () => {
  const db = getDB();
  
  // Aggregate data for AI
  const summary = {
    totalBookings: db.bookings.length,
    activeBookings: db.bookings.filter(b => b.status === 'ACTIVE').length,
    revenue: db.bookings.reduce((sum, b) => sum + b.amountPaid, 0),
    unpaid: db.bookings.reduce((sum, b) => sum + (b.totalAmount - b.amountPaid), 0),
    venues: db.venues.map(v => ({
      name: v.name,
      bookingsCount: db.bookings.filter(b => b.venueId === v.id).length
    })),
    topClients: db.clients.slice(0, 5).map(c => ({
      name: c.name,
      revenue: db.bookings.filter(b => b.clientId === c.id).reduce((sum, b) => sum + b.amountPaid, 0)
    }))
  };

  const prompt = `
    Act as a business consultant for LEGENDS ARENA Management. 
    Analyze the following business data and provide 4-5 actionable insights on:
    1. Revenue optimization
    2. Peak hour utilization
    3. Client retention
    4. Operational efficiency
    
    Data: ${JSON.stringify(summary)}
    
    Format your response as a JSON array of objects with 'title' and 'description' keys.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['title', 'description']
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("AI Insight Error:", error);
    return [{ title: "Analysis Unavailable", description: "Could not generate insights at this time. Please try again later." }];
  }
};
