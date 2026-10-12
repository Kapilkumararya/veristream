from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from app.config import STATIC_DIR, settings
from app.routers import verify_router, tasks_router, benchmark_router, websocket_router

app = FastAPI(
    title="VeriStream — Real-Time Multimodal Fact Verification Engine",
    description="""
    AI-powered fact verification platform that analyzes claims from videos, audio, and text in real time.
    Features:
    * Autonomous Agentic AI reasoning loop that thinks for itself and collects Pro vs Con evidence.
    * Focuses on Health-Related Product Claims & Historical Claims.
    * Optimized FFmpeg media preprocessing reducing audio latency by ~30%.
    * OpenAI Whisper Speech-to-Text transcription.
    * Google Fact Check Tools API evidence retrieval.
    * Asynchronous processing architecture with real-time WebSocket notifications.
    """,
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(verify_router)
app.include_router(tasks_router)
app.include_router(benchmark_router)
app.include_router(websocket_router)

# Mount Static Files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/", summary="Web Operator Console")
async def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "VeriStream FastAPI Backend Active. Visit /docs for OpenAPI documentation."}

@app.get("/health", summary="Health Check")
async def health_check():
    return {
        "status": "healthy",
        "service": "VeriStream FastAPI",
        "ffmpeg_latency_optimization": settings.enable_low_latency_ffmpeg,
        "openai_configured": bool(settings.openai_api_key),
        "google_factcheck_configured": bool(settings.google_fact_check_api_key)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
