from fastapi import APIRouter
from typing import Dict, Any, List
from app.models.schemas import VerifyTextRequest, AgentVerificationResult
from app.services.langgraph_workflow import langgraph_engine
from app.services.task_manager import task_manager

router = APIRouter(prefix="/api/mobile", tags=["React Native Mobile Client"])

@router.get("/domains", summary="List Investigation Domains for Mobile Client")
async def get_mobile_domains() -> Dict[str, Any]:
    """
    Returns available verification domains and featured claims for the React Native mobile UI.
    """
    return {
        "domains": [
            {
                "id": "health_domain",
                "title": "Health & Biomedical Claims",
                "icon": "heart-pulse",
                "description": "Nutritional supplements, OTC products, pharmaceuticals, viral disease myths.",
                "sample_claims": [
                    "Colloidal silver supplements cure cancer and bacterial infections.",
                    "Apple cider vinegar gummies dissolve visceral fat and cure Type 2 diabetes.",
                    "Miracle Mineral Solution (MMS) cures autism and viral diseases."
                ]
            },
            {
                "id": "environmental_domain",
                "title": "Environmental & Climate Science",
                "icon": "leaf",
                "description": "Satellite gravimetry, renewable energy levelized costs, atmospheric baselines.",
                "sample_claims": [
                    "The levelized cost of solar photovoltaic electricity dropped by over 80% over the last decade.",
                    "Antarctica has been gaining net continental land ice sheet mass over the past twenty years.",
                    "Atmospheric carbon dioxide levels have surpassed 420 ppm."
                ]
            },
            {
                "id": "historical_domain",
                "title": "Historical Events & Conspiracies",
                "icon": "book-open",
                "description": "Space exploration archival telemetry, global epidemiological eradication, maritime records.",
                "sample_claims": [
                    "Smallpox was declared officially eradicated worldwide in 1980 following a global vaccination campaign.",
                    "The Apollo 11 moon landing was staged in a studio, proven by the waving American flag.",
                    "The Titanic was secretly swapped with the Olympic as an insurance fraud conspiracy."
                ]
            }
        ]
    }

@router.post("/investigate", response_model=AgentVerificationResult, summary="React Native Instant Mobile Investigation")
async def mobile_investigate(payload: VerifyTextRequest):
    """
    Optimized synchronous endpoint for React Native mobile client claim cards.
    """
    task_id = f"rn_{hash(payload.text) % 1000000}"
    graph_output = await langgraph_engine.execute_investigation(payload.text, media_type="text")
    return task_manager._convert_graph_output(task_id, payload.text, graph_output, media_type="text")
