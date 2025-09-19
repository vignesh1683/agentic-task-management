# Complete Guide: Building a Task Management App with AI Agent

## Overview

This comprehensive guide walks you through building a full-stack Task Management App with an AI agent using modern technologies:

**Backend**: Python + FastAPI + LangGraph + Gemini API + PostgreSQL
**Frontend**: Next.js + TypeScript + TailwindCSS + WebSocket
**Features**: Real-time chat interface, AI-powered task operations, live task updates

## Architecture Overview

The application follows a clean three-tier architecture:
1. **Frontend Layer**: Next.js with TailwindCSS for responsive UI
2. **Backend Layer**: FastAPI with LangGraph AI agent and WebSocket support  
3. **Database Layer**: PostgreSQL with SQLAlchemy/Tortoise ORM

## Backend Implementation

### 1. Project Setup

```bash
mkdir task-manager-backend
cd task-manager-backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install fastapi uvicorn[standard] langgraph langchain-google-genai 
pip install sqlalchemy psycopg2-binary tortoise-orm[asyncpg] python-dotenv
```

### 2. Environment Configuration

Create `.env` file:
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/taskmanager
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
CORS_ORIGINS=http://localhost:3000
```

### 3. Database Models (SQLAlchemy)

```python
# app/models/task.py
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class TaskStatus(enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress" 
    COMPLETED = "completed"
    ARCHIVED = "archived"

class TaskPriority(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
```

### 4. Database Connection

```python
# app/database/connection.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.task import Base
import os

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

### 5. LangGraph Tools Implementation

```python
# app/agent/tools.py
from langchain_core.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.models.task import Task, TaskStatus, TaskPriority
from app.database.connection import AsyncSessionLocal
from datetime import datetime
from typing import Optional, List

@tool
async def create_task(title: str, description: str = "", priority: str = "medium", due_date: str = None) -> str:
    """Create a new task with title, description, priority, and optional due_date."""
    async with AsyncSessionLocal() as db:
        try:
            task_priority = TaskPriority(priority.lower())
            due_date_obj = None
            if due_date:
                due_date_obj = datetime.fromisoformat(due_date)
            
            task = Task(
                title=title,
                description=description,
                priority=task_priority,
                due_date=due_date_obj
            )
            db.add(task)
            await db.commit()
            await db.refresh(task)
            return f"Task '{title}' created successfully with ID {task.id}"
        except Exception as e:
            return f"Error creating task: {str(e)}"

@tool  
async def update_task(task_id: int, title: str = None, description: str = None, 
                     status: str = None, priority: str = None) -> str:
    """Update a task's fields by ID."""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Task).where(Task.id == task_id))
            task = result.scalar_one_or_none()
            
            if not task:
                return f"Task with ID {task_id} not found"
            
            if title:
                task.title = title
            if description:
                task.description = description
            if status:
                task.status = TaskStatus(status.lower())
            if priority:
                task.priority = TaskPriority(priority.lower())
                
            await db.commit()
            return f"Task {task_id} updated successfully"
        except Exception as e:
            return f"Error updating task: {str(e)}"

@tool
async def delete_task(task_id: int) -> str:
    """Delete a task by ID."""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Task).where(Task.id == task_id))
            task = result.scalar_one_or_none()
            
            if not task:
                return f"Task with ID {task_id} not found"
                
            await db.delete(task)
            await db.commit()
            return f"Task {task_id} deleted successfully"
        except Exception as e:
            return f"Error deleting task: {str(e)}"

@tool
async def list_tasks(status: str = None) -> str:
    """List all tasks or filter by status."""
    async with AsyncSessionLocal() as db:
        try:
            query = select(Task)
            if status:
                query = query.where(Task.status == TaskStatus(status.lower()))
            
            result = await db.execute(query.order_by(Task.created_at.desc()))
            tasks = result.scalars().all()
            
            if not tasks:
                return "No tasks found"
                
            task_list = []
            for task in tasks:
                task_info = f"ID: {task.id}, Title: {task.title}, Status: {task.status.value}, Priority: {task.priority.value}"
                if task.due_date:
                    task_info += f", Due: {task.due_date.strftime('%Y-%m-%d')}"
                task_list.append(task_info)
                
            return "Tasks:\n" + "\n".join(task_list)
        except Exception as e:
            return f"Error listing tasks: {str(e)}"

@tool
async def filter_tasks(priority: str = None, status: str = None) -> str:
    """Filter tasks by priority and/or status."""
    async with AsyncSessionLocal() as db:
        try:
            query = select(Task)
            
            if priority:
                query = query.where(Task.priority == TaskPriority(priority.lower()))
            if status:
                query = query.where(Task.status == TaskStatus(status.lower()))
                
            result = await db.execute(query.order_by(Task.created_at.desc()))
            tasks = result.scalars().all()
            
            if not tasks:
                return f"No tasks found with specified filters"
                
            task_list = []
            for task in tasks:
                task_info = f"ID: {task.id}, Title: {task.title}, Status: {task.status.value}, Priority: {task.priority.value}"
                task_list.append(task_info)
                
            return "Filtered tasks:\n" + "\n".join(task_list)
        except Exception as e:
            return f"Error filtering tasks: {str(e)}"
```

### 6. LangGraph Agent Setup

```python
# app/agent/langgraph_agent.py
from langgraph.graph import MessagesState, StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage
from app.agent.tools import create_task, update_task, delete_task, list_tasks, filter_tasks
import os

# Initialize Gemini model
llm = ChatGoogleGenerativeAI(
    model="gemini-pro",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.1
)

# Define tools
tools = [create_task, update_task, delete_task, list_tasks, filter_tasks]
llm_with_tools = llm.bind_tools(tools)
tool_node = ToolNode(tools)

def should_continue(state: MessagesState):
    messages = state["messages"]
    last_message = messages[-1]
    
    if last_message.tool_calls:
        return "tools"
    return END

def call_model(state: MessagesState):
    messages = state["messages"]
    
    # Add system message for context
    system_message = SystemMessage(content="""
    You are a helpful AI assistant for task management. You can help users:
    - Create new tasks with titles, descriptions, priorities, and due dates
    - Update existing tasks (change status, priority, etc.)
    - Delete tasks by ID
    - List all tasks or filter by status
    - Filter tasks by priority and status
    
    Always be conversational and helpful. When users want to mark tasks as done,
    use the update_task tool to change the status to 'completed'.
    """)
    
    response = llm_with_tools.invoke([system_message] + messages)
    return {"messages": [response]}

# Build the graph
workflow = StateGraph(MessagesState)

# Add nodes
workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)

# Add edges
workflow.add_edge(START, "agent")
workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
workflow.add_edge("tools", "agent")

# Compile the graph
graph = workflow.compile()
```

### 7. WebSocket Manager

```python
# app/websocket/manager.py
from typing import Set
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: dict):
        message_str = json.dumps(message)
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message_str)
            except Exception:
                disconnected.append(connection)
                
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()
```

### 8. FastAPI Main Application

```python
# app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.database.connection import init_db, get_db
from app.websocket.manager import manager
from app.agent.langgraph_agent import graph
from langchain_core.messages import HumanMessage
import json
import os

app = FastAPI(title="Task Management AI Agent API", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            user_message = message_data.get("message", "")
            
            # Process with LangGraph agent
            try:
                response = await graph.ainvoke({
                    "messages": [HumanMessage(content=user_message)]
                })
                
                agent_response = response["messages"][-1].content
                
                # Send response back to client
                await manager.send_personal_message(json.dumps({
                    "type": "agent_response",
                    "message": agent_response
                }), websocket)
                
                # Broadcast task update to all clients
                await manager.broadcast({
                    "type": "task_update",
                    "message": "Tasks may have been updated"
                })
                
            except Exception as e:
                await manager.send_personal_message(json.dumps({
                    "type": "error",
                    "message": f"Error processing request: {str(e)}"
                }), websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## Frontend Implementation

### 1. Next.js Project Setup

```bash
npx create-next-app@latest task-manager-frontend --typescript --tailwind --eslint --app
cd task-manager-frontend
npm install socket.io-client
```

### 2. TypeScript Types

```typescript
// src/types/task.ts
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  type: 'user' | 'agent' | 'system';
  message: string;
  timestamp: Date;
}
```

### 3. WebSocket Hook

```typescript
// src/lib/websocket.ts
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(url);
    
    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [url]);

  return { socket, isConnected };
};
```

### 4. Chat Interface Component

```typescript
// src/components/chat/ChatInterface.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/task';

interface ChatInterfaceProps {
  onMessageSent: (message: string) => void;
  messages: ChatMessage[];
  isConnected: boolean;
}

export default function ChatInterface({ onMessageSent, messages, isConnected }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && isConnected) {
      onMessageSent(inputMessage.trim());
      setInputMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">AI Task Assistant</h2>
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.type === 'agent'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              <p className="text-sm">{message.message}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message... (e.g., 'Create a task to buy groceries')"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

### 5. Task List Component

```typescript
// src/components/tasks/TaskList.tsx
'use client';

import { Task } from '@/types/task';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => void;
}

export default function TaskList({ tasks, onTaskUpdate }: TaskListProps) {
  const groupedTasks = {
    todo: tasks.filter(task => task.status === 'todo'),
    in_progress: tasks.filter(task => task.status === 'in_progress'),
    completed: tasks.filter(task => task.status === 'completed'),
    archived: tasks.filter(task => task.status === 'archived'),
  };

  const statusColumns = [
    { key: 'todo', title: 'To Do', color: 'border-gray-200' },
    { key: 'in_progress', title: 'In Progress', color: 'border-blue-200' },
    { key: 'completed', title: 'Completed', color: 'border-green-200' },
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
```

### 6. Main Application Page

```typescript
// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import TaskList from '@/components/tasks/TaskList';
import { ChatMessage, Task } from '@/types/task';

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize WebSocket connection
    const websocket = new WebSocket('ws://localhost:8000/ws/chat');
    
    websocket.onopen = () => {
      setIsConnected(true);
      setMessages(prev => [...prev, {
        type: 'system',
        message: 'Connected to AI Task Assistant',
        timestamp: new Date()
      }]);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'agent_response') {
        setMessages(prev => [...prev, {
          type: 'agent',
          message: data.message,
          timestamp: new Date()
        }]);
      } else if (data.type === 'task_update') {
        // Refresh tasks when updated
        // In a real app, you might want to fetch updated tasks from API
      }
    };

    websocket.onclose = () => {
      setIsConnected(false);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const handleMessageSent = (message: string) => {
    // Add user message to chat
    setMessages(prev => [...prev, {
      type: 'user',
      message,
      timestamp: new Date()
    }]);

    // Send message via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ message }));
    }
  };

  const handleTaskUpdate = (taskId: number, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  return (
    <div className="h-screen flex">
      {/* Chat Interface */}
      <div className="w-1/3 border-r border-gray-200">
        <ChatInterface 
          messages={messages}
          onMessageSent={handleMessageSent}
          isConnected={isConnected}
        />
      </div>
      
      {/* Task List */}
      <div className="flex-1">
        <TaskList 
          tasks={tasks}
          onTaskUpdate={handleTaskUpdate}
        />
      </div>
    </div>
  );
}
```

## Running the Application

### Backend
```bash
cd task-manager-backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend  
```bash
cd task-manager-frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- WebSocket: ws://localhost:8000/ws/chat

## Deployment Considerations

### Backend Deployment (Docker)
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Deployment
```bash
npm run build
npm start
```

## Advanced Features to Add

1. **Authentication & Authorization**
   - JWT-based authentication
   - User-specific tasks
   - Role-based access control

2. **Enhanced AI Capabilities**  
   - Task prioritization suggestions
   - Deadline reminders
   - Smart task categorization

3. **Real-time Collaboration**
   - Multi-user task sharing
   - Live collaborative editing
   - Team workspaces

4. **Mobile Responsiveness**
   - Progressive Web App (PWA)
   - Mobile-optimized UI
   - Push notifications

This complete implementation provides a solid foundation for a production-ready task management application with AI agent capabilities.