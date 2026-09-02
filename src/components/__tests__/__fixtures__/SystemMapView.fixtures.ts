import { vi } from 'vitest'

export const SYSTEM_MAP_DRAFT_TASKS_URL = '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80'

export const sourceRef = {
  source_key: 'system_map_api',
  label: '路线图定义',
  path: '/Users/xiamingxing/Workspace/projects/cockpit/src/cockpit/web/api_system_map.py',
  line: 512,
  exists: true,
  target: '/Users/xiamingxing/Workspace/projects/cockpit/src/cockpit/web/api_system_map.py:512',
}

export const roadmapItem = {
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

export const homePage = {
  id: 'Home',
  title: '首页',
  group: '入口',
  purpose: '健康、告警和任务的日常总览。',
  dimensions: ['entry', 'runtime'],
}

export const alertPage = {
  id: 'AlertCenter',
  title: '告警中心',
  group: '系统治理',
  purpose: '查看告警和规则。',
  dimensions: ['alert'],
}

export const taskPage = {
  id: 'TaskCenter',
  title: '任务中心',
  group: '开发工具',
  purpose: '查看任务与只读草稿。',
  dimensions: ['task'],
}

export const dailyOpsRoadmap = {
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

export const dailyUsagePath = {
  id: 'daily-ops',
  title: '日常体检',
  intent: '每天先确认健康、告警和任务是否需要处理。',
  steps: ['查看首页健康分', '进入告警中心', '打开任务中心草稿'],
  pages: [homePage, alertPage, taskPage],
  source_refs: [sourceRef],
}

export const governanceUsagePath = {
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

export const dailyPlaybook = {
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

export const runtimeDomain = {
  id: 'runtime-ops',
  title: '运行态势',
  english: 'Runtime Operations',
  capability_items: ['health', 'alerts'],
  providers: ['Home', 'AlertCenter'],
  cockpit_page: 'Home',
  coverage: 'native',
  source_refs: [sourceRef],
}

export const projectGap = {
  id: 'project-native-surface',
  severity: 'medium',
  title: '部分项目仍需补齐状态面',
  evidence: '项目矩阵存在待补能力。',
  next: '继续补齐项目原生入口。',
}

export const readyCoverageChecks = [
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

export const kaironTriageCommand = {
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

export const workflowTrace = {
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

export const cockpitProject = {
  id: 'cockpit',
  layer: 'L3',
  stack: 'Python',
  role: 'Cockpit API',
  cockpit_page: 'SystemMap',
  coverage: 'native',
  path: '/Users/xiamingxing/Workspace/projects/cockpit',
  exists: true,
  registry_contract: {
    status: 'active',
    version: '0.4.0',
    python: '>=3.13',
    build_backend: 'hatchling',
    src_dir: 'src/cockpit/',
    coverage: ['agora (BOS 网关)', 'gbrain (Postgres 知识库)'],
    missing_fields: [],
    status_text: 'ready',
  },
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

export const kaironProject = {
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

export const systemMapPayload = {
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

export const sourcePreviewPayload = {
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

export const draftTasksPayload = {
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

export function okJson(payload: unknown) {
  return { ok: true, json: async () => payload } as Response
}

export function expectTaskCenterDraftCall(
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

export function createDefaultFetchMock() {
  return async (input: RequestInfo | URL) => {
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
  }
}

export function setupSystemMapTest() {
  vi.mocked(fetch).mockReset()
  window.sessionStorage.clear()
  vi.mocked(fetch).mockImplementation(createDefaultFetchMock())
}
