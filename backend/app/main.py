# app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, and_
from datetime import datetime, date, timedelta
from typing import List, Dict
import json
import os
import time

from app.websocket.manager import manager
from app.agent.langgraph_agent import graph, TaskState
from langchain_core.messages import HumanMessage
from app.models.task import Task, TaskStatus, TaskPriority
from app.database.connection import init_db, AsyncSessionLocal

app = FastAPI(title="Task Management AI Agent API", version="2.0.0")

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
    async with AsyncSessionLocal() as db:
        base = select(Task)
        if filters:
            base = base.where(and_(*filters))
        base = base.order_by(Task.due_date.asc().nulls_last(), Task.priority.desc())
        result = await db.execute(base)
        return result.scalars().all()


def is_filter_request(message: str) -> bool:
    msg = (message or "").lower()
    return any(word in msg for word in ("show", "list", "filter", "only", "what are", "display"))


def build_filter_clauses(message: str):
    msg = (message or "").lower()
    clauses = []

    if any(k in msg for k in ("completed", "done", "finished")):
        clauses.append(Task.status == TaskStatus.COMPLETED)
    elif any(k in msg for k in ("inprogress", "in progress", "pending", "incomplete", "not started", "todo")):
        clauses.append(Task.status == TaskStatus.IN_PROGRESS)
    elif "archived" in msg:
        clauses.append(Task.status == TaskStatus.ARCHIVED)

    if any(k in msg for k in ("high priority", "urgent", "asap", "important")):
        clauses.append(Task.priority == TaskPriority.HIGH)
    elif "medium priority" in msg:
        clauses.append(Task.priority == TaskPriority.MEDIUM)
    elif any(k in msg for k in ("low priority", "whenever", "sometime")):
        clauses.append(Task.priority == TaskPriority.LOW)

    if "today" in msg or "todays" in msg or "today's" in msg:
        clauses.append(func.date(Task.due_date) == date.today())
    elif "tomorrow" in msg:
        clauses.append(func.date(Task.due_date) == (date.today() + timedelta(days=1)))
    elif "this week" in msg:
        clauses.append(and_(Task.due_date != None, func.date(Task.due_date) >= date.today(), func.date(Task.due_date) <= (date.today() + timedelta(days=7))))
    elif "overdue" in msg or "missed" in msg:
        clauses.append(Task.due_date != None)
        clauses.append(Task.due_date < datetime.now())
        clauses.append(Task.status != TaskStatus.COMPLETED)
        clauses.append(Task.status != TaskStatus.ARCHIVED)

    return clauses


@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    # Send initial tasks
    initial_tasks = await fetch_tasks()
    await manager.send_personal_message(
        json.dumps({"type": "initial_tasks", "tasks": serialize_tasks(initial_tasks)}),
        websocket,
    )

    state = TaskState(messages=[])

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
                # ── Track latency ──
                start_time = time.perf_counter()

                # Send "supervisor routing" step
                await manager.send_personal_message(
                    json.dumps({
                        "type": "workflow_step",
                        "agent": "supervisor",
                        "status": "routing",
                        "latency_ms": 0,
                    }),
                    websocket,
                )

                # ── Invoke the multi-agent graph ──
                config = {"recursion_limit": 50}
                response = await graph.ainvoke(
                    {"messages": state["messages"]},
                    config=config,
                )

                # ── End latency ──
                total_ms = int((time.perf_counter() - start_time) * 1000)

                # Update state from agent response
                if "messages" in response:
                    state["messages"] = response["messages"][-MAX_HISTORY:]

                # Get the active agent from response
                active_agent = response.get("active_agent", "unknown")

                agent_response = (
                    response["messages"][-1].content if response.get("messages") else "I didn't generate a response."
                )
                print(f"[WS] Agent ({active_agent}): {agent_response} ({total_ms}ms)")

                # Send workflow steps: supervisor → agent → done
                await manager.send_personal_message(
                    json.dumps({
                        "type": "workflow_step",
                        "agent": active_agent,
                        "status": "processing",
                        "latency_ms": total_ms // 2,
                    }),
                    websocket,
                )

                await manager.send_personal_message(
                    json.dumps({
                        "type": "workflow_step",
                        "agent": "done",
                        "status": "completed",
                        "latency_ms": total_ms,
                    }),
                    websocket,
                )

                # Send agent response with latency
                await manager.send_personal_message(
                    json.dumps({
                        "type": "agent_response",
                        "message": agent_response,
                        "latency_ms": total_ms,
                    }),
                    websocket,
                )

                # ── Filter handling ──
                if is_filter_request(user_message):
                    clauses = build_filter_clauses(user_message)
                    filtered_tasks = await fetch_tasks(filters=clauses if clauses else None)
                    await manager.send_personal_message(
                        json.dumps({"type": "task_update", "tasks": serialize_tasks(filtered_tasks)}),
                        websocket,
                    )
                    continue

                # ── Broadcast fresh snapshot ──
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


MAX_HISTORY = 6


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
