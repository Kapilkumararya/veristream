import uuid
import os
import aiofiles
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from typing import Optional

from app.models.schemas import (
    VerifyTextRequest,
    AgentVerificationResult,
    AsyncVerificationResponse,
    ClaimDomain
)
from app.services.agentic_verifier import agentic_verifier
from app.services.task_manager import task_manager
from app.config import UPLOADS_DIR, TEMP_DIR

router = APIRouter(prefix="/api/verify", tags=["Verification"])

@router.post("/text", response_model=AgentVerificationResult, summary="Verify Text Claim Directly")
async def verify_text_claim(payload: VerifyTextRequest):
    """
    Directly invokes the Agentic AI Verifier to think, formulate hypotheses,
    gather Pro and Con evidence, cross-examine sources, and output an explainable verdict.
    """
    try:
        result = await agentic_verifier.verify_claim(payload.text, payload.domain)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/async", response_model=AsyncVerificationResponse, summary="Asynchronous Verification with Notifications")
async def verify_async(payload: VerifyTextRequest, background_tasks: BackgroundTasks):
    """
    Dispatches long-running verification task to background execution.
    Sends real-time step-by-step agent thoughts and final verdict via WebSocket notifications.
    """
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    domain = payload.domain or ClaimDomain.GENERAL
    
    background_tasks.add_task(task_manager.run_async_verification, task_id, payload.text, domain)

    return AsyncVerificationResponse(
        task_id=task_id,
        status="queued",
        message="Verification task queued. Real-time agent thought notifications will stream over WebSocket.",
        websocket_channel=f"/ws/notifications"
    )

@router.post("/media", response_model=AsyncVerificationResponse, summary="Upload Media File for Ingestion & Verification")
async def verify_media(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Ingests video/audio file, applies low-latency FFmpeg media preprocessing (-30% latency),
    transcribes audio via Whisper STT, and runs agentic fact-checking.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")

    ext = Path(file.filename).suffix
    file_id = f"media_{uuid.uuid4().hex[:10]}"
    input_file_path = UPLOADS_DIR / f"{file_id}{ext}"
    output_wav_path = TEMP_DIR / f"{file_id}.wav"

    async with aiofiles.open(input_file_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    task_id = f"task_{file_id}"
    background_tasks.add_task(task_manager.run_media_verification, task_id, str(input_file_path), str(output_wav_path))

    return AsyncVerificationResponse(
        task_id=task_id,
        status="processing_media",
        message="Media uploaded. FFmpeg preprocessing and Whisper transcription initiated.",
        websocket_channel="/ws/notifications"
    )
