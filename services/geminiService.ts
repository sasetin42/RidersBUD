import { GoogleGenAI, Type } from "@google/genai";
import { Vehicle } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const getAIServiceSuggestions = async (vehicle: Vehicle, serviceHistory: string[]) => {
    const prompt = `
        Based on the following vehicle and its service history, suggest up to 3 relevant maintenance services.
        Vehicle Make: ${vehicle.make}
        Vehicle Model: ${vehicle.model}
        Vehicle Year: ${vehicle.year}
        Service History: ${serviceHistory.join(', ')}

        Provide the suggestions in a structured JSON format.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    serviceName: {
                                        type: Type.STRING,
                                        description: "The name of the suggested service.",
                                    },
                                    reason: {
                                        type: Type.STRING,
                                        description: "A brief reason why this service is suggested.",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        
        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        return data.suggestions;

    } catch (error) {
        console.error("Error fetching AI suggestions:", error);
        throw new Error("Could not fetch AI suggestions at this time. Please try again later.");
    }
};