import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User, Settings, Bell } from 'lucide-react';
import { useCockpitStore } from '../../store';

/**
 * UserMenu — dropdown showing user info from Zustand store.
 * Includes logout action and notification badge.
 */
export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const user = useCockpitStore((s) => s.user);
  const logout = useCockpitStore((s) => s.user.logout);
  const unreadCount = useCockpitStore((s) => s.notifications.unreadCount);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-profile-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="用户菜单"
      >
        <div className="avatar" aria-hidden="true">
          {user.avatar}
        </div>
        <span className="user-name">{user.name}</span>
        {unreadCount > 0 && (
          <span className="notification-badge" aria-label={`${unreadCount} 条未读通知`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="user-menu-dropdown" role="menu">
          {/* User info header */}
          <div className="user-menu-header">
            <div className="avatar avatar-lg" aria-hidden="true">
              {user.avatar}
            </div>
            <div className="user-menu-info">
              <div className="user-menu-name">{user.name}</div>
              <div className="user-menu-role">{user.role}</div>
            </div>
          </div>

          <div className="user-menu-divider" role="separator" />

          {/* Menu items */}
          <button className="user-menu-item" role="menuitem" onClick={() => setIsOpen(false)}>
            <User size={14} aria-hidden="true" />
            <span>个人资料</span>
          </button>
          <button className="user-menu-item" role="menuitem" onClick={() => setIsOpen(false)}>
            <Settings size={14} aria-hidden="true" />
            <span>偏好设置</span>
          </button>
          <button className="user-menu-item" role="menuitem" onClick={() => setIsOpen(false)}>
            <Bell size={14} aria-hidden="true" />
            <span>通知中心</span>
            {unreadCount > 0 && (
              <span className="user-menu-badge">{unreadCount}</span>
            )}
          </button>

          <div className="user-menu-divider" role="separator" />

          <button
            className="user-menu-item user-menu-logout"
            role="menuitem"
            onClick={handleLogout}
          >
            <LogOut size={14} aria-hidden="true" />
            <span>退出登录</span>
          </button>
        </div>
      )}
    </div>
  );
}
