import React from 'react';
import { BookOpen, Bot, GitBranch } from 'lucide-react';
import { formatPriority, formatTaskStatus } from './KnowledgeExecutionWorkbenchConfig';
import type { SkillItem, WorkflowDefinition, SystemMapLite, TaskItem, WorkflowRecord } from './KnowledgeExecutionWorkbenchTypes';

interface KnowledgeExecutionPanelsProps {
  systemMap: SystemMapLite;
  skills: SkillItem[];
  workflowDefinitions: WorkflowDefinition[];
  tasks: TaskItem[];
  workflows: WorkflowRecord[];
  workflowTotal: number;
  summary: {
    usagePath?: SystemMapLite['usage_paths'] extends Array<infer T> ? T : never;
    playbook?: SystemMapLite['playbooks'] extends Array<infer T> ? T : never;
    gap?: SystemMapLite['gaps'] extends Array<infer T> ? T : never;
    latestWorkflow?: WorkflowRecord;
    latestTask?: TaskItem;
    roadmapItem?: SystemMapLite['roadmap'] extends { items?: Array<infer T> } ? T : never;
  };
  onOpenTarget: (tab: string, taskQuery?: string) => void;
}

export function KnowledgeExecutionPanels({
  systemMap,
  skills,
  workflowDefinitions,
  tasks,
  workflows,
  workflowTotal,
  summary,
  onOpenTarget,
}: KnowledgeExecutionPanelsProps) {
  return (
    <div className="knowledge-execution-grid">
      <div className="knowledge-execution-panel">
        <div className="knowledge-execution-panel-head">
          <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={16} />
            知识入口
          </strong>
          <small>{systemMap.usage_paths?.length || 0} 条使用路径</small>
        </div>
        <div className="knowledge-execution-list">
          {summary.usagePath ? (
            <button
              type="button"
              className="knowledge-execution-item"
              onClick={() => onOpenTarget('Knowledge', summary.usagePath?.id || summary.usagePath?.title)}
            >
              <strong>{summary.usagePath.title || '未命名路径'}</strong>
              <span>{summary.usagePath.intent || '先回到知识中枢确认这条路径的目标。'}</span>
              <small>步骤 {(summary.usagePath.steps || []).length}</small>
            </button>
          ) : (
            <div className="knowledge-execution-item knowledge-execution-empty">
              <strong>还没有高频路径</strong>
              <span>建议先把日常巡检、专项修复和复盘链路整理成可复用路径。</span>
            </div>
          )}
          {summary.playbook && (
            <button
              type="button"
              className="knowledge-execution-item"
              onClick={() => onOpenTarget('TaskCenter', summary.playbook?.id || summary.playbook?.title)}
            >
              <strong>{summary.playbook.title || '操作清单'}</strong>
              <span>{summary.playbook.goal || '把知识页里的清单转成任务草稿。'}</span>
              <small>{summary.playbook.frequency || '按需执行'}</small>
            </button>
          )}
          {summary.gap && (
            <button
              type="button"
              className="knowledge-execution-item"
              onClick={() => onOpenTarget('Knowledge', summary.gap?.id || summary.gap?.title)}
            >
              <strong>{summary.gap.title || '能力缺口'}</strong>
              <span>{summary.gap.next || '回知识中枢梳理缺口。'}</span>
              <small>{summary.gap.severity || '未标记'}</small>
            </button>
          )}
        </div>
      </div>

      <div className="knowledge-execution-panel">
        <div className="knowledge-execution-panel-head">
          <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={16} />
            能力与自动化
          </strong>
          <small>技能 {skills.length} · 工作流 {workflowDefinitions.length}</small>
        </div>
        <div className="knowledge-execution-list">
          {skills.slice(0, 2).map((skill) => (
            <button
              key={skill.id}
              type="button"
              className="knowledge-execution-item"
              onClick={() => onOpenTarget('Assets', skill.id)}
            >
              <strong>{skill.name || skill.id}</strong>
              <span>去资产页看这个能力适合挂在哪条执行路径上。</span>
              <small>技能资产</small>
            </button>
          ))}
          {workflowDefinitions.slice(0, 1).map((workflow) => (
            <button
              key={workflow.name}
              type="button"
              className="knowledge-execution-item"
              onClick={() => onOpenTarget('Workflows', workflow.name)}
            >
              <strong>{workflow.name || '自动化工作流'}</strong>
              <span>{workflow.description || '查看这个工作流的节点编排与回放结果。'}</span>
              <small>{workflow.steps || 0} 个节点</small>
            </button>
          ))}
          {!skills.length && !workflowDefinitions.length && (
            <div className="knowledge-execution-item knowledge-execution-empty">
              <strong>能力面还偏薄</strong>
              <span>建议优先给高频路径补技能说明、管线入口和工作流测试按钮。</span>
            </div>
          )}
        </div>
      </div>

      <div className="knowledge-execution-panel">
        <div className="knowledge-execution-panel-head">
          <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitBranch size={16} />
            执行与落地
          </strong>
          <small>任务 {tasks.length} · 编排历史 {workflows.length}/{workflowTotal}</small>
        </div>
        <div className="knowledge-execution-list">
          {summary.latestWorkflow && (
            <button
              type="button"
              className="knowledge-execution-item"
              onClick={() => onOpenTarget('Workflows', summary.latestWorkflow?.id)}
            >
              <strong>{summary.latestWorkflow.task || summary.latestWorkflow.id}</strong>
              <span>最新工作流状态：{summary.latestWorkflow.status || '未知'}。</span>
              <small>{summary.latestWorkflow.updated || '刚刚更新'}</small>
            </button>
          )}
          {summary.latestTask && (
            <button
              type="button"
              className="knowledge-execution-item"
              onClick={() => onOpenTarget('TaskCenter', summary.latestTask?.id)}
            >
              <strong>{summary.latestTask.title || summary.latestTask.id}</strong>
              <span>
                {formatTaskStatus(summary.latestTask.status)} · {formatPriority(summary.latestTask.priority)}
                {summary.latestTask.read_only ? ' · 只读草稿' : ''}
              </span>
              <small>{summary.latestTask.source?.title || summary.latestTask.source?.type || '任务池'}</small>
            </button>
          )}
          {summary.roadmapItem && (
            <button
              type="button"
              className="knowledge-execution-item"
              onClick={() => onOpenTarget('SystemMap', summary.roadmapItem?.id || summary.roadmapItem?.title)}
            >
              <strong>{summary.roadmapItem.title || '路线图项'}</strong>
              <span>{summary.roadmapItem.problem || '回系统地图看这条能力补齐路线。'}</span>
              <small>{summary.roadmapItem.priority || '未标优先级'}</small>
            </button>
          )}
          {!summary.latestWorkflow && !summary.latestTask && (
            <div className="knowledge-execution-item knowledge-execution-empty">
              <strong>还没有闭环证据</strong>
              <span>先产出一条从知识页出发、落到任务中心的完整执行样本。</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
