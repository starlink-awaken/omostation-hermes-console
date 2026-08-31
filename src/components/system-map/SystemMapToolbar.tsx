import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { SystemMapPayload } from './types';
import { shortDate } from './utils';

type SystemMapToolbarProps = {
  systemMap: SystemMapPayload;
  onRefresh: () => void;
};

function SystemMapToolbar({ systemMap, onRefresh }: SystemMapToolbarProps) {
  return (
    <div className="system-map-toolbar">
      <div>
        <h2>工作区总图</h2>
        <p>{systemMap.architecture.model} · {systemMap.architecture.ecos_version} · {systemMap.architecture.dependency_direction}</p>
        <small className="text-muted">数据快照 {shortDate(systemMap.generated_at)} · schema {systemMap.schema_version}</small>
      </div>
      <button className="antd-btn" onClick={onRefresh}>
        <RefreshCw size={14} />
        <span>刷新</span>
      </button>
    </div>
  );
}

export default SystemMapToolbar;
