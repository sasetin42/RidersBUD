import { GoogleGenAI, Chat } from "@google/genai";
import { Service, Part, Mechanic, Settings } from '../types';

// This interface is a workaround to access the full db object shape
interface FullDatabase {
    services: Service[];
    parts: Part[];
    mechanics: Mechanic[];
    settings: Settings;
    // Add other db properties if needed by the prompt
}

export const startAssistantChat = (db: FullDatabase): Chat => {
    const { services, parts, mechanics, settings } = db;

    // Create detailed, structured lists for the AI's knowledge base
    const servicesInfo = services.map(s => 
        `- ${s.name}: ${s.description} It costs ₱${s.price.toLocaleString()} and takes about ${s.estimatedTime}. Category: ${s.category}.`
    ).join('\n');

    const partsInfo = parts.map(p => 
        `- ${p.name} (SKU: ${p.sku}): ${p.description} It costs ₱${p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Category: ${p.category}.`
    ).join('\n');

    const mechanicsInfo = mechanics.map(m => 
        `- ${m.name}: A specialist in ${m.specializations.join(', ')} with a rating of ${m.rating.toFixed(1)} from ${m.reviews} reviews. Bio: ${m.bio}. Status: ${m.status}.`
    ).join('\n');

    const systemInstruction = `
You are ${settings.virtualMechanicName || 'RiderAI'}, an expert and friendly AI mechanic assistant for the RidersBUD application. Your goal is to provide helpful and accurate information to users based ONLY on the data provided below. Do not invent services, parts, mechanics, or prices.

If a user asks about something not in your knowledge base (e.g., "Can you fix my boat?" or "Do you sell tires?"), politely inform them that you don't have information on that topic and suggest they ask about car maintenance, or browse the app's services and parts store.

Your responses should be friendly, conversational, and easy to understand. Keep answers concise.

Here is the complete catalog of information you have access to:

### Our Services
${servicesInfo}

### Parts & Tools in Our Store
${partsInfo}

### Our Professional Mechanics
${mechanicsInfo}

---
When the conversation starts, greet the user by name (e.g., "Hi! I'm RiderAI...") and ask how you can help them with services, parts, or mechanics today.
    `;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        }
    });

    return chat;
};