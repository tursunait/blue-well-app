from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from services.enhanced_llm import EnhancedLLMProvider

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    conversation_history: Optional[List[Dict[str, str]]] = None
    user_profile: Optional[Dict[str, Any]] = None


class Suggestion(BaseModel):
    id: str
    kind: str  # "class", "workout", "meal"
    title: str
    desc: Optional[str] = None
    cta: str
    payload: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    type: str  # "message" or "suggestions"
    message: Optional[str] = None
    suggestions: Optional[List[Suggestion]] = None


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Handle chat requests with natural language understanding and personalized responses"""
    try:
        llm = EnhancedLLMProvider()
        response = llm.generate(
            message=request.message,
            user_profile=request.user_profile,
            conversation_history=request.conversation_history,
            context=request.context,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
