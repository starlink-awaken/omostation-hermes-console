/**
 * AssetsView with React Query integration.
 */

import React, { useState } from 'react';
import { Briefcase, GitCommit, Activity, RefreshCw, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

// ── Types ──

interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  version: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface AssetListResponse {
  assets: Asset[];
}

// ── Hook ──

function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await apiFetch<AssetListResponse>('/api/ecos/skills');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch assets');
      }
      return response.data?.assets || [];
    },
    staleTime: 60000,
    refetchInterval: 60000,
    retry: 3,
  });
}

// ── Component ──

export default function AssetsView() {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [filterType, setFilterType] = useState('all');

  const { data: assets, isLoading, error } = useAssets();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'published':
        return 'var(--antd-success)';
      case 'draft':
        return 'var(--antd-warning)';
      case 'deprecated':
        return 'var(--antd-error)';
      default:
        return 'var(--antd-text-muted)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
      case 'published':
        return '已发布';
      case 'draft':
        return '草稿';
      case 'deprecated':
        return '已弃用';
      default:
        return '未知';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'skill':
        return <Briefcase size={16} className="text-primary" />;
      case 'workflow':
        return <GitCommit size={16} className="text-info" />;
      case 'pipeline':
        return <Activity size={16} className="text-warning" />;
      default:
        return <Briefcase size={16} className="text-muted" />;
    }
  };

  const displayAssets = assets || [];
  const types = [...new Set(displayAssets.map((asset) => asset.type))];

  // Filter assets
  const filteredAssets = filterType === 'all'
    ? displayAssets
    : displayAssets.filter((asset) => asset.type === filterType);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>技术资产库</h1>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: '8px' }} />
          <div>加载中...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div role="alert" style={{ 
          padding: '16px', 
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--antd-error)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Activity size={16} />
            <strong>资产数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error.message}</div>
        </div>
      )}

      {/* Type Filter */}
      {types.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`antd-btn ${filterType === 'all' ? 'antd-btn-primary' : ''}`}
            onClick={() => setFilterType('all')}
            aria-label="显示所有类型"
          >
            全部
          </button>
          {types.map((type) => (
            <button
              key={type}
              className={`antd-btn ${filterType === type ? 'antd-btn-primary' : ''}`}
              onClick={() => setFilterType(type)}
              aria-label={`筛选类型 ${type}`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Asset List */}
      {filteredAssets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="antd-card"
              style={{ 
                cursor: 'pointer',
                borderLeft: `4px solid ${getStatusColor(asset.status)}`,
              }}
              onClick={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
              role="button"
              tabIndex={0}
              aria-label={`查看资产 ${asset.name}`}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                {getTypeIcon(asset.type)}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{asset.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                    类型: {asset.type} · 版本: {asset.version}
                  </div>
                </div>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 500,
                  color: getStatusColor(asset.status),
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: `${getStatusColor(asset.status)}15`,
                }}>
                  {getStatusText(asset.status)}
                </span>
              </div>
              
              {asset.description && (
                <div style={{ fontSize: '13px', color: 'var(--antd-text-secondary)', marginBottom: '8px' }}>
                  {asset.description}
                </div>
              )}
              
              <div style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
                更新时间: {new Date(asset.updated_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Asset Detail */}
      {selectedAsset && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>资产详情</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>名称</div>
              <div style={{ fontWeight: 500 }}>{selectedAsset.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>类型</div>
              <div>{selectedAsset.type}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>状态</div>
              <span style={{ 
                color: getStatusColor(selectedAsset.status),
                fontWeight: 500,
              }}>
                {getStatusText(selectedAsset.status)}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>版本</div>
              <div>{selectedAsset.version}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>创建时间</div>
              <div style={{ fontSize: '13px' }}>{new Date(selectedAsset.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>更新时间</div>
              <div style={{ fontSize: '13px' }}>{new Date(selectedAsset.updated_at).toLocaleString()}</div>
            </div>
          </div>
          
          {selectedAsset.description && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '8px' }}>描述</div>
              <div style={{ 
                padding: '12px', 
                background: 'rgba(0, 242, 254, 0.03)',
                border: '1px solid rgba(0, 242, 254, 0.08)',
                borderRadius: '4px',
                fontSize: '13px',
              }}>
                {selectedAsset.description}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
