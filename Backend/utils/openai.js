import "dotenv/config";

let discoveredModels = null;
let workingModel = null;
let workingApiVer = "v1beta";

async function getAvailableGeminiModels(geminiKey) {
    if (workingModel) return [workingModel];
    if (discoveredModels && discoveredModels.length > 0) return discoveredModels;
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
        const data = await res.json();
        if (data.models && Array.isArray(data.models)) {
            const valid = data.models
                .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
                .map(m => m.name.replace(/^models\//, ""))
                // Exclude TTS, audio, embedding, and image-only models
                .filter(name => !name.includes("tts") && !name.includes("embedding") && !name.includes("imagen"));

            if (valid.length > 0) {
                // Prioritize recommended flash models
                valid.sort((a, b) => {
                    if (a.includes("3.0-flash") || a.includes("3-flash")) return -1;
                    if (b.includes("3.0-flash") || b.includes("3-flash")) return 1;
                    if (a.includes("flash")) return -1;
                    if (b.includes("flash")) return 1;
                    return 0;
                });
                console.log("Filtered chat Gemini models:", valid);
                discoveredModels = valid;
                return valid;
            }
        } else if (data.error) {
            console.error("ListModels API error:", data.error.message || data.error);
        }
    } catch (err) {
        console.error("Failed to list Gemini models:", err);
    }
    return [
        "gemini-3.0-flash",
        "gemini-2.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash"
    ];
}

const getOpenAIAPIResponse = async (message) => {
    // Option 1: Google Gemini API (Free tier available)
    const geminiKey = process.env.GEMINI_API_KEY?.trim()?.replace(/^["']|["']$/g, "");
    let geminiError = null;

    if (geminiKey) {
        const models = workingModel ? [workingModel] : await getAvailableGeminiModels(geminiKey);
        const versionsToTry = workingModel ? [workingApiVer] : ["v1beta", "v1"];

        for (const model of models) {
            for (const apiVer of versionsToTry) {
                try {
                    const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${geminiKey}`;
                    const response = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            system_instruction: {
                                parts: [{ text: "You are Vexa, an intelligent, friendly, and helpful AI assistant. Always answer directly, clearly, and concisely in clean markdown. Never show internal brainstorming, scratchpad notes, draft options, or meta-commentary." }]
                            },
                            contents: [{ parts: [{ text: message }] }]
                        })
                    });
                    const data = await response.json();
                    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                        // Cache the fast working model and API version
                        workingModel = model;
                        workingApiVer = apiVer;
                        return data.candidates[0].content.parts[0].text;
                    }
                    if (data.error) {
                        geminiError = `(${model}) ${data.error.message || JSON.stringify(data.error)}`;
                        console.error(`Gemini (${model} ${apiVer}) error:`, data.error.message || data.error);
                    }
                } catch (err) {
                    geminiError = err.message;
                    console.error(`Gemini (${model} ${apiVer}) network error:`, err);
                }
            }
        }
    }

    // Option 2: Groq API (Free tier available, OpenAI-compatible)
    if (process.env.GROQ_API_KEY) {
        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: message }]
                })
            });
            const data = await response.json();
            if (data.choices && data.choices[0]?.message?.content) {
                return data.choices[0].message.content;
            }
        } catch (err) {
            console.error("Groq API error:", err);
        }
    }

    // Option 3: OpenAI API
    if (process.env.OPENAI_API_KEY) {
        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: message }]
                })
            });
            const data = await response.json();
            if (data.choices && data.choices[0]?.message?.content) {
                return data.choices[0].message.content;
            }
        } catch (err) {
            console.error("OpenAI API error:", err);
        }
    }

    // If Gemini key was provided but failed
    if (geminiKey) {
        return `Hello! I am **Vexa** ✦. 

⚠️ **Gemini API Error**: ${geminiError || "Could not generate response from Gemini API"}.

Please verify your \`GEMINI_API_KEY\` in your Render Environment variables.`;
    }

    // Fallback Mock Assistant when no AI key is configured yet
    return `Hello! I am **Vexa** ✦. 

I received your message: *" ${message} "*

⚠️ **Notice**: No AI API key is configured yet in \`Backend/.env\`. 
To get full responses, you can add a **free** API key:
- **Google Gemini API Key**: [Google AI Studio](https://aistudio.google.com/) (Set \`GEMINI_API_KEY\`)
- or **Groq API Key**: [Groq Console](https://console.groq.com/) (Set \`GROQ_API_KEY\`)
- or **OpenAI API Key**: [OpenAI Platform](https://platform.openai.com/) (Set \`OPENAI_API_KEY\`)`;
};

export default getOpenAIAPIResponse;