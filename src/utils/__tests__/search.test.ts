import { describe, it, expect } from 'vitest';
import {
  normalizeSearchText,
  tokenizeSearchText,
  expandSearchAliases,
  buildSearchIndex,
  scoreSearchTarget,
  matchesFocusQuery,
  SEARCH_ALIAS_GROUPS,
} from '../search';
import type { SearchTarget } from '../search';

describe('normalizeSearchText', () => {
  it('统一小写并去除标点', () => {
    expect(normalizeSearchText('Hello-World_123')).toBe('hello world 123');
  });

  it('压缩连续空白', () => {
    expect(normalizeSearchText('  a   b   c  ')).toBe('a b c');
  });

  it('空值安全', () => {
    expect(normalizeSearchText()).toBe('');
    expect(normalizeSearchText('')).toBe('');
    expect(normalizeSearchText(undefined)).toBe('');
  });
});

describe('tokenizeSearchText', () => {
  it('中文无空格时返回整串', () => {
    const tokens = tokenizeSearchText('任务中心');
    expect(tokens).toContain('任务中心');
    // 中文无空格分隔，split(' ') 不会拆出子词
    expect(tokens.length).toBe(1);
  });

  it('英文按空格分词并去重', () => {
    const tokens = tokenizeSearchText('hello world hello');
    // 返回 [整串, ...子词去重]: ['hello world hello', 'hello', 'world']
    expect(tokens).toContain('hello world hello');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
    expect(tokens.length).toBe(3);
  });

  it('空输入返回空数组', () => {
    expect(tokenizeSearchText('')).toEqual([]);
  });
});

describe('expandSearchAliases', () => {
  it('命中同义词组时扩展', () => {
    const result = expandSearchAliases(['任务']);
    expect(result).toContain('任务');
    expect(result).toContain('草稿');
    expect(result).toContain('待办');
    expect(result).toContain('行动项');
  });

  it('未命中时只返回自身分词', () => {
    const result = expandSearchAliases(['xyzabc']);
    expect(result).toContain('xyzabc');
  });

  it('空输入返回空数组', () => {
    expect(expandSearchAliases([])).toEqual([]);
  });
});

describe('SEARCH_ALIAS_GROUPS', () => {
  it('包含 11 组同义词', () => {
    expect(SEARCH_ALIAS_GROUPS.length).toBe(11);
  });

  it('每组至少 2 个别名', () => {
    SEARCH_ALIAS_GROUPS.forEach((group) => {
      expect(group.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('buildSearchIndex', () => {
  it('合并 label/group/tab/keywords 并扩展同义词', () => {
    const target: SearchTarget = {
      id: 'test',
      tab: 'TaskCenter',
      label: '任务中心',
      group: '开发工具',
      keywords: ['todo'],
    };
    const index = buildSearchIndex(target);
    expect(index).toContain('任务中心');
    expect(index).toContain('开发工具');
    expect(index).toContain('taskcenter');
    // 同义词扩展: '任务' 命中 → 加入 '草稿' '待办'
    expect(index).toContain('草稿');
    expect(index).toContain('待办');
  });
});

describe('scoreSearchTarget', () => {
  const target: SearchTarget = {
    id: 'test',
    tab: 'TaskCenter',
    label: '任务中心',
    group: '开发工具',
    keywords: ['task', 'todo'],
  };

  it('label 完全匹配得分最高', () => {
    const score = scoreSearchTarget(target, '任务中心', ['任务', '中心']);
    expect(score).toBeGreaterThan(12);
  });

  it('group 匹配有中等得分', () => {
    const score = scoreSearchTarget(target, '开发工具', ['开发', '工具']);
    expect(score).toBeGreaterThanOrEqual(6);
  });

  it('完全匹配得分高于部分匹配', () => {
    const exact = scoreSearchTarget(target, '任务中心', ['任务中心']);
    const partial = scoreSearchTarget(target, '工具', ['工具']); // 只匹配 group 的子串
    expect(exact).toBeGreaterThan(partial);
  });

  it('不匹配时得分为 0', () => {
    const none = scoreSearchTarget(target, 'xyz', ['xyz']);
    expect(none).toBe(0);
  });
});

describe('matchesFocusQuery', () => {
  it('双向匹配', () => {
    expect(matchesFocusQuery('任务中心', '任务')).toBe(true);
    expect(matchesFocusQuery('任务', '任务中心')).toBe(true);
  });

  it('大小写不敏感', () => {
    expect(matchesFocusQuery('Hello', 'hello')).toBe(true);
  });

  it('空值安全', () => {
    expect(matchesFocusQuery('', 'test')).toBe(false);
    expect(matchesFocusQuery('test', '')).toBe(false);
    expect(matchesFocusQuery(undefined, 'test')).toBe(false);
    expect(matchesFocusQuery('test', undefined)).toBe(false);
  });

  it('不匹配返回 false', () => {
    expect(matchesFocusQuery('abc', 'xyz')).toBe(false);
  });
});
