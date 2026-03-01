'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import TaskList from '@/components/tasks/TaskList';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import { ChatMessage, Task } from '@/types/task';
import { WorkflowStep } from '@/components/chat/WorkflowTracker';
import { Zap, Wifi, WifiOff, RefreshCw } from 'lucide-react';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentWorkflowSteps, setCurrentWorkflowSteps] = useState<WorkflowStep[]>([]);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus('reconnecting');
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/chat';
    const websocket = new WebSocket(wsUrl);
    wsRef.current = websocket;

    websocket.onopen = () => {
      setConnectionStatus('connected');
      setRetryCount(0);
      setWs(websocket);
      setMessages(prev => {
        const lastSystem = [...prev].reverse().find(m => m.type === 'system');
        if (lastSystem?.message === 'Connected — Multi-Agent AI is ready') return prev;
        return [
          ...prev,
          {
            type: 'system',
            message: 'Connected — Multi-Agent AI is ready',
            timestamp: new Date()
          }
        ];
      });
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'initial_tasks') {
        setTasks(data.tasks);

      } else if (data.type === 'workflow_step') {
        // Accumulate workflow steps for current response
        const step: WorkflowStep = {
          agent: data.agent,
          status: data.status,
          latency_ms: data.latency_ms,
        };
        setCurrentWorkflowSteps(prev => [...prev, step]);

      } else if (data.type === 'agent_response') {
        setIsAgentTyping(false);
        setMessages(prev => [
          ...prev,
          {
            type: 'agent',
            message: data.message,
            timestamp: new Date(),
            latency_ms: data.latency_ms,
            workflowSteps: [...(currentWorkflowSteps || [])],
          }
        ]);
        // Reset workflow steps for next response
        setCurrentWorkflowSteps([]);

      } else if (data.type === 'task_update') {
        setTasks(data.tasks);

      } else if (data.type === 'error') {
        setIsAgentTyping(false);
        setCurrentWorkflowSteps([]);
        console.error('[TaskMate] Agent error:', data.message);
      }
    };

    websocket.onclose = () => {
      setConnectionStatus('disconnected');
      setWs(null);
      wsRef.current = null;

      setRetryCount(prev => {
        const next = prev + 1;
        const delay = Math.min(1000 * Math.pow(2, next - 1), 30000);
        reconnectTimerRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
        return next;
      });

      setMessages(prev => [
        ...prev,
        {
          type: 'system',
          message: 'Disconnected — Attempting to reconnect...',
          timestamp: new Date()
        }
      ]);
    };

    websocket.onerror = () => { };
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

  const handleMessageSent = (message: string) => {
    setMessages(prev => [...prev, { type: 'user', message, timestamp: new Date() }]);
    setIsAgentTyping(true);
    setCurrentWorkflowSteps([]);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ message }));
    }
  };

  const handleTaskUpdate = (taskId: number, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)));
    if (ws && ws.readyState === WebSocket.OPEN && updates.status) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const statusMap: Record<string, string> = {
          completed: 'completed',
          inprogress: 'inprogress',
          archived: 'archived',
        };
        const newStatus = statusMap[updates.status] || updates.status;
        ws.send(JSON.stringify({
          message: `Update task "${task.title}" status to ${newStatus}`,
        }));
      }
    }
  };

  const handleManualReconnect = () => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    setRetryCount(0);
    connectWebSocket();
  };

  const statusConfig = {
    connected: {
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: <Wifi size={15} />,
      label: 'Connected — AI ready',
    },
    disconnected: {
      bg: 'bg-red-500/10 border-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      icon: <WifiOff size={15} />,
      label: `Disconnected — Retrying...`,
    },
    reconnecting: {
      bg: 'bg-amber-500/10 border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      icon: <RefreshCw size={15} className="animate-spin" />,
      label: 'Reconnecting...',
    },
  };

  const status = statusConfig[connectionStatus];

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Top Header Bar ── */}
      <header
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-gradient)' }}
          >
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              TaskMate
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              AI Task Management
            </p>
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${status.bg} ${status.text}`}
          >
            {status.icon}
            <span>{status.label}</span>
            {connectionStatus === 'disconnected' && (
              <button
                onClick={handleManualReconnect}
                className="ml-1 underline hover:no-underline text-xs font-semibold"
              >
                Retry now
              </button>
            )}
          </div>

          {/* Task Stats */}
          <div className="hidden md:flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              {tasks.filter(t => t.status === 'inprogress').length} Active
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {tasks.filter(t => t.status === 'completed').length} Done
            </span>
            <span className="font-medium" style={{ color: 'var(--text-tertiary)' }}>
              {tasks.length} Total
            </span>
          </div>

          <ThemeToggleButton />
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Sidebar */}
        <div
          className="w-[380px] min-w-[320px] border-r flex flex-col"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--bg-chat)',
          }}
        >
          <ChatInterface
            messages={messages}
            onMessageSent={handleMessageSent}
            isConnected={connectionStatus === 'connected'}
            isAgentTyping={isAgentTyping}
            currentWorkflowSteps={currentWorkflowSteps}
          />
        </div>

        {/* Task Board */}
        <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-primary)' }}>
          <TaskList tasks={tasks} onTaskUpdate={handleTaskUpdate} />
        </div>
      </div>
    </div>
  );
}