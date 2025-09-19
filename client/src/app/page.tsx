'use client';

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import TaskList from '@/components/tasks/TaskList';
import { ChatMessage, Task } from '@/types/task';

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize WebSocket connection
    const websocket = new WebSocket('ws://localhost:8000/ws/chat');

    websocket.onopen = () => {
      setIsConnected(true);
      setMessages(prev => [...prev, {
        type: 'system',
        message: 'Connected to AI Task Assistant',
        timestamp: new Date()
      }]);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'agent_response') {
        setMessages(prev => [...prev, {
          type: 'agent',
          message: data.message,
          timestamp: new Date()
        }]);
      } else if (data.type === 'task_update') {

      }
    };

    websocket.onclose = () => {
      setIsConnected(false);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const handleMessageSent = (message: string) => {
    // Add user message to chat
    setMessages(prev => [...prev, {
      type: 'user',
      message,
      timestamp: new Date()
    }]);

    // Send message via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ message }));
    }
  };

  const handleTaskUpdate = (taskId: number, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  return (
    <div className="h-screen flex">
      {/* Task List */}
      <div className="flex-1">
        <TaskList
          tasks={tasks}
          onTaskUpdate={handleTaskUpdate}
        />
      </div>

      {/* Chat Interface */}
      <div className="w-1/4 border-r border-gray-200">
        <ChatInterface
          messages={messages}
          onMessageSent={handleMessageSent}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
}