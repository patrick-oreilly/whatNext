# Custom error handling for what next
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Optional

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
    return JSONResponse(
        status_code=404,
        content={
            "error": "room_not_found",
            "message": exc.message,
            "details": exc.details
        }
    )

async def room_full_handler(request: Request, exc: RoomFullError):
    return JSONResponse(
        status_code=400,
        content={
            "error": "room_full",
            "message": exc.message,
            "details": exc.details
        }
    )

async def player_not_in_room_handler(request: Request, exc: PlayerNotInRoomError):
    return JSONResponse(
        status_code=403,
        content={
            "error": "player_not_in_room",
            "message": exc.message,
            "details": exc.details
        }
    )

async def invalid_game_phase_handler(request: Request, exc: InvalidGamePhaseError):
    return JSONResponse(
        status_code=400,
        content={
            "error": "invalid_game_phase",
            "message": exc.message,
            "details": exc.details
        }
    )

async def not_enough_players_handler(request: Request, exc: NotEnoughPlayersError):
    return JSONResponse(
        status_code=400,
        content={
            "error": "not_enough_players",
            "message": exc.message,
            "details": exc.details
        }
    )

async def session_error_handler(request: Request, exc: SessionError):
    return JSONResponse(
        status_code=500,
        content={
            "error": "session_error",
            "message": exc.message,
            "details": exc.details
        }
    )

async def duplicate_player_handler(request: Request, exc: DuplicatePlayerError):
    return JSONResponse(
        status_code=400,
        content={
            "error": "duplicate_player",
            "message": exc.message,
            "details": exc.details
        }
    )

async def voting_error_handler(request: Request, exc: VotingError):
    return JSONResponse(
        status_code=400,
        content={
            "error": "voting_error",
            "message": exc.message,
            "details": exc.details
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