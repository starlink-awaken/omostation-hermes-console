/**
 * Utils barrel export.
 *
 * 统一出口，避免各文件散落 import.
 *   import { normalizeSearchText, scoreSearchTarget } from '@/utils';
 *   import { normalizeStatus, coverageTone } from '@/utils';
 */

// 搜索引擎
export {
  normalizeSearchText,
  tokenizeSearchText,
  expandSearchAliases,
  buildSearchIndex,
  scoreSearchTarget,
  matchesFocusQuery,
  SEARCH_ALIAS_GROUPS,
} from './search';
export type { SearchTarget } from './search';

// 状态归一化
export {
  normalizeStatus,
  badgeClass,
  statusText,
  summaryStatusText,
  focusStatusText,
  maturityStatusText,
  portfolioStatusText,
  coverageTone,
  actionLoadTone,
} from './status';
export type { ActionLoadCounters } from './status';

// 导航映射
export {
  draftTarget,
  playbookTarget,
  usagePathTarget,
  sourceTypeDefaultTarget,
} from './navigation';
export type { FocusActionDraft, UsagePath, OperatingPlaybook } from './navigation';

// 任务工具
export {
  sourceTypeLabel,
  sourceTypeDescription,
  sourceTypeHint,
  sourceTypeSearchKeyword,
  sourceActionLabel,
  sourceCompletionHint,
  taskOriginLabel,
  canRunControlledVerification,
  formatTime,
  DRAFT_SOURCE_ORDER,
  isDraftSourceType,
} from './taskUtils';
