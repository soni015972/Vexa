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
                // Prioritize recommended flash models (e.g. 3.6-flash, 2.0-flash)
                valid.sort((a, b) => {
                    if (a.includes("3.6-flash") || a.includes("3.6")) return -1;
                    if (b.includes("3.6-flash") || b.includes("3.6")) return 1;
                    if (a.includes("2.0-flash")) return -1;
                    if (b.includes("2.0-flash")) return 1;
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
        "gemini-3.6-flash",
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-1.5-flash"
    ];
}

async function callGeminiModel(model, geminiKey, geminiContents) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
            system_instruction: {
                parts: [{ text: "You are Vexa, an intelligent, friendly, and helpful AI assistant. Always answer directly, clearly, and concisely in clean markdown. Remember and reference previous conversation context naturally when relevant. Never show internal brainstorming, scratchpad notes, draft options, or meta-commentary." }]
            },
            contents: geminiContents
        })
    });
    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return { text: data.candidates[0].content.parts[0].text, model };
    }
    throw new Error(data.error?.message || `Model ${model} returned no text`);
}

const getOpenAIAPIResponse = async (message, history = []) => {
    // Option 1: Google Gemini API (Free tier available)
    const geminiKey = process.env.GEMINI_API_KEY?.trim()?.replace(/^["']|["']$/g, "");
    let geminiError = null;

    if (geminiKey) {
        // Build multi-turn conversational history for Gemini
        const geminiContents = [];
        if (Array.isArray(history)) {
            for (const item of history.slice(-10)) {
                if (!item.content || typeof item.content !== "string") continue;
                const role = (item.role === "assistant" || item.role === "model") ? "model" : "user";
                if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === role) {
                    geminiContents[geminiContents.length - 1].parts[0].text += `\n${item.content}`;
                } else {
                    geminiContents.push({
                        role: role,
                        parts: [{ text: item.content }]
                    });
                }
            }
        }

        // Append current user message
        if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === "user") {
            geminiContents[geminiContents.length - 1].parts[0].text += `\n${message}`;
        } else {
            geminiContents.push({
                role: "user",
                parts: [{ text: message }]
            });
        }

        // Fast path: if a working model is already locked, use it directly
        if (workingModel) {
            try {
                const res = await callGeminiModel(workingModel, geminiKey, geminiContents);
                return res.text;
            } catch (err) {
                console.warn(`Working model ${workingModel} failed, re-probing candidates...`);
                workingModel = null;
            }
        }

        // Parallel Race: dynamically discover available models for this key, then race the top candidates
        const availableModels = await getAvailableGeminiModels(geminiKey);
        const candidateModels = availableModels.slice(0, 3);
        console.log("Racing candidate Gemini models:", candidateModels);

        try {
            const winner = await Promise.any(
                candidateModels.map(m => callGeminiModel(m, geminiKey, geminiContents))
            );
            workingModel = winner.model;
            console.log("===> FASTEST MODEL LOCKED:", workingModel);
            return winner.text;
        } catch (err) {
            console.error("All fast Gemini candidates failed:", err);
            geminiError = err.errors ? err.errors.map(e => e.message).join("; ") : err.message;
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