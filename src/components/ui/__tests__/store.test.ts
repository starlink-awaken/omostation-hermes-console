import { describe, expect, it, beforeEach } from 'vitest';
import { useCockpitStore } from '../../../store';

/**
 * Capture the initial store state once at module load. This preserves the
 * action functions (login, add, …) that live inside the nested slices — a
 * plain setState with plain objects would drop them.
 */
const initialState = useCockpitStore.getState();

/**
 * Reset store state between tests so each test starts from the defaults.
 * Zustand stores are singletons — without resetting, state leaks across tests.
 */
function resetStore() {
  useCockpitStore.setState(initialState, true);
}

describe('CockpitStore — user slice', () => {
  beforeEach(resetStore);

  it('has sensible defaults', () => {
    const { name, role, isAuthenticated } = useCockpitStore.getState().user;
    expect(name).toBe('管理员');
    expect(role).toBe('admin');
    expect(isAuthenticated).toBe(true);
  });

  it('login updates user fields and sets authenticated', () => {
    useCockpitStore.getState().user.login('Alice', 'operator', 'AL');
    const { name, role, avatar, isAuthenticated } = useCockpitStore.getState().user;
    expect(name).toBe('Alice');
    expect(role).toBe('operator');
    expect(avatar).toBe('AL');
    expect(isAuthenticated).toBe(true);
  });

  it('logout sets isAuthenticated to false but preserves profile', () => {
    useCockpitStore.getState().user.login('Alice', 'operator', 'AL');
    useCockpitStore.getState().user.logout();
    const { name, isAuthenticated } = useCockpitStore.getState().user;
    expect(name).toBe('Alice');
    expect(isAuthenticated).toBe(false);
  });

  it('updatePreferences merges partial prefs', () => {
    useCockpitStore.getState().user.updatePreferences({ theme: 'light' });
    const { preferences } = useCockpitStore.getState().user;
    expect(preferences.theme).toBe('light');
    expect(preferences.language).toBe('zh-CN'); // unchanged
  });
});

describe('CockpitStore — notifications slice', () => {
  beforeEach(resetStore);

  it('starts with zero items', () => {
    const { items, unreadCount } = useCockpitStore.getState().notifications;
    expect(items).toHaveLength(0);
    expect(unreadCount).toBe(0);
  });

  it('add creates an unread notification with generated id', () => {
    useCockpitStore.getState().notifications.add({ title: '告警', message: 'CPU 过高' });
    const { items, unreadCount } = useCockpitStore.getState().notifications;
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('告警');
    expect(items[0].read).toBe(false);
    expect(items[0].id).toMatch(/^notif-/);
    expect(unreadCount).toBe(1);
  });

  it('markRead flips a single item to read', () => {
    useCockpitStore.getState().notifications.add({ title: 'A', message: 'm' });
    const id = useCockpitStore.getState().notifications.items[0].id;
    useCockpitStore.getState().notifications.markRead(id);
    const { items, unreadCount } = useCockpitStore.getState().notifications;
    expect(items[0].read).toBe(true);
    expect(unreadCount).toBe(0);
  });

  it('markAllRead flips every item', () => {
    useCockpitStore.getState().notifications.add({ title: 'A', message: 'm' });
    useCockpitStore.getState().notifications.add({ title: 'B', message: 'm' });
    useCockpitStore.getState().notifications.markAllRead();
    const { items, unreadCount } = useCockpitStore.getState().notifications;
    expect(items.every((n) => n.read)).toBe(true);
    expect(unreadCount).toBe(0);
  });

  it('remove deletes a notification by id', () => {
    useCockpitStore.getState().notifications.add({ title: 'A', message: 'm' });
    const id = useCockpitStore.getState().notifications.items[0].id;
    useCockpitStore.getState().notifications.remove(id);
    expect(useCockpitStore.getState().notifications.items).toHaveLength(0);
  });

  it('caps items at 50', () => {
    for (let i = 0; i < 55; i++) {
      useCockpitStore.getState().notifications.add({ title: `t${i}`, message: 'm' });
    }
    expect(useCockpitStore.getState().notifications.items.length).toBeLessThanOrEqual(50);
  });
});
