/**
 * NodeTrafficTable — 节点流量数据表格.
 */

import React from 'react';
import type { NodeTraffic } from './computeViewTypes';

interface NodeTrafficTableProps {
  nodes: NodeTraffic[];
}

export default function NodeTrafficTable({ nodes }: NodeTrafficTableProps) {
  if (nodes.length === 0) return null;

  return (
    <div className="antd-card">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>节点流量</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--antd-border-color)' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>节点</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>调用</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Token</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>成本</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>云成本</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>节省</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>延迟</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.node_id} style={{ borderBottom: '1px solid var(--antd-border-color)' }}>
                <td style={{ padding: '8px' }}>{node.node_label}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{(node.calls ?? 0).toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{(node.tokens ?? 0).toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>${(node.estimated_cost_usd ?? 0).toFixed(4)}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>${(node.equivalent_cloud_cost_usd ?? 0).toFixed(4)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: 'var(--antd-success)' }}>
                  ${(node.saved_vs_cloud_usd ?? 0).toFixed(4)}
                </td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  {node.latency_ms_avg ? `${node.latency_ms_avg.toFixed(0)}ms` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
