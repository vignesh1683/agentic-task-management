# app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, and_
from datetime import datetime, date
from typing import List, Dict
import json
import os

from app.websocket.manager import manager
from app.agent.langgraph_agent import graph, TaskState
from langchain_core.messages import HumanMessage
from app.models.task import Task, TaskStatus, TaskPriority
from app.database.connection import init_db, AsyncSessionLocal

app = FastAPI(title="Task Management AI Agent API", version="1.0.0")

# CORS
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


def serialize_tasks(tasks: List[Task]) -> List[Dict]:
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "status": t.status.value,
            "priority": t.priority.value,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        }
        for t in tasks
    ]


async def fetch_tasks(filters: List = None) -> List[Task]:
    """
    Always open a new session so we read fresh data.
    `filters` should be a list of SQLAlchemy boolean expressions (WHERE clauses).
    """
    async with AsyncSessionLocal() as db:
        base = select(Task)
        if filters:
            base = base.where(and_(*filters))
        base = base.order_by(Task.due_date.asc().nulls_last(), Task.priority.desc())
        result = await db.execute(base)
        return result.scalars().all()


def is_filter_request(message: str) -> bool:
    """Heuristic to detect filter-like user messages."""
    msg = (message or "").lower()
    return any(word in msg for word in ("show", "list", "filter", "only", "what are", "display"))


def build_filter_clauses(message: str):
    """Return SQLAlchemy filter clauses based on the user's message."""
    msg = (message or "").lower()
    clauses = []

    # Status keywords
    if any(k in msg for k in ("completed", "done", "finished")):
        clauses.append(Task.status == TaskStatus.COMPLETED)
    elif any(k in msg for k in ("inprogress", "in progress", "pending", "incomplete", "not started", "todo")):
        clauses.append(Task.status == TaskStatus.IN_PROGRESS)
    elif "archived" in msg:
        clauses.append(Task.status == TaskStatus.ARCHIVED)

    # Priority keywords
    if any(k in msg for k in ("high priority", "urgent", "asap", "important")):
        clauses.append(Task.priority == TaskPriority.HIGH)
    elif "medium priority" in msg:
        clauses.append(Task.priority == TaskPriority.MEDIUM)
    elif any(k in msg for k in ("low priority", "whenever", "sometime")):
        clauses.append(Task.priority == TaskPriority.LOW)

    # Due-date/time keywords
    # "today", "tomorrow", "this week", "overdue"
    if "today" in msg or "todays" in msg or "today's" in msg:
        # compare date portion only
        clauses.append(func.date(Task.due_date) == date.today())
    elif "tomorrow" in msg:
        clauses.append(func.date(Task.due_date) == (date.today() + timedelta(days=1)))
    elif "this week" in msg:
        # week: from today to 7 days
        clauses.append(and_(Task.due_date != None, func.date(Task.due_date) >= date.today(), func.date(Task.due_date) <= (date.today() + timedelta(days=7))))
    elif "overdue" in msg or "missed" in msg:
        # due_date before now and not completed/archived
        clauses.append(Task.due_date != None)
        clauses.append(Task.due_date < datetime.now())
        # optional: exclude completed/archived
        clauses.append(Task.status != TaskStatus.COMPLETED)
        clauses.append(Task.status != TaskStatus.ARCHIVED)

    # If user asked for "completed today" etc, combinations above will combine.
    return clauses


@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    # Send initial tasks (full snapshot)
    initial_tasks = await fetch_tasks()
    await manager.send_personal_message(
        json.dumps({"type": "initial_tasks", "tasks": serialize_tasks(initial_tasks)}),
        websocket,
    )

    state = TaskState(messages=[], memory="")

    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            user_message = data.get("message", "").strip()
            if not user_message:
                continue

            print(f"[WS] User: {user_message}")
            state["messages"].append(HumanMessage(content=user_message))

            try:
                response = await graph.ainvoke(state)

                # update state from agent response
                if "memory" in response:
                    state["memory"] = response["memory"]
                if "messages" in response:
                    state["messages"].extend(response["messages"])

                agent_response = (
                    response["messages"][-1].content if response.get("messages") else "I didn’t generate a response."
                )
                print(f"[WS] Agent: {agent_response}")

                await manager.send_personal_message(
                    json.dumps({"type": "agent_response", "message": agent_response}),
                    websocket,
                )

                # --------- filter handling -----------
                if is_filter_request(user_message):
                    # build clauses and fetch filtered tasks
                    clauses = build_filter_clauses(user_message)
                    filtered_tasks = await fetch_tasks(filters=clauses if clauses else None)
                    # send filtered results only to the requesting client
                    await manager.send_personal_message(
                        json.dumps({"type": "task_update", "tasks": serialize_tasks(filtered_tasks)}),
                        websocket,
                    )
                    # do NOT broadcast filtered results to everyone
                    continue

                # --------- default behavior: broadcast fresh full snapshot ---------
                latest = await fetch_tasks()
                await manager.broadcast(
                    {"type": "task_update", "tasks": serialize_tasks(latest)}
                )

            except Exception as e:
                print(f"[WS] Error: {e}")
                await manager.send_personal_message(
                    json.dumps({"type": "error", "message": f"Error: {str(e)}"}),
                    websocket,
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("[WS] Client disconnected")


if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

