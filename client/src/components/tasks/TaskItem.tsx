'use client';

import { Task } from '@/types/task';

interface TaskItemProps {
  task: Task;
  onUpdate: (taskId: number, updates: Partial<Task>) => void;
}

export default function TaskItem({ task, onUpdate }: TaskItemProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    onUpdate(task.id, { status: e.target.value as Task['status'] });

  return (
    <div className="
      border border-[var(--border-color)]
      rounded p-3 bg-[var(--bg-primary)]
      shadow-sm flex flex-col gap-2
    ">
      <div className="flex justify-between items-center">
        <span className="font-medium text-[var(--text-primary)]">{task.title}</span>
        <select
          value={task.status}
          onChange={handleChange}
          className="
            ml-2 px-2 py-1 rounded border border-[var(--border-color)]
            bg-[var(--bg-secondary)] text-[var(--text-primary)]
            focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]
          "
        >
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {task.description && (
        <p className="text-sm text-[var(--text-secondary)]">{task.description}</p>
      )}
    </div>
  );
}
