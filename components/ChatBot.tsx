import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage } from '../services/geminiService';
import { ChatMessage } from '../types';

const ChatBot: React.FC = () => {
  const [input, setInput] = useState('');
  
  // Initialize from localStorage or default
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quizzle_chat_history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Revive date strings back to Date objects
          return parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        } catch (e) {
          console.error("Failed to parse chat history", e);
        }
      }
    }
    return [{
      id: 'init',
      role: 'model',
      text: "Hello! I'm your AI Tutor. Ask me anything about your studies or the MCQs you just solved.",
      timestamp: new Date()
    }];
  });

  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem('quizzle_chat_history', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Transform internal message format to API history format
      const history = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      const responseText = await sendChatMessage(history, userMsg.text);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "I couldn't generate a response. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, I encountered an error connecting to the tutor service.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    const initialMsg: ChatMessage = {
      id: 'init',
      role: 'model',
      text: "Hello! I'm your AI Tutor. Ask me anything about your studies or the MCQs you just solved.",
      timestamp: new Date()
    };
    setMessages([initialMsg]);
    localStorage.removeItem('quizzle_chat_history');
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header with Clear Option */}
      <div className="shrink-0 px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between z-10 transition-colors duration-300">
        <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                    <path d="M16.5 6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v7.5a3 3 0 0 0 3 3v2.604a.75.75 0 0 0 1.08.665l3.22-1.77h6.2a3 3 0 0 0 3-3V6Z" />
                </svg>
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white animate-fade-in">AI Tutor</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 animate-fade-in delay-100">Always here to help</p>
            </div>
        </div>
        
        <button
            onClick={handleClearChat}
            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300 group"
            title="Clear Chat History"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 transition-transform group-hover:scale-110">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full items-end gap-2 md:gap-3 animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                      <path d="M16.5 6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v7.5a3 3 0 0 0 3 3v2.604a.75.75 0 0 0 1.08.665l3.22-1.77h6.2a3 3 0 0 0 3-3V6Z" />
                    </svg>
                </div>
            )}
            
            <div
              className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-4 py-3 md:px-6 md:py-4 shadow-lg backdrop-blur-sm border ${
                msg.role === 'user'
                  ? 'bg-blue-600/90 border-blue-500/50 text-white rounded-br-sm'
                  : 'glass-panel text-gray-900 dark:text-gray-100 border-gray-200 dark:border-white/10 rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base break-words">{msg.text}</p>
              <p className={`text-[10px] mt-2 opacity-60 font-medium ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            
            {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700/50 border border-gray-300 dark:border-white/10 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500 dark:text-gray-300">
                      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                    </svg>
                </div>
            )}
          </div>
        ))}
        {loading && (
           <div className="flex justify-start w-full gap-3 animate-fade-in-up">
               <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                      <path d="M16.5 6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v7.5a3 3 0 0 0 3 3v2.604a.75.75 0 0 0 1.08.665l3.22-1.77h6.2a3 3 0 0 0 3-3V6Z" />
                    </svg>
               </div>
               <div className="glass-panel rounded-2xl rounded-bl-sm px-6 py-5 border border-gray-200 dark:border-white/10 flex space-x-2 items-center">
                   <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                   <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></div>
               </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 md:p-4 glass-panel border-t border-gray-200 dark:border-white/10 backdrop-blur-xl animate-fade-in">
        <div className="flex items-center space-x-2 md:space-x-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 glass-input text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm md:text-base rounded-xl md:rounded-2xl focus:ring-2 focus:ring-blue-500/50 block w-full p-3 md:p-4 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl md:rounded-2xl p-3 md:p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95"
          >
            <svg className="w-5 h-5 transform rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 12L3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;