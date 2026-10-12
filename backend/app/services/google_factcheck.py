import httpx
from typing import Optional, Dict, Any, List
from app.config import settings

class GoogleFactCheckService:
    def __init__(self):
        self.api_key = settings.google_fact_check_api_key
        self.base_url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"

    async def query_claims(self, query: str) -> List[Dict[str, Any]]:
        """
        Queries Google Fact Check Tools API for verified claims.
        """
        if not self.api_key:
            return []

        params = {
            "query": query,
            "key": self.api_key,
            "languageCode": "en"
        }

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                response = await client.get(self.base_url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    claims = data.get("claims", [])
                    results = []
                    for c in claims:
                        review = c.get("claimReview", [{}])[0]
                        publisher = review.get("publisher", {})
                        results.append({
                            "claim_text": c.get("text", ""),
                            "claimant": c.get("claimant", ""),
                            "textual_rating": review.get("textualRating", "Unrated"),
                            "publisher_name": publisher.get("name", "Verified Fact-Checker"),
                            "publisher_site": publisher.get("site", ""),
                            "review_url": review.get("url", ""),
                            "review_title": review.get("title", "")
                        })
                    return results
        except Exception as e:
            print(f"[GoogleFactCheck] API request error: {e}")

        return []

google_factcheck_service = GoogleFactCheckService()
