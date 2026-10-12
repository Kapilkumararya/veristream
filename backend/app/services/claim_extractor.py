import re
from typing import List, Dict, Any
from app.models.schemas import ClaimDomain

class ClaimExtractor:
    def __init__(self):
        # Health-related product keywords
        self.health_patterns = [
            r"\b(silver|colloidal|cure|remedy|supplement|gummies|mms|bleach|autism|cancer|diabetes|visceral fat|detox|vaccine|mrna|genome|fda|pill|weight loss|fat burner|miracle)\b"
        ]
        # Historical claim keywords
        self.historical_patterns = [
            r"\b(apollo|moon landing|staged|nasa|flag waving|smallpox|1980|who|great wall|space|naked eye|titanic|olympic|swapped|insurance fraud|1912|conspiracy|hoax)\b"
        ]

    def extract_claims(self, text: str) -> List[Dict[str, Any]]:
        """
        Extracts verifiable claims from raw transcript text and categorizes them.
        """
        cleaned = text.strip()
        if not cleaned:
            return []

        # Split into sentences or clauses
        sentences = re.split(r"(?<=[.?!])\s+", cleaned)
        claims = []

        for sentence in sentences:
            s_clean = sentence.strip()
            if len(s_clean) < 10:
                continue

            lower_s = s_clean.lower()
            
            # Domain classification
            domain = ClaimDomain.GENERAL
            if any(re.search(pat, lower_s) for pat in self.health_patterns):
                domain = ClaimDomain.HEALTH_PRODUCT
            elif any(re.search(pat, lower_s) for pat in self.historical_patterns):
                domain = ClaimDomain.HISTORICAL
            elif re.search(r"\b(ice sheets|antarctica|carbon|solar|energy|gravity|climate)\b", lower_s):
                domain = ClaimDomain.SCIENTIFIC

            # Extract search query
            words = re.findall(r"\b[A-Za-z0-9]+\b", s_clean)
            stopwords = {"the", "a", "an", "is", "was", "are", "were", "and", "or", "in", "on", "at", "to", "for", "of", "with", "that", "this", "it", "from", "by"}
            filtered_words = [w for w in words if w.lower() not in stopwords]
            query = " ".join(filtered_words[:6]) if filtered_words else s_clean[:40]

            claims.append({
                "claim_text": s_clean,
                "domain": domain,
                "normalized_query": query
            })

        if not claims and len(cleaned) >= 10:
            claims.append({
                "claim_text": cleaned,
                "domain": ClaimDomain.GENERAL,
                "normalized_query": cleaned[:40]
            })

        return claims

claim_extractor = ClaimExtractor()
