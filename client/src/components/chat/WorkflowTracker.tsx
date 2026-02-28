'use client';

import { Bot, CheckCircle2, ArrowRight, Zap } from 'lucide-react';

export interface WorkflowStep {
    agent: string;
    status: string;
    latency_ms: number;
}

interface WorkflowTrackerProps {
    steps: WorkflowStep[];
}

const agentConfig: Record<string, { label: string; color: string; bg: string }> = {
    supervisor: { label: 'Supervisor', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
    creator: { label: 'Creator Agent', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
    reader: { label: 'Reader Agent', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    editor: { label: 'Editor Agent', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    done: { label: 'Complete', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
};

export default function WorkflowTracker({ steps }: WorkflowTrackerProps) {
    if (steps.length === 0) return null;

    return (
        <div className="flex justify-start animate-fade-in mb-1">
            <div
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-medium flex-wrap"
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                }}
            >
                <Bot size={11} style={{ color: 'var(--accent-primary)', marginRight: 2 }} />
                {steps.map((step, i) => {
                    const cfg = agentConfig[step.agent] || agentConfig.done;
                    const isDone = step.agent === 'done';
                    return (
                        <span key={i} className="flex items-center gap-1">
                            {i > 0 && (
                                <ArrowRight size={9} style={{ color: 'var(--text-tertiary)', margin: '0 1px' }} />
                            )}
                            <span
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                                style={{ background: cfg.bg, color: cfg.color }}
                            >
                                {isDone ? <CheckCircle2 size={9} /> : null}
                                {cfg.label}
                            </span>
                            <span
                                className="flex items-center gap-0.5"
                                style={{ color: 'var(--text-tertiary)' }}
                            >
                                <Zap size={8} />
                                {step.latency_ms}ms
                            </span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
