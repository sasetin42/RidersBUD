
import { GoogleGenAI, Type } from "@google/genai";
import { Vehicle, Part } from '../types';

const getAIClient = () => {
    // Try both standard Vite env and the process.env define
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        console.warn("Gemini API Key missing. internal AI features will be disabled.");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export const getAIServiceSuggestions = async (vehicle: Vehicle, serviceHistory: string[]) => {
    const prompt = `
        Based on the following vehicle and its service history, suggest up to 3 relevant maintenance services that are not already in the recent history.
        
        Vehicle Details:
        - Year/Make/Model: ${vehicle.year} ${vehicle.make} ${vehicle.model}
        - Mileage: ${vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : 'Unknown'}
        
        Service History (Last completed jobs):
        ${serviceHistory.length > 0 ? serviceHistory.join(', ') : 'No recorded history'}

        Task:
        Analyze the vehicle's age and mileage to determine likely due maintenance (e.g., oil changes, brake checks, timing belt, 50k/100k major service).
        Suggest up to 3 specific services from a standard auto shop catalog.
        
        IMPORTANT:
        - If the mileage is available, prioritize services that are specifically recommended at this mileage interval for a ${vehicle.make} ${vehicle.model}.
        - Consider the vehicle age.

        Provide the suggestions in a structured JSON format. For each suggestion, provide a compelling, user-friendly reason based on the vehicle's specific data (e.g., "At 50,000km, it is recommended to...").
    `;

    try {
        const ai = getAIClient();
        if (!ai) throw new Error("AI features are not configured (Missing API Key)");

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                thinkingConfig: {
                    thinkingBudget: 1024, // Reduced budget for faster suggestions
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
        const ai = getAIClient();
        if (!ai) throw new Error("AI features are not configured (Missing API Key)");

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                thinkingConfig: {
                    thinkingBudget: 1024,
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
