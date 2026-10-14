/**
 * React Native Investigation Screen Component for VeriStream
 * Renders Mobile Claim Investigation Cards, Dialectical Evidence, and Verdicts
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useVeriStream, EvidenceItem } from './useVeriStream';

export const VeriStreamInvestigationScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const { result, loading, activeThoughts, connected, investigateClaim } = useVeriStream();

  const handleSearch = () => {
    if (!query.trim()) return;
    investigateClaim(query.trim());
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'VERIFIED_TRUE':
        return '#10B981';
      case 'DEBUNKED_FALSE':
        return '#EF4444';
      case 'MISLEADING_CHERRY_PICKED':
        return '#F59E0B';
      default:
        return '#64748B';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>VeriStream</Text>
          <Text style={styles.subtitle}>AI-Powered Evidence Investigation Platform</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusDot, { backgroundColor: connected ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.statusText}>{connected ? 'LangGraph WS Live' : 'Offline'}</Text>
          </View>
        </View>

        {/* Input Form */}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="Enter claim across Health, Climate, or History..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            multiline
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Run LangGraph Investigation</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Thoughts */}
        {activeThoughts.length > 0 && loading && (
          <View style={styles.thoughtBox}>
            <Text style={styles.thoughtTitle}>Autonomous LangGraph Thought:</Text>
            {activeThoughts.map((t, idx) => (
              <Text key={idx} style={styles.thoughtItem}>&bull; {t}</Text>
            ))}
          </View>
        )}

        {/* Investigation Results */}
        {result && (
          <View style={styles.resultCard}>
            <View style={[styles.verdictBanner, { backgroundColor: getVerdictColor(result.verdict) }]}>
              <Text style={styles.verdictText}>{result.verdict}</Text>
              <Text style={styles.confidenceText}>{(result.confidence_score * 100).toFixed(0)}% Confidence</Text>
            </View>

            <Text style={styles.ratingSubtitle}>{result.textual_rating}</Text>
            <Text style={styles.claimQuote}>"{result.claim_text}"</Text>
            <Text style={styles.summaryText}>{result.verdict_summary}</Text>

            {/* Evidence Board */}
            <Text style={styles.sectionHeader}>Contradicting Evidence (Qdrant RAG):</Text>
            {result.refuting_evidence.map((ev: EvidenceItem, i: number) => (
              <View key={i} style={styles.evidenceItem}>
                <Text style={styles.evSource}>{ev.source_name} ({ev.authority_type})</Text>
                <Text style={styles.evText}>{ev.evidence_point}</Text>
              </View>
            ))}

            <Text style={styles.sectionHeader}>Proponent Assertions:</Text>
            {result.supporting_evidence.map((ev: EvidenceItem, i: number) => (
              <View key={i} style={styles.evidenceItem}>
                <Text style={styles.evSource}>{ev.source_name}</Text>
                <Text style={styles.evText}>{ev.evidence_point}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  scroll: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#F8FAFC' },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  searchBox: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 16 },
  input: { backgroundColor: '#0F172A', color: '#F8FAFC', borderRadius: 8, padding: 12, minHeight: 60, textAlignVertical: 'top' },
  button: { backgroundColor: '#3B82F6', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  thoughtBox: { backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 12, borderRadius: 8, marginBottom: 16 },
  thoughtTitle: { color: '#60A5FA', fontWeight: '700', fontSize: 12, marginBottom: 4 },
  thoughtItem: { color: '#E2E8F0', fontSize: 12, marginVertical: 2 },
  resultCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginTop: 8 },
  verdictBanner: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 6, marginBottom: 10 },
  verdictText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  confidenceText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  ratingSubtitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  claimQuote: { color: '#94A3B8', fontStyle: 'italic', marginBottom: 10 },
  summaryText: { color: '#E2E8F0', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  sectionHeader: { color: '#38BDF8', fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  evidenceItem: { backgroundColor: '#0F172A', padding: 10, borderRadius: 6, marginBottom: 6 },
  evSource: { color: '#94A3B8', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  evText: { color: '#F8FAFC', fontSize: 12, lineHeight: 17 }
});
