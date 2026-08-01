/**
 * 系统地图领域计算层.
 *
 * 从 fullsite HomePage.tsx 提取的纯计算函数:
 *   - buildPageGroups — 页面元数据按分组排序
 *   - buildArchitectureLaneSummaries — 架构车道汇总 (页面/路径/能力域/关注)
 *   - buildSiteClosureRows — 页面闭环缺口行 (缺失/已链接项)
 *   - buildDimensionCoverageRows — 维度覆盖带行 (分组聚合)
 *
 * 纯数据转换逻辑，输入原始 API 数据，输出视图可直接渲染的行/聚合.
 */

import { COCKPIT_PAGE_REGISTRY } from '../components/cockpitPageRegistry';
import type {
  CockpitPageMeta,
  FeatureDomain,
  UsagePath,
  OperatingPlaybook,
  DraftTaskSummary,
  PageGroupSummary,
  ArchitectureLaneSummary,
  SiteClosureRow,
  NavigationCoverageRow,
  DimensionCoverageBandRow,
} from '../types/cockpit';
import { normalizeSearchText } from '../utils/search';

/** 页面分组排序优先级 */
export const PAGE_GROUP_ORDER = ['入口', '运行大盘', '智能与知识', '系统治理', '开发工具', '领域应用', '系统配置'];

// ─── 页面分组 ───

/**
 * 按分组字段对页面元数据分组并排序.
 *
 * 排序规则: PAGE_GROUP_ORDER 中靠前的分组优先，未定义分组排最后.
 */
export function buildPageGroups(pages: CockpitPageMeta[]): PageGroupSummary[] {
  const grouped = new Map<string, CockpitPageMeta[]>();
  pages.forEach((page) => {
    const group = page.group || '未分组';
    const existing = grouped.get(group) || [];
    existing.push(page);
    grouped.set(group, existing);
  });
  return [...grouped.entries()]
    .map(([group, items]) => ({ group, count: items.length, pages: items }))
    .sort((left, right) => {
      const leftIndex = PAGE_GROUP_ORDER.indexOf(left.group);
      const rightIndex = PAGE_GROUP_ORDER.indexOf(right.group);
      return (leftIndex === -1 ? PAGE_GROUP_ORDER.length : leftIndex)
        - (rightIndex === -1 ? PAGE_GROUP_ORDER.length : rightIndex);
    });
}

// ─── 架构车道 ───

/** 架构车道汇总输入 */
export interface ArchitectureLaneInput {
  cockpitPages: CockpitPageMeta[];
  featureDomains: FeatureDomain[];
  usagePaths: UsagePath[];
  roadmapItems: Array<{ cockpit_page?: string; problem?: string; title?: string; status?: string }>;
  draftItems: DraftTaskSummary[];
  domainAttentionItems: Array<{ id?: string; name?: string; next_action?: string }>;
}

/**
 * 计算每个分道的汇总数据.
 *
 * 对每个页面分组，统计:
 *   - pageCount: 页面数
 *   - usageCount: 关联使用路径数
 *   - domainCount: 关联能力域数
 *   - attentionCount: 关注项计数 (草稿 + 路线图 + 域关注)
 *   - nextAction: 下一步行动建议
 *   - objectTarget/taskTarget: 导航目标
 */
export function buildArchitectureLaneSummaries(input: ArchitectureLaneInput): ArchitectureLaneSummary[] {
  const groupPages = new Map<string, Map<string, string>>();

  const registerGroupPage = (group?: string, pageId?: string, pageTitle?: string) => {
    if (!group || !pageId) return;
    const existing = groupPages.get(group) || new Map<string, string>();
    existing.set(pageId, pageTitle || pageId);
    groupPages.set(group, existing);
  };

  input.cockpitPages.forEach((page) => registerGroupPage(page.group, page.id, page.title));
  input.usagePaths.forEach((path) => {
    (path.pages || []).forEach((page) => registerGroupPage(page.group, page.id, page.title));
  });

  return [...groupPages.entries()]
    .sort((left, right) => {
      const leftIndex = PAGE_GROUP_ORDER.indexOf(left[0]);
      const rightIndex = PAGE_GROUP_ORDER.indexOf(right[0]);
      return (leftIndex === -1 ? PAGE_GROUP_ORDER.length : leftIndex)
        - (rightIndex === -1 ? PAGE_GROUP_ORDER.length : rightIndex);
    })
    .map(([group, pages]) => {
      const pageIds = [...pages.keys()];
      const matchingUsagePaths = input.usagePaths.filter((path) =>
        (path.pages || []).some((page) => page.id && pageIds.includes(page.id)),
      );
      const matchingDomains = input.featureDomains.filter((domain) =>
        (domain.cockpit_page && pageIds.includes(domain.cockpit_page))
        || (domain.providers || []).some((provider) => pageIds.includes(provider)),
      );
      const matchingRoadmapItems = input.roadmapItems.filter((item) =>
        item.cockpit_page && pageIds.includes(item.cockpit_page) && item.status !== 'shipped',
      );
      const pageDrafts = input.draftItems.filter((item) =>
        item.read_only === true
        && item.source?.type === 'system_map_page_maturity'
        && item.source.id
        && pageIds.includes(item.source.id),
      );
      const laneAttentionCount = pageDrafts.length
        + matchingRoadmapItems.length
        + (group === '领域应用' ? input.domainAttentionItems.length : 0);
      const primaryPageDraft = pageDrafts[0];
      const primaryRoadmap = matchingRoadmapItems[0];
      const primaryDomainAttention = group === '领域应用' ? input.domainAttentionItems[0] : null;
      const primaryPageId = primaryPageDraft?.source?.id || primaryRoadmap?.cockpit_page || pageIds[0] || null;
      const nextAction = primaryPageDraft?.description
        || primaryRoadmap?.problem
        || primaryDomainAttention?.next_action
        || `先回 ${group} 这条工作带确认页面、路径和能力域是否都挂上了。`;

      return {
        id: group,
        title: group,
        pageCount: pageIds.length,
        usageCount: matchingUsagePaths.length,
        domainCount: matchingDomains.length,
        attentionCount: laneAttentionCount,
        nextAction,
        objectTarget: primaryDomainAttention
          ? { tab: 'DomainApps', taskQuery: primaryDomainAttention.id || primaryDomainAttention.name || 'domain' }
          : primaryPageId
            ? { tab: 'SystemMap', pageId: primaryPageId }
            : { tab: 'SystemMap' },
        taskTarget: primaryDomainAttention
          ? { tab: 'TaskCenter', taskQuery: primaryDomainAttention.id || primaryDomainAttention.name || 'domain' }
          : primaryPageId
            ? { tab: 'TaskCenter', taskQuery: primaryPageId }
            : { tab: 'TaskCenter', taskQuery: group },
      };
    });
}

// ─── 闭环缺口 ───

/** 草稿 → 页面匹配 (用于闭环检测) */
export function draftMatchesPage(draft: DraftTaskSummary, pageId: string, pageTitle: string): boolean {
  if (draft.source?.id === pageId) return true;
  const normalizedPageId = normalizeSearchText(pageId);
  const normalizedPageTitle = normalizeSearchText(pageTitle);
  const draftTitle = normalizeSearchText(draft.title);
  const draftDescription = normalizeSearchText(draft.description);
  const draftSourceTitle = normalizeSearchText(draft.source?.title);
  return [draftTitle, draftDescription, draftSourceTitle].some((value) =>
    Boolean(value) && (
      value.includes(normalizedPageId)
      || value.includes(normalizedPageTitle)
      || normalizedPageTitle.includes(value)
    ),
  );
}

/** 闭环行输入 */
export interface SiteClosureInput {
  cockpitPages: CockpitPageMeta[];
  featureDomains: FeatureDomain[];
  usagePaths: UsagePath[];
  playbooks: OperatingPlaybook[];
  roadmapItems: Array<{ cockpit_page?: string; status?: string }>;
  draftItems: DraftTaskSummary[];
}

/**
 * 计算每个页面的闭环缺口.
 *
 * 检查每个页面在 5 个维度的覆盖情况:
 *   路径 / 能力域 / 操作清单 / 路线图 / 任务
 *
 * 返回按缺失项数量降序排列的行.
 */
export function buildSiteClosureRows(input: SiteClosureInput): SiteClosureRow[] {
  const pageIds = new Set<string>();
  input.cockpitPages.forEach((page) => page.id && pageIds.add(page.id));
  input.usagePaths.forEach((path) => (path.pages || []).forEach((page) => page.id && pageIds.add(page.id)));
  input.playbooks.forEach((playbook) => (playbook.steps || []).forEach((step) => {
    const pageId = step.page_id || step.page?.id;
    if (pageId) pageIds.add(pageId);
  }));
  input.featureDomains.forEach((domain) => {
    if (domain.cockpit_page) pageIds.add(domain.cockpit_page);
    (domain.providers || []).forEach((provider) => provider && pageIds.add(provider));
  });
  input.roadmapItems.forEach((item) => item.cockpit_page && pageIds.add(item.cockpit_page));

  return [...pageIds]
    .map((pageId) => {
      const pageMeta = input.cockpitPages.find((page) => page.id === pageId);
      const pageTitle = pageMeta?.title || pageId;
      const hasPath = input.usagePaths.some((path) => path.pages?.some((page) => page.id === pageId));
      const matchedDomains = input.featureDomains.filter(
        (domain) => domain.cockpit_page === pageId || domain.providers?.includes(pageId),
      );
      const matchedPlaybooks = input.playbooks.filter((playbook) =>
        (playbook.steps || []).some((step) => (step.page_id || step.page?.id) === pageId),
      );
      const matchedRoadmapItems = input.roadmapItems.filter(
        (item) => item.cockpit_page === pageId && item.status !== 'shipped',
      );
      const matchedDraft = input.draftItems.find((draft) => draftMatchesPage(draft, pageId, pageTitle)) || null;

      const missingItems: string[] = [];
      const linkedItems: string[] = [];
      if (hasPath) linkedItems.push('路径'); else missingItems.push('路径');
      if (matchedDomains.length > 0) linkedItems.push('能力域'); else missingItems.push('能力域');
      if (matchedPlaybooks.length > 0) linkedItems.push('操作清单'); else missingItems.push('操作清单');
      if (matchedRoadmapItems.length > 0) linkedItems.push('路线图'); else missingItems.push('路线图');
      if (matchedDraft) linkedItems.push('任务'); else missingItems.push('任务');

      const nextAction = !hasPath
        ? '先把页面挂进使用路径。'
        : matchedDomains.length === 0
          ? '补能力域映射。'
          : matchedPlaybooks.length === 0
            ? '补操作清单入口。'
            : matchedRoadmapItems.length === 0
              ? '补路线图条目。'
              : !matchedDraft
                ? '补任务草稿。'
                : '继续把页面闭环做实。';

      return {
        id: `site-closure-${pageId}`,
        pageId,
        title: pageTitle,
        group: pageMeta?.group || '未分组',
        missingItems,
        linkedItems,
        nextAction,
        objectTarget: { tab: 'SystemMap', pageId },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedDraft?.source?.id || pageId },
      };
    })
    .sort((left, right) => {
      const missingDelta = right.missingItems.length - left.missingItems.length;
      if (missingDelta !== 0) return missingDelta;
      return left.title.localeCompare(right.title, 'zh-CN');
    });
}

// ─── 导航覆盖 ───

/** 导航覆盖行输入 */
export interface NavigationCoverageInput {
  cockpitPages: CockpitPageMeta[];
  usagePaths: UsagePath[];
  playbooks: OperatingPlaybook[];
  draftItems: DraftTaskSummary[];
}

/**
 * 计算每个注册页面的导航覆盖情况.
 *
 * 基于 COCKPIT_PAGE_REGISTRY (全站页面注册)，检查:
 *   地图登记 / 使用路径 / 操作清单 / 任务承接
 *
 * 返回按缺失项数量降序排列的行.
 */
export function buildNavigationCoverageRows(input: NavigationCoverageInput): NavigationCoverageRow[] {
  const registeredPageIds = new Set(input.cockpitPages.map((page) => page.id));

  return COCKPIT_PAGE_REGISTRY.map((page) => {
    const hasUsagePath = input.usagePaths.some((path) => path.pages?.some((item) => item.id === page.id));
    const hasPlaybook = input.playbooks.some((playbook) =>
      (playbook.steps || []).some((step) => (step.page_id || step.page?.id) === page.id),
    );
    const matchedDraft = input.draftItems.find((draft) => draftMatchesPage(draft, page.id, page.title)) || null;
    const missingItems: string[] = [];

    if (!registeredPageIds.has(page.id)) missingItems.push('地图登记');
    if (!hasUsagePath) missingItems.push('使用路径');
    if (!hasPlaybook) missingItems.push('操作清单');
    if (!matchedDraft) missingItems.push('任务承接');

    const nextAction = !registeredPageIds.has(page.id)
      ? '先把这个页面登记进系统地图和站内治理视图。'
      : !hasUsagePath
        ? '补一条使用路径，说明这个页面什么时候进、解决什么问题。'
        : !hasPlaybook
          ? '补操作清单步骤，让页面进入稳定日用闭环。'
          : !matchedDraft
            ? '补一个只读任务草稿，给页面留明确承接入口。'
            : '继续把页面承接链条做细。';

    return {
      id: `nav-coverage-${page.id}`,
      pageId: page.id,
      title: page.title,
      group: page.group,
      purpose: page.purpose || '',
      registeredInSystemMap: registeredPageIds.has(page.id),
      hasUsagePath,
      hasPlaybook,
      hasTaskDraft: Boolean(matchedDraft),
      missingItems,
      nextAction,
      objectTarget: { tab: page.id, pageId: page.id },
      taskTarget: { tab: 'TaskCenter', taskQuery: matchedDraft?.source?.id || page.id },
    };
  }).sort((left, right) => {
    const missingDelta = right.missingItems.length - left.missingItems.length;
    if (missingDelta !== 0) return missingDelta;
    return left.title.localeCompare(right.title, 'zh-CN');
  });
}

// ─── 维度覆盖 ───

/** 维度覆盖输入 */
export interface DimensionCoverageInput {
  rows: NavigationCoverageRow[];
  featureDomains: FeatureDomain[];
}

/**
 * 将导航覆盖行聚合为维度覆盖带.
 *
 * 按分组聚合，计算每组的覆盖率分数和缺失维度统计.
 */
export function buildDimensionCoverageRows(input: DimensionCoverageInput): DimensionCoverageBandRow[] {
  const grouped = new Map<string, NavigationCoverageRow[]>();
  input.rows.forEach((row) => {
    const group = row.group || '未分组';
    const existing = grouped.get(group) || [];
    existing.push(row);
    grouped.set(group, existing);
  });

  return [...grouped.entries()]
    .sort((left, right) => {
      const leftIndex = PAGE_GROUP_ORDER.indexOf(left[0]);
      const rightIndex = PAGE_GROUP_ORDER.indexOf(right[0]);
      return (leftIndex === -1 ? PAGE_GROUP_ORDER.length : leftIndex)
        - (rightIndex === -1 ? PAGE_GROUP_ORDER.length : rightIndex);
    })
    .map(([group, rows]) => {
      const totalPages = rows.length;
      const registeredCount = rows.filter((r) => r.registeredInSystemMap).length;
      const usageCount = rows.filter((r) => r.hasUsagePath).length;
      const playbookCount = rows.filter((r) => r.hasPlaybook).length;
      const taskCount = rows.filter((r) => r.hasTaskDraft).length;
      const domainCount = input.featureDomains.filter(
        (domain) => domain.cockpit_page && rows.some((r) => r.pageId === domain.cockpit_page),
      ).length;
      const attentionCount = rows.filter((r) => r.missingItems.length > 0).length;

      // 覆盖率分数 (加权平均)
      const coverageScore = totalPages > 0
        ? Math.round(
          ((registeredCount / totalPages) * 30
            + (usageCount / totalPages) * 25
            + (playbookCount / totalPages) * 20
            + (domainCount / Math.max(totalPages, 1)) * 15
            + (taskCount / totalPages) * 10),
        )
        : 0;

      // 缺失维度统计
      const missingDimensionCounts: { label: string; count: number }[] = [];
      const dimensionLabels = ['地图登记', '使用路径', '操作清单', '任务承接'];
      dimensionLabels.forEach((label) => {
        const count = rows.filter((r) => r.missingItems.includes(label)).length;
        if (count > 0) missingDimensionCounts.push({ label, count });
      });

      const nextAction = coverageScore < 50
        ? `${group} 覆盖率不足，优先补地图登记和使用路径。`
        : coverageScore < 80
          ? `${group} 覆盖率中等，补操作清单和任务承接。`
          : `${group} 覆盖率良好，继续精细化。`;

      return {
        id: `dimension-${group}`,
        group,
        coverageScore,
        pageCount: totalPages,
        registeredCount,
        usageCount,
        playbookCount,
        domainCount,
        taskCount,
        attentionCount,
        missingDimensionCounts,
        nextAction,
        objectTarget: { tab: 'SystemMap' },
        taskTarget: { tab: 'TaskCenter', taskQuery: group },
      };
    });
}
