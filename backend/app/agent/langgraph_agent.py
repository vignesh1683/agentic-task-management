"""
Multi-Agent LangGraph — Supervisor orchestrates Creator, Reader, Editor.

Architecture (flat graph — no nested sub-graphs):
    START → supervisor → (creator_agent | reader_agent | editor_agent) → tools → route_back → END
"""

from datetime import datetime, timedelta
import re
import os
from dotenv import load_dotenv
load_dotenv()

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, AIMessage
from app.agent.tools import create_task, update_task, delete_task, list_tasks, filter_tasks

# ── Shared state ──
from langgraph.graph.message import MessagesState


class AgentState(MessagesState):
    next_agent: str = ""
    active_agent: str = ""


# ── LLM ──
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.1,
)

# ── Tools ──
all_tools = [create_task, update_task, delete_task, list_tasks, filter_tasks]
creator_tools = [create_task]
reader_tools = [list_tasks, filter_tasks]
editor_tools = [update_task, delete_task, list_tasks]

tool_node = ToolNode(all_tools)

# ── Message trimming ──
MAX_HISTORY = 6


def _trim(messages):
    if len(messages) <= MAX_HISTORY:
        return list(messages)
    return list(messages[-MAX_HISTORY:])


# ── Supervisor ──
supervisor_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0,
)


def supervisor_node(state: AgentState):
    """Classify user intent → route to correct agent."""
    system = SystemMessage(content="""Classify the user's intent into exactly ONE word:
- "creator" — user wants to ADD/CREATE a new task
- "reader" — user wants to VIEW/LIST/SHOW/FILTER tasks
- "editor" — user wants to UPDATE/DELETE/COMPLETE/ARCHIVE/REOPEN a task
Respond with ONLY: creator, reader, or editor""")

    msgs = state["messages"]
    response = supervisor_llm.invoke([system] + msgs[-2:])
    route = response.content.strip().lower()

    if route not in ("creator", "reader", "editor"):
        last_msg = msgs[-1].content.lower() if msgs else ""
        if any(w in last_msg for w in ("create", "add", "new", "buy", "remind", "schedule")):
            route = "creator"
        elif any(w in last_msg for w in ("show", "list", "display", "filter", "what", "view")):
            route = "reader"
        else:
            route = "editor"

    return {"next_agent": route, "active_agent": "supervisor"}


def route_after_supervisor(state: AgentState):
    return state.get("next_agent", "creator")


# ── Creator Agent ──
creator_llm = llm.bind_tools(creator_tools)

# Relative-time patterns the LLM tends to mis-calculate
_REL_TIME_PATTERNS = [
    # "within 30 minutes", "in 1 hour", "in 2 hours", "within 2 hrs"
    (re.compile(r"(?:within|in)\s+(\d+(?:\.\d+)?)\s+hours?", re.I), "hours"),
    (re.compile(r"(?:within|in)\s+(\d+(?:\.\d+)?)\s+(?:minutes?|mins?)", re.I), "minutes"),
]


def _resolve_relative_deadline(user_text: str, now: datetime) -> str | None:
    """Return a pre-computed ISO due_date string for relative time expressions, or None."""
    for pattern, unit in _REL_TIME_PATTERNS:
        m = pattern.search(user_text)
        if m:
            amount = float(m.group(1))
            if unit == "hours":
                deadline = now + timedelta(hours=amount)
            else:
                deadline = now + timedelta(minutes=amount)
            return deadline.strftime("%Y-%m-%dT%H:%M:%S")
    return None



def creator_node(state: AgentState):
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    day_name = now.strftime("%A")
    current_time = now.strftime("%H:%M:%S")
    current_iso = now.strftime("%Y-%m-%dT%H:%M:%S")
    tomorrow = (now + timedelta(days=1)).strftime("%Y-%m-%d")

    day_map = {}
    for i in range(1, 8):
        d = now + timedelta(days=i)
        day_map[d.strftime("%A")] = d.strftime("%Y-%m-%d")
    date_ref = ", ".join(f"{k}={v}" for k, v in day_map.items())

    # Pre-compute relative deadline in Python so the LLM never has to do math
    messages = _trim(state["messages"])
    last_user_text = ""
    for msg in reversed(messages):
        if hasattr(msg, "type") and msg.type == "human":
            last_user_text = msg.content
            break

    precomputed_due = _resolve_relative_deadline(last_user_text, now)
    if precomputed_due:
        due_date_instruction = (
            f"IMPORTANT: The user said '{last_user_text}'. "
            f"The pre-computed due_date is exactly: {precomputed_due}. "
            f"You MUST use due_date='{precomputed_due}' — do not calculate or change it."
        )
    else:
        due_date_instruction = (
            "DUE DATE RULES:\n"
            f"- Specific time today ('by 5pm', 'at 18:00'): use today={today}T<time>.\n"
            f"- Day name ('Friday', 'next Monday'): use DATE REFERENCE above + T23:59:59.\n"
            "- No due date mentioned: omit due_date entirely."
        )

    system = SystemMessage(content=f"""You are the Creator Agent of TaskMate. Today is {day_name}, {today}. Current time is {current_time}.
DATE REFERENCE: today={today}, tomorrow={tomorrow}, {date_ref}

RULES:
- Create EXACTLY ONE task per request. Never create multiple tasks.
- Call create_task ONCE, then STOP. Do NOT call it again.
- Title: 4-6 words max. Description: 1 sentence.
- Priority: urgent=high, whenever=low, default=medium.
- After calling create_task, respond with a brief confirmation. Do NOT create more tasks.

{due_date_instruction}""")

    response = creator_llm.invoke([system] + messages)
    return {"messages": [response], "active_agent": "creator"}


# ── Reader Agent ──
reader_llm = llm.bind_tools(reader_tools)


def reader_node(state: AgentState):
    system = SystemMessage(content="""You are the Reader Agent of TaskMate.
YOUR ONLY JOB: List and filter tasks. Use list_tasks() or filter_tasks().
Status: pending=inprogress, done=completed, old=archived.
Present results clearly with title, status, priority, due date. Never show task_id. Be concise.""")

    messages = _trim(state["messages"])
    response = reader_llm.invoke([system] + messages)
    return {"messages": [response], "active_agent": "reader"}


# ── Editor Agent ──
editor_llm = llm.bind_tools(editor_tools)


def editor_node(state: AgentState):
    system = SystemMessage(content="""You are the Editor Agent of TaskMate.
YOUR ONLY JOB: Update or delete tasks. Always call list_tasks() FIRST to find the task by title.
Never ask user for task_id. Fuzzy-match by title. If multiple, ask user to pick.
Status: pending=inprogress, done=completed, missed=overdue, old=archived.
Resolve pronouns from context. Be concise.""")

    messages = _trim(state["messages"])
    response = editor_llm.invoke([system] + messages)
    return {"messages": [response], "active_agent": "editor"}


# ── Routing after agent nodes ──
def should_continue(state: AgentState):
    """If the last message has tool_calls, go to tools. Otherwise END."""
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END


def route_back_from_tools(state: AgentState):
    """After tools execute, route back to the active agent."""
    return state.get("active_agent", "creator")


# ── Build the flat multi-agent graph ──
workflow = StateGraph(AgentState)

# Nodes
workflow.add_node("supervisor", supervisor_node)
workflow.add_node("creator", creator_node)
workflow.add_node("reader", reader_node)
workflow.add_node("editor", editor_node)
workflow.add_node("tools", tool_node)

# Edges
workflow.add_edge(START, "supervisor")
workflow.add_conditional_edges("supervisor", route_after_supervisor, {
    "creator": "creator",
    "reader": "reader",
    "editor": "editor",
})

# Each agent → tools or END
for agent in ("creator", "reader", "editor"):
    workflow.add_conditional_edges(agent, should_continue, {
        "tools": "tools",
        END: END,
    })

# Tools → back to the calling agent
workflow.add_conditional_edges("tools", route_back_from_tools, {
    "creator": "creator",
    "reader": "reader",
    "editor": "editor",
})

graph = workflow.compile()

# Backward compat
TaskState = AgentState
