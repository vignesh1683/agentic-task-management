'use client';

import { useState } from 'react';
import { Task } from '@/types/task';
import TaskItem from './TaskItem';
import { LayoutList, LayoutGrid, ListTodo, AlertTriangle, CheckCircle2, Archive } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => void;
}

export default function TaskList({ tasks, onTaskUpdate }: TaskListProps) {
  const [view, setView] = useState<'list' | 'grid'>('grid');

  const grouped = {
    in_progress: tasks.filter(t => t.status === 'inprogress'),
    overdue: tasks.filter(t => {
      if (t.status === 'completed' || t.status === 'archived') return false;
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }),
    completed: tasks.filter(t => t.status === 'completed'),
    archived: tasks.filter(t => t.status === 'archived'),
  };

  const columns = [
    {
      key: 'in_progress' as const,
      title: 'In Progress',
      accent: '#6366f1',
      bgAccent: 'rgba(99, 102, 241, 0.08)',
      icon: <ListTodo size={16} />,
    },
    {
      key: 'overdue' as const,
      title: 'Overdue',
      accent: '#ef4444',
      bgAccent: 'rgba(239, 68, 68, 0.08)',
      icon: <AlertTriangle size={16} />,
    },
    {
      key: 'completed' as const,
      title: 'Completed',
      accent: '#22c55e',
      bgAccent: 'rgba(34, 197, 94, 0.08)',
      icon: <CheckCircle2 size={16} />,
    },
    {
      key: 'archived' as const,
      title: 'Archived',
      accent: '#6b7280',
      bgAccent: 'rgba(107, 114, 128, 0.08)',
      icon: <Archive size={16} />,
    },
  ];

  return (
    <div className="p-6 min-h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Task Board
        </h1>
        <button
          onClick={() => setView(view === 'list' ? 'grid' : 'list')}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
          style={{
            color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {view === 'list' ? (
            <>
              <LayoutGrid size={14} /> Grid
            </>
          ) : (
            <>
              <LayoutList size={14} /> List
            </>
          )}
        </button>
      </div>

      {/* Kanban Board — Horizontal Columns */}
      <div
        className={
          view === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 flex-1'
            : 'flex flex-col gap-4 flex-1'
        }
      >
        {columns.map(c => (
          <div
            key={c.key}
            className="flex flex-col rounded-xl overflow-hidden"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Column Header */}
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{ borderBottom: `2px solid ${c.accent}` }}
            >
              <span style={{ color: c.accent }}>{c.icon}</span>
              <h2 className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
                {c.title}
              </h2>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: c.bgAccent,
                  color: c.accent,
                }}
              >
                {grouped[c.key].length}
              </span>
            </div>

            {/* Column Body */}
            <div
              className={`flex-1 overflow-y-auto p-3 space-y-2.5 ${view === 'list' ? 'max-h-[260px]' : ''
                }`}
              style={{ minHeight: view === 'grid' ? '200px' : '80px' }}
            >
              {grouped[c.key].map((task, idx) => (
                <div
                  key={task.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <TaskItem task={task} onUpdate={onTaskUpdate} />
                </div>
              ))}
              {grouped[c.key].length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 opacity-40">
                  <span style={{ color: c.accent }} className="mb-2 opacity-40">
                    {c.icon}
                  </span>
                  <p className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                    No tasks
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
