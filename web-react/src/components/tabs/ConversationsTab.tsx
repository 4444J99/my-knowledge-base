/**
 * ConversationsTab Component
 * Browse conversations
 */

import { useQuery } from '@tanstack/react-query';
import { conversationsApi } from '../../api/client';

export function ConversationsTab() {
  const { data: response, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversationsApi.list(),
    staleTime: 60000,
  });

  const conversations = response?.data || [];

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-2)] border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-[var(--ink-muted)]">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--ink-muted)]">No conversations found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {conversations.map((conversation) => (
        <div key={conversation.id} className="card p-4">
          <h3 className="font-semibold text-[var(--accent-3)] mb-2 line-clamp-2">
            {conversation.title}
          </h3>
          <div className="text-sm text-[var(--ink-muted)] space-y-1">
            <p>
              <strong>Source:</strong> {conversation.source}
            </p>
            <p>
              <strong>Units:</strong> {conversation.unitCount}
            </p>
            <p>
              <strong>Date:</strong>{' '}
              {new Date(conversation.timestamp).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
