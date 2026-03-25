"""
Islamic Ask Router — free-form Q&A about Islamic finance.
POST /api/v1/islamic-ask/ — ask a question
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.db.models.user import User
from app.schemas.islamic_ask import IslamicAskRequest, IslamicAskResponse
from app.services.islamic_ask_service import ask_islamic_finance

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/islamic-ask", tags=["islamic-ask"])


@router.post("/", response_model=IslamicAskResponse)
def ask_question(
    request: IslamicAskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ask a free-form question about Islamic finance.
    Uses AI (Groq/Gemini) with fallback to glossary knowledge base.
    """
    try:
        return ask_islamic_finance(request=request, db=db)
    except Exception as e:
        logger.error(f"Islamic Ask error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process question")
