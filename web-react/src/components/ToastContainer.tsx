/**
 * ToastContainer Component
 * Displays toast notifications
 */

import { useUIStore } from '../stores/uiStore';

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.type} flex items-center gap-3 min-w-[200px]`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
