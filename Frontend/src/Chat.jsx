import "./Chat.css";
import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

function Chat() {
    const {newChat, prevChats, reply} = useContext(MyContext);
    const [latestReply, setLatestReply] = useState(null);

    useEffect(() => {
        if(reply === null) {
            setLatestReply(null);
            return;
        }

        if(!prevChats?.length) return;

        const content = reply.split(" ");

        let idx = 0;
        const interval = setInterval(() => {
            setLatestReply(content.slice(0, idx+1).join(" "));
            idx++;
            if(idx >= content.length) clearInterval(interval);
        }, 15);

        return () => clearInterval(interval);

    }, [prevChats, reply])

    return (
        <div className="chats">
            {newChat && <h1>✦ Start a New Chat!</h1>}

            {
                prevChats?.map((chat, idx) => {
                    const isLast = idx === prevChats.length - 1;
                    if (chat.role === "user") {
                        return (
                            <div className="userDiv" key={idx}>
                                <p className="userMessage">{chat.content}</p>
                            </div>
                        );
                    } else {
                        return (
                            <div className="gptDiv" key={idx}>
                                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                                    {isLast && latestReply !== null ? latestReply : chat.content}
                                </ReactMarkdown>
                            </div>
                        );
                    }
                })
            }
        </div>
    )
}

export default Chat;