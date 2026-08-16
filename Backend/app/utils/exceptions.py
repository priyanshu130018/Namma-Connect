from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from app.core.logger import logger

async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP error on {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "detail": exc.detail
        }
    )

from fastapi.encoders import jsonable_encoder

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "invalid value")
        messages.append(f"{loc}: {msg}")
    
    friendly_msg = "; ".join(messages)
    logger.warning(f"Validation error on {request.url.path}: {friendly_msg}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": friendly_msg,
            "detail": jsonable_encoder(errors)
        }
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    error_msg = str(exc.__dict__.get('orig', exc))
    logger.error(f"Database error on {request.url.path}: {error_msg}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "A database error occurred.",
            "detail": "A database error occurred."
        }
    )
