/**
 * UI State Store
 * Manages tab navigation, theme, modals, and toasts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tab, Toast } from '../types';

interface UIState {
  // Tab navigation
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Modal state
  modalOpen: boolean;
  modalUnitId: string | null;
  openModal: (unitId: string) => void;
  closeModal: () => void;

  // Shortcuts modal
  shortcutsOpen: boolean;
  toggleShortcuts: () => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;

  // Sidebar state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Tab navigation - default to search
      activeTab: 'search',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Theme - default to system
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        if (theme !== 'system') {
          root.classList.add(theme);
        }
      },

      // Modal state
      modalOpen: false,
      modalUnitId: null,
      openModal: (unitId) => set({ modalOpen: true, modalUnitId: unitId }),
      closeModal: () => set({ modalOpen: false, modalUnitId: null }),

      // Shortcuts modal
      shortcutsOpen: false,
      toggleShortcuts: () => set((state) => ({ shortcutsOpen: !state.shortcutsOpen })),

      // Toast notifications
      toasts: [],
      addToast: (message, type, duration = 3000) => {
        const id = crypto.randomUUID();
        set((state) => ({
          toasts: [...state.toasts, { id, message, type, duration }],
        }));
        // Auto-remove after duration
        if (duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, duration);
        }
      },
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      // Sidebar state
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'kb-ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
