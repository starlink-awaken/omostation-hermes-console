import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Sparkles, Target, Scale, CheckCircle2 } from 'lucide-react';

interface GovernanceStatus {
  current_wave?: string;
  current_phase?: number;
  health_score?: number;
  theme: string;
}

export default function GovernanceOverviewSection() {
  const [govStatus, setGovStatus] = useState<GovernanceStatus | null>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchGov = async () => {
      setError(null);
      try {
        const [statusRes, violationsRes] = await Promise.all([
          fetch('/api/omos/status'),
          fetch('/api/omos/violations')
        ]);

        if (statusRes.ok) {
          const data = await statusRes.json();
          const system = data.system || {};
          const governance = data.governance || {};
          setGovStatus({
            current_wave: data.system?.current_wave,
            current_phase: system.current_phase,
            health_score: governance.health_score,
            theme: data.theme || '治理状态已连接，等待后端提供主题说明。'
          });
        } else {
          throw new Error('治理状态接口不可用');
        }

        if (violationsRes.ok) {
          const vData = await violationsRes.json();
          setPassed(vData.passed !== false);
          setViolations(vData.violations || []);
        } else {
          throw new Error('SSOT 校验接口不可用');
        }
      } catch (err) {
        console.error('Failed to fetch governance status:', err);
        setGovStatus(null);
        setPassed(null);
        setViolations([]);
        setError('核心治理面数据暂不可用。');
      } finally {
        setLoading(false);
      }
    };

    fetchGov();
    const interval = setInterval(fetchGov, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>
        正在读取核心治理面数据...
      </div>
    );
  }

  return (
    <section className="governance-overview-section animate-fade-in" style={{ marginTop: '0px', marginBottom: '24px' }}>
      <div className="section-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Scale size={16} style={{ color: 'var(--antd-warning)' }} />
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--antd-text-secondary)', margin: 0 }}>
          🏛️ eCOS 架构收敛与治理面板 (Governance & SSOT)
        </h3>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            border: '1px solid rgba(255, 184, 0, 0.3)',
            borderRadius: '6px',
            background: 'rgba(255, 184, 0, 0.08)',
            color: 'var(--antd-warning)',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* 左侧卡片：当前战役波次与状态 */}
        <div className="antd-card" style={{ 
          padding: '20px', 
          background: 'linear-gradient(135deg, rgba(22, 119, 255, 0.03) 0%, rgba(22, 119, 255, 0.01) 100%)',
          border: '1px solid rgba(22, 119, 255, 0.1)',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={16} style={{ color: 'var(--antd-primary)' }} />
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--antd-text-primary)' }}>
                  当前战役波次: {govStatus?.current_wave || '—'}
                </span>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.4' }}>
                {govStatus?.theme}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--antd-primary)', fontFamily: 'monospace' }}>
                {govStatus?.current_phase ? `Phase ${govStatus.current_phase}` : 'Phase —'}
              </div>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                eCOS Epoch
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block' }}>治理健康分</span>
              <strong style={{ fontSize: '18px', color: 'var(--antd-success)', display: 'block', marginTop: '4px' }}>
                {govStatus?.health_score === undefined ? '—' : `${govStatus.health_score} / 100`}
              </strong>
            </div>
            <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }}></div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block' }}>治理状态探测</span>
              <strong style={{ fontSize: '18px', color: 'var(--antd-warning)', display: 'block', marginTop: '4px' }}>
                {govStatus ? '已连接' : '未知'}
              </strong>
            </div>
          </div>
        </div>

        {/* 中间卡片：直写拦截雷达 */}
        <div className="antd-card" style={{ 
          padding: '20px', 
          border: passed === true ? '1px solid rgba(52, 199, 89, 0.15)' : passed === false ? '1px solid rgba(255, 69, 58, 0.25)' : '1px solid rgba(255, 184, 0, 0.25)',
          background: passed === true
            ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.02) 0%, rgba(52, 199, 89, 0.0) 100%)' 
            : passed === false
              ? 'linear-gradient(135deg, rgba(255, 69, 58, 0.03) 0%, rgba(255, 69, 58, 0.01) 100%)'
              : 'linear-gradient(135deg, rgba(255, 184, 0, 0.03) 0%, rgba(255, 184, 0, 0.01) 100%)',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ 
              backgroundColor: passed === true ? 'rgba(52, 199, 89, 0.1)' : passed === false ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255, 184, 0, 0.1)',
              padding: '10px', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${passed === true ? 'rgba(52, 199, 89, 0.2)' : passed === false ? 'rgba(255, 69, 58, 0.2)' : 'rgba(255, 184, 0, 0.2)'}`
            }}>
              {passed === true ? (
                <ShieldCheck size={20} style={{ color: 'var(--antd-success)' }} />
              ) : passed === false ? (
                <ShieldAlert size={20} style={{ color: 'var(--antd-error)' }} />
              ) : (
                <ShieldAlert size={20} style={{ color: 'var(--antd-warning)' }} />
              )}
            </div>
            <div>
              <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--antd-text-primary)', display: 'block' }}>
                {passed === true ? 'SSOT Guardian 物理防写校验通过' : passed === false ? '🚨 检测到直写违规 (direct-omo-io)' : 'SSOT Guardian 状态未知'}
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px', display: 'block', lineHeight: '1.4' }}>
                {passed === true
                  ? '未发现任何绕过持久化 Broker 直接修改 .omo/ 治理面的行为，代码处于健康合规状态。' 
                  : passed === false
                    ? `检测到 ${violations.length} 处违规写入。请通过 omo CLI/OMO core 或 c2g 代理更改文件！`
                    : '尚未取得 SSOT 校验结果，请恢复治理接口后重试。'}
              </span>
            </div>
          </div>

          {passed === false && violations.length > 0 && (
            <div style={{ 
              maxHeight: '70px', 
              overflowY: 'auto', 
              backgroundColor: 'rgba(0,0,0,0.2)', 
              padding: '8px 12px', 
              borderRadius: '4px',
              border: '1px solid rgba(255,69,58,0.1)'
            }}>
              {violations.slice(0, 2).map((v, i) => (
                <div key={i} style={{ fontSize: '10px', color: 'var(--antd-error)', fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                  {v.file}:{v.line} - {v.message || '禁止直写'}
                </div>
              ))}
              {violations.length > 2 && (
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
                  等其余 {violations.length - 2} 处违规...
                </div>
              )}
            </div>
          )}

          {passed === true && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--antd-success)' }}>
              <CheckCircle2 size={12} />
              <span>AST 防直写门禁持续监控中</span>
            </div>
          )}
        </div>

        {/* 右侧卡片：eCOS 治理铁律 */}
        <div className="antd-card" style={{ 
          padding: '20px', 
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>
            <Sparkles size={14} style={{ color: 'var(--antd-warning)' }} />
            <span>eCOS 核心 SSOT 治理铁律</span>
          </div>
          
          <ul style={{ 
            margin: 0, 
            paddingLeft: '16px', 
            fontSize: '11px', 
            color: 'rgba(255,255,255,0.65)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            lineHeight: '1.4'
          }}>
            <li>
              <strong>单一读写源原则</strong>：同一事实不在多处写。知识面文档引用事实面数据时，必须使用相对路径指针，不得复制内容。
            </li>
            <li>
              <strong>非 Broker 禁写原则</strong>：所有 <code>.omo/</code> 顶层治理状态的写入必须经由 OMO 内核或 c2g ingress 代理，禁绝一切 ad-hoc 脚本直接读写。
            </li>
            <li>
              <strong>强制闭环审计原则</strong>：mof-version.yaml 每次历史变动必须有相应的 git commit 记录配对，保证每次系统演进完全可追溯。
            </li>
          </ul>
        </div>

      </div>
    </section>
  );
}
