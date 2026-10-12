const axios = require('axios');
const config = require('../config');

class ClaimExtractor {
  constructor() {
    this.apiKey = config.openaiApiKey;
  }

  /**
   * Extracts verifiable claims from transcript text.
   * Filters out conversational filler, subjective opinions, and questions.
   * @param {string} text - Raw transcript snippet or sentence
   * @returns {Promise<{ claims: Array<{ text: string, searchQuery: string, confidence: number, entities: Array<string>, type: string }>, latencyMs: number }>}
   */
  async extractClaims(text) {
    const startTime = Date.now();

    if (!text || text.trim().length < 5) {
      return { claims: [], latencyMs: 0 };
    }

    // If OpenAI API key is available, use GPT for state-of-the-art claim extraction
    if (this.apiKey) {
      try {
        const gptClaims = await this.extractWithLLM(text);
        return {
          claims: gptClaims,
          latencyMs: Date.now() - startTime,
          engine: 'gpt-4o-mini'
        };
      } catch (err) {
        console.warn(`[ClaimExtractor] LLM extraction error: ${err.message}. Using rule-based NLP.`);
      }
    }

    // Rule-based NLP Claim Extraction Engine
    const heuristicClaims = this.extractWithHeuristics(text);
    return {
      claims: heuristicClaims,
      latencyMs: Date.now() - startTime,
      engine: 'veristream-heuristic-nlp'
    };
  }

  /**
   * Uses OpenAI chat completions to extract claims
   */
  async extractWithLLM(text) {
    const prompt = `You are a professional fact-checking assistant. Given the following live speech transcript, extract only verifiable factual claims (statements asserting objective facts, statistics, scientific claims, historical dates, or policy actions). Ignore opinions, personal preferences, greetings, or conversational filler.
    
For each claim, return a JSON object with:
- "text": Exact or cleaned claim statement
- "searchQuery": Concise 3-6 word search query optimized for Google Fact Check Tools API
- "confidence": Float between 0.1 and 1.0
- "entities": Array of key entities/topics mentioned
- "type": "statistical" | "scientific" | "historical" | "political" | "general"

Transcript: "${text}"

Respond ONLY with a JSON array of claim objects. If no verifiable claims are found, return [].`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const content = response.data.choices[0]?.message?.content || '[]';
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : (parsed.claims || []);
  }

  /**
   * Fast rule-based heuristic extraction for low-latency streaming pipeline
   */
  extractWithHeuristics(text) {
    const sentences = text
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 8);

    const nonClaimStarters = [
      'i think', 'i believe', 'i feel', 'in my opinion', 'maybe', 'perhaps',
      'hello', 'hi everyone', 'welcome', 'can you hear', 'how are you',
      'thank you', 'let me know', 'what do you think', 'good morning', 'good evening'
    ];

    const factIndicators = [
      /\b(\d+(?:\.\d+)?%|\b\d{4}\b|\bmillion\b|\bbillion\b|\btrillion\b|\bpercent\b)/i,
      /\b(caused|proves|discovered|invented|created|destroyed|cured|eradicated|doubled|tripled)\b/i,
      /\b(vaccine|dna|covid|moon landing|nasa|climate|carbon|ice caps|election|who|cdc|fbi)\b/i,
      /\b(first time|never before|largest|smallest|highest|lowest|fastest)\b/i,
      /\b(studies show|research proves|scientists confirmed|according to data)\b/i
    ];

    const extracted = [];

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();

      // Check if sentence starts with subjective or chit-chat markers
      const isFiller = nonClaimStarters.some(starter => lower.startsWith(starter));
      const isQuestion = sentence.endsWith('?');

      if (isFiller || isQuestion) {
        continue;
      }

      // Check if it contains factual assertions, statistics, entities, or keywords
      const matchedIndicators = factIndicators.filter(regex => regex.test(lower));
      
      // If sentence has verifiable markers or substantive length with assertions
      if (matchedIndicators.length > 0 || (sentence.length > 25 && /\b(is|was|are|were|has|have|did)\b/i.test(sentence))) {
        // Generate concise Google Fact Check search query
        const cleanWords = sentence
          .replace(/[^\w\s]/gi, '')
          .split(/\s+/)
          .filter(w => !['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'that', 'this'].includes(w.toLowerCase()));

        const searchQuery = cleanWords.slice(0, 5).join(' ');

        // Extract key entities
        const entities = sentence.match(/\b[A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*\b/g) || [];

        let type = 'general';
        if (/\d+%|\bpercent|\bmillion|\bbillion/i.test(sentence)) type = 'statistical';
        else if (/climate|ice|carbon|warming|vaccine|dna|virus|covid/i.test(sentence)) type = 'scientific';
        else if (/\b(19\d\d|20\d\d|apollo|war|century|president|election)\b/i.test(sentence)) type = 'historical';

        extracted.push({
          text: sentence,
          searchQuery: searchQuery || sentence.slice(0, 40),
          confidence: Math.min(0.95, 0.65 + (matchedIndicators.length * 0.1)),
          entities: [...new Set(entities)].slice(0, 4),
          type
        });
      }
    }

    return extracted;
  }
}

module.exports = new ClaimExtractor();
