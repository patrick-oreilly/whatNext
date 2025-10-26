# api_server.py
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from whats_next_agent import prompts
import os
import uuid
from typing import Dict

load_dotenv()

from whats_next_agent.agent import root_agent
from google.adk.runners import InMemoryRunner
from google.adk.agents import LiveRequestQueue
from google.adk.agents.run_config import RunConfig
from google.genai.types import Part, Content

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store sessions: {user_id: (live_request_queue, session_id)}

active_sessions: Dict[str, tuple] = {}


async def start_agent_session(user_id: str):
    """Initialize ADK agent session with Runner."""

    runner = InMemoryRunner(
        app_name="What Next App",
        agent=root_agent,
    )
    
    # Create session
    session = await runner.session_service.create_session(
        app_name="What Next App",
        user_id=user_id,
    )
    
    run_config = RunConfig(response_modalities=["TEXT"])
    live_request_queue = LiveRequestQueue()
    
    # Use user_id and session_id 

    live_events = runner.run_live(
        user_id=user_id,
        session_id=session.id,
        live_request_queue=live_request_queue,
        run_config=run_config,
    )
    
    return live_events, live_request_queue, session.id

# Health check  endpoint

@app.get("/")
async def root():
    api_key = os.getenv("GOOGLE_API_KEY")
    return {
        "status": "healthy",
        "api_configured": bool(api_key),
        "api_key_prefix": api_key[:10] + "..." if api_key else None
    }


# Streaming endpoint

@app.get("/stream")
async def stream_story(user_id: str = "default"):
    """Stream AI-generated story using Server-Sent Events with ADK."""
    
    async def generate():
        user_id_str = str(user_id)
        session_id = None
        
        try:
            live_events, live_request_queue, session_id = await start_agent_session(user_id_str)
            active_sessions[user_id_str] = (live_request_queue, session_id)
            
            # Send initial prompt

            # prompt = "Let's begin your basketball journey. Where does your story start?"
            content = Content(role="user", parts=[Part.from_text(text=prompts.HOOP_DREAMS_PROMPT)])
            live_request_queue.send_content(content=content)
            
            # Stream events from agent
            async for event in live_events:
                if event.turn_complete:
                    yield "data: [DONE]\n\n"
                    break
                
                if event.interrupted:
                    yield "data: [INTERRUPTED]\n\n"
                    break
                
                if event.content and event.content.parts:
                    part = event.content.parts[0]
                    
                    if part.text and event.partial:
                        yield f"{part.text}"
                        # words = part.text.split(" ")
                        # for word in words:
                        #     yield f"Data: {word}" + "\n\n"
            
            # Cleanup
            live_request_queue.close()
            if user_id_str in active_sessions:
                del active_sessions[user_id_str]
                
        except Exception as e:
            print(f"Error in stream: {e}")
            yield f"data: [ERROR] {str(e)}\n\n"
            if user_id_str in active_sessions:
                del active_sessions[user_id_str]
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

# Send message endpoint

@app.post("/send/{user_id}")
async def send_message(user_id: str, request: Request):
    """Send additional messages to existing session."""
    session_data = active_sessions.get(user_id)
    
    if not session_data:
        return {"error": "Session not found"}
    
    live_request_queue, session_id = session_data
    
    data = await request.json()
    message_text = data.get("message", "")
    
    content = Content(role="user", parts=[Part.from_text(text=message_text)])
    live_request_queue.send_content(content=content)
    
    return {"status": "sent", "session_id": session_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)