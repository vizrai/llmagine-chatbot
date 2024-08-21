import React, { useState } from 'react';
import { getAIResponse } from '../lib/openai';

const ChatBox = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    const sendMessage = async () => {
        if (input.trim()) {
            const userMessage = { role: 'user', content: input };
            setMessages([...messages, userMessage]);

            const aiResponse = await getAIResponse(input);
            setMessages([...messages, userMessage, { role: 'assistant', content: aiResponse }]);

            setInput('');
        }
    };

    return (
        <div>
            <div id="chat-window">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.role}`}>
                        {msg.role === 'user' ? 'You: ' : 'AI: '}
                        {msg.content}
                    </div>
                ))}
            </div>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
};

export default ChatBox;
