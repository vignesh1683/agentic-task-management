import { Task } from '@/types/task';

interface TaskItemProps {
  task: Task;
  onUpdate: (taskId: number, updates: Partial<Task>) => void;
}

export default function TaskItem({ task, onUpdate }: TaskItemProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(task.id, { status: e.target.value as Task['status'] });
  };

  return (
    <div className="border rounded p-3 bg-gray-100 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="font-medium text-gray-800">{task.title}</span>
        <select
          value={task.status}
          onChange={handleStatusChange}
          className="ml-2 px-2 py-1 rounded border"
        >
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {task.description && (
        <p className="text-gray-600 text-sm">{task.description}</p>
      )}
    </div>
  );
}
