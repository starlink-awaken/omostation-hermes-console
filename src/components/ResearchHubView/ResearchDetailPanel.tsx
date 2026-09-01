import React from 'react';
import { Clock3, X } from 'lucide-react';
import { type ResearchDetailPayload } from './types';
import { shortTime, statusText } from './utils';

export function ResearchDetailPanel({
  researchDetail,
  selectedResearchId,
  detailLoading,
  detailError,
  onClose,
}: {
  researchDetail: ResearchDetailPayload | null;
  selectedResearchId: number | null;
  detailLoading: boolean;
  detailError: string | null;
  onClose: () => void;
}) {
  return (
    <section className="services-section" role="region" aria-label="研究对象详情">
      <div className="section-header">
        <div>
          <h2>{researchDetail?.item?.topic || `研究对象 #${selectedResearchId}`}</h2>
          <p className="text-muted">对象正文、证据关系、时间线和发布记录。</p>
        </div>
        <button type="button" className="icon-btn" aria-label="关闭研究对象详情" onClick={onClose} title="关闭详情">
          <X size={16} />
        </button>
      </div>

      {detailLoading && <p className="text-muted">正在读取研究对象详情...</p>}
      {detailError && <p className="text-muted">{detailError}</p>}
      {researchDetail?.item && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="antd-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <span className={`status-badge ${researchDetail.item.status === 'active' ? 'online' : researchDetail.item.status === 'archived' ? 'degraded' : 'offline'}`}>
                {statusText(researchDetail.item.status)}
              </span>
              <span className="text-muted">来源 {researchDetail.item.source_count}</span>
              <span className="text-muted">Agent {researchDetail.item.agent || '未指定'}</span>
              {researchDetail.half_life?.days !== undefined && (
                <span className="text-muted"><Clock3 size={13} style={{ verticalAlign: '-2px' }} /> 新鲜度 {researchDetail.half_life.days} 天</span>
              )}
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 14 }}>{researchDetail.item.summary || '暂无摘要'}</p>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--antd-text-secondary)', fontSize: 13 }}>
              {researchDetail.item.full_text || '暂无完整正文。'}
            </div>
            {researchDetail.item.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {researchDetail.item.tags.map((tag) => <span key={tag} className="system-map-chip degraded">{tag}</span>)}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <article className="antd-card" style={{ padding: 18 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>时间线</h3>
              {researchDetail.timeline.length === 0 ? <p className="text-muted">暂无事件。</p> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {researchDetail.timeline.map((event, index) => (
                    <div key={`${event.created_at || 'event'}-${index}`} style={{ borderLeft: '2px solid var(--antd-primary)', paddingLeft: 12 }}>
                      <strong>{event.label || event.event_type || event.type || '研究事件'}</strong>
                      <p style={{ margin: '4px 0', fontSize: 13 }}>{event.description || '暂无描述'}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>{shortTime(event.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="antd-card" style={{ padding: 18 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>发布记录</h3>
              {researchDetail.dossier.publications.length === 0 ? <p className="text-muted">尚未发布。</p> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {researchDetail.dossier.publications.map((publication, index) => (
                    <div key={`${publication.path || 'publication'}-${index}`}>
                      <strong>{publication.style || '研究输出'}</strong>
                      <p style={{ margin: '4px 0', fontSize: 13 }}>{publication.path || '未记录输出路径'}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>{shortTime(publication.published_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          <article className="antd-card" style={{ padding: 18 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>追问与关系</h3>
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <span>追问 {researchDetail.item.follow_ups.length} 条</span>
              <span>父级研究 {researchDetail.dossier.parents.length} 条，子级研究 {researchDetail.dossier.children.length} 条</span>
              {researchDetail.item.follow_ups.slice(0, 3).map((followUp, index) => (
                <span key={`follow-up-${index}`} className="text-muted">{followUp.question || '未命名追问'}</span>
              ))}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
