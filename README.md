# Task Management AI Agent

This is a full-stack task management application that features an AI agent to help you manage your tasks. You can create, update, list, and delete tasks by chatting with the AI agent in a real-time interface.

This project is built with a modern tech stack, featuring a Python backend and a Next.js frontend.

## Tech Stack

*   **Backend:** Python, FastAPI, LangGraph, SQLAlchemy, PostgreSQL
*   **Frontend:** Next.js, TypeScript, TailwindCSS, Socket.IO
*   **AI:** Google Gemini

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:

*   **Python** (3.9 or later)
*   **Node.js** (18.x or later)
*   **PostgreSQL**

## Getting Started

Follow these steps to get the project up and running on your local machine.

### 1. Clone the Repository

```bash
git clone https://github.com/vignesh1683/agentic-task-management.git
cd agentic-task-management
```

### 2. Set Up the Backend

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install the required dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up the database:**
    *   Log in to your PostgreSQL server and create a new database.
        ```sql
        CREATE DATABASE taskmanager;
        ```

5.  **Configure the environment variables:**
    *   Create a `.env` file in the `backend` directory by copying the example file:
        ```bash
        cp .env.example .env
        ```
    *   Open the `.env` file and update the following variables with your own credentials:
        ```
        DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/taskmanager
        GEMINI_API_KEY=your_gemini_api_key
        ```

### 3. Set Up the Frontend

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../client
    ```

2.  **Install the required dependencies:**
    ```bash
    npm install
    ```

### 4. Run the Application

1.  **Start the backend server:**
    *   In the `backend` directory, run the following command:
        ```bash
        uvicorn app.main:app --reload
        ```
    *   The backend will be running at `http://localhost:8000`.

2.  **Start the frontend server:**
    *   In the `client` directory, run the following command:
        ```bash
        npm run dev
        ```
    *   The frontend will be running at `http://localhost:3000`.

## Project Structure

```
.
├── backend
│   ├── app
│   │   ├── agent         # AI agent logic with LangGraph
│   │   ├── database      # Database connection and models
│   │   ├── websocket     # WebSocket connection manager
│   │   └── main.py       # FastAPI application entrypoint
│   ├── .env.example    # Example environment variables
│   └── requirements.txt  # Python dependencies
├── client
│   ├── src
│   │   ├── app           # Next.js application pages
│   │   ├── components    # React components
│   │   ├── lib           # Helper functions and hooks
│   │   └── types         # TypeScript type definitions
│   ├── package.json      # Node.js dependencies
│   └── next.config.ts    # Next.js configuration
└── README.md
```

## Available Scripts

In the `client` directory, you can run the following scripts:

| Script  | Description                               |
| :------ | :---------------------------------------- |
| `dev`   | Runs the app in development mode.         |
| `build` | Builds the app for production.            |
| `start` | Starts the production server.             |
| `lint`  | Runs the linter to check for code quality. |

## API Endpoints

The backend exposes the following endpoints:

*   **`GET /health`**
    *   Returns a status of "healthy" to indicate that the server is running.

*   **`WS /ws/chat`**
    *   The main WebSocket endpoint for real-time communication between the client and the AI agent.
    *   **Client to Server:** Send a JSON message with a `message` key containing the user's input.
        ```json
        {
          "message": "Create a new task to buy groceries"
        }
        ```
    *   **Server to Client:** The server sends various message types, including `agent_response`, `task_update`, and `error`.

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.
