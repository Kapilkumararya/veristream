/**
 * React Native Hook for VeriStream Investigation Platform
 * Connects to FastAPI Backend, LangGraph Workflows, and WebSocket Notifications
 */

import { useState, useEffect, useRef } from 'react';

export interface EvidenceItem {
  polarity: 'pro' | 'con';
  source_name: string;
  evidence_point: string;
  authority_type: string;
  credibility_score: number;
  url?: string;
  date?: string;
}

export interface AgentThoughtStep {
  step_number: number;
  phase: string;
  thought: string;
  elapsed_ms: number;
}

export interface InvestigationResult {
  id: string;
  claim_text: string;
  domain: string;
  verdict: 'VERIFIED_TRUE' | 'DEBUNKED_FALSE' | 'MISLEADING_CHERRY_PICKED' | 'UNSUBSTANTIATED';
  textual_rating: string;
  confidence_score: number;
  verdict_summary: string;
  explainable_report: string;
  risk_level: string;
  consensus_assessment: string;
  supporting_evidence: EvidenceItem[];
  refuting_evidence: EvidenceItem[];
  agent_thought_process: AgentThoughtStep[];
  latency_breakdown: Record<string, number>;
  created_at: string;
}

export const useVeriStream = (backendUrl = 'http://10.0.2.2:8000') => {
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeThoughts, setActiveThoughts] = useState<string[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = backendUrl.replace(/^http/, 'ws') + '/ws/notifications';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.current_thought) {
          setActiveThoughts((prev) => [data.current_thought, ...prev.slice(0, 4)]);
        }
        if (data.status === 'completed' && data.result) {
          setResult(data.result);
          setLoading(false);
        }
      } catch (err) {
        console.warn('WebSocket message parse error:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [backendUrl]);

  const investigateClaim = async (claimText: string) => {
    setLoading(true);
    setActiveThoughts(['Initializing LangGraph Agentic Pipeline...']);
    try {
      const response = await fetch(`${backendUrl}/api/mobile/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: claimText })
      });
      const data: InvestigationResult = await response.json();
      setResult(data);
    } catch (e) {
      console.error('Mobile investigation error:', e);
    } finally {
      setLoading(false);
    }
  };

  return {
    result,
    loading,
    activeThoughts,
    connected,
    investigateClaim
  };
};
