export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'ARCHIVED';
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

// Mock data for testing
export const mockTasks: Task[] = [
  {
    id: 1,
    title: "Buy wedding attire",
    description: "Buy suit, shoe, watch for the wedding",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    due_date: "2025-09-22T00:00:00.000Z",
    created_at: "2025-09-18T23:49:50.256Z",
    updated_at: "2025-09-18T23:49:50.256Z"
  },
  {
    id: 2,
    title: "Complete kitchen inventory",
    description: "Kitchen inventory task - high priority",
    status: "IN_PROGRESS",
    priority: "HIGH",
    due_date: "2025-09-19T00:00:00.000Z",
    created_at: "2025-09-18T16:22:51.359Z",
    updated_at: "2025-09-18T16:22:51.359Z"
  },
  {
    id: 3,
    title: "Purchase wedding food and supplies",
    description: "Food items: fish, chicken, rice, spices, oil | Household supplies: tissue paper, paper towel",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    due_date: "2025-09-22T00:00:00.000Z",
    created_at: "2025-09-18T16:22:52.574Z",
    updated_at: "2025-09-18T16:22:52.574Z"
  },
  {
    id: 4,
    title: "Team meeting preparation",
    description: "Prepare slides and agenda for the weekly team meeting",
    status: "COMPLETED",
    priority: "HIGH",
    due_date: "2025-09-18T09:00:00.000Z",
    created_at: "2025-09-17T10:30:00.000Z",
    updated_at: "2025-09-18T08:45:00.000Z"
  },
  {
    id: 5,
    title: "Review quarterly reports",
    description: "Review and analyze Q3 financial reports",
    status: "OVERDUE",
    priority: "HIGH",
    due_date: "2025-09-17T17:00:00.000Z",
    created_at: "2025-09-15T14:20:00.000Z",
    updated_at: "2025-09-15T14:20:00.000Z"
  },
  {
    id: 6,
    title: "New Task - Low Priority",
    description: "This is a new task to be added for testing.",
    status: "IN_PROGRESS",
    priority: "LOW",
    due_date: "2025-09-25T10:00:00.000Z",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 7,
    title: "Archived task for reference",
    description: "This task is no longer active but kept for reference.",
    status: "ARCHIVED",
    priority: "MEDIUM",
    created_at: "2025-09-10T00:00:00.000Z",
    updated_at: "2025-09-12T00:00:00.000Z"
  }
];
