/**
 * 搜索引擎工具函数集.
 *
 * 从 fullsite Dashboard.tsx / HomePage.tsx 提取的纯逻辑模块:
 *   - normalizeSearchText — 文本标准化 (去标点/统一大小写/压缩空白)
 *   - tokenizeSearchText — 分词 (整串 + 子词去重)
 *   - expandSearchAliases — 中文同义词扩展 (11 组别名表)
 *   - buildSearchIndex — 为 SearchTarget 构建可搜索索引
 *   - scoreSearchTarget — 多维相关性评分 (label/group/tab/keywords 加权)
 *   - matchesFocusQuery — 双向子串模糊匹配
 *
 * 零 React 依赖、零路由耦合，任何搜索场景可直接复用.
 */

/** 搜索目标: 可被搜索评分的实体 */
export interface SearchTarget {
  id: string;
  tab: string;
  label: string;
  group: string;
  keywords: string[];
  context?: {
    projectId?: string;
    taskQuery?: string;
    usagePathId?: string;
    gapId?: string;
    coverageDimensionId?: string;
    pageId?: string;
    featureDomainId?: string;
    draftId?: string;
    alertTab?: 'active' | 'history' | 'rules';
  };
}

/**
 * 中文同义词别名组.
 *
 * 当搜索词命中任一组内别名时，整组词都会被扩展进搜索索引，
 * 从而实现"搜'任务'也能匹配'草稿'和'待办'"的效果.
 */
export const SEARCH_ALIAS_GROUPS = [
  ['运行态势', '运行探针', '运行健康', '运行总面', '概览中心', 'overview'],
  ['日常体检', '体检', '巡检', '健康检查', 'daily ops', 'daily-health-check'],
  ['页面能力', '页面成熟度', '页面补位', '页面', 'page maturity'],
  ['能力域', '功能域', '能力地图', 'feature domain'],
  ['验证补证', '验证证据', '补证', '验证', 'verification'],
  ['家庭', '家庭生活', '家庭驾驶舱', 'family', 'family-hub'],
  ['协议', '元模型', 'model-driven', 'ecos', 'workflow', '协议工作台'],
  ['研究', '发布', 'publication', 'dossier', '研究中枢'],
  ['任务', '草稿', '待办', '行动项', 'task'],
  ['路线图', 'roadmap', '阶段', '车道'],
  ['入口', '导航', '页面分组', '功能架构'],
] as const;

/**
 * 文本标准化.
 *
 * 统一小写、去除标点符号、压缩连续空白.
 * 空值安全: 接受 undefined/string，始终返回 string.
 */
export function normalizeSearchText(value?: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[()\-_/.,:;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 分词.
 *
 * 返回 [整串, 子词...] 的去重集合.
 * 例: "任务中心" → ["任务中心", "任务", "中心"]
 */
export function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  return [...new Set([normalized, ...normalized.split(' ').filter(Boolean)])];
}

/**
 * 同义词扩展.
 *
 * 对输入词列表做分词后，检查是否命中 SEARCH_ALIAS_GROUPS 中任一组，
 * 命中则将整组别名加入结果集.
 */
export function expandSearchAliases(values: string[]): string[] {
  const seed = new Set(values.flatMap((value) => tokenizeSearchText(value)));
  if (seed.size === 0) return [];
  const seedArray = [...seed]; // 复用，避免每次迭代重新展开
  for (const aliases of SEARCH_ALIAS_GROUPS) {
    const matched = aliases.some((alias) => {
      const normalizedAlias = normalizeSearchText(alias);
      return seedArray.some((term) => term.includes(normalizedAlias) || normalizedAlias.includes(term));
    });
    if (matched) {
      aliases.forEach((alias) => {
        tokenizeSearchText(alias).forEach((token) => seed.add(token));
      });
    }
  }
  return [...seed];
}

/**
 * 为搜索目标构建可搜索索引.
 *
 * 将 label/group/tab/keywords 合并后做同义词扩展.
 */
export function buildSearchIndex(target: SearchTarget): string[] {
  return expandSearchAliases([target.label, target.group, target.tab, ...target.keywords]);
}

/**
 * 多维相关性评分.
 *
 * 评分权重:
 *   - 查询词完整匹配 label: +12
 *   - 查询词完整匹配 group: +6
 *   - 查询词完整匹配 tab: +4
 *   - 各分词项匹配 label: +8
 *   - 各分词项匹配 group: +4
 *   - 各分词项匹配索引 (含同义词): +2
 */
export function scoreSearchTarget(target: SearchTarget, query: string, queryTerms: string[]): number {
  const normalizedQuery = normalizeSearchText(query);
  const label = normalizeSearchText(target.label);
  const group = normalizeSearchText(target.group);
  const tab = normalizeSearchText(target.tab);
  const index = buildSearchIndex(target);

  let score = 0;
  if (label.includes(normalizedQuery)) score += 12;
  if (group.includes(normalizedQuery)) score += 6;
  if (tab.includes(normalizedQuery)) score += 4;

  queryTerms.forEach((term) => {
    if (!term) return;
    if (label.includes(term)) score += 8;
    else if (group.includes(term)) score += 4;
    else if (index.some((entry) => entry.includes(term) || term.includes(entry))) score += 2;
  });

  return score;
}

/**
 * 双向子串模糊匹配.
 *
 * 比单向 includes 更宽容: 任意一方包含另一方即命中.
 * 空值安全: 任一参数为空返回 false.
 */
export function matchesFocusQuery(value: string | undefined, query: string | undefined): boolean {
  if (!value || !query) return false;
  const left = value.trim().toLowerCase();
  const right = query.trim().toLowerCase();
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}
