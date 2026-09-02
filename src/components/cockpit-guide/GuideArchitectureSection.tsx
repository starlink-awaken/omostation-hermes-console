import React from 'react';
import { ArrowRight, Compass, LayoutDashboard, Map as MapIcon } from 'lucide-react';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import type { GuideGroup } from './types';

interface GuideArchitectureSectionProps {
  GUIDE_GROUPS: GuideGroup[];
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuideArchitectureSection({ GUIDE_GROUPS, onNavigate, onOpenTarget }: GuideArchitectureSectionProps) {
  return (
    <>
      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>功能架构</h2>
            <p className="text-muted">每个工作带说明这组页面负责什么，以及什么时候该去那里。</p>
          </div>
        </div>
        <div className="cockpit-guide-architecture">
          {GUIDE_GROUPS.map((group) => (
            <section key={group.id} className="cockpit-guide-group">
              <div className="cockpit-guide-group-head">
                <div>
                  <small>{group.summary}</small>
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>
                <button
                  type="button"
                  className="antd-btn cockpit-guide-group-btn"
                  aria-label={`打开分组 ${group.title}`}
                  onClick={() => openCockpitNavigationTarget(group.target, onNavigate, onOpenTarget)}
                >
                  <Compass size={14} />
                  <span>打开主入口</span>
                </button>
              </div>
              <div className="cockpit-guide-page-grid">
                {group.pages.map((page) => (
                  <article key={page.id} className="cockpit-guide-page-card">
                    <div className="cockpit-guide-page-head">
                      <strong>{page.title}</strong>
                      <span>{page.id}</span>
                    </div>
                    <p>{page.purpose}</p>
                    <small>{page.whenToUse}</small>
                    <div className="cockpit-guide-page-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开页面 ${page.title}`}
                        onClick={() => openCockpitNavigationTarget({ tab: page.id }, onNavigate, onOpenTarget)}
                      >
                        <ArrowRight size={14} />
                        <span>打开页面</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn secondary"
                        aria-label={`查看页面覆盖 ${page.title}`}
                        onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: page.id }, onNavigate, onOpenTarget)}
                      >
                        <MapIcon size={14} />
                        <span>看覆盖</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>使用原则</h2>
            <p className="text-muted">把 cockpit 当成入口、状态面和承接台，而不是把所有领域 UI 都塞进来。</p>
          </div>
        </div>
        <div className="cockpit-guide-principles">
          <article className="cockpit-guide-principle-card">
            <LayoutDashboard size={16} />
            <strong>先路径，后页面</strong>
            <p>优先按值守、治理、研究、领域挂载这些目标使用，而不是凭感觉跳菜单。</p>
          </article>
          <article className="cockpit-guide-principle-card">
            <MapIcon size={16} />
            <strong>先总图，后补位</strong>
            <p>当你觉得功能缺失，先去系统地图定位是页面缺口、能力域缺口还是领域应用没挂上来。</p>
          </article>
          <article className="cockpit-guide-principle-card">
            <Compass size={16} />
            <strong>入口不等于吞并</strong>
            <p>家庭驾驶舱、OPC、family-hub 保留各自 SSOT 和专业面，cockpit 只负责挂载、导航、治理和状态。</p>
          </article>
        </div>
      </section>
    </>
  );
}
