"""Reader Agent — specialised in listing and filtering tasks."""

import os
from dotenv import load_dotenv
load_dotenv()
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from app.agent.tools import list_tasks, filter_tasks
from app.agent.state import AgentState

# ── LLM ──
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.1,
)

tools = [list_tasks, filter_tasks]
llm_with_tools = llm.bind_tools(tools)
tool_node = ToolNode(tools)


def should_continue(state: AgentState):
    last = state["messages"][-1]
    return "tools" if last.tool_calls else END


def call_reader(state: AgentState):
    system = SystemMessage(content="""You are the Reader Agent of TaskMate.

YOUR ONLY JOB: List and filter tasks using list_tasks() and filter_tasks().
- "show my tasks" / "show all" → list_tasks() with no filter.
- "high priority" → filter_tasks(priority="high").
- "completed" / "done" → filter_tasks(status="completed") or list_tasks(status="completed").
- Status: pending/incomplete=inprogress, done/finished=completed, overdue/missed=overdue, old=archived.
- Present results clearly with title, status, priority, and due date.
- Never show raw task_id to user.
- Be concise.""")

    response = llm_with_tools.invoke([system] + state["messages"])
    return {"messages": [response]}


# ── Build sub-graph ──
reader_workflow = StateGraph(AgentState)
reader_workflow.add_node("reader", call_reader)
reader_workflow.add_node("tools", tool_node)

reader_workflow.add_edge(START, "reader")
reader_workflow.add_conditional_edges("reader", should_continue, {"tools": "tools", END: END})
reader_workflow.add_edge("tools", "reader")

reader_graph = reader_workflow.compile()
