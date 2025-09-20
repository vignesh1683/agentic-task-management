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
    const websocket = new WebSocket('ws://localhost:8000/ws/chat');
    websocket.onopen = () => {
      setIsConnected(true);
      setMessages(prev => [
        ...prev,
        {
          type: 'system',
          message: 'Connected to AI Task Assistant',
          timestamp: new Date()
        }
      ]);
    };
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'initial_tasks') {
        setTasks(data.tasks);
      } else if (data.type === 'agent_response') {
        setMessages(prev => [
          ...prev,
          {
            type: 'agent',
            message: data.message,
            timestamp: new Date()
          }
        ]);
      } else if (data.type === 'task_update') {
        setTasks(data.tasks);
      }
    };
    websocket.onclose = () => setIsConnected(false);
    setWs(websocket);
    return () => websocket.close();
  }, []);

  const handleMessageSent = (message: string) => {
    setMessages(prev => [...prev, { type: 'user', message, timestamp: new Date() }]);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ message }));
    }
  };

  const handleTaskUpdate = (taskId: number, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)));
  };

  return (
    <div className="h-screen flex">
      <div className="w-1/4 border-r border-gray-200 shadow overflow-hidden">
        <ChatInterface
          messages={messages}
          onMessageSent={handleMessageSent}
          isConnected={isConnected}
        />
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        <TaskList tasks={tasks} onTaskUpdate={handleTaskUpdate} />
      </div>
    </div>
  );
}