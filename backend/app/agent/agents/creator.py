"""Creator Agent — specialised in creating new tasks."""

from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
load_dotenv()
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from app.agent.tools import create_task
from app.agent.state import AgentState

# ── LLM ──
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0.1,
)

tools = [create_task]
llm_with_tools = llm.bind_tools(tools)
tool_node = ToolNode(tools)


def should_continue(state: AgentState):
    last = state["messages"][-1]
    return "tools" if last.tool_calls else END


def call_creator(state: AgentState):
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    day_name = now.strftime("%A")
    tomorrow = (now + timedelta(days=1)).strftime("%Y-%m-%d")

    day_map = {}
    for i in range(1, 8):
        d = now + timedelta(days=i)
        day_map[d.strftime("%A")] = d.strftime("%Y-%m-%d")
    date_ref = ", ".join(f"{k}={v}" for k, v in day_map.items())

    system = SystemMessage(content=f"""You are the Creator Agent of TaskMate. Today is {day_name}, {today}.

DATE REFERENCE: today={today}, tomorrow={tomorrow}, {date_ref}
Always append T23:59:59 if no time given. No due date = leave NULL.

YOUR ONLY JOB: Create tasks using create_task().
- Title: short (4-6 words). Description: 1-2 sentences with specifics.
- Group related items into ONE task (shopping list = single task).
- Priority: "urgent/ASAP"=high, "whenever"=low, default=medium.
- Create directly. Never ask for confirmation.
- Be concise in responses.""")

    response = llm_with_tools.invoke([system] + state["messages"])
    return {"messages": [response]}


# ── Build sub-graph ──
creator_workflow = StateGraph(AgentState)
creator_workflow.add_node("creator", call_creator)
creator_workflow.add_node("tools", tool_node)

creator_workflow.add_edge(START, "creator")
creator_workflow.add_conditional_edges("creator", should_continue, {"tools": "tools", END: END})
creator_workflow.add_edge("tools", "creator")

creator_graph = creator_workflow.compile()
