import asyncio
import logging
from typing import Dict, Optional, AsyncGenerator
from datetime import datetime

from google.adk.runners import InMemoryRunner
from google.adk.agents import LiveRequestQueue
from google.adk.agents.run_config import RunConfig
from google.genai.types import Part, Content

from backend.agent import root_agent
from backend.core.config import settings
from backend.core.errors import SessionError

logger = logging.getLogger(__name__)

# Data for a specific session

class SessionData:
    """Holds ADK session data for a room"""
    def __init__(
        self,
        room_id: str,
        session_id: str,
        live_request_queue: LiveRequestQueue,
        live_events,
        runner: InMemoryRunner
    ):
        self.room_id = room_id
        self.session_id = session_id
        self.live_request_queue = live_request_queue
        self.live_events = live_events
        self.runner = runner
        self.created_at = datetime.now()
        self.message_count = 0


class SessionManager:
    """
    Manages ADK sessions for game rooms
    
    Decision 1: Keep session alive for entire game, close after MAX_TURNS
    Decision 2: Use ADK's built-in context (session maintains history)
    Decision 3: Retry on failure with exponential backoff
    """
    
    def __init__(self):
        self.sessions: Dict[str, SessionData] = {}
        logger.info("SessionManager initialized")
    
  
    # Session lifecycle
    
    async def create_session(self, room_id: str, storyline_prompt: str, user_id: str = "player") -> SessionData:
        """
        Create new ADK session for a room

        Args:
            room_id: Unique room identifier
            storyline_prompt: The storyline-specific system prompt for the agent
            user_id: User identifier for ADK

        Returns:
            SessionData containing session info

        Raises:
            SessionError: If session creation fails
        """
        try:
            from google.adk.agents import LlmAgent
            from backend.core.config import settings

            # Create storyline-specific agent with the correct instruction
            storyline_agent = LlmAgent(
                model=settings.MODEL_NAME,
                name='story_agent',
                description='A game master that creates stories for players.',
                instruction=storyline_prompt,
            )

            # Create runner with storyline-specific agent
            runner = InMemoryRunner(
                app_name="What Next App",
                agent=storyline_agent,
            )
            
            # Create ADK session
            session = await runner.session_service.create_session(
                app_name="What Next App",
                user_id=user_id,
            )
            
            # Setup run config
            run_config = RunConfig(response_modalities=["TEXT"])
            live_request_queue = LiveRequestQueue()
            
            # Start live events stream
            live_events = runner.run_live(
                user_id=user_id,
                session_id=session.id,
                live_request_queue=live_request_queue,
                run_config=run_config,
            )
            
            # Store session data
            session_data = SessionData(
                room_id=room_id,
                session_id=session.id,
                live_request_queue=live_request_queue,
                live_events=live_events,
                runner=runner
            )
            
            self.sessions[room_id] = session_data
            
            logger.info(f"Created ADK session for room {room_id} (session_id: {session.id})")
            return session_data
            
        except Exception as e:
            logger.error(f"Failed to create session for room {room_id}: {e}")
            raise SessionError(f"Could not create AI session: {str(e)}")
    
    def get_session(self, room_id: str) -> Optional[SessionData]:
        """Get existing session for room"""
        return self.sessions.get(room_id)
    
    def close_session(self, room_id: str) -> None:
        """
        Close ADK session for room
        
        Decision 1: Called when game concludes (after MAX_TURNS)
        """
        session_data = self.sessions.get(room_id)
        if session_data:
            try:
                session_data.live_request_queue.close()
                del self.sessions[room_id]
                logger.info(f"Closed session for room {room_id}")
            except Exception as e:
                logger.error(f"Error closing session for room {room_id}: {e}")
    
    def should_close_session(self, room_id: str, max_turns: int) -> bool:
        """
        Check if session should be closed
        
        Decision 1: Close after max_turns messages sent
        """
        session_data = self.get_session(room_id)
        if not session_data:
            return False
        
        return session_data.message_count >= max_turns
    
    # Send message 
    def send_message(self, room_id: str, message: str) -> None:
        """
        Send message to ADK session
        
        Decision 2: ADK maintains context, so we just send the new message
        
        Args:
            room_id: Room identifier
            message: Message text to send
            
        Raises:
            SessionError: If session doesn't exist or sending fails
        """
        session_data = self.get_session(room_id)
        if not session_data:
            raise SessionError(f"No active session for room {room_id}")
        
        try:
            content = Content(
                role="user",
                parts=[Part.from_text(text=message)]
            )
            session_data.live_request_queue.send_content(content=content)
            session_data.message_count += 1
            
            logger.info(f"Sent message to room {room_id} (message #{session_data.message_count})")
            
        except Exception as e:
            logger.error(f"Failed to send message to room {room_id}: {e}")
            raise SessionError(f"Could not send message: {str(e)}")
    
    # ========================================================================
    # STREAMING WITH RETRY
    # ========================================================================
    
    async def stream_response(self, room_id: str) -> AsyncGenerator[str, None]:
        """
        Stream AI response from session
        
        Decision 3: Implements retry logic with exponential backoff
        
        Args:
            room_id: Room identifier
            
        Yields:
            Text chunks from AI response
            
        Raises:
            SessionError: If all retries fail
        """
        for attempt in range(settings.MAX_RETRIES):
            try:
                async for chunk in self._stream_internal(room_id):
                    yield chunk
                return  # Success - exit retry loop
                
            except Exception as e:
                if attempt == settings.MAX_RETRIES - 1:
                    # Final attempt failed
                    logger.error(f"All retry attempts failed for room {room_id}: {e}")
                    raise SessionError(f"AI generation failed after {settings.MAX_RETRIES} attempts")
                
                # Calculate backoff delay
                delay = settings.RETRY_DELAY_SECONDS * (settings.RETRY_BACKOFF_MULTIPLIER ** attempt)
                logger.warning(
                    f"Stream failed for room {room_id} (attempt {attempt + 1}/{settings.MAX_RETRIES}). "
                    f"Retrying in {delay}s... Error: {e}"
                )
                await asyncio.sleep(delay)
    
    async def _stream_internal(self, room_id: str) -> AsyncGenerator[str, None]:
        """
        Internal streaming implementation
        
        Args:
            room_id: Room identifier
            
        Yields:
            Text chunks from AI
        """
        session_data = self.get_session(room_id)
        if not session_data:
            raise SessionError(f"No active session for room {room_id}")
        
        try:
            # Stream events from ADK
            async for event in session_data.live_events:
                # Check for completion
                if event.turn_complete:
                    logger.info(f"Turn complete for room {room_id}")
                    break
                
                # Check for interruption
                if event.interrupted:
                    logger.warning(f"Stream interrupted for room {room_id}")
                    break
                
                # Extract text content
                if event.content and event.content.parts:
                    part = event.content.parts[0]
                    
                    if part.text and event.partial:
                        # Yield the text chunk
                        yield part.text
                        
        except Exception as e:
            logger.error(f"Error during streaming for room {room_id}: {e}")
            raise
    
    # ========================================================================
    # UTILITY
    # ========================================================================
    
    def get_active_sessions(self) -> Dict[str, SessionData]:
        """Get all active sessions"""
        return self.sessions.copy()
    
    def count_active_sessions(self) -> int:
        """Count number of active sessions"""
        return len(self.sessions)