'use client';

import { useState } from 'react';
import { Task } from '@/types/task';
import TaskItem from './TaskItem';
import { LayoutList, LayoutGrid } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => void;
}

export default function TaskList({ tasks, onTaskUpdate }: TaskListProps) {
  const [view, setView] = useState<'list' | 'grid'>('list');

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
    { key: 'in_progress', title: 'In Progress', border: 'border-blue-300' },
    { key: 'overdue', title: 'Overdue', border: 'border-red-300' },
    { key: 'completed', title: 'Completed', border: 'border-green-300' },
    { key: 'archived', title: 'Archived', border: 'border-gray-400' },
  ] as const;

  return (
    <div className="p-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen">
      <div className="flex items-center gap-6 mb-6">
        <h1 className="text-2xl font-bold">Task Management</h1>
        <button
          onClick={() => setView(view === 'list' ? 'grid' : 'list')}
          className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {view === 'list' ? (
            <>
              <LayoutGrid size={18} /> Grid View
            </>
          ) : (
            <>
              <LayoutList size={18} /> List View
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-6 pb-4">
        {columns.map(c => (
          <div
            key={c.key}
            className={`
              flex-shrink-0 w-full max-h-1/5
              bg-[var(--bg-secondary)]
              border-2 ${c.border}
              rounded-lg shadow
              flex flex-col
              max-h-[500px]
            `}
          >
            <div className="px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {c.title} ({grouped[c.key].length})
              </h2>
            </div>

            <div
              className={`flex-1 overflow-y-auto p-4 ${
                view === 'grid' ? 'grid grid-cols-3 md:grid-cols-4 gap-4' : 'space-y-4'
              }`}
            >
              {grouped[c.key].map(task => (
                <TaskItem key={task.id} task={task} onUpdate={onTaskUpdate} />
              ))}
              {grouped[c.key].length === 0 && (
                <p className="text-sm italic text-[var(--text-secondary)]">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
