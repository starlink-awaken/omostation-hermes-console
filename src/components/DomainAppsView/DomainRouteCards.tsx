import React from 'react';
import { AppWindow, ExternalLink, FileText } from 'lucide-react';
import { type DomainRouteCard } from './types';

export function DomainRouteCards({
  cards,
  onPrimaryAction,
  onSecondaryAction,
}: {
  cards: DomainRouteCard[];
  onPrimaryAction: (card: DomainRouteCard) => void;
  onSecondaryAction: (card: DomainRouteCard) => void;
}) {
  return (
    <section className="services-section" aria-label="领域承接路径" style={{ marginBottom: 20 }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, margin: 0 }}>领域承接路径</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            把 Cockpit 入口、领域 SSOT、运行对象和任务承接页连成一条线，避免从 Dashboard 跳进来后还得自己猜下一步。
          </p>
        </div>
        <span className={`status-badge ${cards.length > 1 ? 'online' : 'degraded'}`}>
          已编排 {cards.length} 条
        </span>
      </div>

      <div className="domain-route-grid">
        {cards.map((card) => (
          <article key={card.id} className="domain-route-card">
            <div className="domain-route-head">
              <div>
                <h3>{card.title}</h3>
                <p>{card.subtitle}</p>
              </div>
              <button
                className="antd-btn small"
                aria-label={`打开领域承接 ${card.title}`}
                onClick={() => onPrimaryAction(card)}
              >
                <FileText size={13} />
                <span>{card.primaryActionLabel}</span>
              </button>
            </div>

            <p className="domain-route-summary">{card.summary}</p>

            <div className="domain-route-links">
              <div className="domain-route-link">
                <span>Cockpit 入口</span>
                <strong>{card.entryValue}</strong>
                <small>入口页先负责挂载、状态和跳转，不直接接管领域真数据。</small>
              </div>
              <div className="domain-route-link">
                <span>领域 SSOT</span>
                <strong>{card.ssotValue}</strong>
                <small>真实内容和结构继续留在领域侧，Cockpit 只读聚合或有限写回。</small>
              </div>
              <div className="domain-route-link">
                <span>任务承接</span>
                <strong>{card.handoffValue}</strong>
                <small>{card.nextAction}</small>
              </div>
            </div>

            <div className="domain-route-actions">
              {card.secondaryAction ? (
                <button
                  className="antd-btn small"
                  aria-label={`打开领域承接任务 ${card.title}`}
                  onClick={() => onSecondaryAction(card)}
                >
                  <AppWindow size={13} />
                  <span>{card.secondaryActionLabel}</span>
                </button>
              ) : null}
              {card.launchUrl ? (
                <a className="antd-btn small" href={card.launchUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={13} />
                  <span>打开入口</span>
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
