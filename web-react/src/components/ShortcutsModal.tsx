/**
 * ShortcutsModal Component
 * Displays keyboard shortcuts help
 */

import { useUIStore } from '../stores/uiStore';
import { shortcuts } from '../hooks/useKeyboardShortcuts';

export function ShortcutsModal() {
  const { shortcutsOpen, toggleShortcuts } = useUIStore();

  if (!shortcutsOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) toggleShortcuts();
      }}
    >
      <div className="card max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
          <button
            onClick={toggleShortcuts}
            className="text-2xl text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map(({ keys, action }) => (
            <div key={action} className="flex justify-between items-center">
              <span className="flex gap-1">
                {keys.map((key, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-1 bg-[var(--bg)] rounded text-sm font-mono"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
              <span className="text-[var(--ink-muted)]">{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
