import express from "express";
import Thread from "../models/Thread.js";
import getOpenAIAPIResponse from "../utils/openai.js";

const router = express.Router();

//test
router.post("/test", async(req, res) => {
    try {
        const thread = new Thread({
            threadId: "abc",
            title: "Testing New Thread2"
        });

        const response = await thread.save();
        res.send(response);
    } catch(err) {
        console.log(err);
        res.status(500).json({error: "Failed to save in DB"});
    }
});

// In-memory fallback if MongoDB is not connected
let inMemoryThreads = [];

// Get all threads
router.get("/thread", async (req, res) => {
    try {
        if (Thread.db?.readyState === 1) {
            const threads = await Thread.find({}).sort({ updatedAt: -1 });
            return res.json(threads);
        }
        // Fallback to in-memory
        res.json(inMemoryThreads);
    } catch (err) {
        console.log(err);
        res.json(inMemoryThreads);
    }
});

router.get("/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;

    try {
        if (Thread.db?.readyState === 1) {
            const thread = await Thread.findOne({ threadId });
            if (!thread) {
                return res.status(404).json({ error: "Thread not found" });
            }
            return res.json(thread.messages);
        }
        // In-memory fallback
        const thread = inMemoryThreads.find(t => t.threadId === threadId);
        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.json(thread.messages);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Failed to fetch chat" });
    }
});

router.delete("/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;

    try {
        if (Thread.db?.readyState === 1) {
            const deletedThread = await Thread.findOneAndDelete({ threadId });
            if (!deletedThread) {
                return res.status(404).json({ error: "Thread not found" });
            }
            return res.status(200).json({ success: "Thread deleted successfully" });
        }
        // In-memory fallback
        inMemoryThreads = inMemoryThreads.filter(t => t.threadId !== threadId);
        res.status(200).json({ success: "Thread deleted successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Failed to delete thread" });
    }
});

router.post("/chat", async (req, res) => {
    const { threadId, message, history: clientHistory } = req.body;

    if (!threadId || !message) {
        return res.status(400).json({ error: "missing required fields" });
    }

    try {
        // Collect conversation history
        let conversationHistory = [];
        if (Array.isArray(clientHistory) && clientHistory.length > 0) {
            conversationHistory = clientHistory;
        } else if (Thread.db?.readyState === 1) {
            const existingThread = await Thread.findOne({ threadId });
            if (existingThread && existingThread.messages) {
                conversationHistory = existingThread.messages;
            }
        } else {
            const existingThread = inMemoryThreads.find(t => t.threadId === threadId);
            if (existingThread && existingThread.messages) {
                conversationHistory = existingThread.messages;
            }
        }

        const assistantReply = await getOpenAIAPIResponse(message, conversationHistory);

        if (Thread.db?.readyState === 1) {
            let thread = await Thread.findOne({ threadId });

            if (!thread) {
                thread = new Thread({
                    threadId,
                    title: message.length > 30 ? message.slice(0, 30) + "..." : message,
                    messages: [{ role: "user", content: message }]
                });
            } else {
                thread.messages.push({ role: "user", content: message });
            }

            thread.messages.push({ role: "assistant", content: assistantReply });
            thread.updatedAt = new Date();
            await thread.save();
        } else {
            // In-memory storage when MongoDB is not connected
            let thread = inMemoryThreads.find(t => t.threadId === threadId);
            if (!thread) {
                thread = {
                    threadId,
                    title: message.length > 30 ? message.slice(0, 30) + "..." : message,
                    messages: [
                        { role: "user", content: message },
                        { role: "assistant", content: assistantReply }
                    ],
                    updatedAt: new Date()
                };
                inMemoryThreads.unshift(thread);
            } else {
                thread.messages.push({ role: "user", content: message });
                thread.messages.push({ role: "assistant", content: assistantReply });
                thread.updatedAt = new Date();
            }
        }

        res.json({ reply: assistantReply });
    } catch (err) {
        console.log("Chat error:", err);
        res.status(500).json({ error: "something went wrong" });
    }
});





export default router;