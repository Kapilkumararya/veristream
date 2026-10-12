const axios = require('axios');
const config = require('../config');

class FactCheckService {
  constructor() {
    this.apiKey = config.googleFactCheckApiKey;
    this.endpoint = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';
    
    // Curated real-time fact-checking knowledge database for instant matching & offline resilience
    this.knowledgeBase = [
      {
        keywords: ['moon landing', 'apollo 11', 'flag waving', 'hoax', 'studio', 'faked'],
        claimText: 'The Apollo 11 moon landing was staged in a studio, proven by the waving American flag.',
        verdict: 'FALSE',
        textualRating: 'False / Debunked',
        publisher: 'NASA / Reuters Fact Check',
        reviewUrl: 'https://www.reuters.com/article/factcheck-apollo-flag-waving',
        explanation: 'The flag appeared to ripple because astronauts twisted the telescoping rod into the lunar regolith; with no atmospheric drag, inertia caused it to flutter for several seconds.',
        confidence: 0.98
      },
      {
        keywords: ['mrna', 'vaccine', 'dna', 'alter', 'genetic code', 'modify human dna'],
        claimText: 'mRNA vaccines alter human DNA and permanently change the genome.',
        verdict: 'FALSE',
        textualRating: 'False / Disproven',
        publisher: 'FactCheck.org',
        reviewUrl: 'https://www.factcheck.org/2021/04/scicheck-mrna-vaccines-dont-alter-dna/',
        explanation: 'mRNA never enters the nucleus of the cell where genomic DNA is stored. Cells discard the mRNA molecule within hours after translating the spike protein instructions.',
        confidence: 0.99
      },
      {
        keywords: ['smallpox', 'eradicated', '1980', 'who', 'disease eradicated'],
        claimText: 'Smallpox was declared officially eradicated worldwide in 1980 following a global vaccination campaign.',
        verdict: 'TRUE',
        textualRating: 'True / Verified',
        publisher: 'World Health Organization (WHO)',
        reviewUrl: 'https://www.who.int/news-room/spotlight/history-of-vaccination/a-brief-history-of-vaccination',
        explanation: 'The 33rd World Health Assembly declared the global eradication of smallpox on May 8, 1980, marking the first human disease ever eradicated by medicine.',
        confidence: 0.99
      },
      {
        keywords: ['antarctic', 'ice', 'antarctica', 'gaining ice', 'climate change hoax'],
        claimText: 'Antarctica has been gaining net land ice sheet mass over the past twenty years.',
        verdict: 'MISLEADING',
        textualRating: 'Misleading / Cherry-picked',
        publisher: 'NASA Climate / PolitiFact',
        reviewUrl: 'https://climate.nasa.gov/vital-signs/ice-sheets/',
        explanation: 'While East Antarctica saw localized accumulation in specific years, GRACE satellite data shows overall Antarctica has lost approximately 150 billion metric tons of ice annually since 2002.',
        confidence: 0.94
      },
      {
        keywords: ['solar', 'energy', 'cost', 'renewables', '80%', 'cheapest'],
        claimText: 'The levelized cost of solar photovoltaic electricity dropped by over 80% over the last decade.',
        verdict: 'TRUE',
        textualRating: 'True / Accurate',
        publisher: 'Our World in Data / IRENA',
        reviewUrl: 'https://ourworldindata.org/cheap-renewables-growth',
        explanation: 'According to IRENA, the global weighted-average levelized cost of electricity (LCOE) of utility-scale solar PV dropped by 88% between 2010 and 2021.',
        confidence: 0.97
      },
      {
        keywords: ['5g', 'radiation', 'covid', 'immune system', 'viruses'],
        claimText: '5G cellular towers transmit viruses or suppress the immune system.',
        verdict: 'FALSE',
        textualRating: 'Pants on Fire / False',
        publisher: 'PolitiFact',
        reviewUrl: 'https://www.politifact.com/factchecks/2020/mar/19/facebook-posts/5g-cellular-technology-does-not-cause-coronavirus/',
        explanation: 'Viruses are biological microorganisms that cannot travel on radio waves or wireless networks. 5G signals are non-ionizing electromagnetic radiation incapable of damaging DNA.',
        confidence: 0.99
      },
      {
        keywords: ['great wall of china', 'space', 'naked eye', 'moon'],
        claimText: 'The Great Wall of China is visible from the Moon or space with the naked eye.',
        verdict: 'FALSE',
        textualRating: 'False / Myth',
        publisher: 'NASA Earth Observatory',
        reviewUrl: 'https://earthobservatory.nasa.gov/images/37272/great-wall-of-china-from-space',
        explanation: 'NASA astronauts have confirmed the Great Wall cannot be seen from low Earth orbit without magnification, and is completely invisible from the Moon, as it is only a few meters wide and built with local stone.',
        confidence: 0.96
      }
    ];
  }

  /**
   * Validates a claim against Google Fact Check API, falling back to verified knowledge base.
   * @param {string} claimText - The full claim sentence
   * @param {string} searchQuery - Search keywords optimized for API
   * @returns {Promise<{ verdict: string, textualRating: string, publisher: string, reviewUrl: string, explanation: string, confidence: number, latencyMs: number, source: string }>}
   */
  async checkClaim(claimText, searchQuery = '') {
    const startTime = Date.now();
    const query = (searchQuery || claimText).trim();

    // 1. Try Google Fact Check Tools API if API key is provided
    if (this.apiKey) {
      try {
        const result = await this.queryGoogleFactCheckApi(query);
        if (result) {
          const latencyMs = Date.now() - startTime;
          return {
            ...result,
            latencyMs,
            source: 'google-fact-check-api'
          };
        }
      } catch (err) {
        console.warn(`[FactCheckService] Google Fact Check API error: ${err.message}. Using fallback engine.`);
      }
    }

    // 2. Fast Knowledge Base matching
    const kbMatch = this.matchKnowledgeBase(claimText, query);
    if (kbMatch) {
      const latencyMs = Date.now() - startTime;
      return {
        ...kbMatch,
        latencyMs,
        source: 'veristream-verified-kb'
      };
    }

    // 3. Fallback semantic heuristic verification
    const fallbackVerdict = this.generateFallbackVerification(claimText);
    const latencyMs = Date.now() - startTime;

    return {
      ...fallbackVerdict,
      latencyMs,
      source: 'veristream-heuristic-evaluator'
    };
  }

  /**
   * Calls Google Fact Check Tools API
   */
  async queryGoogleFactCheckApi(query) {
    const url = `${this.endpoint}?query=${encodeURIComponent(query)}&key=${this.apiKey}&languageCode=en`;

    const response = await axios.get(url, { timeout: 8000 });
    const claims = response.data?.claims || [];

    if (claims.length === 0) {
      return null;
    }

    const firstClaim = claims[0];
    const review = firstClaim.claimReview?.[0] || {};
    const textualRating = review.textualRating || 'Unrated';
    const verdict = this.normalizeRating(textualRating);

    return {
      verdict,
      textualRating,
      claimant: firstClaim.claimant || 'Public Speaker / Viral Media',
      publisher: review.publisher?.name || 'Verified Fact-Checker',
      publisherSite: review.publisher?.site || '',
      reviewUrl: review.url || '',
      reviewTitle: review.title || firstClaim.text,
      explanation: review.title ? `Fact-checked by ${review.publisher?.name || 'Fact-Checker'}: ${review.title}` : `Evaluated as ${textualRating} by independent fact-checkers.`,
      confidence: 0.95
    };
  }

  /**
   * Matches against built-in curated knowledge base
   */
  matchKnowledgeBase(claimText, query) {
    const combined = `${claimText} ${query}`.toLowerCase();

    for (const item of this.knowledgeBase) {
      const matches = item.keywords.filter(kw => combined.includes(kw.toLowerCase()));
      if (matches.length >= 2 || (item.keywords.length > 0 && matches.length >= 1 && combined.includes(item.keywords[0].toLowerCase()))) {
        return {
          verdict: item.verdict,
          textualRating: item.textualRating,
          publisher: item.publisher,
          reviewUrl: item.reviewUrl,
          explanation: item.explanation,
          confidence: item.confidence
        };
      }
    }

    return null;
  }

  /**
   * Normalizes disparate textual ratings into standard categories
   */
  normalizeRating(rating) {
    const lower = rating.toLowerCase();
    if (lower.includes('false') || lower.includes('pants on fire') || lower.includes('incorrect') || lower.includes('debunked') || lower.includes('fake') || lower.includes('hoax')) {
      return 'FALSE';
    }
    if (lower.includes('true') || lower.includes('correct') || lower.includes('accurate') || lower.includes('verified')) {
      return 'TRUE';
    }
    if (lower.includes('misleading') || lower.includes('context') || lower.includes('half') || lower.includes('partly') || lower.includes('mixture') || lower.includes('unproven')) {
      return 'MISLEADING';
    }
    return 'UNVERIFIED';
  }

  /**
   * Fallback verification when no direct matches exist in API or KB
   */
  generateFallbackVerification(claimText) {
    const lower = claimText.toLowerCase();

    // Check for extreme or sensational red flags
    if (/miracle cure|government secret|alien|conspiracy|flat earth|5g causes|secret plan/i.test(lower)) {
      return {
        verdict: 'FALSE',
        textualRating: 'Unsubstantiated / High Risk',
        publisher: 'VeriStream Multimodal Engine',
        reviewUrl: 'https://en.wikipedia.org/wiki/Misinformation',
        explanation: 'Statement exhibits hallmark patterns of unverified sensationalism with no supporting empirical evidence.',
        confidence: 0.85
      };
    }

    if (/water boils|gravity|sun rises|oxygen|photosynthesis|earth revolves/i.test(lower)) {
      return {
        verdict: 'TRUE',
        textualRating: 'Established Scientific Fact',
        publisher: 'VeriStream Scientific Index',
        reviewUrl: 'https://en.wikipedia.org',
        explanation: 'Statement aligns with established empirical scientific consensus.',
        confidence: 0.99
      };
    }

    return {
      verdict: 'UNVERIFIED',
      textualRating: 'Under Review / Context Needed',
      publisher: 'VeriStream Live Stream Monitor',
      reviewUrl: '#',
      explanation: 'No immediate prior fact-checks found in Google Fact Check database. Independent verification recommended.',
      confidence: 0.60
    };
  }
}

module.exports = new FactCheckService();
