from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ClaimDomain(str, Enum):
    HEALTH = "health_domain"
    ENVIRONMENTAL = "environmental_domain"
    HISTORICAL = "historical_domain"
    GENERAL = "general_domain"
    
    # Aliases for backward compatibility
    HEALTH_PRODUCT = "health_domain"

class VerdictType(str, Enum):
    VERIFIED_TRUE = "VERIFIED_TRUE"
    DEBUNKED_FALSE = "DEBUNKED_FALSE"
    MISLEADING_CHERRY_PICKED = "MISLEADING_CHERRY_PICKED"
    UNSUBSTANTIATED = "UNSUBSTANTIATED"

class EvidenceItem(BaseModel):
    polarity: str = Field(..., description="'pro' (supporting) or 'con' (contradicting)")
    source_name: str
    evidence_point: str
    authority_type: str = Field(default="Regulatory/Academic", description="Peer-reviewed, Regulatory, Fact-Checker, Manufacturer")
    credibility_score: float = Field(ge=0.0, le=1.0)
    url: Optional[str] = None
    date: Optional[str] = None

class AgentThoughtStep(BaseModel):
    step_number: int
    phase: str
    thought: str
    elapsed_ms: float

class AgentVerificationResult(BaseModel):
    id: str
    claim_text: str
    normalized_query: Optional[str] = None
    media_type: Optional[str] = "text"
    domain: str
    verdict: VerdictType
    textual_rating: str
    confidence_score: float
    verdict_summary: str
    explainable_report: Optional[str] = None
    
    # LangGraph Dialectical Evidence Synthesis
    agent_thought_process: List[AgentThoughtStep]
    supporting_evidence: List[EvidenceItem]
    refuting_evidence: List[EvidenceItem]
    quantitative_analysis: Optional[Dict[str, Any]] = None
    source_validation: Optional[Dict[str, Any]] = None
    
    consensus_assessment: str
    risk_level: str
    latency_breakdown: Dict[str, float]
    created_at: str

class VerifyTextRequest(BaseModel):
    text: str = Field(..., min_length=3, description="Claim or statement to investigate")
    domain: Optional[ClaimDomain] = None

class AsyncVerificationResponse(BaseModel):
    task_id: str
    status: str
    message: str
    websocket_channel: str

class TaskNotification(BaseModel):
    task_id: str
    status: str  # queued, thinking, collecting_evidence, completed, failed
    current_thought: Optional[str] = None
    progress: int = 0
    result: Optional[AgentVerificationResult] = None
    error: Optional[str] = None
    timestamp: str

class LatencyBenchmarkResult(BaseModel):
    standard_ffmpeg_latency_ms: float
    optimized_ffmpeg_latency_ms: float
    latency_reduction_pct: float
    optimization_flags: List[str]
    description: str
