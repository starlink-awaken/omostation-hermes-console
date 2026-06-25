import React, { useState } from 'react';
import { Database, Search, Save, Loader2, Link as LinkIcon, BookOpen, Clock } from 'lucide-react';

export default function MemoryInjector() {
  const [activeSubTab, setActiveSubTab] = useState('write');
  
  // Write Form State
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [writeLoading, setWriteLoading] = useState(false);
  const [writeResult, setWriteResult] = useState<{status: string, msg: string} | null>(null);

  // Search State
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleWrite = async (e: React.FormEvent) => {
    e.preventDefault();
    setWriteLoading(true);
    setWriteResult(null);
    
    try {
      const response = await fetch('/api/knowledge/put', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title,
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean)
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || response.statusText);
      
      setWriteResult({ status: 'success', msg: `知识注入成功，已落盘至 bos://memory。` });
      setSlug('');
      setTitle('');
      setContent('');
      setTags('');
    } catch (err: any) {
      setWriteResult({ status: 'error', msg: `注入失败: ${err.message}` });
    } finally {
      setWriteLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    setSearchLoading(true);
    setSearchResults([]);
    
    try {
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || response.statusText);
      
      // MCP returns tools result which contains content array
      // For `search` tool, we expect a JSON string in the first text block
      const resultText = data.result?.content?.[0]?.text;
      if (resultText) {
        let cleanText = resultText.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        }
        setSearchResults(JSON.parse(cleanText));
      } else {
        setSearchResults([]);
      }
    } catch (err: any) {
      console.error(err);
      alert('检索失败: ' + err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="memory-container animate-fade-in" style={{ animationDelay: '0.2s', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Database size={24} style={{ color: 'var(--antd-primary)' }} />
        <h2>bos://memory 记忆域</h2>
      </div>

      {/* Tabs */}
      <div className="antd-card" style={{ display: 'flex', gap: '1rem', padding: '0.5rem', width: 'fit-content', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--antd-border-color)' }}>
        <button 
          className={`antd-btn ${activeSubTab === 'write' ? 'antd-btn-primary' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => setActiveSubTab('write')}
        >
          <Save size={16} /> 注入记忆
        </button>
        <button 
          className={`antd-btn ${activeSubTab === 'search' ? 'antd-btn-primary' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => setActiveSubTab('search')}
        >
          <Search size={16} /> 检索基底
        </button>
      </div>

      {/* Write View */}
      {activeSubTab === 'write' && (
        <div className="antd-card animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form onSubmit={handleWrite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="memory-slug" style={{ fontSize: '0.85rem', color: 'var(--antd-text-secondary)' }}>唯一标识 (Slug)</label>
                <input required id="memory-slug" type="text" value={slug} onChange={e => setSlug(e.target.value)} placeholder="例如: project-x-arch" className="antd-input" />
              </div>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="memory-title" style={{ fontSize: '0.85rem', color: 'var(--antd-text-secondary)' }}>标题</label>
                <input required id="memory-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="项目 X 架构说明" className="antd-input" />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="memory-content" style={{ fontSize: '0.85rem', color: 'var(--antd-text-secondary)' }}>记忆内容 (支持 Markdown)</label>
              <textarea required id="memory-content" value={content} onChange={e => setContent(e.target.value)} placeholder="在此详细描述知识或记忆记录..." className="antd-input" style={{ minHeight: '150px', resize: 'vertical', height: 'auto', padding: '8px 12px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="memory-tags" style={{ fontSize: '0.85rem', color: 'var(--antd-text-secondary)' }}>标签 (逗号分隔)</label>
              <input id="memory-tags" type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="架构, 计划, 草稿" className="antd-input" />
            </div>

            <button type="submit" disabled={writeLoading} className="antd-btn antd-btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: 'fit-content', marginTop: '0.5rem', height: '36px' }}>
              {writeLoading ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
              {writeLoading ? '正在注入知识库...' : '注入记忆'}
            </button>

            {writeResult && (
              <div aria-live="polite" style={{ padding: '0.75rem', borderRadius: 'var(--antd-radius-md)', backgroundColor: writeResult.status === 'success' ? 'var(--antd-success-bg)' : 'var(--antd-error-bg)', border: `1px solid ${writeResult.status === 'success' ? 'rgba(5,243,162,0.2)' : 'rgba(255,71,87,0.2)'}`, color: writeResult.status === 'success' ? 'var(--antd-success)' : 'var(--antd-error)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                {writeResult.msg}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Search View */}
      {activeSubTab === 'search' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <form onSubmit={handleSearch} className="antd-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Search size={18} style={{ color: 'var(--antd-text-secondary)' }} />
            <input required aria-label="检索向量空间" type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="检索向量空间 (如: '核心架构决策')" className="antd-input" style={{ flex: 1, border: 'none', backgroundColor: 'transparent' }} />
            <button type="submit" disabled={searchLoading} className="antd-btn antd-btn-primary" style={{ height: '36px' }}>
              {searchLoading ? <Loader2 size={18} className="spinner" /> : '检索'}
            </button>
          </form>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }} aria-live="polite">
            {searchResults.map((res, i) => (
              <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 0.1}s`, display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--antd-border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--antd-text-primary)' }}>{res.title}</h3>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '2px 8px', 
                    borderRadius: 'var(--antd-radius-md)', 
                    backgroundColor: 'rgba(0, 242, 254, 0.08)', 
                    color: 'var(--antd-primary)', 
                    border: '1px solid rgba(0, 242, 254, 0.15)' 
                  }}>
                    匹配度: {res.score?.toFixed(2)}
                  </span>
                </div>
                
                <p style={{ fontSize: '0.9rem', color: 'var(--antd-text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {res.chunk_text}
                </p>
                
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--antd-text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <LinkIcon size={12} /> {res.slug}
                  </div>
                  {res.effective_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {res.effective_date}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {searchResults.length === 0 && !searchLoading && (
              <div className="antd-card" style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--antd-text-secondary)' }}>
                <BookOpen size={32} style={{ margin: '0 auto 1rem', opacity: 0.5, color: 'var(--antd-text-secondary)' }} />
                <p>未找到相关记忆。请尝试输入其他关键词或注入新的知识。</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
