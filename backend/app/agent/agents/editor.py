"""Editor Agent — specialised in updating and deleting tasks."""

import os
from dotenv import load_dotenv
load_dotenv()
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from app.agent.tools import update_task, delete_task, list_tasks
from app.agent.state import AgentState

# ── LLM ──
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.1,
)

tools = [update_task, delete_task, list_tasks]
llm_with_tools = llm.bind_tools(tools)
tool_node = ToolNode(tools)


def should_continue(state: AgentState):
    last = state["messages"][-1]
    return "tools" if last.tool_calls else END


def call_editor(state: AgentState):
    system = SystemMessage(content="""You are the Editor Agent of TaskMate.

YOUR ONLY JOB: Update or delete tasks using update_task() and delete_task().
- Always call list_tasks() FIRST to find the task by title (fuzzy match).
- Never ask user for task_id — find it yourself.
- If multiple matches, show a numbered list and ask user to pick.
- Status mapping: pending/incomplete=inprogress, done/finished=completed, missed=overdue, old=archived.
- Resolve pronouns ("it", "that task") from conversation context.
- Confirm the action after completing it.
- Be concise.""")

    response = llm_with_tools.invoke([system] + state["messages"])
    return {"messages": [response]}


# ── Build sub-graph ──
editor_workflow = StateGraph(AgentState)
editor_workflow.add_node("editor", call_editor)
editor_workflow.add_node("tools", tool_node)

editor_workflow.add_edge(START, "editor")
editor_workflow.add_conditional_edges("editor", should_continue, {"tools": "tools", END: END})
editor_workflow.add_edge("tools", "editor")

editor_graph = editor_workflow.compile()
