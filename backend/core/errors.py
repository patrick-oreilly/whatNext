# Custom error handling for what next
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Custom exceptions

class WhatNextException(Exception):
    """Base exception for What Next app"""
    def __init__(self, message: str, details: Optional[str] = None):
        self.message = message
        self.details = details
        super().__init__(self.message)

class RoomNotFoundError(WhatNextException):
    """Room does not exist"""
    pass

class RoomFullError(WhatNextException):
    """Room has reached maximum players"""
    pass

class PlayerNotInRoomError(WhatNextException):
    """Player is not in the specified room"""
    pass

class InvalidGamePhaseError(WhatNextException):
    """Action not allowed in current game phase"""
    pass

class NotEnoughPlayersError(WhatNextException):
    """Not enough players to start game"""
    pass

class SessionError(WhatNextException):
    """Error with ADK session"""
    pass

class DuplicatePlayerError(WhatNextException):
    """Player name already taken in room"""
    pass

class VotingError(WhatNextException):
    """Error during voting phase"""
    pass


# FastAPI exceptions

async def room_not_found_handler(request: Request, exc: RoomNotFoundError):
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Room not found error: {exc.message} | Details: {exc.details}")
    return JSONResponse(
        status_code=404,
        content={
            "error": "room_not_found",
            "message": exc.message,
            "details": exc.details
        }
    )

async def room_full_handler(request: Request, exc: RoomFullError):
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Room full error: {exc.message} | Details: {exc.details}")
    return JSONResponse(
        status_code=400,
        content={
            "error": "room_full",
            "message": exc.message,
            "details": exc.details
        }
    )

async def player_not_in_room_handler(request: Request, exc: PlayerNotInRoomError):
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Player not in room error: {exc.message} | Details: {exc.details}")
    return JSONResponse(
        status_code=403,
        content={
            "error": "player_not_in_room",
            "message": exc.message,
            "details": exc.details
        }
    )

async def invalid_game_phase_handler(request: Request, exc: InvalidGamePhaseError):
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Invalid game phase error: {exc.message} | Details: {exc.details}")
    return JSONResponse(
        status_code=400,
        content={
            "error": "invalid_game_phase",
            "message": exc.message,
            "details": exc.details
        }
    )

async def not_enough_players_handler(request: Request, exc: NotEnoughPlayersError):
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Not enough players error: {exc.message} | Details: {exc.details}")
    return JSONResponse(
        status_code=400,
        content={
            "error": "not_enough_players",
            "message": exc.message,
            "details": exc.details
        }
    )

async def session_error_handler(request: Request, exc: SessionError):
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Session error: {exc.message} | Details: {exc.details}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "session_error",
            "message": exc.message,
            "details": exc.details
        }
    )

async def duplicate_player_handler(request: Request, exc: DuplicatePlayerError):
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Duplicate player error: {exc.message} | Details: {exc.details}")
    return JSONResponse(
        status_code=400,
        content={
            "error": "duplicate_player",
            "message": exc.message,
            "details": exc.details
        }
    )

async def voting_error_handler(request: Request, exc: VotingError):
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Voting error: {exc.message} | Details: {exc.details}")
    return JSONResponse(
        status_code=400,
        content={
            "error": "voting_error",
            "message": exc.message,
            "details": exc.details
        }
    )

async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "message": "Invalid request data",
            "details": str(exc.errors())
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all for unexpected errors"""
    logger.error(f"Unexpected error: {type(exc).__name__}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "An unexpected error occurred",
            "details": str(exc)
        }
    )


# Register exception handlers

def register_exception_handlers(app):
    """Register all custom exception handlers with FastAPI app"""
    app.add_exception_handler(RoomNotFoundError, room_not_found_handler)
    app.add_exception_handler(RoomFullError, room_full_handler)
    app.add_exception_handler(PlayerNotInRoomError, player_not_in_room_handler)
    app.add_exception_handler(InvalidGamePhaseError, invalid_game_phase_handler)
    app.add_exception_handler(NotEnoughPlayersError, not_enough_players_handler)
    app.add_exception_handler(SessionError, session_error_handler)
    app.add_exception_handler(DuplicatePlayerError, duplicate_player_handler)
    app.add_exception_handler(VotingError, voting_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, general_exception_handler)