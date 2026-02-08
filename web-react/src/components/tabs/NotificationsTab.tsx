/**
 * NotificationsTab Component
 * Displays live WebSocket activity and system notifications.
 */

import { useMemo, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useWebSocketStore } from '../../hooks/useWebSocket';

type NotificationFilter = 'all' | 'unread';

export function NotificationsTab() {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = useUIStore();
  const { status, clientId } = useWebSocketStore();

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((item) => !item.read);
    }
    return notifications;
  }, [filter, notifications]);

  return (
    <div className="space-y-6">
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Realtime Activity</h3>
            <p className="text-sm text-[var(--ink-muted)]">
              Connection status:{' '}
              <span className="font-medium capitalize">{status}</span>
              {clientId ? ` · Client ${clientId}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`btn-ghost ${filter === 'all' ? 'ring-1 ring-[var(--accent-2)]' : ''}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`btn-ghost ${filter === 'unread' ? 'ring-1 ring-[var(--accent-2)]' : ''}`}
            >
              Unread
            </button>
            <button onClick={markAllNotificationsRead} className="btn-ghost">
              Mark all read
            </button>
            <button onClick={clearNotifications} className="btn-ghost text-red-500">
              Clear
            </button>
          </div>
        </div>
      </section>

      <section className="card p-4">
        {filteredNotifications.length === 0 ? (
          <p className="text-[var(--ink-muted)] text-center py-8">
            No notifications yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {filteredNotifications.map((item) => (
              <li
                key={item.id}
                className={`rounded-lg border p-3 transition-colors ${
                  item.read
                    ? 'border-[var(--border)] bg-[var(--bg)]'
                    : 'border-[var(--accent-2)]/40 bg-[var(--surface)]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-[var(--ink-muted)] mt-1">{item.message}</p>
                    <p className="text-xs text-[var(--ink-muted)] mt-2">
                      {new Date(item.timestamp).toLocaleString()}
                      {item.sourceEventType ? ` · ${item.sourceEventType}` : ''}
                    </p>
                  </div>
                  {!item.read && (
                    <button
                      onClick={() => markNotificationRead(item.id)}
                      className="btn-ghost text-xs"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
