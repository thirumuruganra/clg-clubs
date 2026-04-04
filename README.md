# WAVC (What's Active in Various Clubs)

WAVC is a Progressive Web App (PWA) designed to keep students informed about activities across various college clubs. This project uses a modern web stack with a React frontend and a FastAPI backend.

## Project Structure

This project is organized as a monorepo containing both the frontend and backend codebases:

- `frontend/`: React + Vite progressive web application.
- `backend/`: Python FastAPI application.
- `ui_mockups/`: HTML/CSS mockups for the application interfaces.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [Python](https://www.python.org/) 3.12+

## Setup & Run Instructions

### 1. Backend Setup

The backend is built with Python and FastAPI. 

Navigate to the backend directory and activate the virtual environment:
```bash
cd backend
source wavc/bin/activate
```

Install the required dependencies:
```bash
pip install -r requirements.txt
```

Run the FastAPI development server:
```bash
uvicorn app.main:app --reload
```
The backend API will start, typically at `http://127.0.0.1:8000`.

### 2. Frontend Setup

The frontend is built with React and Vite. Open a new terminal window/tab to keep the backend running.

Navigate to the frontend directory:
```bash
cd frontend
```

Install the required Node dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```
The frontend application will start, usually at `http://localhost:5173`.

## Additional Notes

- Ensure both the backend and frontend servers are running simultaneously for the application to function correctly.
- Review `./prd.md` for specific product requirements and architecture details.
- Review `backend/app/` for the core API logic, routing, and database setup.
