'use client';

import { Task } from '@/types/task';
import { CheckCircle2, Clock } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onUpdate: (taskId: number, updates: Partial<Task>) => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  high: 'bg-red-100 text-red-700 border-red-300',
};

export default function TaskItem({ task, onUpdate }: TaskItemProps) {
  const priorityClass =
    priorityColors[task.priority] ?? 'bg-gray-100 text-gray-700 border-gray-300';

  return (
    <div
      className="
        border border-[var(--border-color)]
        rounded-lg p-4 bg-[var(--bg-primary)]
        shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow
      "
    >
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-base text-[var(--text-primary)] break-words">
          {task.title}
        </h3>

        <span
          className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${priorityClass}`}
        >
          {task.priority.toUpperCase()}
        </span>
      </div>

      {task.description && (
        <p className="text-sm text-[var(--text-secondary)] leading-snug">
          {task.description}
        </p>
      )}

      <div className="flex justify-between items-center text-xs text-[var(--text-secondary)]">
        {task.due_date && (
          <span className="flex items-center gap-1">
            <Clock size={14} /> {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
        <button
          className="flex items-center gap-1 text-blue-500 hover:underline font-medium"
          onClick={() =>
            onUpdate(task.id, {
              status: task.status === 'completed' ? 'inprogress' : 'completed',
            })
          }
        >
          {task.status === 'completed' ? (
            <>
              <Clock size={14} /> Mark In-Progress
            </>
          ) : (
            <>
              <CheckCircle2 size={14} /> Mark Completed
            </>
          )}
        </button>
      </div>
    </div>
  );
}
