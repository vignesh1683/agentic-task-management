"""Supervisor Agent — routes user intent to the correct sub-agent."""

import os
from dotenv import load_dotenv
load_dotenv()
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, AIMessage

# ── LLM (no tools — supervisor only classifies) ──
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0,
)


def classify_intent(state):
    """Supervisor node: classifies user intent and routes to sub-agent."""
    system = SystemMessage(content="""You are the Supervisor of TaskMate, a multi-agent task management system.

Your ONLY job is to classify the user's intent into exactly ONE of these categories:
- "creator" — user wants to ADD/CREATE a new task
- "reader" — user wants to VIEW/LIST/SHOW/FILTER tasks  
- "editor" — user wants to UPDATE/DELETE/COMPLETE/ARCHIVE/REOPEN a task

Respond with ONLY the single word: creator, reader, or editor. Nothing else.""")

    messages = state["messages"]
    response = llm.invoke([system] + messages[-2:])  # only last 2 msgs for speed

    # Extract the route
    route = response.content.strip().lower()
    if route not in ("creator", "reader", "editor"):
        # Default fallback: if it mentions create/add → creator, show/list → reader, else editor
        last_msg = messages[-1].content.lower() if messages else ""
        if any(w in last_msg for w in ("create", "add", "new", "buy", "remind", "schedule")):
            route = "creator"
        elif any(w in last_msg for w in ("show", "list", "display", "filter", "what", "view")):
            route = "reader"
        else:
            route = "editor"

    return {"next_agent": route, "active_agent": "supervisor"}
