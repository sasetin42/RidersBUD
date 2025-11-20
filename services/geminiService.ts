
import { GoogleGenAI, Type } from "@google/genai";
import { Vehicle } from '../types';

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
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                thinkingConfig: {
                    thinkingBudget: 32768,
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
        // A schema guarantees the output is valid JSON, so we can parse it directly.
        const data = JSON.parse(jsonText);
        return data.suggestions || [];

    } catch (error) {
        console.error("Error fetching AI suggestions:", error);
        throw new Error("Could not fetch AI suggestions at this time. The AI model may be temporarily unavailable.");
    }
};