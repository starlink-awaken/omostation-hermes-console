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
  /** Navigation history stack */
  history: string[];
  /** Navigate to a new tab */
  setActiveTab: (tab: string) => void;
  /** Go back to previous tab */
  goBack: () => void;
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

// ── User State ──

export interface UserPreferences {
  theme: 'dark' | 'light';
  language: string;
  timezone: string;
}

export interface UserState {
  name: string;
  role: string;
  avatar: string;
  isAuthenticated: boolean;
  preferences: UserPreferences;
  login: (name: string, role: string, avatar: string) => void;
  logout: () => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}

// ── Notifications State ──

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface NotificationsState {
  unreadCount: number;
  items: NotificationItem[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  add: (item: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>) => void;
  remove: (id: string) => void;
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
  user: UserState;
  notifications: NotificationsState;
  preferences: DashboardPreferences;
}

export const useCockpitStore = create<CockpitStore>((set) => ({
  navigation: {
    activeTab: 'Home',
    previousTab: null,
    history: [],
    setActiveTab: (tab: string) =>
      set((state) => ({
        navigation: {
          ...state.navigation,
          previousTab: state.navigation.activeTab,
          activeTab: tab,
          history: [...state.navigation.history, state.navigation.activeTab].slice(-20),
        },
      })),
    goBack: () =>
      set((state) => {
        const hist = state.navigation.history;
        if (hist.length === 0) return {};
        const prev = hist[hist.length - 1];
        return {
          navigation: {
            ...state.navigation,
            previousTab: state.navigation.activeTab,
            activeTab: prev,
            history: hist.slice(0, -1),
          },
        };
      }),
  },

  user: {
    name: '管理员',
    role: 'admin',
    avatar: 'AD',
    isAuthenticated: true,
    preferences: { theme: 'dark', language: 'zh-CN', timezone: 'Asia/Shanghai' },
    login: (name: string, role: string, avatar: string) =>
      set((state) => ({
        user: { ...state.user, name, role, avatar, isAuthenticated: true },
      })),
    logout: () =>
      set((state) => ({
        user: { ...state.user, isAuthenticated: false },
      })),
    updatePreferences: (prefs: Partial<UserPreferences>) =>
      set((state) => ({
        user: { ...state.user, preferences: { ...state.user.preferences, ...prefs } },
      })),
  },

  notifications: {
    unreadCount: 0,
    items: [],
    markRead: (id: string) =>
      set((state) => {
        const items = state.notifications.items.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        );
        return { notifications: { ...state.notifications, items, unreadCount: items.filter((n) => !n.read).length } };
      }),
    markAllRead: () =>
      set((state) => {
        const items = state.notifications.items.map((n) => ({ ...n, read: true }));
        return { notifications: { ...state.notifications, items, unreadCount: 0 } };
      }),
    add: (item: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>) =>
      set((state) => {
        const newItem: NotificationItem = {
          ...item,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          read: false,
          createdAt: Date.now(),
        };
        const items = [newItem, ...state.notifications.items].slice(0, 50);
        return { notifications: { ...state.notifications, items, unreadCount: items.filter((n) => !n.read).length } };
      }),
    remove: (id: string) =>
      set((state) => {
        const items = state.notifications.items.filter((n) => n.id !== id);
        return { notifications: { ...state.notifications, items, unreadCount: items.filter((n) => !n.read).length } };
      }),
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
