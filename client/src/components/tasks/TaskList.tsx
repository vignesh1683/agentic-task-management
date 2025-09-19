'use client';

import { Task } from '@/types/task';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => void;
}

export default function TaskList({ tasks, onTaskUpdate }: TaskListProps) {
  const grouped = {
    in_progress: tasks.filter(t => t.status === 'IN_PROGRESS'),
    completed: tasks.filter(t => t.status === 'COMPLETED'),
    overdue: tasks.filter(t => t.status === 'OVERDUE'),
    archived: tasks.filter(t => t.status === 'ARCHIVED'),
  };

  const columns = [
    { key: 'in_progress', title: 'In Progress', border: 'border-blue-300' },
    { key: 'completed', title: 'Completed', border: 'border-green-300' },
    { key: 'overdue', title: 'Overdue', border: 'border-red-300' },
    { key: 'archived', title: 'Archived', border: 'border-gray-400' },
  ] as const;

  return (
    <div className="p-6 bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Task Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map(c => (
          <div
            key={c.key}
            className={`
              bg-[var(--bg-secondary)] rounded-lg p-4
              border-2 ${c.border} shadow
            `}
          >
            <h2 className="text-lg font-semibold mb-4">
              {c.title} ({grouped[c.key].length})
            </h2>

            <div className="space-y-3">
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
