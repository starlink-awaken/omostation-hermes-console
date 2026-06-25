# Phase 1: 首页重新设计 + 告警中心 + 图表集成

> 细化方案到每一个页面，规范 API，启动落地实施

---

## 一、页面设计规范

### 1.1 首页 (Home)

#### 页面结构

```
┌─────────────────────────────────────────────────────────────────┐
│ 系统健康总览                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 健康分数  │ │ 活跃服务  │ │ 活跃任务  │ │ 今日请求  │           │
│  │   98     │ │  24/28   │ │    12    │ │  12.4k   │           │
│  │  ↑ 2%   │ │  ↑ 1    │ │  ↓ 3    │ │  ↑ 15%  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 实时告警 (3)                              [查看全部] [配置规则]   │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 [L4] vault 域信号数异常 (160个)           2 分钟前            │
│ 🟡 [Agora] LLM Gateway 延迟升高 (850ms)     5 分钟前            │
│ 🟡 [KOS] 搜索索引重建中                      10 分钟前           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 关键指标趋势                              [1h] [6h] [24h] [7d]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [健康分数趋势图]    [请求数趋势图]    [错误率趋势图]              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 最近任务                                        [查看全部任务]   │
├─────────────────────────────────────────────────────────────────┤
│ 📋 TASK-001: L4 域优化                        进行中  60%       │
│ 📋 TASK-002: 告警规则配置                      已完成  100%      │
│ 📋 TASK-003: 数据库迁移                        待处理  0%        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 快速入口                                                        │
├─────────────────────────────────────────────────────────────────┤
│ [创建任务] [查看日志] [搜索知识] [打开终端] [查看拓扑]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 数据需求

| 区域 | API 接口 | 数据字段 |
|------|----------|----------|
| 系统健康总览 | `GET /api/health/summary` | health_score, active_services, active_tasks, today_requests |
| 实时告警 | `GET /api/alerts?limit=3&status=active` | id, level, source, message, timestamp |
| 关键指标趋势 | `GET /api/metrics/trend?range=24h` | timestamp, health_score, requests, error_rate |
| 最近任务 | `GET /api/tasks?limit=3&sort=updated` | id, title, status, progress |
| 快速入口 | 静态配置 | - |

#### 组件设计

```typescript
// HomePage.tsx
interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = () => {
  return (
    <div className="home-page">
      {/* 系统健康总览 */}
      <HealthSummarySection />
      
      {/* 实时告警 */}
      <AlertFeedSection limit={3} />
      
      {/* 关键指标趋势 */}
      <MetricsTrendSection />
      
      {/* 最近任务 */}
      <RecentTasksSection limit={3} />
      
      {/* 快速入口 */}
      <QuickActionsSection />
    </div>
  );
};
```

---

### 1.2 告警中心 (Alert Center)

#### 页面结构

```
┌─────────────────────────────────────────────────────────────────┐
│ 告警中心                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 告警统计                                                  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 🔴 严重: 2  │ 🟠 错误: 5  │ 🟡 警告: 12  │ 🔵 信息: 30  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 活跃告警                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [过滤: 全部 ▼] [级别 ▼] [来源 ▼] [时间 ▼]     [搜索...]       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔴 vault 域信号数异常 (160个)                              │   │
│  │ 来源: L4 Health  │ 时间: 2 分钟前  │ 状态: 活跃            │   │
│  │ 描述: vault 域信号数量超过阈值，可能存在...                  │   │
│  │ [查看详情] [确认] [静默] [解决]                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🟡 LLM Gateway 延迟升高 (850ms)                           │   │
│  │ 来源: Agora  │ 时间: 5 分钟前  │ 状态: 活跃                │   │
│  │ 描述: LLM Gateway 响应延迟超过阈值...                      │   │
│  │ [查看详情] [确认] [静默] [解决]                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 告警历史                                        [导出] [分析]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [时间范围: 最近 7 天 ▼]                                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 时间 │ 级别 │ 来源 │ 消息 │ 状态 │ 操作人                  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 10:30 │ 🔴 │ L4 │ vault 异常 │ 活跃 │ -                    │   │
│  │ 10:25 │ 🟡 │ Agora │ 延迟升高 │ 已确认 │ admin              │   │
│  │ 10:20 │ 🟡 │ KOS │ 索引重建 │ 已解决 │ system               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 告警规则配置                                    [+ 新增规则]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 规则名称 │ 条件 │ 级别 │ 通知渠道 │ 状态 │ 操作            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 健康率下降 │ health_rate < 100% │ 🔴 │ Slack+邮件 │ 启用 │   │
│  │ 信号数异常 │ signal_count > 100 │ 🟡 │ Slack │ 启用        │   │
│  │ 域不健康 │ fresh = false │ 🔴 │ 全部 │ 启用              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### API 接口规范

```typescript
// 告警相关 API
GET    /api/alerts                    // 获取告警列表
GET    /api/alerts/:id                // 获取告警详情
POST   /api/alerts/:id/acknowledge    // 确认告警
POST   /api/alerts/:id/silence        // 静默告警
POST   /api/alerts/:id/resolve        // 解决告警
GET    /api/alerts/history            // 获取告警历史
GET    /api/alerts/rules              // 获取告警规则列表
POST   /api/alerts/rules              // 创建告警规则
PUT    /api/alerts/rules/:id          // 更新告警规则
DELETE /api/alerts/rules/:id          // 删除告警规则
```

#### 数据模型

```typescript
interface Alert {
  id: string;
  level: 'critical' | 'error' | 'warning' | 'info';
  source: string;
  message: string;
  description?: string;
  status: 'active' | 'acknowledged' | 'silenced' | 'resolved';
  created_at: string;
  updated_at: string;
  acknowledged_by?: string;
  resolved_by?: string;
  resolved_at?: string;
  metadata?: Record<string, any>;
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  level: Alert['level'];
  channels: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
```

---

### 1.3 首页图表设计

#### 图表类型

| 图表 | 类型 | 数据 | 交互 |
|------|------|------|------|
| 健康分数趋势 | 折线图 | 24h 健康分数 | 悬停显示详情 |
| 请求数趋势 | 面积图 | 24h 请求数 | 时间范围选择 |
| 错误率趋势 | 折线图 | 24h 错误率 | 阈值线标记 |
| 服务状态分布 | 环形图 | 在线/离线/降级 | 点击跳转 |
| 告警级别分布 | 柱状图 | 严重/错误/警告/信息 | 点击过滤 |

#### 图表组件

```typescript
// LineChart.tsx
interface LineChartProps {
  data: DataPoint[];
  xField: string;
  yField: string;
  title: string;
  color?: string;
  showThreshold?: boolean;
  threshold?: number;
  onPointClick?: (point: DataPoint) => void;
}

// AreaChart.tsx
interface AreaChartProps {
  data: DataPoint[];
  xField: string;
  yField: string;
  title: string;
  color?: string;
  gradient?: boolean;
}

// PieChart.tsx
interface PieChartProps {
  data: DataPoint[];
  nameField: string;
  valueField: string;
  title: string;
  colors?: string[];
  innerRadius?: number;
  onSliceClick?: (slice: DataPoint) => void;
}

// BarChart.tsx
interface BarChartProps {
  data: DataPoint[];
  xField: string;
  yField: string;
  title: string;
  color?: string;
  stacked?: boolean;
}
```

---

## 二、API 接口规范

### 2.1 统一响应格式

```typescript
interface ApiResponse<T> {
  code: number;           // 状态码：0=成功，非0=失败
  message: string;        // 状态消息
  data: T;                // 响应数据
  timestamp: string;      // 响应时间戳
  request_id: string;     // 请求ID
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}
```

### 2.2 健康概览 API

```typescript
// GET /api/health/summary
interface HealthSummary {
  health_score: number;           // 健康分数 (0-100)
  health_score_change: number;    // 健康分数变化 (百分比)
  active_services: number;        // 活跃服务数
  total_services: number;         // 总服务数
  active_tasks: number;           // 活跃任务数
  today_requests: number;         // 今日请求数
  today_requests_change: number;  // 请求数变化 (百分比)
}
```

### 2.3 告警 API

```typescript
// GET /api/alerts
interface AlertListRequest {
  status?: 'active' | 'acknowledged' | 'silenced' | 'resolved';
  level?: 'critical' | 'error' | 'warning' | 'info';
  source?: string;
  start_time?: string;
  end_time?: string;
  page?: number;
  page_size?: number;
}

// POST /api/alerts/:id/acknowledge
interface AcknowledgeAlertRequest {
  comment?: string;
}

// POST /api/alerts/:id/silence
interface SilenceAlertRequest {
  duration: number;  // 静默时长 (分钟)
  reason?: string;
}

// POST /api/alerts/:id/resolve
interface ResolveAlertRequest {
  comment?: string;
}
```

### 2.4 指标趋势 API

```typescript
// GET /api/metrics/trend
interface MetricsTrendRequest {
  range: '1h' | '6h' | '24h' | '7d' | '30d';
  metrics?: string[];  // 指标名称列表
}

interface MetricsTrendResponse {
  timestamps: string[];
  metrics: {
    [key: string]: number[];
  };
}
```

### 2.5 任务 API

```typescript
// GET /api/tasks
interface TaskListRequest {
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  limit?: number;
  sort?: 'created' | 'updated';
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  updated_at: string;
  assignee?: string;
}
```

---

## 三、实施计划

### 3.1 Phase 1.1: 首页重新设计（3 天）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| HealthSummarySection | 0.5 天 | 健康总览卡片 |
| AlertFeedSection | 0.5 天 | 实时告警流 |
| MetricsTrendSection | 1 天 | 关键指标趋势图表 |
| RecentTasksSection | 0.5 天 | 最近任务列表 |
| QuickActionsSection | 0.5 天 | 快速入口 |

### 3.2 Phase 1.2: 告警中心（3 天）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| AlertSummary | 0.5 天 | 告警统计卡片 |
| AlertList | 1 天 | 活跃告警列表 |
| AlertHistory | 0.5 天 | 告警历史 |
| AlertRules | 1 天 | 告警规则配置 |

### 3.3 Phase 1.3: 图表集成（2 天）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 图表库集成 | 0.5 天 | 引入 Recharts |
| LineChart 组件 | 0.5 天 | 折线图组件 |
| AreaChart 组件 | 0.5 天 | 面积图组件 |
| PieChart 组件 | 0.5 天 | 饼图组件 |

### 3.4 Phase 1.4: API 对接（2 天）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 健康概览 API | 0.5 天 | cockpit 后端实现 |
| 告警 API | 1 天 | cockpit 后端实现 |
| 指标趋势 API | 0.5 天 | cockpit 后端实现 |

---

## 四、技术实现

### 4.1 前端组件结构

```
src/
├── components/
│   ├── charts/
│   │   ├── LineChart.tsx
│   │   ├── AreaChart.tsx
│   │   ├── PieChart.tsx
│   │   └── BarChart.tsx
│   │
│   ├── home/
│   │   ├── HealthSummarySection.tsx
│   │   ├── AlertFeedSection.tsx
│   │   ├── MetricsTrendSection.tsx
│   │   ├── RecentTasksSection.tsx
│   │   └── QuickActionsSection.tsx
│   │
│   ├── alerts/
│   │   ├── AlertSummary.tsx
│   │   ├── AlertList.tsx
│   │   ├── AlertHistory.tsx
│   │   ├── AlertRules.tsx
│   │   └── AlertCard.tsx
│   │
│   └── common/
│       ├── TimeRangePicker.tsx
│       ├── StatusBadge.tsx
│       └── ...
│
├── pages/
│   ├── HomePage.tsx
│   ├── AlertCenterPage.tsx
│   └── ...
│
├── services/
│   ├── healthService.ts
│   ├── alertService.ts
│   ├── metricsService.ts
│   └── taskService.ts
│
└── stores/
    ├── healthStore.ts
    ├── alertStore.ts
    └── ...
```

### 4.2 后端 API 结构

```
src/cockpit/web/
├── api_health.py        # 健康概览 API
├── api_alerts.py        # 告警 API
├── api_metrics.py       # 指标趋势 API
├── api_tasks.py         # 任务 API
└── ...
```

---

## 五、验收标准

### 5.1 首页验收标准

- [ ] 健康总览卡片显示正确数据
- [ ] 实时告警流每 30 秒自动刷新
- [ ] 关键指标趋势图表正常显示
- [ ] 时间范围选择器工作正常
- [ ] 最近任务列表显示正确
- [ ] 快速入口链接正确

### 5.2 告警中心验收标准

- [ ] 告警统计卡片显示正确
- [ ] 活跃告警列表正常显示
- [ ] 告警过滤功能正常
- [ ] 告警操作（确认/静默/解决）正常
- [ ] 告警历史查询正常
- [ ] 告警规则配置正常

### 5.3 图表验收标准

- [ ] 折线图正常显示
- [ ] 面积图正常显示
- [ ] 饼图正常显示
- [ ] 图表交互正常
- [ ] 图表响应式布局

---

*文档版本: v1.0*
*创建时间: 2026-06-25*
*状态: 待实施*
