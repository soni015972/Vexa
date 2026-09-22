import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect } from "react";
import {ScaleLoader} from "react-spinners";

function ChatWindow() {
    const {prompt, setPrompt, reply, setReply, currThreadId, setPrevChats, setNewChat} = useContext(MyContext);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const BACKEND_URL = import.meta.env.VITE_API_URL || "https://vexa-rb09.onrender.com";

    const getReply = async () => {
        const userMessage = prompt.trim();
        if (!userMessage || loading) return;

        // 1. Instantly clear the input box
        setPrompt("");

        // 2. Instantly show the user's message in the chat
        setPrevChats(prev => [...prev, { role: "user", content: userMessage }]);

        // 3. Set loading state
        setLoading(true);
        setNewChat(false);

        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: userMessage,
                threadId: currThreadId,
                history: prevChats
            })
        };

        try {
            const response = await fetch(`${BACKEND_URL}/api/chat`, options);
            const res = await response.json();
            setReply(res.reply);
            setPrevChats(prev => [...prev, { role: "assistant", content: res.reply }]);
        } catch(err) {
            console.log(err);
            const errMsg = "Sorry, failed to get a response. Please check your connection.";
            setReply(errMsg);
            setPrevChats(prev => [...prev, { role: "assistant", content: errMsg }]);
        }
        setLoading(false);
    }

    const handleProfileClick = () => {
        setIsOpen(!isOpen);
    }

    return (
        <div className="chatWindow">
            {/* Navbar */}
            <div className="navbar">
                <div className="navbar-title">
                    <span className="brand-name">Vexa</span>
                    <i className="fa-solid fa-chevron-down"></i>
                </div>
                <div className="userIconDiv" onClick={handleProfileClick}>
                    <span className="userIcon"><i className="fa-solid fa-user"></i></span>
                </div>
            </div>

            {/* Profile Dropdown */}
            {
                isOpen && 
                <div className="dropDown">
                    <div className="dropDownItem"><i className="fa-solid fa-gear"></i> Settings</div>
                    <div className="dropDownItem"><i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan</div>
                    <div className="dropDownItem"><i className="fa-solid fa-arrow-right-from-bracket"></i> Log out</div>
                </div>
            }

            {/* Chat Messages */}
            <Chat></Chat>

            {/* Loader */}
            <ScaleLoader color="#a78bfa" loading={loading} height={20} width={3} margin={3}></ScaleLoader>
            
            {/* Input Area */}
            <div className="chatInput">
                <div className="inputBox">
                    <input 
                        placeholder="Ask Vexa anything..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' ? getReply() : ''}
                    />
                    <div id="submit" onClick={getReply}>
                        <i className="fa-solid fa-paper-plane"></i>
                    </div>
                </div>
                <p className="info">
                    Vexa can make mistakes. Check important info.
                </p>
            </div>
        </div>
    )
}

export default ChatWindow;