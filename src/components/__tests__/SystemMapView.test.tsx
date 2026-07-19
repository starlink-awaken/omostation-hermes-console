import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import SystemMapView from '../SystemMapView'

const SYSTEM_MAP_DRAFT_TASKS_URL = '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80'

const sourceRef = {
  source_key: 'system_map_api',
  label: '路线图定义',
  path: '/Users/xiamingxing/Workspace/projects/cockpit/src/cockpit/web/api_system_map.py',
  line: 512,
  exists: true,
  target: '/Users/xiamingxing/Workspace/projects/cockpit/src/cockpit/web/api_system_map.py:512',
}

const roadmapItem = {
  id: 'source-open-actions',
  priority: 'P2',
  stage: 'now',
  status: 'shipped',
  title: '来源证据预览',
  domain: 'governance',
  cockpit_page: 'SystemMap',
  problem: '用户需要在 Cockpit 内核对来源内容。',
  actions: ['提供只读 source_ref 预览接口。'],
  acceptance: ['点击来源能看到目标行附近内容。'],
  source_refs: [sourceRef],
}

const homePage = {
  id: 'Home',
  title: '首页',
  group: '入口',
  purpose: '健康、告警和任务的日常总览。',
  dimensions: ['entry', 'runtime'],
}

const alertPage = {
  id: 'AlertCenter',
  title: '告警中心',
  group: '系统治理',
  purpose: '查看告警和规则。',
  dimensions: ['alert'],
}

const taskPage = {
  id: 'TaskCenter',
  title: '任务中心',
  group: '开发工具',
  purpose: '查看任务与只读草稿。',
  dimensions: ['task'],
}

const dailyOpsRoadmap = {
  id: 'daily-ops-console',
  priority: 'P1',
  stage: 'now',
  status: 'planned',
  title: '日常路径工作台',
  domain: 'runtime',
  cockpit_page: 'Home',
  problem: '用户需要从目标路径直接进入日常操作。',
  actions: ['聚合路径、清单、能力域和任务草稿入口。'],
  acceptance: ['选择日常体检后能看到相关清单和页面链。'],
  source_refs: [sourceRef],
}

const dailyUsagePath = {
  id: 'daily-ops',
  title: '日常体检',
  intent: '每天先确认健康、告警和任务是否需要处理。',
  steps: ['查看首页健康分', '进入告警中心', '打开任务中心草稿'],
  pages: [homePage, alertPage, taskPage],
  source_refs: [sourceRef],
}

const governanceUsagePath = {
  id: 'governance-loop',
  title: '治理闭环',
  intent: '每周处理治理风险和债务。',
  steps: ['打开系统地图', '查看治理入口'],
  pages: [
    {
      id: 'SystemMap',
      title: '系统地图',
      group: '入口',
      purpose: '解释整个 Cockpit。',
      dimensions: ['entry'],
    },
  ],
  source_refs: [sourceRef],
}

const dailyPlaybook = {
  id: 'daily-health-check',
  title: '每日体检',
  goal: '5 分钟内确认 Cockpit 日常运行状态。',
  frequency: 'daily',
  owner: 'operator',
  risk: 'low',
  source_refs: [sourceRef],
  steps: [
    {
      id: 'daily-home',
      page_id: 'Home',
      action: '查看首页健康分',
      evidence: '健康分与今日焦点可见',
      done_when: '无 P0 告警',
      page: homePage,
    },
    {
      id: 'daily-alerts',
      page_id: 'AlertCenter',
      action: '检查告警',
      evidence: '告警列表可见',
      done_when: '高优告警已确认',
      page: alertPage,
    },
  ],
}

const runtimeDomain = {
  id: 'runtime-ops',
  title: '运行态势',
  english: 'Runtime Operations',
  capability_items: ['health', 'alerts'],
  providers: ['Home', 'AlertCenter'],
  cockpit_page: 'Home',
  coverage: 'native',
  source_refs: [sourceRef],
}

const projectGap = {
  id: 'project-native-surface',
  severity: 'medium',
  title: '部分项目仍需补齐状态面',
  evidence: '项目矩阵存在待补能力。',
  next: '继续补齐项目原生入口。',
}

const readyCoverageChecks = [
  {
    id: 'cockpit_surface',
    title: 'Cockpit 入口',
    status: 'ready',
    detail: '入口：SystemMap，覆盖：native。',
    next_action: '保持页面映射同步。',
  },
  {
    id: 'verification',
    title: '验证证据',
    status: 'ready',
    detail: '最近验证：verified，checks=1。',
    next_action: '保持验证证据新鲜。',
  },
]

const kaironTriageCommand = {
  id: 'verification-rerun',
  label: '复跑验证',
  kind: 'copy_command',
  value: 'cd "/Users/xiamingxing/Workspace/projects/kairon" && uv run pytest -q',
  enabled: true,
  risk: 'low',
  executes: false,
  guard: '复制排查命令；Cockpit 不直接执行终端命令。',
  category: 'verification',
  project_id: 'kairon',
  reason: '最近验证失败或缺失，复制项目验证命令复现。',
}

const workflowTrace = {
  latest_run_id: 'run-kairon',
  latest_status: 'closed',
  latest_ts: '2026-07-05T05:00:00Z',
  runs: [
    {
      run_id: 'run-kairon',
      workflow_id: 'project-code-change',
      objective: '修复 kairon 验证',
      status: 'closed',
      verify_status: 'failed',
      verify_checks: 1,
      latest_ts: '2026-07-05T05:00:00Z',
      paths: ['projects/kairon'],
      events: [
        { type: 'claim', status: 'claimed', ts: '2026-07-05T04:59:00Z', summary: 'claimed 1 path(s)', paths: ['projects/kairon'] },
        { type: 'verify', status: 'failed', ts: '2026-07-05T05:00:00Z', summary: 'checks=1', paths: ['projects/kairon'] },
        { type: 'closeout', status: 'closed', ts: '2026-07-05T05:00:00Z', summary: 'status=ok' },
      ],
    },
  ],
  summary: { runs: 1, verified: 0, failed: 1, active: 0 },
}

const cockpitProject = {
  id: 'cockpit',
  layer: 'L3',
  stack: 'Python',
  role: 'Cockpit API',
  cockpit_page: 'SystemMap',
  coverage: 'native',
  path: '/Users/xiamingxing/Workspace/projects/cockpit',
  exists: true,
  operational: {
    status: 'ready',
    docs: { present: 1, expected: 1, items: [] },
    commands: ['uv run pytest'],
    manifests: [],
    risks: [],
    next_action: '保持验证',
  },
  runtime: {
    status: 'running',
    profile: 'service',
    needs_runtime: true,
    probe_reason: '已登记可观测端口，可直接用监听结果判断运行状态。',
    ports: [],
    listening_count: 1,
    latest_verification: { status: 'verified', checks: 1 },
  },
  workflow: {
    ...workflowTrace,
    latest_run_id: 'run-cockpit',
    runs: [{ ...workflowTrace.runs[0], run_id: 'run-cockpit', objective: '验证 cockpit' }],
  },
  source_refs: [sourceRef],
  actions: [
    {
      id: 'copy-verify-command',
      label: '复制验证',
      kind: 'copy_command',
      value: 'cd cockpit && uv run pytest',
      enabled: true,
      risk: 'low',
      executes: false,
      guard: '复制验证命令；不直接执行。',
    },
    {
      id: 'open-project-page',
      label: '打开项目页面',
      kind: 'navigate',
      value: 'Overview',
      enabled: true,
      risk: 'low',
      executes: false,
      guard: '打开项目对应的页面入口。',
    },
  ],
  triage_commands: [],
  coverage_checks: readyCoverageChecks,
  portfolio: {
    score: 100,
    status: 'healthy',
    ready: 2,
    warning: 0,
    failed: 0,
    primary_gap: '状态可日用',
    next_action: '保持项目注册表同步。',
    non_ready_dimensions: [],
  },
  diagnostics: [
    {
      id: 'ready',
      severity: 'low',
      title: '状态可日用',
      detail: '基础状态、运行探针和最近验证未发现阻断项。',
      next_action: '保持项目注册表同步。',
    },
  ],
}

const kaironProject = {
  ...cockpitProject,
  id: 'kairon',
  role: 'Reasoning engine',
  runtime: {
    status: 'stopped',
    profile: 'service',
    needs_runtime: true,
    probe_reason: '检测到服务入口或启动脚本，但尚未登记运行端口。',
    ports: [],
    listening_count: 0,
    latest_verification: { status: 'failed', checks: 1 },
  },
  operational: {
    ...cockpitProject.operational,
    next_action: '修复验证',
  },
  coverage_checks: [
    readyCoverageChecks[0],
    {
      id: 'verification',
      title: '验证证据',
      status: 'failed',
      detail: '最近验证：failed，checks=1。',
      next_action: '复现失败验证并补 closeout 证据。',
    },
  ],
  portfolio: {
    score: 50,
    status: 'blocked',
    ready: 1,
    warning: 0,
    failed: 1,
    primary_gap: '最近验证失败',
    next_action: '复制验证命令复现。',
    non_ready_dimensions: [
      {
        id: 'verification',
        title: '验证证据',
        status: 'failed',
        next_action: '复现失败验证并补 closeout 证据。',
      },
    ],
  },
  workflow: workflowTrace,
  triage_commands: [kaironTriageCommand],
  diagnostics: [
    {
      id: 'verification-failed',
      severity: 'high',
      title: '最近验证失败',
      detail: '最近验证事件失败，checks=1。',
      next_action: '复制验证命令复现。',
    },
  ],
}

const systemMapPayload = {
  schema_version: 'v1',
  generated_at: new Date().toISOString(),
  architecture: {
    model: '5+4+1+1',
    ecos_version: 'v6',
    dependency_direction: 'entry surfaces -> routing mesh -> governed state',
  },
  source_paths: {
    project_registry: { path: '/Users/xiamingxing/Workspace/docs/project-registry.yaml', exists: true },
  },
  cockpit_pages: [
    homePage,
    alertPage,
    taskPage,
    {
      id: 'SystemMap',
      title: '系统地图',
      group: '入口',
      purpose: '解释整个 Cockpit。',
      dimensions: ['entry'],
    },
  ],
  layers: [],
  projects: [cockpitProject, kaironProject],
  project_focus: {
    queues: [
      {
        id: 'verification-gap',
        title: '验证待补证',
        severity: 'medium',
        reason: '最近验证失败或缺少验证事件。',
        count: 1,
        project_ids: ['kairon'],
        top_projects: [{ id: 'kairon', diagnostics: kaironProject.diagnostics }],
      },
    ],
    summary: {
      needs_action: 1,
      operational_gap: 0,
      runtime_gap: 1,
      verification_gap: 1,
      ready_and_running: 1,
    },
  },
  project_triage: {
    queues: [
      {
        id: 'runtime',
        title: '运行排查',
        severity: 'medium',
        reason: '端口未监听、缺少端口登记或需要人工启动确认的项目。',
        count: 0,
        project_ids: [],
        commands: [],
      },
      {
        id: 'verification',
        title: '验证排查',
        severity: 'high',
        reason: '最近验证失败或缺少验证证据的项目。',
        count: 1,
        project_ids: ['kairon'],
        commands: [kaironTriageCommand],
      },
      {
        id: 'coverage',
        title: '清单排查',
        severity: 'medium',
        reason: '项目文档、命令或 manifest 不完整的项目。',
        count: 0,
        project_ids: [],
        commands: [],
      },
    ],
    summary: {
      total_commands: 1,
      runtime_commands: 1,
      verification_commands: 1,
      coverage_commands: 0,
    },
  },
  project_capability_coverage: {
    dimensions: [
      { id: 'cockpit_surface', title: 'Cockpit 入口', description: '项目是否有站内原生入口。' },
      { id: 'verification', title: '验证证据', description: '项目是否有最近验证事件。' },
    ],
    dimension_summary: [
      {
        id: 'cockpit_surface',
        title: 'Cockpit 入口',
        description: '项目是否有站内原生入口。',
        status: 'ready',
        ready: 2,
        warning: 0,
        failed: 0,
        score: 100,
        attention_projects: [],
      },
      {
        id: 'verification',
        title: '验证证据',
        description: '项目是否有最近验证事件。',
        status: 'failed',
        ready: 1,
        warning: 0,
        failed: 1,
        score: 50,
        attention_projects: [{ id: 'kairon', status: 'failed', next_action: '复现失败验证并补 closeout 证据。' }],
      },
    ],
    weakest_dimensions: [
      {
        id: 'verification',
        title: '验证证据',
        description: '项目是否有最近验证事件。',
        status: 'failed',
        ready: 1,
        warning: 0,
        failed: 1,
        score: 50,
        attention_projects: [{ id: 'kairon', status: 'failed', next_action: '复现失败验证并补 closeout 证据。' }],
      },
    ],
    matrix: [
      { project_id: 'cockpit', layer: 'L3', cockpit_page: 'SystemMap', ready: 2, warning: 0, failed: 0, checks: readyCoverageChecks },
      { project_id: 'kairon', layer: 'L3', cockpit_page: 'SystemMap', ready: 1, warning: 0, failed: 1, checks: [] },
    ],
    summary: {
      projects: 2,
      dimensions: 2,
      total_cells: 4,
      ready_cells: 3,
      warning_cells: 0,
      failed_cells: 1,
      score: 75,
    },
  },
  domain_apps: {
    status: 'watch',
    strategy: 'Cockpit is the L3 entry; L4 domains keep SSOT and vertical app ownership.',
    summary: {
      total: 3,
      ready: 3,
      needs_attention: 0,
      running: 2,
      stopped: 1,
      high_risk: 1,
      external_mounts: 2,
      security_passed: 14,
      security_warn: 0,
      security_failed: 0,
      security_blocking: 0,
      security_attention_apps: 0,
      score: 93,
      security_posture: 'passed',
    },
    items: [
      {
        id: 'family-dashboard-app',
        name: '家庭驾驶舱',
        domain: { id: 'family', name: '家庭生活' },
        kind: 'next_app',
        integration_mode: 'external_mount',
        risk_level: 'high',
        health: 'ready',
        runtime_status: 'running',
        launch_url: 'http://127.0.0.1:3010',
        api_url: null,
        security_posture: 'passed',
        security_attention: 0,
        security_failed: 0,
        read_capabilities: ['summary', 'calendar'],
        write_capabilities: ['file-save'],
        action_count: 3,
        next_action: '保持 SSOT、验证命令和安全门证据新鲜。',
      },
      {
        id: 'opc-workspace',
        name: 'OPC 作战台',
        domain: { id: 'opc', name: 'OPC' },
        kind: 'workspace',
        integration_mode: 'native_cockpit_view',
        risk_level: 'medium',
        health: 'ready',
        runtime_status: 'running',
        launch_url: null,
        api_url: null,
        security_posture: 'passed',
        security_attention: 0,
        security_failed: 0,
        read_capabilities: ['strategy'],
        write_capabilities: [],
        action_count: 2,
        next_action: '保持 SSOT、验证命令和安全门证据新鲜。',
      },
      {
        id: 'family-hub',
        name: 'family-hub 服务',
        domain: { id: 'family', name: '家庭生活' },
        kind: 'service',
        integration_mode: 'external_service',
        risk_level: 'medium',
        health: 'ready',
        runtime_status: 'stopped',
        launch_url: null,
        api_url: 'http://127.0.0.1:8787',
        security_posture: 'passed',
        security_attention: 0,
        security_failed: 0,
        read_capabilities: ['quests'],
        write_capabilities: ['quest-complete'],
        action_count: 2,
        next_action: '按登记启动命令拉起服务或确认它只需要按需启动。',
      },
    ],
    attention_items: [
      {
        id: 'family-hub',
        name: 'family-hub 服务',
        health: 'ready',
        runtime_status: 'stopped',
        risk_level: 'medium',
        security_posture: 'passed',
        next_action: '按登记启动命令拉起服务或确认它只需要按需启动。',
      },
    ],
    next_action: '启动或验证停止的领域服务，让应用中心从入口变成日用能力。',
  },
  project_portfolio: {
    summary: {
      score: 75,
      status: 'blocked',
      projects: 2,
      blocked: 1,
      at_risk: 0,
      watch: 0,
      healthy: 1,
      priority_projects: 1,
      weakest_dimensions: 1,
    },
    buckets: [
      {
        id: 'blocked',
        title: '阻塞项目',
        severity: 'high',
        reason: '验证失败、目录缺失或多个能力维度失败，需要优先处理。',
        count: 1,
        project_ids: ['kairon'],
      },
      {
        id: 'at_risk',
        title: '风险项目',
        severity: 'medium',
        reason: '运行、文档、命令或探针存在缺口，影响稳定日用。',
        count: 0,
        project_ids: [],
      },
      {
        id: 'watch',
        title: '观察项目',
        severity: 'medium',
        reason: '存在提醒项或活跃工作流，短期需要跟进。',
        count: 0,
        project_ids: [],
      },
      {
        id: 'healthy',
        title: '健康项目',
        severity: 'low',
        reason: '核心覆盖维度已经就绪，保持证据新鲜即可。',
        count: 1,
        project_ids: ['cockpit'],
      },
    ],
    priority_projects: [
      {
        id: 'kairon',
        layer: 'L3',
        cockpit_page: 'SystemMap',
        score: 50,
        status: 'blocked',
        primary_gap: '最近验证失败',
        next_action: '复制验证命令复现。',
        failed: 1,
        warning: 0,
        runtime_status: 'stopped',
        verification_status: 'failed',
        non_ready_dimensions: [
          {
            id: 'verification',
            title: '验证证据',
            status: 'failed',
            next_action: '复现失败验证并补 closeout 证据。',
          },
        ],
        triage_commands: 1,
      },
    ],
    weakest_dimensions: [
      {
        id: 'verification',
        title: '验证证据',
        description: '项目是否有最近验证事件。',
        status: 'failed',
        ready: 1,
        warning: 0,
        failed: 1,
        score: 50,
        attention_projects: [{ id: 'kairon', status: 'failed', next_action: '复现失败验证并补 closeout 证据。' }],
      },
    ],
  },
  feature_domains: [runtimeDomain],
  roadmap: {
    items: [roadmapItem, dailyOpsRoadmap],
    lanes: [{ id: 'now', title: '现在补', items: [roadmapItem, dailyOpsRoadmap] }],
    summary: { total: 2, shipped: 1, planned: 1, p0: 0 },
  },
  usage_paths: [dailyUsagePath, governanceUsagePath],
  playbooks: [dailyPlaybook],
  gaps: [projectGap],
  summary: {
    projects: 2,
    layers: 0,
    feature_domains: 1,
    cockpit_pages: 4,
    native_project_surfaces: 0,
    orientation_project_surfaces: 0,
    ready_projects: 0,
    partial_projects: 0,
    missing_projects: 0,
    running_projects: 0,
    stopped_projects: 0,
    unobserved_projects: 0,
    not_applicable_projects: 0,
    gaps: 1,
    roadmap_items: 2,
    playbooks: 1,
    project_actions: 1,
    projects_needing_action: 1,
    project_triage_commands: 1,
    project_coverage_score: 75,
    project_portfolio_score: 75,
    blocked_projects: 1,
    at_risk_projects: 0,
    domain_apps: 3,
    domain_app_score: 93,
    domain_app_security_attention: 0,
    source_refs: 1,
  },
}

const sourcePreviewPayload = {
  path: sourceRef.path,
  workspace_relative_path: 'projects/cockpit/src/cockpit/web/api_system_map.py',
  line: 512,
  target: sourceRef.target,
  total_lines: 900,
  context_start: 511,
  context_end: 513,
  guard: '只读来源预览；路径必须位于当前 Workspace 内，接口不执行本机打开命令。',
  lines: [
    { number: 511, text: 'ROADMAP_ITEMS = (', highlight: false },
    { number: 512, text: '    {"id": "source-open-actions"}', highlight: true },
    { number: 513, text: ')', highlight: false },
  ],
}

const draftTasksPayload = {
  items: [
    {
      id: 'playbook-daily-health-check',
      title: '操作清单：每日体检',
      description: '5 分钟内确认 Cockpit 日常运行状态。',
      priority: 'low',
      read_only: true,
      source: {
        type: 'system_map_playbook',
        id: 'daily-health-check',
        title: '每日体检',
      },
      draft: {
        kind: 'playbook_task',
        copy_text: '# playbook draft',
        step_count: 2,
        guard: '只读任务草稿；需要正式写入时走 C2G/OMO 受控入口。',
      },
    },
    {
      id: 'page-maturity-home',
      title: '页面能力：补齐 首页',
      description: '补一条操作清单步骤，让页面进入日常流程。',
      priority: 'medium',
      read_only: true,
      source: {
        type: 'system_map_page_maturity',
        id: 'Home',
        title: '首页 页面成熟度',
      },
      draft: {
        kind: 'page_maturity_task',
        copy_text: '# page maturity draft',
        step_count: 1,
        guard: '只读页面能力草稿；正式写入需走 C2G/OMO 受控入口。',
      },
    },
    {
      id: 'portfolio-kairon',
      title: '项目组合：修复 kairon',
      description: '复制验证命令复现。',
      priority: 'critical',
      read_only: true,
      source: {
        type: 'system_map_project_portfolio',
        id: 'kairon',
        title: 'kairon 项目组合态势',
      },
      draft: {
        kind: 'project_portfolio_task',
        copy_text: '# project portfolio draft',
        step_count: 1,
        guard: '只读项目组合草稿；复制后由人确认，正式写入需走 C2G/OMO 受控入口。',
      },
    },
    {
      id: 'verification-ready-cockpit',
      title: '验证补证：cockpit',
      description: '项目已登记验证命令，但最近还没有 workflow 验证证据。',
      priority: 'medium',
      read_only: true,
      source: {
        type: 'system_map_verification_ready',
        id: 'cockpit',
        title: 'cockpit 验证补证',
      },
      draft: {
        kind: 'verification_ready_task',
        copy_text: '# verification ready draft',
        step_count: 3,
        guard: '只读验证补证草稿；正式写入需走 agent-workflow / C2G / OMO 受控入口。',
      },
    },
    {
      id: 'domain-app-family-hub',
      title: '领域应用：处理 family-hub 服务',
      description: '按登记启动命令拉起服务或确认它只需要按需启动。',
      priority: 'medium',
      read_only: true,
      source: {
        type: 'system_map_domain_app',
        id: 'family-hub',
        title: 'family-hub 服务领域应用态势',
      },
      draft: {
        kind: 'domain_app_task',
        copy_text: '# domain app draft',
        step_count: 1,
        guard: '只读领域应用草稿；正式写入需走领域 app 自身认证/审计或 C2G/OMO 受控入口。',
      },
    },
  ],
}

function okJson(payload: unknown) {
  return { ok: true, json: async () => payload } as Response
}

function expectTaskCenterDraftCall(
  onOpenTarget: ReturnType<typeof vi.fn>,
  index: number,
  taskQuery: string,
  title: string,
) {
  const target = onOpenTarget.mock.calls[index]?.[0]
  expect(target).toEqual(expect.objectContaining({
    tab: 'TaskCenter',
    taskQuery,
    draftKey: expect.any(String),
  }))
  const raw = window.sessionStorage.getItem(target.draftKey)
  expect(raw).toBeTruthy()
  expect(JSON.parse(raw || '{}')).toEqual(expect.objectContaining({ title }))
}

describe('SystemMapView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    window.sessionStorage.clear()
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') return okJson(systemMapPayload)
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson(draftTasksPayload)
      if (url === `/api/cockpit/source-ref?target=${encodeURIComponent(sourceRef.target)}&context=4`) {
        return okJson(sourcePreviewPayload)
      }
      if (url === '/api/cockpit/projects/cockpit/actions/copy-verify-command/queue') {
        return okJson({
          id: 'cockpit-action-cockpit-copy-verify-command',
          status: 'pending',
          title: '项目动作：Cockpit API · 复制验证',
          executes: false,
        })
      }
      if (url === '/api/cockpit/projects/kairon/triage/verification-rerun/queue') {
        return okJson({
          id: 'cockpit-triage-kairon-verification-rerun',
          status: 'pending',
          title: '项目排查：kairon · 复跑验证',
          executes: false,
        })
      }
      if (url === '/api/cockpit/triage/queue') {
        return okJson({
          summary: { queued: 2, skipped: 1, errors: 0 },
          executes: false,
        })
      }
      if (url === '/api/cockpit/coverage/queue') {
        return okJson({
          summary: { queued: 4, skipped: 2, errors: 0 },
          executes: false,
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
  })

  it('previews source references inside the system map', async () => {
    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => screen.getByText('来源证据预览'))
    fireEvent.click(screen.getAllByRole('button', { name: /路线图定义/ })[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/cockpit/source-ref?target=${encodeURIComponent(sourceRef.target)}&context=4`,
      )
      expect(screen.getByText('ROADMAP_ITEMS = (')).toBeInTheDocument()
      expect(screen.getByText(/接口不执行本机打开命令/)).toBeInTheDocument()
    })
  }, 15000)

  it('opens the focused project detail when launched with a project id', async () => {
    render(<SystemMapView onNavigate={vi.fn()} focusProjectId="kairon" />)

    await waitFor(() => {
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
      expect(screen.getByText('工作流时间线')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'kairon 验证历史' })).toBeInTheDocument()
      expect(screen.getByText('run-kairon · checks 1')).toBeInTheDocument()
      expect(screen.getByText('run：run-kairon')).toBeInTheDocument()
    })
  })

  it('queues a triage command directly from project detail', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} focusProjectId="kairon" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '承接项目排查命令 复跑验证' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '承接项目排查命令 复跑验证' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/projects/kairon/triage/verification-rerun/queue',
        { method: 'POST' },
      )
      expect(onOpenTarget).toHaveBeenCalledWith({
        tab: 'TaskCenter',
        taskQuery: 'cockpit-triage-kairon-verification-rerun',
      })
    })
  })

  it('prevents duplicate project triage queue requests', async () => {
    const onOpenTarget = vi.fn()
    let resolveQueue: ((response: Response) => void) | undefined
    let queueCalls = 0
    const queueResponse = new Promise<Response>((resolve) => {
      resolveQueue = resolve
    })
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/projects/kairon/triage/verification-rerun/queue' && init?.method === 'POST') {
        queueCalls += 1
        return queueResponse
      }
      if (url === '/api/cockpit/system-map') return okJson(systemMapPayload)
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson(draftTasksPayload)
      return okJson({})
    })

    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} focusProjectId="kairon" />)
    const button = await screen.findByRole('button', { name: '承接项目排查命令 复跑验证' })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('承接中')
    expect(queueCalls).toBe(1)
    resolveQueue?.(okJson({ id: 'cockpit-triage-kairon-verification-rerun' }))

    await waitFor(() => expect(onOpenTarget).toHaveBeenCalledWith({
      tab: 'TaskCenter',
      taskQuery: 'cockpit-triage-kairon-verification-rerun',
    }))
  })

  it('renders the project by dimension coverage matrix and opens cell details', async () => {
    render(<SystemMapView onNavigate={vi.fn()} />)

    const matrix = await screen.findByRole('region', { name: '项目能力维度交叉矩阵' })
    expect(within(matrix).getByRole('columnheader', { name: 'Cockpit 入口' })).toBeInTheDocument()
    expect(within(matrix).getByRole('columnheader', { name: '验证证据' })).toBeInTheDocument()
    expect(within(matrix).getByRole('button', { name: 'kairon 验证证据：缺口' })).toBeInTheDocument()

    fireEvent.click(within(matrix).getByRole('button', { name: 'kairon 验证证据：缺口' }))

    await waitFor(() => {
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
    })
  })

  it('keeps the project context when opening its cockpit entry from the project matrix', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    const projectMatrix = await screen.findByRole('heading', { name: '项目矩阵' })
    const matrixSection = projectMatrix.closest('section')
    expect(matrixSection).not.toBeNull()

    fireEvent.click(within(matrixSection as HTMLElement).getAllByRole('button', { name: '系统地图' })[0])

    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', projectId: 'cockpit' })
  })

  it('queues an enabled project command without executing it', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} focusProjectId="cockpit" />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '承接项目动作 复制验证' }).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: '承接项目动作 复制验证' })[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/projects/cockpit/actions/copy-verify-command/queue',
        { method: 'POST' },
      )
      expect(onOpenTarget).toHaveBeenCalledWith({
        tab: 'TaskCenter',
        taskQuery: 'cockpit-action-cockpit-copy-verify-command',
      })
      expect(screen.getByRole('status')).toHaveTextContent('已登记为计划任务')
    })
  })

  it('queues a triage command without executing it', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '承接排查命令 kairon 复跑验证' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '承接排查命令 kairon 复跑验证' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/projects/kairon/triage/verification-rerun/queue',
        { method: 'POST' },
      )
      expect(onOpenTarget).toHaveBeenCalledWith({
        tab: 'TaskCenter',
        taskQuery: 'cockpit-triage-kairon-verification-rerun',
      })
      expect(screen.getByRole('status')).toHaveTextContent('已登记为计划任务')
    })
  })

  it('opens the task center to retry a failed triage task', async () => {
    const onOpenTarget = vi.fn()
    const failedPayload = JSON.parse(JSON.stringify(systemMapPayload))
    failedPayload.project_triage.queues[1].commands[0].task = {
      task_id: 'cockpit-triage-kairon-verification-rerun',
      status: 'failed',
      execution_audit: { exit_code: 124, timed_out: true },
    }
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') return okJson(failedPayload)
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson({ items: [] })
      return okJson({})
    })

    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '打开排查任务 kairon 复跑验证' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '打开排查任务 kairon 复跑验证' }))

    expect(onOpenTarget).toHaveBeenCalledWith({
      tab: 'TaskCenter',
      taskQuery: 'cockpit-triage-kairon-verification-rerun',
    })
  })

  it('opens an already queued triage task for approval or execution', async () => {
    const onOpenTarget = vi.fn()
    const queuedPayload = JSON.parse(JSON.stringify(systemMapPayload))
    queuedPayload.project_triage.queues[1].commands[0].task = {
      task_id: 'cockpit-triage-kairon-verification-rerun',
      status: 'planned',
      execution_audit: {},
    }
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') return okJson(queuedPayload)
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson({ items: [] })
      return okJson({})
    })

    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '打开排查任务 kairon 复跑验证' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '打开排查任务 kairon 复跑验证' }))

    expect(onOpenTarget).toHaveBeenCalledWith({
      tab: 'TaskCenter',
      taskQuery: 'cockpit-triage-kairon-verification-rerun',
    })
  })

  it('falls back to TaskCenter tab navigation for an already queued triage task', async () => {
    const onNavigate = vi.fn()
    const queuedPayload = JSON.parse(JSON.stringify(systemMapPayload))
    queuedPayload.project_triage.queues[1].commands[0].task = {
      task_id: 'cockpit-triage-kairon-verification-rerun',
      status: 'pending',
    }
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input) === '/api/cockpit/system-map') return okJson(queuedPayload)
      return okJson({})
    })

    render(<SystemMapView onNavigate={onNavigate} />)
    const button = await screen.findByRole('button', { name: '打开排查任务 kairon 复跑验证' })
    fireEvent.click(button)

    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
  })

  it('batches verification triage into OMO tasks without executing commands', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '批量承接验证缺口' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '批量承接验证缺口' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/triage/queue',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ category: 'verification', command_id: 'verification-rerun' }),
        }),
      )
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'cockpit-triage-' })
      expect(screen.getByRole('status')).toHaveTextContent('已批量承接验证缺口：2 条')
    })
  })

  it('batches runtime probe triage without executing commands', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '批量承接运行探针' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '批量承接运行探针' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/triage/queue',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ category: 'runtime' }),
        }),
      )
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'cockpit-triage-' })
      expect(screen.getByRole('status')).toHaveTextContent('已批量承接运行探针：2 条')
    })
  })

  it('batches all coverage drafts into OMO tasks without executing them', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '批量承接全站缺口' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '批量承接全站缺口' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/coverage/queue',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ category: 'all', limit: 40 }),
        }),
      )
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'cockpit-' })
      expect(screen.getByRole('status')).toHaveTextContent('已批量承接全站缺口：4 条')
    })
  })

  it('connects usage paths to playbooks, domains, roadmap items, and task drafts', async () => {
    const onNavigate = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getAllByText('使用路径工作台').length).toBeGreaterThan(0)
      expect(screen.getAllByText('日常体检').length).toBeGreaterThan(0)
      expect(screen.getAllByText(/覆盖页/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/相关清单/).length).toBeGreaterThan(0)
      expect(screen.getAllByText('每日体检').length).toBeGreaterThan(0)
      expect(screen.getAllByText('运行态势').length).toBeGreaterThan(0)
      expect(screen.getAllByText('日常路径工作台').length).toBeGreaterThan(0)
      expect(screen.getAllByText('部分项目仍需补齐状态面').length).toBeGreaterThan(0)
      expect(screen.getAllByText('任务草稿').length).toBeGreaterThan(0)
      expect(screen.getAllByText('操作清单：每日体检').length).toBeGreaterThan(0)
      expect(screen.getAllByText('页面能力：补齐 首页').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /任务草稿/ }))

    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
    expect(fetch).toHaveBeenCalledWith(SYSTEM_MAP_DRAFT_TASKS_URL)
  })

  it('surfaces executable projects, triage commands, and drafts for a focused governance path', async () => {
    render(<SystemMapView onNavigate={vi.fn()} focusUsagePathId="governance-loop" />)

    await waitFor(() => {
      expect(screen.getAllByText('治理闭环').length).toBeGreaterThan(0)
      expect(screen.getAllByText('相关项目').length).toBeGreaterThan(0)
      expect(screen.getAllByText('排查命令').length).toBeGreaterThan(0)
      expect(screen.getAllByText('项目组合：修复 kairon').length).toBeGreaterThan(0)
      expect(screen.getAllByText('复跑验证').length).toBeGreaterThan(0)
      expect(screen.getAllByText('kairon').length).toBeGreaterThan(0)
    })
  })

  it('summarizes domain app coverage inside the system map', async () => {
    const onNavigate = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('领域应用覆盖')).toBeInTheDocument()
      expect(screen.getByText('家庭驾驶舱')).toBeInTheDocument()
      expect(screen.getAllByText('family-hub 服务').length).toBeGreaterThan(0)
      expect(screen.getByText(/启动或验证停止的领域服务/)).toBeInTheDocument()
      expect(screen.getAllByText(/运行 stopped/).length).toBeGreaterThan(0)
      expect(screen.getByText('3 · 93%')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByRole('button', { name: /应用中心/ })[0])

    expect(onNavigate).toHaveBeenCalledWith('DomainApps')
  })

  it('opens the focused usage path when launched with a usage path id', async () => {
    render(<SystemMapView onNavigate={vi.fn()} focusUsagePathId="governance-loop" />)

    await waitFor(() => {
      expect(screen.getAllByText('每周处理治理风险和债务。').length).toBeGreaterThan(0)
      expect(screen.getAllByText('治理闭环').length).toBeGreaterThan(0)
    })
  })

  it('supports deep-link focus for coverage dimensions, pages, and feature domains', async () => {
    const { rerender } = render(<SystemMapView onNavigate={vi.fn()} focusCoverageDimensionId="verification" />)

    await waitFor(() => {
      expect(screen.getByText(/覆盖维度：验证证据/)).toBeInTheDocument()
    })

    rerender(<SystemMapView onNavigate={vi.fn()} focusPageId="AlertCenter" />)

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦页面' })
      expect(within(focus).getByText('告警中心')).toBeInTheDocument()
    })

    rerender(<SystemMapView onNavigate={vi.fn()} focusFeatureDomainId="runtime-ops" />)

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦能力域' })
      expect(within(focus).getByText('运行态势')).toBeInTheDocument()
    })
  })

  it('surfaces a focused capability gap with closure handoff routes when launched with a gap id', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusGapId="project-native-surface" />)

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦能力缺口' })
      expect(focus).toBeInTheDocument()
      expect(screen.getAllByText('部分项目仍需补齐状态面').length).toBeGreaterThan(0)
      expect(screen.getAllByText(/继续补齐项目原生入口/).length).toBeGreaterThan(0)
      expect(within(focus).getByText('缺口承接面')).toBeInTheDocument()
      expect(within(focus).getByText('当前承接线索')).toBeInTheDocument()
      expect(within(focus).getByText('反向修复入口')).toBeInTheDocument()
      expect(within(focus).getByText('查看项目')).toBeInTheDocument()
      expect(within(focus).getByText('查看任务草稿')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '能力缺口承接总表' })).toBeInTheDocument()
      expect(screen.getByText('已挂页面')).toBeInTheDocument()
      expect(screen.getByText('待跟项目')).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByRole('region', { name: '当前聚焦能力缺口' })).getByText('查看项目'))

    await waitFor(() => {
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByRole('region', { name: '当前聚焦能力缺口' })).getByText('查看任务草稿'))

    expectTaskCenterDraftCall(onOpenTarget, 0, 'kairon', '项目组合：修复 kairon')
  })

  it('summarizes page capability maturity across site pages', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      const workbench = screen.getByRole('region', { name: '系统地图闭环工作台' })
      expect(workbench).toBeInTheDocument()
      expect(within(workbench).getByText('当前 3 个闭环位')).toBeInTheDocument()
      expect(within(workbench).getByLabelText('系统地图闭环 日常体检 · 路径闭环')).toBeInTheDocument()
      expect(within(workbench).getByLabelText('系统地图闭环 首页 · 页面闭环')).toBeInTheDocument()
      expect(within(workbench).getByLabelText('系统地图闭环 运行态势 · 能力域闭环')).toBeInTheDocument()
      expect(screen.getByText('页面能力成熟度')).toBeInTheDocument()
      const focus = screen.getByRole('region', { name: '当前聚焦页面' })
      expect(focus).toBeInTheDocument()
      expect(screen.getByText('可日用 0')).toBeInTheDocument()
      expect(screen.getByText('观察 2')).toBeInTheDocument()
      expect(screen.getByText('待补 2')).toBeInTheDocument()
      expect(screen.getAllByText(/观察 · 65%/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/补一条操作清单步骤，让页面进入日常流程。/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/补项目或服务映射，避免页面只有入口没有对象。/).length).toBeGreaterThan(0)
      expect(screen.getAllByText('首页').length).toBeGreaterThan(0)
      expect(within(focus).getByText('项目映射缺失')).toBeInTheDocument()
      expect(within(focus).getByText('受控动作缺失')).toBeInTheDocument()
      expect(within(focus).getByText('查看路径')).toBeInTheDocument()
      expect(within(focus).getByText('查看清单')).toBeInTheDocument()
      expect(within(focus).getByText('查看页面草稿')).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByRole('region', { name: '当前聚焦页面' })).getByText('查看页面草稿'))

    expectTaskCenterDraftCall(onOpenTarget, 0, 'Home', '页面能力：补齐 首页')

    fireEvent.click(screen.getAllByRole('button', { name: '查看剖面' })[1])

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦页面' })
      expect(within(focus).getByText('告警中心')).toBeInTheDocument()
      expect(within(focus).getByText('项目映射缺失')).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByRole('region', { name: '当前聚焦页面' })).getByText('查看清单'))

    expectTaskCenterDraftCall(onOpenTarget, 1, 'daily-health-check', '操作清单：每日体检')

    fireEvent.click(screen.getAllByRole('button', { name: /进入页面/ })[0])

    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'AlertCenter',
      pageId: 'AlertCenter',
    }))
  })

  it('builds a focused feature-domain repair profile with reverse links', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦能力域' })
      expect(focus).toBeInTheDocument()
      expect(within(focus).getByText('运行态势')).toBeInTheDocument()
      expect(within(focus).getByText('能力接入面')).toBeInTheDocument()
      expect(within(focus).getByText('提供方与能力项')).toBeInTheDocument()
      expect(within(focus).getByText('查看路径')).toBeInTheDocument()
      expect(within(focus).getByText('查看清单')).toBeInTheDocument()
      expect(within(focus).getByText('查看页面草稿')).toBeInTheDocument()
      expect(within(focus).getByText('查看路线图')).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByRole('region', { name: '当前聚焦能力域' })).getByText('查看清单'))

    expectTaskCenterDraftCall(onOpenTarget, 0, 'daily-health-check', '操作清单：每日体检')

    fireEvent.click(screen.getAllByRole('button', { name: '查看剖面' })[0])

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦能力域' })
      expect(within(focus).getByText('运行态势')).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByRole('region', { name: '当前聚焦能力域' })).getByText('进入页面'))

    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'Home',
      pageId: 'Home',
      featureDomainId: 'runtime-ops',
    }))
  })

  it('filters the project matrix by project focus queue', async () => {
    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '查看 cockpit 项目详情' })).toBeInTheDocument()
      expect(screen.getAllByText('kairon').length).toBeGreaterThan(0)
      expect(screen.getByText('排查命令队列')).toBeInTheDocument()
      expect(screen.getByText('项目组合态势')).toBeInTheDocument()
      expect(screen.getByText('组合分')).toBeInTheDocument()
      expect(screen.getAllByText('优先项目').length).toBeGreaterThan(0)
      expect(screen.getAllByText('阻塞项目').length).toBeGreaterThan(0)
      expect(screen.getByText('验证排查')).toBeInTheDocument()
      expect(screen.getAllByText(/kairon · 复跑验证/).length).toBeGreaterThan(0)
      expect(screen.getByText('能力覆盖矩阵')).toBeInTheDocument()
      expect(screen.getAllByText('验证证据').length).toBeGreaterThan(0)
      expect(screen.getByText('覆盖分')).toBeInTheDocument()
      expect(screen.getAllByText('最近验证失败').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /验证待补证/ }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '查看 cockpit 项目详情' })).not.toBeInTheDocument()
      expect(screen.getAllByText('kairon').length).toBeGreaterThan(0)
      expect(screen.getByText(/显示 1 \/ 2/)).toBeInTheDocument()
    })
  })

  it('filters the project matrix by portfolio posture bucket', async () => {
    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /阻塞项目/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看 cockpit 项目详情' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /阻塞项目/ }))

    await waitFor(() => {
      expect(screen.getByText(/组合态势：阻塞项目/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '查看 cockpit 项目详情' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看 kairon 项目详情' })).toBeInTheDocument()
      expect(screen.getByText(/显示 1 \/ 2 · 命令 1/)).toBeInTheDocument()
    })
  })

  it('filters projects by architecture layer and cockpit entry page', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation()
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') {
        const domainProject = { ...kaironProject, layer: 'L4', cockpit_page: 'DomainApps' }
        return okJson({
          ...systemMapPayload,
          cockpit_pages: [...systemMapPayload.cockpit_pages, { id: 'DomainApps', title: '应用中心', group: '领域应用', purpose: '领域应用入口', dimensions: ['domain'] }],
          projects: [cockpitProject, domainProject],
          project_capability_coverage: {
            ...systemMapPayload.project_capability_coverage,
            matrix: [
              systemMapPayload.project_capability_coverage.matrix[0],
              { ...systemMapPayload.project_capability_coverage.matrix[1], layer: 'L4', cockpit_page: 'DomainApps' },
            ],
          },
        })
      }
      return defaultFetch ? defaultFetch(input) : okJson({})
    })

    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '按架构层级筛选项目' })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: '按 Cockpit 入口页筛选项目' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看 cockpit 项目详情' })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('combobox', { name: '按架构层级筛选项目' }), { target: { value: 'L4' } })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '查看 cockpit 项目详情' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看 kairon 项目详情' })).toBeInTheDocument()
      expect(screen.getByText(/显示 1 \/ 2/)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('combobox', { name: '按 Cockpit 入口页筛选项目' }), { target: { value: 'DomainApps' } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '查看 kairon 项目详情' })).toBeInTheDocument()
      expect(screen.getByText(/显示 1 \/ 2/)).toBeInTheDocument()
    })
  })

  it('builds a project entry mapping board with cockpit, coverage, and task handoff routes', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      const board = screen.getByRole('region', { name: '项目入口映射总表' })
      expect(board).toBeInTheDocument()
      expect(within(board).getByText('入口映射')).toBeInTheDocument()
      expect(within(board).getAllByText('kairon').length).toBeGreaterThan(0)
      expect(within(board).getByText('打开项目入口')).toBeInTheDocument()
      expect(within(board).getByText('查看项目覆盖')).toBeInTheDocument()
      expect(within(board).getByText('打开项目任务')).toBeInTheDocument()
      expect(within(board).getByText('定位缺口维度')).toBeInTheDocument()
      expect(within(board).getByText('草稿 项目组合：修复 kairon')).toBeInTheDocument()
    })

    const board = screen.getByRole('region', { name: '项目入口映射总表' })
    fireEvent.click(within(board).getByText('打开项目入口'))
    expect(onOpenTarget).toHaveBeenNthCalledWith(1, expect.objectContaining({
      tab: 'SystemMap',
      projectId: 'kairon',
    }))

    fireEvent.click(within(board).getByText('查看项目覆盖'))
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, expect.objectContaining({
      tab: 'SystemMap',
      projectId: 'kairon',
    }))

    fireEvent.click(within(board).getByText('打开项目任务'))
    expectTaskCenterDraftCall(onOpenTarget, 2, 'kairon', '项目组合：修复 kairon')

    fireEvent.click(within(board).getByText('定位缺口维度'))
    expect(onOpenTarget).toHaveBeenNthCalledWith(4, expect.objectContaining({
      tab: 'SystemMap',
      projectId: 'kairon',
      coverageDimensionId: 'verification',
    }))
  })

  it('surfaces a project dimension repair workbench', async () => {
    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '项目维度修复台' })).toBeInTheDocument()
    })

    const workbench = screen.getByRole('region', { name: '项目维度修复台' })
    const picker = within(workbench).getByRole('list', { name: '项目覆盖维度' })

    expect(within(workbench).getAllByText('验证证据').length).toBeGreaterThan(0)
    expect(within(workbench).getAllByText((_, element) => Boolean(element?.textContent?.includes('维度分'))).length).toBeGreaterThan(0)
    expect(within(workbench).getByText('缺口 1 · 提醒 0')).toBeInTheDocument()
    expect(within(workbench).getByRole('button', { name: /查看 kairon 维度修复详情/ })).toBeInTheDocument()
    expect(within(workbench).getByText('最近验证：failed，checks=1。')).toBeInTheDocument()
    expect(within(workbench).getAllByText('复跑验证').length).toBeGreaterThan(0)

    fireEvent.click(within(picker).getByRole('button', { name: /Cockpit 入口/ }))

    await waitFor(() => {
      expect(within(workbench).getByText('这个维度当前没有待处理项目')).toBeInTheDocument()
    })
  })

  it('builds a capability backlog workbench for missing pages, gaps, domains, and drafts', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      const backlog = screen.getByRole('region', { name: '能力建设 Backlog' })
      expect(backlog).toBeInTheDocument()
      expect(within(backlog).getByText('页面待补位')).toBeInTheDocument()
      expect(within(backlog).getByText('领域与缺口待收口')).toBeInTheDocument()
      expect(within(backlog).getByText('路线图与草稿承接')).toBeInTheDocument()
      expect(within(backlog).getByText('family-hub 服务')).toBeInTheDocument()
      expect(within(backlog).getAllByText('页面能力：补齐 首页').length).toBeGreaterThan(0)
      expect(within(backlog).getByText('日常路径工作台')).toBeInTheDocument()
      expect(within(backlog).getAllByText('部分项目仍需补齐状态面').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /打开待挂能力域页面 TaskCenter/ }))

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦页面' })
      expect(within(focus).getByText('任务中心')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /打开能力缺口 project-native-surface/ }))

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '当前聚焦能力缺口' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /打开待收口领域 family-hub/ }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'DomainApps', taskQuery: 'family-hub' })

    fireEvent.click(screen.getByRole('button', { name: /打开待完成路线图 daily-ops-console/ }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'Home', taskQuery: 'daily-ops-console' })

    fireEvent.click(screen.getByRole('button', { name: /打开建设草稿 页面能力：补齐 首页/ }))
    expectTaskCenterDraftCall(onOpenTarget, 2, 'Home', '页面能力：补齐 首页')
  })

  it('builds a unified construction control tower across pages, domains, verification, and roadmap', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      const tower = screen.getByRole('region', { name: '统一建设控制台' })
      expect(tower).toBeInTheDocument()
      expect(within(tower).getByText('页面能力建设')).toBeInTheDocument()
      expect(within(tower).getByText('领域挂载合同')).toBeInTheDocument()
      expect(within(tower).getByText('验证与补证')).toBeInTheDocument()
      expect(within(tower).getByText('项目与路线图优先项')).toBeInTheDocument()
      expect(within(tower).getByText('family-hub 服务')).toBeInTheDocument()
      expect(within(tower).getByText('验证补证：cockpit')).toBeInTheDocument()
      expect(within(tower).getByText('日常路径工作台')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /打开领域合同项 family-hub/ }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'DomainApps', taskQuery: 'family-hub' })

    fireEvent.click(screen.getByRole('button', { name: /打开验证补证 cockpit/ }))
    expectTaskCenterDraftCall(onOpenTarget, 1, 'cockpit', '验证补证：cockpit')

    fireEvent.click(screen.getByRole('button', { name: /打开优先项目 kairon/ }))

    await waitFor(() => {
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
    })
  })

  it('links coverage dimensions to project and triage filters', async () => {
    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('能力覆盖矩阵')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看 cockpit 项目详情' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '筛选覆盖维度：验证证据' }))

    await waitFor(() => {
      expect(screen.getByText(/覆盖维度：验证证据/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '查看 cockpit 项目详情' })).not.toBeInTheDocument()
      expect(screen.getAllByText('kairon').length).toBeGreaterThan(0)
      expect(screen.getByText(/显示 1 \/ 2 · 命令 1/)).toBeInTheDocument()
      expect(screen.getAllByText(/kairon · 复跑验证/).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /kairon 验证证据：/ }))

    await waitFor(() => {
      expect(screen.getByText(/覆盖维度：验证证据/)).toBeInTheDocument()
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
    })
  })

  it('opens a project detail panel with workflow evidence and commands', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '查看 kairon 项目详情' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '查看 kairon 项目详情' }))

    await waitFor(() => {
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
      expect(screen.getByText('项目详情')).toBeInTheDocument()
      expect(screen.getByText('工作流时间线')).toBeInTheDocument()
      expect(screen.getByText('run：run-kairon')).toBeInTheDocument()
      expect(screen.getByText(/修复 kairon 验证/)).toBeInTheDocument()
      expect(screen.getByText('checks=1')).toBeInTheDocument()
      expect(screen.getAllByText('验证证据').length).toBeGreaterThan(0)
      expect(screen.getByText('run：暂无')).toBeInTheDocument()
      expect(screen.getAllByText('复跑验证').length).toBeGreaterThan(0)
      expect(screen.getByText('查看项目草稿')).toBeInTheDocument()
      expect(screen.getByText('查看覆盖维度')).toBeInTheDocument()
      expect(screen.getByText('查看页面能力')).toBeInTheDocument()
      expect(screen.getByText('查看使用路径')).toBeInTheDocument()
      expect(screen.getAllByText('来源证据').length).toBeGreaterThan(1)
      const workbench = screen.getByRole('region', { name: '系统地图闭环工作台' })
      expect(within(workbench).getByLabelText('系统地图闭环 kairon · 项目闭环')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('查看项目草稿'))

    expectTaskCenterDraftCall(onOpenTarget, 0, 'kairon', '项目组合：修复 kairon')

    fireEvent.click(within(screen.getByLabelText('kairon 项目详情')).getByRole('button', { name: '打开项目页面' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'Overview', projectId: 'kairon' })

    fireEvent.click(screen.getByRole('button', { name: '打开系统地图闭环对象 kairon · 项目闭环' }))

    expectTaskCenterDraftCall(onOpenTarget, 2, 'kairon', '项目组合：修复 kairon')

    fireEvent.click(screen.getByText('查看覆盖维度'))

    await waitFor(() => {
      expect(screen.getByText(/覆盖维度：验证证据/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('查看页面能力'))

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '当前聚焦页面' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('查看使用路径'))

    await waitFor(() => {
      expect(screen.getAllByText('治理闭环').length).toBeGreaterThan(0)
    })
  })

  it('explains projects that do not need a long-running runtime probe', async () => {
    const staticPayload = {
      ...systemMapPayload,
      projects: [
        {
          ...cockpitProject,
          id: 'cockpit-ui',
          role: 'Web 控制台 UI',
          runtime: {
            status: 'not_applicable',
            profile: 'static',
            needs_runtime: false,
            probe_reason: '检测到 Vite/静态前端入口，按需启动开发服务器，不作为常驻运行探针。',
            ports: [],
            listening_count: 0,
            latest_verification: {
              status: 'documented',
              checks: 0,
              command: 'cd "/Users/xiamingxing/Workspace/projects/cockpit-ui" && bun run build',
              source: 'project_commands',
            },
          },
          diagnostics: [
            {
              id: 'verification-documented',
              severity: 'low',
              title: '可验证未留证',
              detail: '项目已经登记验证命令，但最近还没有 workflow 验证证据。',
              next_action: '择机运行已登记命令，并把结果补进 agent-workflow 证据。',
            },
          ],
        },
        kaironProject,
      ],
      summary: {
        ...systemMapPayload.summary,
        running_projects: 0,
        not_applicable_projects: 1,
      },
    }

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') return okJson(staticPayload)
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson(draftTasksPayload)
      if (url === `/api/cockpit/source-ref?target=${encodeURIComponent(sourceRef.target)}&context=4`) {
        return okJson(sourcePreviewPayload)
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('无需常驻 1')).toBeInTheDocument()
      expect(screen.getByText(/静态前端 · 检测到 Vite\/静态前端入口/)).toBeInTheDocument()
      expect(screen.getAllByText('可验证未留证').length).toBeGreaterThan(0)
    })
  })
})
