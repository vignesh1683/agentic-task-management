from langchain_core.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.models.task import Task, TaskStatus, TaskPriority
from app.database.connection import AsyncSessionLocal
from datetime import datetime
from typing import Optional, List
from difflib import SequenceMatcher

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
                     status: str = None, priority: str = None, due_date: str = None) -> str:
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
            if due_date:
                task.due_date = datetime.fromisoformat(due_date)
                
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
        
@tool
async def check_duplicate(title: str) -> dict:
    """
    Check if a similar task already exists. 
    Returns {'exists': bool, 'task_id': int or None}.
    """
    task = await find_similar_task(title)
    return {"exists": bool(task), "task_id": task.id if task else None}

async def find_similar_task(title: str, threshold: float = 0.7) -> dict | None:
    """Return a task that is very similar to the given title."""
    tasks = await get_all_tasks()
    for t in tasks:
        ratio = SequenceMatcher(None, t.title.lower(), title.lower()).ratio()
        if ratio >= threshold:
            return t
    return None

async def get_all_tasks() -> List[Task]:
    """Retrieve all tasks from the database."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Task))
        return result.scalars().all()