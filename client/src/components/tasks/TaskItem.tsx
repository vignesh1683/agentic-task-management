'use client';

import { Task } from '@/types/task';
import { CheckCircle2, Clock, ArrowUpCircle, ArrowRightCircle, ArrowDownCircle, Calendar, Archive, RotateCcw } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onUpdate: (taskId: number, updates: Partial<Task>) => void;
}

const priorityConfig: Record<string, {
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  label: string;
}> = {
  high: {
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    border: '#ef4444',
    icon: <ArrowUpCircle size={12} />,
    label: 'High',
  },
  medium: {
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: '#f59e0b',
    icon: <ArrowRightCircle size={12} />,
    label: 'Medium',
  },
  low: {
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.08)',
    border: '#22c55e',
    icon: <ArrowDownCircle size={12} />,
    label: 'Low',
  },
};

function getRelativeDate(dateStr: string): { text: string; isOverdue: boolean } {
  const due = new Date(dateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) {
    // Overdue — show hours or days
    const absHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    if (absHours < 1) return { text: 'Just overdue', isOverdue: true };
    if (absHours < 24) return { text: `Overdue by ${absHours}h`, isOverdue: true };
    const absDays = Math.floor(absHours / 24);
    return {
      text: absDays === 1 ? 'Overdue by 1 day' : `Overdue by ${absDays} days`,
      isOverdue: true,
    };
  }

  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) {
    const diffMins = Math.round(diffMs / (1000 * 60));
    return { text: `Due in ${diffMins}m`, isOverdue: false };
  }
  if (diffHours < 24) {
    const h = Math.floor(diffHours);
    return { text: `Due in ${h}h`, isOverdue: false };
  }

  // Compare calendar dates (strip time)
  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const calDiffDays = Math.round((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (calDiffDays === 0) return { text: 'Due today', isOverdue: false };
  if (calDiffDays === 1) return { text: 'Due tomorrow', isOverdue: false };
  if (calDiffDays <= 7) return { text: `Due in ${calDiffDays} days`, isOverdue: false };
  return {
    text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    isOverdue: false,
  };
}


export default function TaskItem({ task, onUpdate }: TaskItemProps) {
  const priority = priorityConfig[task.priority?.toLowerCase()] ?? priorityConfig.medium;
  const dateInfo = task.due_date ? getRelativeDate(task.due_date) : null;
  const isArchived = task.status === 'archived';
  const isCompleted = task.status === 'completed';

  return (
    <div
      className="rounded-xl p-3.5 transition-all duration-200 hover:translate-y-[-1px] cursor-default group"
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderLeft: `3px solid ${priority.border}`,
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      {/* Title & Priority */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3
          className="text-sm font-semibold leading-snug break-words flex-1"
          style={{ color: 'var(--text-primary)' }}
        >
          {task.title}
        </h3>
        <span
          className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{
            color: priority.color,
            background: priority.bg,
          }}
        >
          {priority.icon}
          {priority.label}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p
          className="text-xs leading-relaxed mb-2.5 line-clamp-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {task.description}
        </p>
      )}

      {/* Footer: Date + Actions */}
      <div className="flex items-center justify-between mt-1">
        {dateInfo ? (
          <span
            className="flex items-center gap-1 text-[11px] font-medium"
            style={{ color: dateInfo.isOverdue ? 'var(--danger)' : 'var(--text-tertiary)' }}
          >
            <Calendar size={11} />
            {dateInfo.text}
          </span>
        ) : (
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            No due date
          </span>
        )}

        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
          {isArchived ? (
            /* Archived → Reopen button */
            <button
              onClick={() => onUpdate(task.id, { status: 'inprogress' })}
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md"
              style={{
                color: 'var(--info)',
                background: 'var(--info-bg)',
              }}
            >
              <RotateCcw size={11} /> Reopen
            </button>
          ) : (
            <>
              {/* Complete / Reopen toggle */}
              <button
                onClick={() =>
                  onUpdate(task.id, {
                    status: isCompleted ? 'inprogress' : 'completed',
                  })
                }
                className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md"
                style={{
                  color: isCompleted ? 'var(--info)' : 'var(--success)',
                  background: isCompleted ? 'var(--info-bg)' : 'var(--success-bg)',
                }}
              >
                {isCompleted ? (
                  <>
                    <Clock size={11} /> Reopen
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={11} /> Complete
                  </>
                )}
              </button>

              {/* Archive button */}
              <button
                onClick={() => onUpdate(task.id, { status: 'archived' })}
                className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md"
                style={{
                  color: '#6b7280',
                  background: 'rgba(107, 114, 128, 0.1)',
                }}
              >
                <Archive size={11} /> Archive
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

