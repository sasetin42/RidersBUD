import { GoogleGenAI, Type } from "@google/genai";
import { Vehicle, Part } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const getAIServiceSuggestions = async (vehicle: Vehicle, serviceHistory: string[]) => {
    const prompt = `
        Based on the following vehicle and its service history, suggest up to 3 relevant maintenance services that are not already in the recent history.
        Vehicle Make: ${vehicle.make}
        Vehicle Model: ${vehicle.model}
        Vehicle Year: ${vehicle.year}
        Most Recent Service History: ${serviceHistory.join(', ') || 'None'}

        Provide the suggestions in a structured JSON format. For each suggestion, provide a compelling, user-friendly reason based on the vehicle's type, age, or common maintenance schedules.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                thinkingConfig: {
                    thinkingBudget: 24576,
                },
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            description: "A list of up to 3 service suggestions.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    serviceName: {
                                        type: Type.STRING,
                                        description: "The name of the suggested maintenance service.",
                                    },
                                    reason: {
                                        type: Type.STRING,
                                        description: "A brief, user-friendly reason why this service is suggested for the user's vehicle.",
                                    },
                                },
                                required: ["serviceName", "reason"],
                            },
                        },
                    },
                    required: ["suggestions"],
                },
            },
        });
        
        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        return data.suggestions || [];

    } catch (error) {
        console.error("Error fetching AI suggestions:", error);
        throw new Error("Could not fetch AI suggestions at this time. The AI model may be temporarily unavailable.");
    }
};

export const getAIPartSuggestions = async (vehicle: Vehicle, serviceHistory: string[], allParts: Part[]) => {
    const partsList = allParts.map(p => `- ${p.name} (Brand: ${p.brand}, Category: ${p.category})`).join('\n');

    const prompt = `
        Based on the following vehicle, its recent service history, and our available parts inventory, suggest up to 3 relevant car parts for purchase.
        Vehicle Make: ${vehicle.make}
        Vehicle Model: ${vehicle.model}
        Vehicle Year: ${vehicle.year}
        Recent Service History: ${serviceHistory.join(', ') || 'None'}

        Available Parts Inventory:
        ${partsList}

        For each suggestion:
        1. Only suggest parts that are available in our inventory.
        2. Provide a compelling, user-friendly reason why this part is a good purchase for this specific vehicle, considering its age, type, and common maintenance needs.
        3. Do not suggest parts related to services that are already in the recent history (e.g., if 'Change Oil' is in history, do not suggest 'Engine Oil').

        Return the response in a structured JSON format.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                thinkingConfig: {
                    thinkingBudget: 24576,
                },
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            description: "A list of up to 3 part suggestions.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    partName: {
                                        type: Type.STRING,
                                        description: "The exact name of the suggested part from the inventory.",
                                    },
                                    reason: {
                                        type: Type.STRING,
                                        description: "A brief, user-friendly reason for the suggestion.",
                                    },
                                },
                                required: ["partName", "reason"],
                            },
                        },
                    },
                    required: ["suggestions"],
                },
            },
        });
        
        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        return data.suggestions || [];

    } catch (error) {
        console.error("Error fetching AI part suggestions:", error);
        throw new Error("Could not fetch AI suggestions at this time. The AI model may be temporarily unavailable.");
    }
};