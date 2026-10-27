import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Megaphone,
  MessageSquare,
  CheckCircle2,
  FolderGit2,
  Info,
} from 'lucide-react';
import { communicationApi } from '../api/communication';
import { projectsApi } from '../api/client';
import type { NotificationDto } from '@cloudlab/shared-types';

import { getAccessToken } from '../utils/auth';

function formatRelativeTime(dateStr: string): string {
  try {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

export const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const commPromise = communicationApi.getNotifications().catch(() => []);
      const projPromise = projectsApi.getNotifications().then((res: any) => res.data?.data || []).catch(() => []);

      const [commList, projList] = await Promise.all([commPromise, projPromise]);

      const mappedProjNotifs: NotificationDto[] = (projList || []).map((pn: any) => ({
        id: pn.id,
        userId: pn.userId,
        type: 'PROJECT_EVENT' as const,
        title: pn.title,
        message: pn.message,
        referenceId: pn.projectId,
        linkUrl: pn.projectId ? `/projects/${pn.projectId}` : '/projects',
        isRead: !!(pn.read ?? pn.isRead),
        createdAt: pn.createdAt,
      }));

      const notifMap = new Map<string, NotificationDto>();
      [...commList, ...mappedProjNotifs].forEach((n) => {
        if (!notifMap.has(n.id)) {
          notifMap.set(n.id, n);
        }
      });
      const combined = Array.from(notifMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(combined);
      setUnreadCount(combined.filter((n) => !n.isRead).length);
    } catch (err) {
      // Silently fail if not logged in
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Setup WebSocket real-time connection
    const token = getAccessToken();
    let ws: WebSocket | null = null;
    let pollTimer: NodeJS.Timeout | null = null;

    if (token) {
      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host; // API Gateway host
        const wsUrl = `${wsProtocol}//${wsHost}/ws/notifications?token=${token}`;

        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification' && data.notification) {
              setNotifications((prev) => [data.notification, ...prev]);
              setUnreadCount((prev) => prev + 1);
            }
          } catch (e) {
            // Ignore format errors
          }
        };

        ws.onerror = () => {
          // Fallback to polling every 15s if WS error occurs
          pollTimer = setInterval(fetchNotifications, 15000);
        };
      } catch (err) {
        pollTimer = setInterval(fetchNotifications, 15000);
      }
    } else {
      pollTimer = setInterval(fetchNotifications, 15000);
    }

    return () => {
      if (ws) ws.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await Promise.allSettled([
        communicationApi.markNotificationRead(id),
        projectsApi.markNotificationRead(id),
      ]);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await Promise.allSettled([
        communicationApi.markAllNotificationsRead(),
        ...notifications.filter((n) => !n.isRead).map((n) => projectsApi.markNotificationRead(n.id)),
      ]);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationDto) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.linkUrl) {
      navigate(notif.linkUrl);
    } else if (notif.type === 'PROJECT_EVENT') {
      navigate('/projects');
    } else {
      navigate('/community');
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT':
        return <Megaphone size={16} color="#00d4ff" />;
      case 'FORUM_REPLY':
        return <MessageSquare size={16} color="#a855f7" />;
      case 'FORUM_SOLVED':
        return <CheckCircle2 size={16} color="#10b981" />;
      case 'PROJECT_EVENT':
        return <FolderGit2 size={16} color="#f59e0b" />;
      default:
        return <Info size={16} color="#3b82f6" />;
    }
  };

  return (
    <div className="nav-notification-menu" ref={dropdownRef}>
      <button
        type="button"
        className={`btn-icon-nav ${isOpen ? 'active' : ''}`}
        onClick={() => {
          setIsOpen((v) => !v);
          if (!isOpen) fetchNotifications();
        }}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <div className="notif-title-group">
              <span className="notif-title">Notifications</span>
              {unreadCount > 0 && <span className="notif-pill">{unreadCount} unread</span>}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn-mark-all-read"
                onClick={handleMarkAllRead}
                disabled={loading}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={24} color="#64748b" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="notif-icon-wrapper">{getNotifIcon(n.type)}</div>
                  <div className="notif-content">
                    <div className="notif-item-header">
                      <span className="notif-item-title">{n.title}</span>
                      <span className="notif-time">{formatRelativeTime(n.createdAt)}</span>
                    </div>
                    <p className="notif-message">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      className="btn-read-check"
                      title="Mark as read"
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .nav-notification-menu {
          position: relative;
        }

        .btn-icon-nav {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-icon-nav:hover,
        .btn-icon-nav.active {
          background: rgba(0, 212, 255, 0.12);
          border-color: rgba(0, 212, 255, 0.35);
          color: #00d4ff;
        }

        .notif-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: linear-gradient(135deg, #ef4444, #f43f5e);
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 5px;
          min-width: 17px;
          height: 17px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #0d121d;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
          animation: pulseBadge 2s infinite;
        }

        @keyframes pulseBadge {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }

        .notif-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 340px;
          max-height: 440px;
          background: rgba(15, 22, 36, 0.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 212, 255, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 250;
          animation: notifFadeIn 0.15s ease;
        }

        @keyframes notifFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
        }

        .notif-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notif-title {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
        }

        .notif-pill {
          font-size: 10px;
          font-weight: 700;
          background: rgba(0, 212, 255, 0.15);
          color: #00d4ff;
          padding: 2px 7px;
          border-radius: 10px;
          border: 1px solid rgba(0, 212, 255, 0.3);
        }

        .btn-mark-all-read {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 11.5px;
          cursor: pointer;
          transition: color 0.15s;
        }

        .btn-mark-all-read:hover {
          color: #00d4ff;
        }

        .notif-list {
          overflow-y: auto;
          max-height: 380px;
        }

        .notif-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: #64748b;
          gap: 10px;
          font-size: 13px;
        }

        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          cursor: pointer;
          transition: background 0.15s ease;
          position: relative;
        }

        .notif-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .notif-item.unread {
          background: rgba(0, 212, 255, 0.05);
        }

        .notif-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notif-content {
          flex: 1;
          min-width: 0;
        }

        .notif-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 3px;
        }

        .notif-item-title {
          font-size: 12.5px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .notif-time {
          font-size: 10.5px;
          color: #64748b;
          flex-shrink: 0;
        }

        .notif-message {
          font-size: 11.5px;
          color: #94a3b8;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .btn-read-check {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        .btn-read-check:hover {
          color: #00d4ff;
          background: rgba(0, 212, 255, 0.1);
        }
      `}</style>
    </div>
  );
};
