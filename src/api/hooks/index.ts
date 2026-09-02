/**
 * React Query hooks for cockpit-ui.
 *
 * Barrel re-export — all hooks are split into domain files under src/api/hooks/.
 * Import from '@/api/hooks' as before; no caller changes needed.
 */

export * from './system';
export * from './tasks';
export * from './kems';
export * from './research';
export * from './knowledge';
export * from './governance';
export * from './observability';
export * from './workbench';
export * from './gbrain';
export * from './swarm';
export * from './home';
// factory and domains are not barrel-exported to avoid naming conflicts
// Import directly: import { createResourceHooks } from '@/api/hooks/factory';
// import { TaskHooks, useHarnessCompliance } from '@/api/hooks/domains';
