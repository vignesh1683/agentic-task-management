from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.database.connection import init_db
from app.websocket.manager import manager
from app.agent.langgraph_agent import graph, TaskState  # import TaskState from your agent file
from langchain_core.messages import HumanMessage
import json
import os
import asyncio

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


@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    """
    Each websocket connection keeps its own TaskState so that
    the conversation and memory persist for that client only.
    """
    await manager.connect(websocket)

    # --- Initialize per-client state ---
    # TaskState needs two keys: messages (list) and memory (string)
    state = TaskState(messages=[], memory="")

    try:
        while True:
            # Receive message from the user
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            user_message = data.get("message", "").strip()
            if not user_message:
                continue

            print(f"[WS] User: {user_message}")

            # Append the user's message to the conversation history
            state["messages"].append(HumanMessage(content=user_message))

            try:
                # Pass entire state (messages + memory) to LangGraph
                response = await graph.ainvoke(state)

                # Update state with the new memory from agent
                if "memory" in response:
                    state["memory"] = response["memory"]

                # Append the assistant's response messages back into history
                if "messages" in response:
                    state["messages"].extend(response["messages"])

                # Send the assistant's last message text to the client
                if response["messages"]:
                    agent_response = response["messages"][-1].content
                else:
                    agent_response = "I didn’t generate a response."

                print(f"[WS] Agent: {agent_response}")

                await manager.send_personal_message(
                    json.dumps({"type": "agent_response", "message": agent_response}),
                    websocket,
                )

                # If the last agent message triggered tool calls, you can broadcast
                last_msg = response["messages"][-1]
                if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
                    await manager.broadcast(
                        {
                            "type": "task_update",
                            "message": "Tasks updated",
                        }
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
