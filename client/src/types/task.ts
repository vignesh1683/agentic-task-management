export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'inprogress' | 'completed' | 'overdue' | 'archived';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  type: 'user' | 'agent' | 'system';
  message: string;
  timestamp: Date;
}
