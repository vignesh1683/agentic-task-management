'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/task';

interface ChatInterfaceProps {
  onMessageSent: (message: string) => void;
  messages: ChatMessage[];
  isConnected: boolean;
}

export default function ChatInterface({ onMessageSent, messages, isConnected }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && isConnected) {
      onMessageSent(inputMessage.trim());
      setInputMessage('');
    }
  };

  return (
    <div
      className="
        flex flex-col h-full rounded-lg shadow-sm
        bg-[var(--bg-primary)] text-[var(--text-primary)]
        border border-[var(--border-color)]
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
        <h2 className="text-lg font-semibold">AI Task Assistant</h2>
        <span
          className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow
                ${
                  m.type === 'user'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                }`}
            >
              <p className="text-sm break-words">{m.message}</p>
              <p className="text-xs opacity-70 mt-1">
                {m.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--border-color)]">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            placeholder="Type a message…"
            className="
              flex-1 px-3 py-2 rounded-md
              bg-[var(--bg-secondary)] text-[var(--text-primary)]
              border border-[var(--border-color)]
              focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]
              disabled:opacity-50
            "
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !isConnected}
            className="
              px-4 py-2 rounded-md
              bg-[var(--accent-primary)] text-white
              hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
