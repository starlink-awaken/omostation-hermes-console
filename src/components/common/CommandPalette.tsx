import React, { useState, useEffect, useRef } from 'react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Array<{
    id: string;
    label: string;
    description?: string;
    shortcut?: string;
    action: () => void;
  }>;
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      // 命令面板每次打开都从空查询和首项开始，避免沿用上次上下文。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (filteredCommands.length > 0) {
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (filteredCommands.length > 0) {
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
        onClick={e => e.stopPropagation()}
      >
        <div className="command-palette-header">
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="输入命令..."
            aria-label="命令面板搜索"
            aria-controls="cockpit-command-list"
            aria-activedescendant={filteredCommands[selectedIndex] ? `command-${filteredCommands[selectedIndex].id}` : undefined}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div id="cockpit-command-list" className="command-palette-list" role="listbox" aria-label="可用命令">
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">
              没有找到匹配的命令
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                id={`command-${cmd.id}`}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="command-item-label">{cmd.label}</div>
                {cmd.description && (
                  <div className="command-item-description">{cmd.description}</div>
                )}
                {cmd.shortcut && (
                  <div className="command-item-shortcut">{cmd.shortcut}</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
