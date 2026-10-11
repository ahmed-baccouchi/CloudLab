import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Megaphone,
  Bot,
  Plus,
  Search,
  CheckCircle2,
  Eye,
  MessageCircle,
  Pin,
  Filter,
  Trash2,
  Edit3,
  Calendar,
  User as UserIcon,
  Tag,
  X,
  FileText,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { communicationApi } from '../../api/communication';
import type {
  AnnouncementDto,
  ForumCategoryDto,
  DiscussionDto,
  AnnouncementType,
  AnnouncementTargetAudience,
} from '@cloudlab/shared-types';

import { getUserFromStorage, getUserRole } from '../../utils/auth';
import { AiAssistantWidget } from '../../components/AiAssistantWidget';

type TabType = 'announcements' | 'forum' | 'ai';

export const CommunityHubPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getUserFromStorage();
  const role = currentUser?.role || getUserRole();

  const [activeTab, setActiveTab] = useState<TabType>('announcements');

  // Announcements state
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [annFilterType, setAnnFilterType] = useState<string>('ALL');
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [showCreateAnnModal, setShowCreateAnnModal] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnType, setNewAnnType] = useState<AnnouncementType>('GENERAL');
  const [newAnnTarget, setNewAnnTarget] = useState<AnnouncementTargetAudience>('ALL');

  // Forum state
  const [categories, setCategories] = useState<ForumCategoryDto[]>([]);
  const [discussions, setDiscussions] = useState<DiscussionDto[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingForum, setLoadingForum] = useState(false);
  const [showCreateDiscModal, setShowCreateDiscModal] = useState(false);

  // New discussion form state
  const [newDiscTitle, setNewDiscTitle] = useState('');
  const [newDiscContent, setNewDiscContent] = useState('');
  const [newDiscCatId, setNewDiscCatId] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const canManageAnnouncements = role === 'INSTRUCTOR' || role === 'ADMIN';

  useEffect(() => {
    loadAnnouncements();
    loadCategories();
    loadDiscussions();
  }, []);

  useEffect(() => {
    loadDiscussions();
  }, [selectedCatId, selectedStatus, searchQuery]);

  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      const list = await communicationApi.getAnnouncements();
      setAnnouncements(list);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const loadCategories = async () => {
    try {
      const list = await communicationApi.getForumCategories();
      setCategories(list);
      if (list.length > 0 && !newDiscCatId) {
        setNewDiscCatId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load forum categories:', err);
    }
  };

  const loadDiscussions = async () => {
    try {
      setLoadingForum(true);
      const list = await communicationApi.getDiscussions({
        categoryId: selectedCatId || undefined,
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
      });
      setDiscussions(list);
    } catch (err) {
      console.error('Failed to load discussions:', err);
    } finally {
      setLoadingForum(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;

    try {
      await communicationApi.createAnnouncement({
        title: newAnnTitle,
        content: newAnnContent,
        type: newAnnType,
        targetAudience: newAnnTarget,
        isPublished: true,
      });

      setShowCreateAnnModal(false);
      setNewAnnTitle('');
      setNewAnnContent('');
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to create announcement:', err);
    }
  };

  const handleDeleteAnnouncement = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await communicationApi.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  const handleMarkAnnRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await communicationApi.markAnnouncementRead(id);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, readByUserIds: [...(a.readByUserIds || []), currentUser?.id || ''] } : a))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscTitle.trim() || !newDiscContent.trim() || !newDiscCatId) return;

    try {
      const disc = await communicationApi.createDiscussion({
        categoryId: newDiscCatId,
        title: newDiscTitle,
        content: newDiscContent,
      });

      setShowCreateDiscModal(false);
      setNewDiscTitle('');
      setNewDiscContent('');
      loadDiscussions();
      navigate(`/community/forum/discussions/${disc.id}`);
    } catch (err) {
      console.error('Failed to create discussion:', err);
    }
  };

  const filteredAnnouncements = announcements.filter((ann) => {
    if (annFilterType === 'ALL') return true;
    return ann.type === annFilterType;
  });

  return (
    <div className="cloudlab-page-wrapper">
      <Navbar currentPage="community" />

      <div className="community-container">
        {/* Hub Header */}
        <div className="community-header">
          <div>
            <h1 className="page-title">Community &amp; AI Hub</h1>
            <p className="page-subtitle">
              Connect with fellow CloudLab learners, join discussions, stay informed with platform news, and consult your AI Assistant.
            </p>
          </div>

          {activeTab === 'announcements' && canManageAnnouncements && (
            <button
              type="button"
              className="btn-primary-glow"
              onClick={() => setShowCreateAnnModal(true)}
            >
              <Plus size={16} />
              <span>New Announcement</span>
            </button>
          )}

          {activeTab === 'forum' && (
            <button
              type="button"
              className="btn-primary-glow"
              onClick={() => setShowCreateDiscModal(true)}
            >
              <Plus size={16} />
              <span>New Discussion</span>
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="hub-tabs-row">
          <button
            type="button"
            className={`hub-tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            <Megaphone size={18} />
            <span>Announcements &amp; News</span>
            <span className="hub-tab-count">{announcements.length}</span>
          </button>

          <button
            type="button"
            className={`hub-tab-btn ${activeTab === 'forum' ? 'active' : ''}`}
            onClick={() => setActiveTab('forum')}
          >
            <MessageSquare size={18} />
            <span>Discussion Forum</span>
            <span className="hub-tab-count">{discussions.length}</span>
          </button>

          <button
            type="button"
            className={`hub-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Bot size={18} />
            <span>CloudLab AI Assistant</span>
            <span className="hub-tab-badge">
              <Sparkles size={11} /> Active
            </span>
          </button>
        </div>

        {/* TAB 1: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="tab-content">
            {/* Filter types */}
            <div className="ann-filter-bar">
              <span className="filter-label">Filter Type:</span>
              {['ALL', 'IMPORTANT', 'GENERAL', 'COURSE', 'PROJECT', 'EVENT'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip-filter ${annFilterType === t ? 'active' : ''}`}
                  onClick={() => setAnnFilterType(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            {loadingAnnouncements ? (
              <div className="loading-state">Loading announcements...</div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="empty-card">
                <Megaphone size={36} color="#64748b" />
                <h3>No Announcements Found</h3>
                <p>There are no announcements posted in this category yet.</p>
              </div>
            ) : (
              <div className="announcements-grid">
                {filteredAnnouncements.map((ann) => {
                  const isRead = ann.readByUserIds?.includes(currentUser?.id || '');
                  return (
                    <div key={ann.id} className={`announcement-card ${ann.type.toLowerCase()}`}>
                      <div className="ann-card-header">
                        <div className="ann-badge-row">
                          <span className={`ann-type-badge ${ann.type.toLowerCase()}`}>
                            {ann.type}
                          </span>
                          <span className="ann-audience-badge">
                            Target: {ann.targetAudience}
                          </span>
                        </div>

                        <div className="ann-actions">
                          {!isRead && (
                            <button
                              type="button"
                              className="btn-mark-read"
                              onClick={(e) => handleMarkAnnRead(ann.id, e)}
                              title="Mark as Read"
                            >
                              <CheckCircle2 size={15} />
                              <span>Mark Read</span>
                            </button>
                          )}
                          {(role === 'ADMIN' || ann.authorId === currentUser?.id) && (
                            <button
                              type="button"
                              className="btn-danger-icon"
                              onClick={(e) => handleDeleteAnnouncement(ann.id, e)}
                              title="Delete Announcement"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      <h2 className="ann-title">{ann.title}</h2>
                      <p className="ann-content">{ann.content}</p>

                      <div className="ann-footer">
                        <div className="ann-author-info">
                          <UserIcon size={14} />
                          <span>{ann.authorName}</span>
                          <span className="role-tag">{ann.authorRole}</span>
                        </div>

                        <div className="ann-date">
                          <Calendar size={14} />
                          <span>{new Date(ann.publicationDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FORUM */}
        {activeTab === 'forum' && (
          <div className="tab-content">
            {/* Category Cards Grid */}
            <div className="categories-grid">
              <div
                className={`category-card ${selectedCatId === '' ? 'selected' : ''}`}
                onClick={() => setSelectedCatId('')}
              >
                <div className="cat-icon-box">
                  <MessageSquare size={20} color="#00d4ff" />
                </div>
                <div>
                  <h4 className="cat-name">All Categories</h4>
                  <span className="cat-desc">Browse all discussions across CloudLab</span>
                </div>
              </div>

              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`category-card ${selectedCatId === cat.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCatId(cat.id)}
                >
                  <div className="cat-icon-box">
                    <Tag size={20} color="#00d4ff" />
                  </div>
                  <div>
                    <h4 className="cat-name">{cat.name}</h4>
                    <span className="cat-desc">{cat.description}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Filter & Search Bar */}
            <div className="forum-controls-bar">
              <div className="search-box">
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search discussions by title or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="status-filter-group">
                <Filter size={15} color="#64748b" />
                <button
                  type="button"
                  className={`chip-filter ${selectedStatus === '' ? 'active' : ''}`}
                  onClick={() => setSelectedStatus('')}
                >
                  All Status
                </button>
                <button
                  type="button"
                  className={`chip-filter ${selectedStatus === 'OPEN' ? 'active' : ''}`}
                  onClick={() => setSelectedStatus('OPEN')}
                >
                  Open
                </button>
                <button
                  type="button"
                  className={`chip-filter ${selectedStatus === 'SOLVED' ? 'active' : ''}`}
                  onClick={() => setSelectedStatus('SOLVED')}
                >
                  Solved
                </button>
              </div>
            </div>

            {/* Discussions List */}
            {loadingForum ? (
              <div className="loading-state">Loading discussions...</div>
            ) : discussions.length === 0 ? (
              <div className="empty-card">
                <MessageSquare size={36} color="#64748b" />
                <h3>No Discussions Found</h3>
                <p>Be the first to start a conversation in this topic!</p>
                <button
                  type="button"
                  className="btn-primary-glow"
                  onClick={() => setShowCreateDiscModal(true)}
                  style={{ marginTop: 12 }}
                >
                  <Plus size={16} />
                  <span>Start Discussion</span>
                </button>
              </div>
            ) : (
              <div className="discussions-list">
                {discussions.map((disc) => (
                  <div
                    key={disc.id}
                    className="discussion-card"
                    onClick={() => navigate(`/community/forum/discussions/${disc.id}`)}
                  >
                    <div className="disc-main">
                      <div className="disc-title-row">
                        <span className="disc-category-tag">{disc.categoryName || 'General'}</span>
                        {disc.status === 'SOLVED' && (
                          <span className="badge-solved">
                            <CheckCircle2 size={13} /> Solved
                          </span>
                        )}
                        <h3 className="disc-title">{disc.title}</h3>
                      </div>
                      <p className="disc-preview">{disc.content.substring(0, 160)}...</p>

                      <div className="disc-meta">
                        <span className="disc-author">
                          By <strong>{disc.authorName}</strong> ({disc.authorRole})
                        </span>
                        <span className="disc-dot">•</span>
                        <span>{new Date(disc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="disc-stats">
                      <div className="stat-pill" title="Replies">
                        <MessageCircle size={15} color="#94a3b8" />
                        <span>{disc.repliesCount}</span>
                      </div>
                      <div className="stat-pill" title="Views">
                        <Eye size={15} color="#94a3b8" />
                        <span>{disc.viewsCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI ASSISTANT */}
        {activeTab === 'ai' && (
          <div className="tab-content">
            <AiAssistantWidget />
          </div>
        )}
      </div>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {showCreateAnnModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create Platform Announcement</h3>
              <button type="button" onClick={() => setShowCreateAnnModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="modal-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Microservice Architecture Module Released"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Announcement Type</label>
                  <select
                    value={newAnnType}
                    onChange={(e) => setNewAnnType(e.target.value as AnnouncementType)}
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="IMPORTANT">IMPORTANT</option>
                    <option value="COURSE">COURSE</option>
                    <option value="PROJECT">PROJECT</option>
                    <option value="EVENT">EVENT</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Audience</label>
                  <select
                    value={newAnnTarget}
                    onChange={(e) => setNewAnnTarget(e.target.value as AnnouncementTargetAudience)}
                  >
                    <option value="ALL">ALL</option>
                    <option value="STUDENTS">STUDENTS</option>
                    <option value="INSTRUCTORS">INSTRUCTORS</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Content</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Write the full announcement body..."
                  value={newAnnContent}
                  onChange={(e) => setNewAnnContent(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateAnnModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-glow">
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DISCUSSION MODAL */}
      {showCreateDiscModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Start a Forum Discussion</h3>
              <button type="button" onClick={() => setShowCreateDiscModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDiscussion} className="modal-form">
              <div className="form-group custom-select-group">
                <label>Category</label>
                <div className="custom-select-wrapper">
                  <button
                    type="button"
                    className={`custom-select-trigger ${categoryDropdownOpen ? 'open' : ''}`}
                    onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                  >
                    <span className="selected-category-text">
                      {(() => {
                        const activeCat = categories.find((c) => c.id === newDiscCatId) || categories[0];
                        if (!activeCat) return 'Select category...';
                        return (
                          <>
                            <strong className="cat-name">{activeCat.name}</strong>
                            {activeCat.description && (
                              <span className="cat-desc"> — {activeCat.description}</span>
                            )}
                          </>
                        );
                      })()}
                    </span>
                    <ChevronDown size={16} className={`dropdown-chevron ${categoryDropdownOpen ? 'rotated' : ''}`} />
                  </button>

                  {categoryDropdownOpen && (
                    <div className="custom-select-menu">
                      {categories.map((c) => {
                        const isSelected = (newDiscCatId || categories[0]?.id) === c.id;
                        return (
                          <div
                            key={c.id}
                            className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setNewDiscCatId(c.id);
                              setCategoryDropdownOpen(false);
                            }}
                          >
                            <div className="cat-option-info">
                              <span className="cat-option-name">{c.name}</span>
                              {c.description && <span className="cat-option-desc">{c.description}</span>}
                            </div>
                            {isSelected && <span className="cat-selected-dot" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Topic / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How to resolve Docker permission denied error?"
                  value={newDiscTitle}
                  onChange={(e) => setNewDiscTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Discussion Content</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Describe your question, code snippet, or discussion topic..."
                  value={newDiscContent}
                  onChange={(e) => setNewDiscContent(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateDiscModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-glow">
                  Post Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .cloudlab-page-wrapper {
          min-height: 100vh;
          background: #070a0f;
          color: #fff;
        }

        .community-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px 80px 24px;
        }

        .community-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          gap: 20px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          font-size: 14px;
          color: #94a3b8;
          margin: 0;
          max-width: 750px;
        }

        .btn-primary-glow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #00d4ff 0%, #0077ff 100%);
          border: none;
          color: #040812;
          font-weight: 700;
          font-size: 13.5px;
          padding: 10px 20px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);
        }

        .btn-primary-glow:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 212, 255, 0.45);
        }

        /* ── Tabs Row ── */
        .hub-tabs-row {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 28px;
          padding-bottom: 2px;
        }

        .hub-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: #94a3b8;
          font-size: 14.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .hub-tab-btn:hover {
          color: #fff;
        }

        .hub-tab-btn.active {
          color: #00d4ff;
          border-bottom-color: #00d4ff;
        }

        .hub-tab-count {
          font-size: 11px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.08);
          padding: 2px 8px;
          border-radius: 12px;
        }

        .hub-tab-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          background: rgba(0, 212, 255, 0.15);
          color: #00d4ff;
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid rgba(0, 212, 255, 0.3);
        }

        /* ── Announcements ── */
        .ann-filter-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
        }

        .filter-label {
          font-size: 12.5px;
          color: #64748b;
          font-weight: 600;
          margin-right: 4px;
        }

        .chip-filter {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chip-filter:hover,
        .chip-filter.active {
          background: rgba(0, 212, 255, 0.12);
          border-color: rgba(0, 212, 255, 0.3);
          color: #00d4ff;
        }

        .announcements-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .announcement-card {
          background: rgba(15, 22, 36, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 20px 24px;
          transition: border-color 0.15s ease;
        }

        .announcement-card.important {
          border-left: 4px solid #ef4444;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(15, 22, 36, 0.9));
        }

        .ann-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .ann-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ann-type-badge {
          font-size: 11px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .ann-type-badge.important {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .ann-type-badge.general {
          background: rgba(59, 130, 246, 0.2);
          color: #93c5fd;
          border: 1px solid rgba(59, 130, 246, 0.4);
        }

        .ann-type-badge.course {
          background: rgba(168, 85, 247, 0.2);
          color: #d8b4fe;
          border: 1px solid rgba(168, 85, 247, 0.4);
        }

        .ann-audience-badge {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
        }

        .ann-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-mark-read {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid rgba(0, 212, 255, 0.25);
          color: #00d4ff;
          font-size: 11.5px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
        }

        .btn-danger-icon {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          padding: 5px;
          border-radius: 6px;
          cursor: pointer;
        }

        .ann-title {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 10px 0;
        }

        .ann-content {
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.6;
          margin: 0 0 16px 0;
        }

        .ann-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 12.5px;
          color: #64748b;
        }

        .ann-author-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .role-tag {
          font-size: 10px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .ann-date {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* ── Forum ── */
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .category-card {
          background: rgba(15, 22, 36, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .category-card:hover,
        .category-card.selected {
          border-color: rgba(0, 212, 255, 0.4);
          background: rgba(0, 212, 255, 0.06);
        }

        .cat-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(0, 212, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cat-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 2px 0;
        }

        .cat-desc {
          font-size: 11px;
          color: #64748b;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .forum-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 280px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(15, 22, 36, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px 16px;
        }

        .search-box input {
          background: none;
          border: none;
          color: #fff;
          font-size: 13.5px;
          outline: none;
          width: 100%;
        }

        .status-filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .discussions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .discussion-card {
          background: rgba(15, 22, 36, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .discussion-card:hover {
          border-color: rgba(0, 212, 255, 0.35);
          background: rgba(15, 22, 36, 0.95);
        }

        .disc-main {
          flex: 1;
          min-width: 0;
        }

        .disc-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }

        .disc-category-tag {
          font-size: 11px;
          font-weight: 700;
          background: rgba(0, 212, 255, 0.12);
          color: #00d4ff;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .badge-solved {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(16, 185, 129, 0.18);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 2px 8px;
          border-radius: 12px;
        }

        .disc-title {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .disc-preview {
          font-size: 13px;
          color: #94a3b8;
          margin: 0 0 10px 0;
          line-height: 1.4;
        }

        .disc-meta {
          font-size: 12px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .disc-dot {
          color: #334155;
        }

        .disc-stats {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .stat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12.5px;
          color: #94a3b8;
          font-weight: 600;
        }

        /* ── Modals & Common ── */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 500;
          padding: 20px;
        }

        .modal-card {
          background: #0f1624;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          width: 100%;
          max-width: 580px;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .modal-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .modal-header button {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 10px 14px;
          color: #f1f5f9;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .form-group select {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 16px;
          padding-right: 40px;
          cursor: pointer;
        }

        .form-group select option {
          background: #0f172a;
          color: #f1f5f9;
          padding: 10px 14px;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #00d4ff;
          box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
        }

        /* Custom Category Dropdown */
        .custom-select-group {
          position: relative;
        }

        .custom-select-wrapper {
          position: relative;
          width: 100%;
        }

        .custom-select-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 10px 14px;
          color: #f1f5f9;
          font-size: 13.5px;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          text-align: left;
        }

        .custom-select-trigger:hover {
          border-color: rgba(255, 255, 255, 0.25);
        }

        .custom-select-trigger.open {
          border-color: #00d4ff;
          box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
        }

        .selected-category-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding-right: 8px;
        }

        .cat-name {
          color: #f8fafc;
          font-weight: 600;
        }

        .cat-desc {
          color: #94a3b8;
          font-weight: 400;
        }

        .dropdown-chevron {
          color: #94a3b8;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }

        .dropdown-chevron.rotated {
          transform: rotate(180deg);
          color: #00d4ff;
        }

        .custom-select-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #0f1624;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7);
          z-index: 600;
          max-height: 240px;
          overflow-y: auto;
          padding: 6px;
        }

        .custom-select-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .custom-select-option:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .custom-select-option.selected {
          background: rgba(0, 212, 255, 0.12);
          border: 1px solid rgba(0, 212, 255, 0.3);
        }

        .cat-option-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cat-option-name {
          color: #f8fafc;
          font-weight: 600;
          font-size: 13.5px;
        }

        .cat-option-desc {
          color: #94a3b8;
          font-size: 12px;
        }

        .cat-selected-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00d4ff;
          box-shadow: 0 0 8px rgba(0, 212, 255, 0.8);
          flex-shrink: 0;
        }

        .modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .empty-card {
          text-align: center;
          padding: 60px 20px;
          background: rgba(15, 22, 36, 0.6);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          color: #94a3b8;
        }

        .empty-card h3 {
          color: #fff;
          margin: 12px 0 6px 0;
        }

        .loading-state {
          text-align: center;
          padding: 40px;
          color: #00d4ff;
          font-family: monospace;
        }
      `}</style>
    </div>
  );
};
