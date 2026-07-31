/**
 * Global state store for cockpit-ui.
 *
 * Replaces prop drilling and scattered useState calls with a single
 * typed store. Uses Zustand for minimal boilerplate and React 19 compat.
 */

import { create } from 'zustand';

// ── Navigation State ──

export interface NavigationState {
  /** Current active tab/view ID */
  activeTab: string;
  /** Previous tab (for back navigation) */
  previousTab: string | null;
  /** Navigate to a new tab */
  setActiveTab: (tab: string) => void;
}

// ── Search State ──

export interface SearchState {
  /** Current search query */
  query: string;
  /** Whether search panel is open */
  isOpen: boolean;
  /** Search results count */
  resultCount: number;
  setQuery: (query: string) => void;
  setOpen: (open: boolean) => void;
  setResultCount: (count: number) => void;
  toggle: () => void;
}

// ── Dashboard Preferences ──

export interface DashboardPreferences {
  /** Sidebar collapsed state */
  sidebarCollapsed: boolean;
  /** Active sidebar panel */
  sidebarPanel: 'coverage' | 'portfolio' | 'paths' | 'closure' | null;
  /** Global refetch interval override (ms) */
  refetchInterval: number;
  toggleSidebar: () => void;
  setSidebarPanel: (panel: DashboardPreferences['sidebarPanel']) => void;
  setRefetchInterval: (interval: number) => void;
}

// ── Combined Store ──

export interface CockpitStore {
  navigation: NavigationState;
  search: SearchState;
  preferences: DashboardPreferences;
}

export const useCockpitStore = create<CockpitStore>((set) => ({
  navigation: {
    activeTab: 'Home',
    previousTab: null,
    setActiveTab: (tab: string) =>
      set((state) => ({
        navigation: {
          ...state.navigation,
          previousTab: state.navigation.activeTab,
          activeTab: tab,
        },
      })),
  },

  search: {
    query: '',
    isOpen: false,
    resultCount: 0,
    setQuery: (query: string) =>
      set((state) => ({ search: { ...state.search, query } })),
    setOpen: (isOpen: boolean) =>
      set((state) => ({ search: { ...state.search, isOpen } })),
    setResultCount: (resultCount: number) =>
      set((state) => ({ search: { ...state.search, resultCount } })),
    toggle: () =>
      set((state) => ({
        search: { ...state.search, isOpen: !state.search.isOpen },
      })),
  },

  preferences: {
    sidebarCollapsed: false,
    sidebarPanel: null,
    refetchInterval: 30000,
    toggleSidebar: () =>
      set((state) => ({
        preferences: {
          ...state.preferences,
          sidebarCollapsed: !state.preferences.sidebarCollapsed,
        },
      })),
    setSidebarPanel: (panel) =>
      set((state) => ({
        preferences: { ...state.preferences, sidebarPanel: panel },
      })),
    setRefetchInterval: (interval: number) =>
      set((state) => ({
        preferences: { ...state.preferences, refetchInterval: interval },
      })),
  },
}));
