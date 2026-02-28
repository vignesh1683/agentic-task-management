"""Shared state definition for multi-agent system."""

from langgraph.graph.message import MessagesState


class AgentState(MessagesState):
    """State shared across all agents.
    
    Fields:
        messages: Conversation history (inherited from MessagesState)
        next_agent: Which sub-agent the supervisor routes to
        active_agent: Currently executing agent name (for workflow viz)
    """
    next_agent: str = ""
    active_agent: str = ""
