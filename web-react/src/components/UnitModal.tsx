/**
 * UnitModal Component
 * Detailed view of a single atomic unit
 */

import { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useUnit, useRelatedUnits } from '../hooks/useSearch';

export function UnitModal() {
  const { modalOpen, modalUnitId, closeModal } = useUIStore();
  const { data: unit, isLoading } = useUnit(modalUnitId);
  const { data: relatedUnits = [] } = useRelatedUnits(modalUnitId);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeModal]);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  if (!modalOpen) return null;

  const typeClass = unit ? `type-${unit.type}` : '';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="card max-w-3xl w-full max-h-[90vh] overflow-auto">
        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-2xl text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          aria-label="Close"
        >
          ×
        </button>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-2)] border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-[var(--ink-muted)]">Loading...</p>
          </div>
        ) : unit ? (
          <div className="p-6">
            {/* Header */}
            <header className="mb-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h2 className="text-2xl font-bold text-[var(--accent-3)]">
                  {unit.title}
                </h2>
                <span className={`type-badge ${typeClass}`}>{unit.type}</span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-[var(--ink-muted)]">
                <span>
                  <strong>Category:</strong> {unit.category}
                </span>
                <span>
                  <strong>Created:</strong>{' '}
                  {new Date(unit.timestamp).toLocaleString()}
                </span>
                {unit.conversationId && (
                  <span>
                    <strong>Conversation:</strong> {unit.conversationId}
                  </span>
                )}
              </div>
            </header>

            {/* Content */}
            <section className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Content</h3>
              <div className="bg-[var(--bg)] rounded-lg p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {unit.content}
                </pre>
              </div>
            </section>

            {/* Context */}
            {unit.context && (
              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Context</h3>
                <div className="bg-[var(--bg)] rounded-lg p-4">
                  <p className="text-sm text-[var(--ink-muted)]">{unit.context}</p>
                </div>
              </section>
            )}

            {/* Tags */}
            {unit.tags && unit.tags.length > 0 && (
              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {unit.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Keywords */}
            {unit.keywords && unit.keywords.length > 0 && (
              <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Keywords</h3>
                <p className="text-sm text-[var(--ink-muted)]">
                  {unit.keywords.join(', ')}
                </p>
              </section>
            )}

            {/* Related Units */}
            {relatedUnits.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-2">Related Units</h3>
                <div className="space-y-2">
                  {relatedUnits.slice(0, 5).map((related) => (
                    <button
                      key={related.id}
                      onClick={() => useUIStore.getState().openModal(related.id)}
                      className="w-full text-left p-3 bg-[var(--bg)] rounded-lg hover:bg-[var(--border)] transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{related.title}</span>
                        <span className={`type-badge type-${related.type}`}>
                          {related.type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Actions */}
            <footer className="mt-6 pt-4 border-t border-[var(--border)] flex justify-end gap-3">
              <button className="btn-ghost" onClick={closeModal}>
                Close
              </button>
            </footer>
          </div>
        ) : (
          <div className="p-8 text-center text-[var(--ink-muted)]">
            Unit not found
          </div>
        )}
      </div>
    </div>
  );
}
