import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { TermOccurrence, UniverseChat, UniverseProvider, UniverseSummary, UniverseTurn } from '@knowledge-base/contracts';
import { RecentExplorationCache } from './src/offline-cache';
import { createMobileUniverseClient } from './src/universe-client';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
const API_AUTH_HEADER = process.env.EXPO_PUBLIC_API_AUTH_HEADER;

function trimText(content: string, max = 140): string {
  const compact = content.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}

export default function App() {
  const client = useMemo(
    () =>
      createMobileUniverseClient({
        baseUrl: API_BASE,
        authHeader: API_AUTH_HEADER,
      }),
    [],
  );
  const cacheRef = useRef(new RecentExplorationCache({ maxEntries: 20 }));

  const [summary, setSummary] = useState<UniverseSummary | null>(null);
  const [providers, setProviders] = useState<UniverseProvider[]>([]);
  const [providerChats, setProviderChats] = useState<UniverseChat[]>([]);
  const [chatTurns, setChatTurns] = useState<UniverseTurn[]>([]);
  const [termHits, setTermHits] = useState<TermOccurrence[]>([]);
  const [savedExplorations, setSavedExplorations] = useState<
    Array<{ id: string; label: string; providerId?: string; chatId?: string; term?: string }>
  >([]);

  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [termInput, setTermInput] = useState<string>('');
  const [activeTerm, setActiveTerm] = useState<string>('');
  const [status, setStatus] = useState<string>('Loading universe...');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    void (async () => {
      try {
        const [summaryResp, providersResp, saved] = await Promise.all([
          client.summary(),
          client.providers({ limit: 50 }),
          cacheRef.current.hydrate(),
        ]);
        setSummary(summaryResp.data);
        setProviders(providersResp.data);
        setSavedExplorations(saved);
        if (providersResp.data.length > 0) {
          setSelectedProviderId(providersResp.data[0].providerId);
        }
        setStatus('Universe loaded');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load universe');
      }
    })();
  }, [client]);

  useEffect(() => {
    if (!selectedProviderId) {
      setProviderChats([]);
      return;
    }
    void (async () => {
      try {
        setStatus(`Loading chats for ${selectedProviderId}...`);
        const chatsResp = await client.providerChats(selectedProviderId, { limit: 100 });
        setProviderChats(chatsResp.data);
        if (chatsResp.data.length > 0) {
          setSelectedChatId((current) => current || chatsResp.data[0].id);
        } else {
          setSelectedChatId('');
        }
        setStatus(`Loaded ${chatsResp.data.length} chats`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chats');
      }
    })();
  }, [client, selectedProviderId]);

  useEffect(() => {
    if (!selectedChatId) {
      setChatTurns([]);
      return;
    }
    void (async () => {
      try {
        setStatus('Loading turns...');
        const turnsResp = await client.chatTurns(selectedChatId, { limit: 200 });
        setChatTurns(turnsResp.data);
        setStatus(`Loaded ${turnsResp.data.length} turns`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load turns');
      }
    })();
  }, [client, selectedChatId]);

  const runTermSearch = async (termCandidate?: string) => {
    const term = (termCandidate ?? termInput).trim().toLowerCase();
    if (!term) return;
    setActiveTerm(term);
    try {
      setStatus(`Searching “${term}”...`);
      const response = await client.termOccurrences(term, { limit: 120 });
      setTermHits(response.data);
      setStatus(`Found ${response.data.length} hits for "${term}"`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load term occurrences');
    }
  };

  const saveCurrentExploration = async () => {
    const provider = providers.find((item) => item.providerId === selectedProviderId);
    const chat = providerChats.find((item) => item.id === selectedChatId);
    const label = activeTerm
      ? `${provider?.displayName ?? selectedProviderId}: ${activeTerm}`
      : `${provider?.displayName ?? selectedProviderId}: ${chat?.title ?? selectedChatId || 'overview'}`;

    await cacheRef.current.add({
      providerId: selectedProviderId || undefined,
      chatId: selectedChatId || undefined,
      term: activeTerm || undefined,
      label,
    });
    setSavedExplorations(cacheRef.current.list());
    setStatus('Saved exploration');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ color: '#e2e8f0', fontSize: 24, fontWeight: '700' }}>AI Cosmos Mobile</Text>
        <Text style={{ color: '#94a3b8' }}>Universe → Provider → Chat → Turn → Term drill-down.</Text>

        {error ? <Text style={{ color: '#fca5a5' }}>{error}</Text> : null}
        <Text style={{ color: '#94a3b8' }}>{status}</Text>

        <View style={{ backgroundColor: '#111827', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: '#e2e8f0', fontSize: 18, marginBottom: 8 }}>Universe Summary</Text>
          <Text style={{ color: '#cbd5e1' }}>Providers: {summary?.providers ?? '...'}</Text>
          <Text style={{ color: '#cbd5e1' }}>Chats: {summary?.chats ?? '...'}</Text>
          <Text style={{ color: '#cbd5e1' }}>Turns: {summary?.turns ?? '...'}</Text>
          <Text style={{ color: '#cbd5e1' }}>Terms: {summary?.terms ?? '...'}</Text>
        </View>

        <View style={{ backgroundColor: '#111827', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: '#e2e8f0', fontSize: 18, marginBottom: 8 }}>Providers</Text>
          {providers.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              onPress={() => setSelectedProviderId(provider.providerId)}
              style={{ paddingVertical: 8 }}
            >
              <Text
                style={{
                  color: provider.providerId === selectedProviderId ? '#fbbf24' : '#93c5fd',
                  fontWeight: '600',
                }}
              >
                {provider.displayName}
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{provider.providerId}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ backgroundColor: '#111827', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: '#e2e8f0', fontSize: 18, marginBottom: 8 }}>Chats</Text>
          {providerChats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              onPress={() => setSelectedChatId(chat.id)}
              style={{ paddingVertical: 8 }}
            >
              <Text style={{ color: chat.id === selectedChatId ? '#fbbf24' : '#93c5fd', fontWeight: '600' }}>
                {trimText(chat.title, 72)}
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{chat.turnCount} turns</Text>
            </TouchableOpacity>
          ))}
          {providerChats.length === 0 ? <Text style={{ color: '#94a3b8' }}>No chats for this provider.</Text> : null}
        </View>

        <View style={{ backgroundColor: '#111827', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: '#e2e8f0', fontSize: 18, marginBottom: 8 }}>Turns</Text>
          {chatTurns.slice(0, 20).map((turn) => (
            <View key={turn.id} style={{ paddingBottom: 10 }}>
              <Text style={{ color: '#f8fafc', fontSize: 12 }}>
                {turn.turnIndex}. {turn.role}
              </Text>
              <Text style={{ color: '#cbd5e1' }}>{trimText(turn.content, 180)}</Text>
            </View>
          ))}
          {chatTurns.length === 0 ? <Text style={{ color: '#94a3b8' }}>No turns loaded.</Text> : null}
        </View>

        <View style={{ backgroundColor: '#111827', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: '#e2e8f0', fontSize: 18, marginBottom: 8 }}>Global Term Explorer</Text>
          <TextInput
            value={termInput}
            onChangeText={setTermInput}
            placeholder="Type a word (example: nebula)"
            placeholderTextColor="#64748b"
            style={{
              backgroundColor: '#1f2937',
              color: '#e2e8f0',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              marginBottom: 8,
            }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => void runTermSearch()} style={{ paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ color: '#93c5fd', fontWeight: '600' }}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void saveCurrentExploration()} style={{ paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ color: '#86efac', fontWeight: '600' }}>Save Exploration</Text>
            </TouchableOpacity>
          </View>

          {termHits.slice(0, 20).map((hit) => (
            <TouchableOpacity
              key={hit.id}
              onPress={() => {
                setSelectedProviderId(hit.providerId);
                setSelectedChatId(hit.threadId);
              }}
              style={{ paddingVertical: 6 }}
            >
              <Text style={{ color: '#f8fafc', fontSize: 12 }}>
                {hit.providerId} • turn {hit.turnIndex} • {hit.role}
              </Text>
              <Text style={{ color: '#cbd5e1' }}>{trimText(hit.content, 160)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ backgroundColor: '#111827', borderRadius: 10, padding: 12 }}>
          <Text style={{ color: '#e2e8f0', fontSize: 18, marginBottom: 8 }}>Saved Explorations</Text>
          {savedExplorations.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                if (item.providerId) setSelectedProviderId(item.providerId);
                if (item.chatId) setSelectedChatId(item.chatId);
                if (item.term) {
                  setTermInput(item.term);
                  setActiveTerm(item.term);
                  void runTermSearch(item.term);
                }
              }}
              style={{ paddingVertical: 6 }}
            >
              <Text style={{ color: '#a5f3fc' }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          {savedExplorations.length === 0 ? <Text style={{ color: '#94a3b8' }}>Nothing saved yet.</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
