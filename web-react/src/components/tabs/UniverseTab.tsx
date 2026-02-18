import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  DEFAULT_VISUAL_FRAME,
  buildNetworkNodes,
  nextChatSelectionFromEdge,
  projectNetworkNode,
  selectionFromOccurrence,
} from '@knowledge-base/contracts';
import { universeApi } from '../../api/universe';

function candidateTerms(content: string): string[] {
  const matches = content.match(/[A-Za-z0-9_'-]{3,}/g) ?? [];
  const normalized = new Set<string>();
  for (const match of matches) {
    const token = match.toLowerCase(); // allow-secret (lexical token, not credential material)
    if (token.length < 3) continue;
    normalized.add(token);
    if (normalized.size >= 12) break;
  }
  return Array.from(normalized);
}

const NETWORK_WIDTH = DEFAULT_VISUAL_FRAME.width;
const NETWORK_HEIGHT = DEFAULT_VISUAL_FRAME.height;

export function UniverseTab() {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [termInput, setTermInput] = useState<string>('');
  const [activeTerm, setActiveTerm] = useState<string>('');
  const [visualMode, setVisualMode] = useState<'2d' | '3d'>('2d');
  const [reindexRunId, setReindexRunId] = useState<string>('');

  const summaryQuery = useQuery({
    queryKey: ['universe-summary'],
    queryFn: () => universeApi.summary(),
    staleTime: 30_000,
  });

  const providersQuery = useQuery({
    queryKey: ['universe-providers'],
    queryFn: () => universeApi.providers({ limit: 200 }),
    staleTime: 30_000,
  });

  const providerChatsQuery = useQuery({
    queryKey: ['universe-provider-chats', selectedProvider],
    queryFn: () => universeApi.providerChats(selectedProvider, { limit: 500 }),
    enabled: selectedProvider.length > 0,
    staleTime: 30_000,
  });

  const chatTurnsQuery = useQuery({
    queryKey: ['universe-chat-turns', selectedChatId],
    queryFn: () => universeApi.chatTurns(selectedChatId, { limit: 1000 }),
    enabled: selectedChatId.length > 0,
    staleTime: 30_000,
  });

  const chatNetworkQuery = useQuery({
    queryKey: ['universe-chat-network', selectedChatId],
    queryFn: () => universeApi.chatNetwork(selectedChatId, { limit: 150 }),
    enabled: selectedChatId.length > 0,
    staleTime: 30_000,
  });

  const termOccurrencesQuery = useQuery({
    queryKey: ['universe-term-occurrences', activeTerm],
    queryFn: () => universeApi.termOccurrences(activeTerm, { limit: 500 }),
    enabled: activeTerm.trim().length > 0,
    staleTime: 10_000,
  });

  const parallelNetworksQuery = useQuery({
    queryKey: ['universe-parallel-networks'],
    queryFn: () => universeApi.parallelNetworks({ limit: 200, minWeight: 2 }),
    staleTime: 30_000,
  });

  const reindexMutation = useMutation({
    mutationFn: () => universeApi.reindex(),
    onSuccess: (response) => {
      setReindexRunId(response.data.runId);
    },
  });

  const reindexRunQuery = useQuery({
    queryKey: ['universe-reindex-run', reindexRunId],
    queryFn: () => universeApi.reindexStatus(reindexRunId),
    enabled: reindexRunId.length > 0,
    refetchInterval: (query) => {
      const status = (query.state.data?.data?.status as string | undefined) ?? 'running';
      return status === 'running' ? 1000 : false;
    },
  });

  const providers = providersQuery.data?.data ?? [];
  const chats = providerChatsQuery.data?.data ?? [];
  const turns = chatTurnsQuery.data?.data ?? [];
  const edges = chatNetworkQuery.data?.data ?? [];
  const occurrences = termOccurrencesQuery.data?.data ?? [];
  const parallelEdges = parallelNetworksQuery.data?.data ?? [];

  useEffect(() => {
    if (!selectedProvider && providers.length > 0) {
      setSelectedProvider(providers[0].providerId);
    }
  }, [providers, selectedProvider]);

  useEffect(() => {
    if (!selectedChatId && chats.length > 0) {
      setSelectedChatId(chats[0].id);
    }
    if (selectedChatId && chats.every((chat) => chat.id !== selectedChatId)) {
      setSelectedChatId(chats.length > 0 ? chats[0].id : '');
    }
  }, [chats, selectedChatId]);

  const cosmicStage = useMemo(() => {
    if (activeTerm) return 'Token Scale (Micro)';
    if (selectedChatId) return 'Chat System Scale';
    if (selectedProvider) return 'Provider Orbit Scale';
    return 'Universe Scale (Macro)';
  }, [activeTerm, selectedChatId, selectedProvider]);

  const summary = summaryQuery.data?.data;
  const activeEdges = selectedChatId ? edges : parallelEdges;

  const networkNodes = useMemo(
    () => buildNetworkNodes(activeEdges, selectedChatId),
    [activeEdges, selectedChatId],
  );

  const projectedNodes = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        x: number;
        y: number;
        scale: number;
      }
    >();

    for (const node of networkNodes) {
      map.set(node.id, {
        ...projectNetworkNode(node, visualMode, DEFAULT_VISUAL_FRAME),
      });
    }
    return map;
  }, [networkNodes, visualMode]);

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--accent-3)]">Universal AI Chat Cosmos</h2>
            <p className="text-sm text-[var(--ink-muted)]">Current zoom: {cosmicStage}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary"
              onClick={() => setVisualMode((mode) => (mode === '2d' ? '3d' : '2d'))}
            >
              Mode: {visualMode.toUpperCase()}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setActiveTerm(termInput.trim().toLowerCase());
              }}
            >
              Find Term
            </button>
            <button
              className="btn-secondary"
              onClick={() => reindexMutation.mutate()}
              disabled={reindexMutation.isPending}
            >
              {reindexMutation.isPending ? 'Reindexing...' : 'Reindex Universe'}
            </button>
          </div>
        </div>

        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 text-sm">
            <div className="bg-[var(--surface)] rounded-md p-3">
              <p className="text-[var(--ink-muted)]">Providers</p>
              <p className="text-lg font-semibold">{summary.providers}</p>
            </div>
            <div className="bg-[var(--surface)] rounded-md p-3">
              <p className="text-[var(--ink-muted)]">Accounts</p>
              <p className="text-lg font-semibold">{summary.accounts}</p>
            </div>
            <div className="bg-[var(--surface)] rounded-md p-3">
              <p className="text-[var(--ink-muted)]">Chats</p>
              <p className="text-lg font-semibold">{summary.chats}</p>
            </div>
            <div className="bg-[var(--surface)] rounded-md p-3">
              <p className="text-[var(--ink-muted)]">Turns</p>
              <p className="text-lg font-semibold">{summary.turns}</p>
            </div>
            <div className="bg-[var(--surface)] rounded-md p-3">
              <p className="text-[var(--ink-muted)]">Terms</p>
              <p className="text-lg font-semibold">{summary.terms}</p>
            </div>
            <div className="bg-[var(--surface)] rounded-md p-3">
              <p className="text-[var(--ink-muted)]">Occurrences</p>
              <p className="text-lg font-semibold">{summary.occurrences}</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-[var(--ink-muted)]">Loading universe summary...</p>
        )}

        {reindexRunId && (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            Reindex run `{reindexRunId}` status: {String(reindexRunQuery.data?.data?.status ?? 'running')}
          </p>
        )}
      </div>

      <div className={`grid grid-cols-1 xl:grid-cols-3 gap-4 ${visualMode === '3d' ? 'perspective-[1200px]' : ''}`}>
        <section className="card p-4">
          <h3 className="font-semibold mb-2">Provider Orbits</h3>
          <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  setSelectedProvider(provider.providerId);
                  setSelectedChatId('');
                }}
                style={
                  visualMode === '3d'
                    ? { transform: 'rotateX(8deg) translateZ(0)', transformOrigin: 'top' }
                    : undefined
                }
                className={`w-full text-left p-2 rounded border ${
                  selectedProvider === provider.providerId
                    ? 'border-[var(--accent-2)] bg-[var(--surface)]'
                    : 'border-[var(--border)]'
                }`}
              >
                <p className="font-medium">{provider.displayName}</p>
                <p className="text-xs text-[var(--ink-muted)]">{provider.providerId}</p>
              </button>
            ))}
            {!providersQuery.isLoading && providers.length === 0 && (
              <p className="text-sm text-[var(--ink-muted)]">No providers indexed yet.</p>
            )}
          </div>
        </section>

        <section className="card p-4">
          <h3 className="font-semibold mb-2">Chat Systems</h3>
          <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                style={
                  visualMode === '3d'
                    ? { transform: 'rotateX(8deg) translateZ(0)', transformOrigin: 'top' }
                    : undefined
                }
                className={`w-full text-left p-2 rounded border ${
                  selectedChatId === chat.id
                    ? 'border-[var(--accent-2)] bg-[var(--surface)]'
                    : 'border-[var(--border)]'
                }`}
              >
                <p className="font-medium line-clamp-2">{chat.title}</p>
                <p className="text-xs text-[var(--ink-muted)]">{chat.turnCount} turns</p>
                <p className="text-xs text-[var(--ink-muted)] line-clamp-1">{chat.sourcePath}</p>
              </button>
            ))}
            {selectedProvider && !providerChatsQuery.isLoading && chats.length === 0 && (
              <p className="text-sm text-[var(--ink-muted)]">No chats indexed for this provider.</p>
            )}
          </div>
        </section>

        <section className="card p-4">
          <h3 className="font-semibold mb-2">Prompt/Response Propulsion</h3>
          <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {turns.map((turn) => (
              <article
                key={turn.id}
                className="border border-[var(--border)] rounded p-2"
                style={
                  visualMode === '3d'
                    ? { transform: 'rotateX(6deg) translateZ(0)', transformOrigin: 'top' }
                    : undefined
                }
              >
                <p className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                  {turn.turnIndex}. {turn.role}
                </p>
                <p className="text-sm whitespace-pre-wrap mt-1 line-clamp-5">{turn.content}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {candidateTerms(turn.content).map((token) => (
                    <button
                      key={`${turn.id}-${token}`}
                      onClick={() => {
                        setTermInput(token);
                        setActiveTerm(token);
                      }}
                      className="text-xs px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)]"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </article>
            ))}
            {selectedChatId && !chatTurnsQuery.isLoading && turns.length === 0 && (
              <p className="text-sm text-[var(--ink-muted)]">No turns found.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold">Global Term Explorer</h3>
            <input
              value={termInput}
              onChange={(event) => setTermInput(event.target.value)}
              placeholder="Type one word"
              className="input flex-1"
            />
          </div>

          {activeTerm ? (
            <p className="text-sm text-[var(--ink-muted)] mb-3">
              Showing occurrences for <strong>{activeTerm}</strong>
            </p>
          ) : (
            <p className="text-sm text-[var(--ink-muted)] mb-3">Click any token above or type one here.</p>
          )}

          <div className="space-y-2 max-h-[20rem] overflow-y-auto pr-1">
            {occurrences.map((occurrence) => (
              <button
                key={occurrence.id}
                className="w-full text-left border border-[var(--border)] rounded p-2"
                onClick={() => {
                  const nextSelection = selectionFromOccurrence(occurrence, {
                    providerId: selectedProvider || undefined,
                    chatId: selectedChatId || undefined,
                    term: activeTerm || undefined,
                  });
                  if (nextSelection.providerId) {
                    setSelectedProvider(nextSelection.providerId);
                  }
                  if (nextSelection.chatId) {
                    setSelectedChatId(nextSelection.chatId);
                  }
                }}
              >
                <p className="text-xs text-[var(--ink-muted)]">
                  {occurrence.providerId} • {occurrence.chatTitle} • turn {occurrence.turnIndex}
                </p>
                <p className="text-sm line-clamp-2 mt-1">{occurrence.content}</p>
              </button>
            ))}
            {activeTerm && !termOccurrencesQuery.isLoading && occurrences.length === 0 && (
              <p className="text-sm text-[var(--ink-muted)]">No occurrences found for this term.</p>
            )}
          </div>
        </section>

        <section className="card p-4">
          <h3 className="font-semibold mb-3">Parallel Networks</h3>
          <div className="border border-[var(--border)] rounded mb-3 overflow-hidden bg-[var(--surface)]">
            <svg
              viewBox={`0 0 ${NETWORK_WIDTH} ${NETWORK_HEIGHT}`}
              className="w-full h-56"
              role="img"
              aria-label="Parallel network map"
            >
              {activeEdges.map((edge) => {
                const source = projectedNodes.get(edge.sourceThreadId);
                const target = projectedNodes.get(edge.targetThreadId);
                if (!source || !target) return null;
                const opacity = Math.min(0.85, 0.2 + Number(edge.weight) / 10);
                return (
                  <line
                    key={`line-${edge.id}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="var(--accent-2)"
                    strokeOpacity={opacity}
                    strokeWidth={1 + Math.min(4, Number(edge.weight))}
                  />
                );
              })}

              {Array.from(projectedNodes.values())
                .sort((left, right) => left.scale - right.scale)
                .map((node) => {
                  const isSelected = node.id === selectedChatId;
                  const radius = 6 + Math.max(0, Math.min(6, node.scale * 4));
                  return (
                    <g
                      key={`node-${node.id}`}
                      onClick={() => setSelectedChatId(node.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius}
                        fill={isSelected ? 'var(--accent-3)' : 'var(--accent-2)'}
                        opacity={0.92}
                      />
                    </g>
                  );
                })}
            </svg>
          </div>
          <div className="space-y-2 max-h-[20rem] overflow-y-auto pr-1">
            {activeEdges.map((edge) => (
              <button
                key={edge.id}
                className="w-full text-left border border-[var(--border)] rounded p-2"
                onClick={() => {
                  setSelectedChatId(nextChatSelectionFromEdge(edge, selectedChatId));
                }}
              >
                <p className="text-xs text-[var(--ink-muted)]">
                  {edge.edgeType} • weight {Number(edge.weight).toFixed(2)}
                </p>
                <p className="text-sm line-clamp-1">
                  {edge.sourceThreadId} ↔ {edge.targetThreadId}
                </p>
              </button>
            ))}
            {!parallelNetworksQuery.isLoading && !chatNetworkQuery.isLoading && activeEdges.length === 0 && (
              <p className="text-sm text-[var(--ink-muted)]">No network edges available for this scope.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
