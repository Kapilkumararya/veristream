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
from app.services.langgraph_workflow import langgraph_engine
from app.services.task_manager import task_manager
from app.config import UPLOADS_DIR, TEMP_DIR

router = APIRouter(prefix="/api/verify", tags=["Multimodal Investigation"])

@router.post("/text", response_model=AgentVerificationResult, summary="Execute LangGraph Text Investigation Workflow")
async def verify_text_claim(payload: VerifyTextRequest):
    """
    Executes the 6-node asynchronous LangGraph workflow:
    1. Domain Classification & Entity Extraction
    2. Qdrant Vector DB Semantic Search & Fact-Check Retrieval
    3. Pro vs Con Evidence Bifurcation
    4. Quantitative & Statistical Scrutiny
    5. Source Validation & Credibility Hierarchy
    6. Explainable Verdict & Citation-Backed Report Generation
    """
    try:
        task_id = f"text_{uuid.uuid4().hex[:10]}"
        graph_output = await langgraph_engine.execute_investigation(payload.text, media_type="text")
        result = task_manager._convert_graph_output(task_id, payload.text, graph_output, media_type="text")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/async", response_model=AsyncVerificationResponse, summary="Dispatch Asynchronous LangGraph Task (WebSocket Notifications)")
async def verify_async(payload: VerifyTextRequest, background_tasks: BackgroundTasks):
    """
    Dispatches long-running LangGraph investigation to background execution.
    Real-time node thoughts, Qdrant search results, and final verdict stream over WebSocket (/ws/notifications).
    """
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    domain = payload.domain or ClaimDomain.GENERAL
    
    background_tasks.add_task(task_manager.run_async_verification, task_id, payload.text, domain)

    return AsyncVerificationResponse(
        task_id=task_id,
        status="queued",
        message="LangGraph investigation queued. Node progress and evidence stream over WebSocket.",
        websocket_channel="/ws/notifications"
    )

@router.post("/media", response_model=AsyncVerificationResponse, summary="Multimodal Media Ingestion (Video / Audio Pipeline)")
async def verify_media(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Ingests video/audio file:
    1. Preprocesses media via FFmpeg with -30% audio latency reduction flags.
    2. Transcribes speech using OpenAI Whisper / Groq Whisper.
    3. Extracts factual claims and domain classification.
    4. Dispatches claims to the LangGraph RAG investigation workflow.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")

    ext = Path(file.filename).suffix.lower()
    file_id = f"media_{uuid.uuid4().hex[:10]}"
    input_file_path = UPLOADS_DIR / f"{file_id}{ext}"
    output_wav_path = TEMP_DIR / f"{file_id}.wav"

    async with aiofiles.open(input_file_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    media_type = "video" if ext in {".mp4", ".mov", ".avi", ".mkv", ".webm"} else "audio"
    task_id = f"task_{file_id}"
    background_tasks.add_task(
        task_manager.run_media_verification,
        task_id,
        str(input_file_path),
        str(output_wav_path),
        media_type
    )

    return AsyncVerificationResponse(
        task_id=task_id,
        status="processing_media",
        message=f"{media_type.capitalize()} ingested. FFmpeg preprocessing and Whisper STT dispatched.",
        websocket_channel="/ws/notifications"
    )

@router.post("/image", response_model=AsyncVerificationResponse, summary="Multimodal Image Ingestion (Screenshots / Infographics)")
async def verify_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    claim_caption: Optional[str] = Form(None)
):
    """
    Ingests visual claim images (infographics, social media screenshots, medical product flyers)
    and dispatches extracted propositions to the LangGraph RAG pipeline.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")

    ext = Path(file.filename).suffix.lower()
    file_id = f"img_{uuid.uuid4().hex[:10]}"
    input_file_path = UPLOADS_DIR / f"{file_id}{ext}"

    async with aiofiles.open(input_file_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    task_id = f"task_{file_id}"
    background_tasks.add_task(
        task_manager.run_image_verification,
        task_id,
        str(input_file_path),
        claim_caption
    )

    return AsyncVerificationResponse(
        task_id=task_id,
        status="processing_image",
        message="Visual media ingested. Dispatched to LangGraph investigation workflow.",
        websocket_channel="/ws/notifications"
    )
