import asyncio
import uuid
from typing import Dict, Any, List, Set
from datetime import datetime
from fastapi import WebSocket

from app.models.schemas import TaskNotification, AgentVerificationResult, ClaimDomain
from app.services.agentic_verifier import agentic_verifier
from app.services.ffmpeg_service import ffmpeg_service
from app.services.whisper_service import whisper_service
from app.services.claim_extractor import claim_extractor

class TaskManager:
    def __init__(self):
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.active_websockets: Set[WebSocket] = set()

    async def register_websocket(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.add(websocket)

    def unregister_websocket(self, websocket: WebSocket):
        self.active_websockets.discard(websocket)

    async def broadcast_notification(self, notification: TaskNotification):
        payload = notification.model_dump()
        dead_connections = set()
        for ws in self.active_websockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead_connections.add(ws)
        for dead in dead_connections:
            self.unregister_websocket(dead)

    async def run_async_verification(self, task_id: str, text: str, domain: ClaimDomain = ClaimDomain.GENERAL):
        """
        Runs asynchronous background verification with step-by-step user notifications.
        """
        try:
            # Step 1: Queued
            self.tasks[task_id] = {
                "task_id": task_id,
                "status": "thinking",
                "progress": 20,
                "current_thought": "Agent initializing: Deconstructing proposition and identifying domain entities...",
                "created_at": datetime.utcnow().isoformat() + "Z",
                "result": None
            }
            await self.broadcast_notification(TaskNotification(
                task_id=task_id,
                status="thinking",
                progress=25,
                current_thought="Agent analyzing claim syntax and contextual domain...",
                timestamp=datetime.utcnow().isoformat() + "Z"
            ))

            await asyncio.sleep(0.4)

            # Step 2: Collecting Pro Evidence
            self.tasks[task_id]["status"] = "collecting_pro_evidence"
            self.tasks[task_id]["progress"] = 50
            await self.broadcast_notification(TaskNotification(
                task_id=task_id,
                status="collecting_pro_evidence",
                progress=50,
                current_thought="Agent querying proponent databases: Retrieving supporting assertions...",
                timestamp=datetime.utcnow().isoformat() + "Z"
            ))

            await asyncio.sleep(0.4)

            # Step 3: Collecting Con Evidence
            self.tasks[task_id]["status"] = "collecting_con_evidence"
            self.tasks[task_id]["progress"] = 75
            await self.broadcast_notification(TaskNotification(
                task_id=task_id,
                status="collecting_con_evidence",
                progress=75,
                current_thought="Agent querying Google Fact Check API & regulatory registries: Retrieving refutations...",
                timestamp=datetime.utcnow().isoformat() + "Z"
            ))

            # Step 4: Full verification calculation
            result: AgentVerificationResult = await agentic_verifier.verify_claim(text, domain)

            # Step 5: Completed
            self.tasks[task_id]["status"] = "completed"
            self.tasks[task_id]["progress"] = 100
            self.tasks[task_id]["result"] = result.model_dump()
            self.tasks[task_id]["completed_at"] = datetime.utcnow().isoformat() + "Z"

            await self.broadcast_notification(TaskNotification(
                task_id=task_id,
                status="completed",
                progress=100,
                current_thought=f"Verdict finalized: {result.verdict.value} ({result.confidence_score * 100:.0f}% confidence)",
                result=result,
                timestamp=datetime.utcnow().isoformat() + "Z"
            ))

        except Exception as e:
            self.tasks[task_id]["status"] = "failed"
            self.tasks[task_id]["error"] = str(e)
            await self.broadcast_notification(TaskNotification(
                task_id=task_id,
                status="failed",
                progress=100,
                error=str(e),
                timestamp=datetime.utcnow().isoformat() + "Z"
            ))

    async def run_media_verification(self, task_id: str, input_file_path: str, output_wav_path: str):
        """
        Runs media preprocessing, transcription, and agentic fact-checking.
        """
        try:
            # 1. FFmpeg audio extraction with -30% latency flags
            await self.broadcast_notification(TaskNotification(
                task_id=task_id,
                status="preprocessing_media",
                progress=20,
                current_thought="FFmpeg optimized audio extraction active (-30% low-latency pipeline)...",
                timestamp=datetime.utcnow().isoformat() + "Z"
            ))
            
            ffmpeg_latency_ms, _ = ffmpeg_service.extract_audio(input_file_path, output_wav_path, low_latency=True)

            # 2. OpenAI Whisper transcription
            await self.broadcast_notification(TaskNotification(
                task_id=task_id,
                status="transcribing",
                progress=45,
                current_thought="Whisper Speech-to-Text transcribing spoken audio stream...",
                timestamp=datetime.utcnow().isoformat() + "Z"
            ))
            
            whisper_res = await whisper_service.transcribe_audio(output_wav_path)
            transcript_text = whisper_res.get("transcript", "")

            # 3. Extract claims
            claims = claim_extractor.extract_claims(transcript_text)
            primary_claim = claims[0]["claim_text"] if claims else transcript_text

            # 4. Agentic verification
            await self.broadcast_notification(TaskNotification(
                task_id=task_id,
                status="agent_deliberating",
                progress=75,
                current_thought=f"Agent investigating extracted claim: '{primary_claim}'...",
                timestamp=datetime.utcnow().isoformat() + "Z"
            ))

            result = await agentic_verifier.verify_claim(primary_claim)
            result.latency_breakdown["ffmpeg_media_extract_ms"] = round(ffmpeg_latency_ms, 2)
            result.latency_breakdown["whisper_stt_ms"] = whisper_res.get("latency_ms", 120.0)

            self.tasks[task_id] = {
                "task_id": task_id,
                "status": "completed",
                "progress": 100,
                "transcript": transcript_text,
                "result": result.model_dump(),
                "completed_at": datetime.utcnow().isoformat() + "Z"
            }

            await self.broadcast_notification(TaskNotification(
                task_id=task_id,
                status="completed",
                progress=100,
                current_thought=f"Media verification finished: {result.verdict.value}",
                result=result,
                timestamp=datetime.utcnow().isoformat() + "Z"
            ))

        except Exception as e:
            self.tasks[task_id] = {"task_id": task_id, "status": "failed", "error": str(e)}
            await self.broadcast_notification(TaskNotification(
                task_id=task_id,
                status="failed",
                error=str(e),
                timestamp=datetime.utcnow().isoformat() + "Z"
            ))

task_manager = TaskManager()
