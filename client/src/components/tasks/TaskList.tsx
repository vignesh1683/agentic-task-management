'use client';

import { Task } from '@/types/task';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => void;
}

export default function TaskList({ tasks, onTaskUpdate }: TaskListProps) {
  const groupedTasks = {
    in_progress: tasks.filter(task => task.status === 'IN_PROGRESS'),
    completed: tasks.filter(task => task.status === 'COMPLETED'),
    overdue: tasks.filter(task => task.status === 'OVERDUE'),
    archived: tasks.filter(task => task.status === 'ARCHIVED'),
  };

  const statusColumns = [
    { key: 'in_progress', title: 'In Progress', color: 'border-blue-200' },
    { key: 'completed', title: 'Completed', color: 'border-green-200' },
    { key: 'overdue', title: 'Overdue', color: 'border-red-200' },
    { key: 'archived', title: 'Archived', color: 'border-gray-300' },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Task Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusColumns.map(column => (
          <div key={column.key} className={`bg-white rounded-lg border-2 ${column.color} p-4`}>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 capitalize">
              {column.title} ({groupedTasks[column.key as keyof typeof groupedTasks].length})
            </h2>
            
            <div className="space-y-3">
              {groupedTasks[column.key as keyof typeof groupedTasks].map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onUpdate={onTaskUpdate}
                />
              ))}
              
              {groupedTasks[column.key as keyof typeof groupedTasks].length === 0 && (
                <p className="text-gray-500 text-sm italic">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}