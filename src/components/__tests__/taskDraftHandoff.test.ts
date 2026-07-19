import { describe, expect, it } from 'vitest';
import { findTaskDraftForTarget, taskDraftToIncomingDraft } from '../taskDraftHandoff';

describe('taskDraftHandoff', () => {
  it('matches generic source-lane queries so the first draft can be handed into TaskCenter', () => {
    const draft = {
      id: 'draft-page-1',
      title: '补齐页面入口',
      source: {
        type: 'system_map_page_maturity',
        id: 'Performance',
      },
      draft: {
        evidence_fields: [{ page_id: 'Performance', done_when: '页面可从首页进入' }],
      },
    };

    expect(findTaskDraftForTarget(
      { tab: 'TaskCenter', taskQuery: 'system_map_page_maturity' },
      [draft],
    )).toBe(draft);
  });

  it('keeps the matched draft source page when creating the incoming handoff', () => {
    const incoming = taskDraftToIncomingDraft({
      id: 'draft-page-1',
      title: '补齐页面入口',
      source: {
        type: 'system_map_page_maturity',
        id: 'Performance',
      },
      draft: {
        evidence_fields: [{ page_id: 'Performance', done_when: '页面可从首页进入' }],
      },
    });

    expect(incoming?.sourceTarget).toEqual({
      tab: 'Performance',
      pageId: 'Performance',
    });
    expect(incoming?.checklist).toEqual(['Performance：页面可从首页进入']);
  });
});
