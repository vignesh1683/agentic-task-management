'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/task';
import { Send, Bot, User, Sparkles, MessageSquare, Zap } from 'lucide-react';
import WorkflowTracker, { WorkflowStep } from './WorkflowTracker';

interface ChatInterfaceProps {
  onMessageSent: (message: string) => void;
  messages: ChatMessage[];
  isConnected: boolean;
  isAgentTyping?: boolean;
  currentWorkflowSteps?: WorkflowStep[];
}

const suggestedPrompts = [
  "Create a task to finish the project report by Friday",
  "Show me all my tasks",
  "Add a high priority task for team standup tomorrow",
  "What tasks are overdue?",
];

export default function ChatInterface({ onMessageSent, messages, isConnected, isAgentTyping, currentWorkflowSteps = [] }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages, isAgentTyping, currentWorkflowSteps]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && isConnected) {
      onMessageSent(inputMessage.trim());
      setInputMessage('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handlePromptClick = (prompt: string) => {
    if (isConnected) {
      onMessageSent(prompt);
    }
  };

  const userMessages = messages.filter(m => m.type !== 'system');
  const hasMessages = userMessages.length > 0 || messages.some(m => m.type === 'user' || m.type === 'agent');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center gap-3"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--bg-secondary)',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-gradient)' }}
        >
          <Bot size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            AI Assistant
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse-dot' : 'bg-red-400'}`}
            />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {isAgentTyping ? 'Agents working...' : isConnected ? '3 agents online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Welcome Screen */}
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--accent-muted)' }}
            >
              <Sparkles size={28} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Welcome to TaskMate
            </h3>
            <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Powered by 3 specialized AI agents
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              I can help you create, manage, and track your tasks. Try one of these:
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptClick(prompt)}
                  className="text-left text-sm px-4 py-2.5 rounded-xl border transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    borderColor: 'var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <MessageSquare
                    size={12}
                    className="inline mr-2 opacity-50"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((m, i) => (
          <div key={i}>
            {/* Workflow tracker (shown above agent messages) */}
            {m.type === 'agent' && m.workflowSteps && m.workflowSteps.length > 0 && (
              <WorkflowTracker steps={m.workflowSteps} />
            )}

            <div
              className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              {/* Bot/System Avatar */}
              {m.type !== 'user' && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1 mr-2"
                  style={{
                    background: m.type === 'system' ? 'var(--accent-muted)' : 'var(--accent-gradient)',
                  }}
                >
                  {m.type === 'system' ? (
                    <Sparkles size={13} style={{ color: 'var(--accent-primary)' }} />
                  ) : (
                    <Bot size={13} className="text-white" />
                  )}
                </div>
              )}

              <div
                className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${m.type === 'user'
                  ? 'rounded-2xl rounded-br-md'
                  : m.type === 'system'
                    ? 'rounded-xl'
                    : 'rounded-2xl rounded-bl-md'
                  }`}
                style={
                  m.type === 'user'
                    ? { background: 'var(--accent-gradient)', color: 'white' }
                    : m.type === 'system'
                      ? {
                        background: 'var(--accent-muted)',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontStyle: 'italic',
                      }
                      : {
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                      }
                }
              >
                <p className="break-words whitespace-pre-wrap">{m.message}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <p
                    className="text-[10px] opacity-50 select-none"
                    style={{ color: m.type === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)' }}
                  >
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {/* Latency badge for agent messages */}
                  {m.type === 'agent' && m.latency_ms && (
                    <span
                      className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        color: m.latency_ms < 1000 ? '#22c55e' : m.latency_ms < 1500 ? '#f59e0b' : '#ef4444',
                        background: m.latency_ms < 1000 ? 'rgba(34,197,94,0.1)' : m.latency_ms < 1500 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                      }}
                    >
                      <Zap size={8} />
                      {m.latency_ms}ms
                    </span>
                  )}
                </div>
              </div>

              {/* User Avatar */}
              {m.type === 'user' && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1 ml-2"
                  style={{ background: 'var(--accent-light)' }}
                >
                  <User size={13} style={{ color: 'var(--accent-primary)' }} />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live workflow tracker while typing */}
        {isAgentTyping && currentWorkflowSteps.length > 0 && (
          <WorkflowTracker steps={currentWorkflowSteps} />
        )}

        {/* Typing Indicator */}
        {isAgentTyping && (
          <div className="flex justify-start animate-fade-in">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1 mr-2"
              style={{ background: 'var(--accent-gradient)' }}
            >
              <Bot size={13} className="text-white" />
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: 'var(--accent-primary)',
                    animation: `typing-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t"
        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2 border"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--bg-primary)',
          }}
        >
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? 'Ask me to create, update, or list tasks...' : 'Waiting for connection...'}
            rows={1}
            className="flex-1 resize-none text-sm py-1.5 leading-relaxed focus:outline-none disabled:opacity-40"
            style={{
              background: 'transparent',
              color: 'var(--text-primary)',
              maxHeight: '120px',
            }}
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !isConnected}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: inputMessage.trim() && isConnected ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
              color: inputMessage.trim() && isConnected ? 'white' : 'var(--text-tertiary)',
            }}
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-[10px] mt-1.5 text-center select-none" style={{ color: 'var(--text-tertiary)' }}>
          Press Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
