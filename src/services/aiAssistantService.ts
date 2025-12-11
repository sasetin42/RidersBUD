
import { GoogleGenAI, Chat } from "@google/genai";
import { Service, Part, Mechanic, Settings, Customer, Database } from '../types';

export const startAssistantChat = (db: Database, customer: Customer | null): Chat => {
    const { services, parts, mechanics, settings } = db;

    const servicesInfo = services.map(s =>
        `- ${s.name}: ${s.description} It costs ₱${s.price.toLocaleString()} and takes about ${s.estimatedTime}. Category: ${s.category}.`
    ).join('\n');

    const partsInfo = parts.map(p =>
        `- ${p.name} (SKU: ${p.sku}): ${p.description} It costs ₱${p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Category: ${p.category}.`
    ).join('\n');

    const mechanicsInfo = mechanics.map(m =>
        `- ${m.name}: A specialist in ${m.specializations.join(', ')} with a rating of ${m.rating.toFixed(1)} from ${m.reviews} reviews. Bio: ${m.bio}. Status: ${m.status}.`
    ).join('\n');

    const defaultSystemInstruction = `
You are ${settings.virtualMechanicName || 'RiderAI'}, an expert and friendly AI mechanic assistant for the RidersBUD application.

**Your Capabilities & Tools:**
1.  **Internal Catalog Knowledge**: You have detailed data about our Services, Parts, and Mechanics listed below. Use this for specific app-related queries.
2.  **Google Search & Maps (Grounding)**: You are connected to real-time Google Search and Maps. Use these tools when the user asks for:
    -   Real-time information (e.g., "traffic near me", "gas prices", "weather").
    -   Locations not in our catalog (e.g., "where is the nearest gas station?", "towing services nearby").
    -   General automotive advice that requires up-to-date sources.

**Guidelines:**
-   If the user asks about booking a service, buying a part, or finding a mechanic *in our app*, prioritize the **Internal Catalog** data.
-   If the user asks a general question (e.g., "Why is my car making a clicking sound?") or location question ("Find a gas station"), use your **Grounding Tools** (Google Search/Maps) to provide a helpful, cited answer.
-   Be concise, friendly, and professional.

### Internal Catalog
**Services:**
${servicesInfo}

**Parts & Tools:**
${partsInfo}

**Mechanics:**
${mechanicsInfo}
    `;

    const systemInstruction = settings.virtualMechanicSystemInstruction || defaultSystemInstruction;

    // As requested, prepare the tool configuration to pass the user's location for Google Maps grounding.
    let toolConfig;
    if (customer?.lat && customer?.lng) {
        toolConfig = {
            retrievalConfig: {
                latLng: {
                    latitude: customer.lat,
                    longitude: customer.lng
                }
            }
        };
    }

    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        console.warn("AI Assistant disabled: API Key missing");
        // Return a dummy object or throw? The interface expects Chat.
        // Throwing here is better than crashing blindly.
        throw new Error("AI Assistant is not configured via API Key.");
    }
    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
        // As requested, using gemini-2.5-flash with Maps Grounding.
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
            // Thinking mode is enabled for Gemini 2.5 series.
            thinkingConfig: {
                thinkingBudget: 1024,
            },
            // Grounding tools are enabled to answer real-world and location-based questions.
            tools: [{ googleSearch: {} }, { googleMaps: {} }],
            toolConfig: toolConfig,
        }
    });

    return chat;
};
