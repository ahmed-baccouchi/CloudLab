import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  Eye,
  CheckCircle2,
  Send,
  Trash2,
  Edit3,
  User,
  Check,
  Tag,
  Calendar,
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { communicationApi } from '../../api/communication';
import type { DiscussionDto, CommentDto } from '@cloudlab/shared-types';

import { getUserFromStorage, getUserRole } from '../../utils/auth';

export const DiscussionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = getUserFromStorage();
  const role = currentUser?.role || getUserRole();

  const [discussion, setDiscussion] = useState<DiscussionDto | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);

  // New comment input
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Edit comment modal/inline state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  useEffect(() => {
    if (id) {
      loadDiscussionAndComments();
    }
  }, [id]);

  const loadDiscussionAndComments = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const disc = await communicationApi.getDiscussionById(id);
      setDiscussion(disc);

      const comms = await communicationApi.getComments(id);
      setComments(comms);
    } catch (err) {
      console.error('Failed to load discussion:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      const comment = await communicationApi.addComment(id, { content: newComment });
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      if (discussion) {
        setDiscussion({ ...discussion, repliesCount: discussion.repliesCount + 1 });
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleToggleAccepted = async (commentId: string) => {
    if (!id || !discussion) return;
    try {
      const isAlreadyAccepted = discussion.acceptedCommentId === commentId;
      const targetCommentId = isAlreadyAccepted ? undefined : commentId;

      const updatedDisc = await communicationApi.markDiscussionSolved(id, targetCommentId);
      setDiscussion(updatedDisc);

      // Refresh comments to update isAcceptedAnswer flag
      const comms = await communicationApi.getComments(id);
      setComments(comms);
    } catch (err) {
      console.error('Failed to mark accepted answer:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await communicationApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (discussion) {
        setDiscussion({ ...discussion, repliesCount: Math.max(0, discussion.repliesCount - 1) });
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;
    try {
      const updated = await communicationApi.updateComment(commentId, editingCommentContent);
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingCommentId(null);
      setEditingCommentContent('');
    } catch (err) {
      console.error('Failed to update comment:', err);
    }
  };

  const handleDeleteDiscussion = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this discussion thread?')) return;
    try {
      await communicationApi.deleteDiscussion(id);
      navigate('/community');
    } catch (err) {
      console.error('Failed to delete discussion:', err);
    }
  };

  if (loading) {
    return (
      <div className="cloudlab-page-wrapper">
        <Navbar currentPage="community" />
        <div className="loading-container">Loading discussion...</div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="cloudlab-page-wrapper">
        <Navbar currentPage="community" />
        <div className="error-container">
          <h2>Discussion Not Found</h2>
          <p>The discussion thread you requested does not exist or was deleted.</p>
          <Link to="/community" className="btn-secondary">
            Return to Community
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = discussion.authorId === currentUser?.id;
  const canManage = isAuthor || role === 'ADMIN';

  return (
    <div className="cloudlab-page-wrapper">
      <Navbar currentPage="community" />

      <div className="detail-container">
        {/* Back Link */}
        <Link to="/community" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Forum &amp; Discussions</span>
        </Link>

        {/* Discussion Main Card */}
        <div className="discussion-main-card">
          <div className="disc-header">
            <div className="disc-badges">
              <span className="category-pill">
                <Tag size={12} />
                {discussion.categoryName || 'General'}
              </span>
              {discussion.status === 'SOLVED' ? (
                <span className="badge-solved">
                  <CheckCircle2 size={13} /> Solved
                </span>
              ) : (
                <span className="badge-open">Open</span>
              )}
            </div>

            {canManage && (
              <button
                type="button"
                className="btn-danger-icon"
                onClick={handleDeleteDiscussion}
                title="Delete Thread"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <h1 className="thread-title">{discussion.title}</h1>

          <div className="thread-author-bar">
            <div className="author-details">
              <div className="author-avatar">
                <User size={16} color="#00d4ff" />
              </div>
              <div>
                <span className="author-name">{discussion.authorName}</span>
                <span className="role-tag">{discussion.authorRole}</span>
              </div>
            </div>

            <div className="thread-meta">
              <span>
                <Calendar size={13} /> {new Date(discussion.createdAt).toLocaleString()}
              </span>
              <span>
                <Eye size={13} /> {discussion.viewsCount} views
              </span>
              <span>
                <MessageCircle size={13} /> {comments.length} replies
              </span>
            </div>
          </div>

          <div className="thread-content">{discussion.content}</div>
        </div>

        {/* Replies Section */}
        <div className="replies-section">
          <h2 className="replies-heading">
            <MessageCircle size={18} />
            <span>Replies &amp; Discussion ({comments.length})</span>
          </h2>

          <div className="comments-list">
            {comments.length === 0 ? (
              <div className="no-comments-box">
                <p>No replies yet. Be the first to answer!</p>
              </div>
            ) : (
              comments.map((comment) => {
                const isCommentAuthor = comment.authorId === currentUser?.id;
                const canEditComment = isCommentAuthor || role === 'ADMIN';
                const isAccepted = discussion.acceptedCommentId === comment.id || comment.isAcceptedAnswer;

                return (
                  <div key={comment.id} className={`comment-card ${isAccepted ? 'accepted-answer' : ''}`}>
                    {isAccepted && (
                      <div className="accepted-banner">
                        <CheckCircle2 size={14} />
                        <span>Accepted Answer</span>
                      </div>
                    )}

                    <div className="comment-header">
                      <div className="comment-author-info">
                        <div className="comment-avatar">
                          <User size={14} color="#fff" />
                        </div>
                        <span className="comment-author-name">{comment.authorName}</span>
                        <span className="role-tag">{comment.authorRole}</span>
                        <span className="comment-time">{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>

                      <div className="comment-actions">
                        {/* Discussion Author or Admin can toggle Accepted Answer */}
                        {canManage && (
                          <button
                            type="button"
                            className={`btn-accept-answer ${isAccepted ? 'active' : ''}`}
                            onClick={() => handleToggleAccepted(comment.id)}
                            title={isAccepted ? 'Unmark as Accepted Answer' : 'Mark as Accepted Answer'}
                          >
                            <Check size={14} />
                            <span>{isAccepted ? 'Accepted' : 'Accept Answer'}</span>
                          </button>
                        )}

                        {canEditComment && (
                          <>
                            <button
                              type="button"
                              className="btn-icon-sm"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentContent(comment.content);
                              }}
                              title="Edit Reply"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-sm danger"
                              onClick={() => handleDeleteComment(comment.id)}
                              title="Delete Reply"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="edit-comment-box">
                        <textarea
                          rows={4}
                          value={editingCommentContent}
                          onChange={(e) => setEditingCommentContent(e.target.value)}
                        />
                        <div className="edit-actions">
                          <button
                            type="button"
                            className="btn-secondary-sm"
                            onClick={() => setEditingCommentId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn-primary-sm"
                            onClick={() => handleUpdateComment(comment.id)}
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="comment-body">{comment.content}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Add Reply Form */}
          <form onSubmit={handleAddComment} className="add-reply-card">
            <h3>Post Your Reply</h3>
            <textarea
              rows={4}
              required
              placeholder="Write a helpful response..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="reply-form-footer">
              <button
                type="submit"
                className="btn-primary-glow"
                disabled={!newComment.trim() || submittingComment}
              >
                <Send size={15} />
                <span>{submittingComment ? 'Posting...' : 'Post Reply'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .cloudlab-page-wrapper {
          min-height: 100vh;
          background: #070a0f;
          color: #fff;
        }

        .detail-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 32px 24px 80px 24px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 13.5px;
          font-weight: 600;
          text-decoration: none;
          margin-bottom: 24px;
          transition: color 0.15s ease;
        }

        .back-link:hover {
          color: #00d4ff;
        }

        .discussion-main-card {
          background: rgba(15, 22, 36, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 32px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
        }

        .disc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .disc-badges {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .category-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 212, 255, 0.12);
          color: #00d4ff;
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 12px;
        }

        .badge-solved {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 12px;
          border: 1px solid rgba(16, 185, 129, 0.35);
        }

        .badge-open {
          font-size: 11.5px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          padding: 3px 10px;
          border-radius: 12px;
        }

        .thread-title {
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 16px 0;
          line-height: 1.3;
        }

        .thread-author-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .author-details {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .author-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(0, 212, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .author-name {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          margin-right: 6px;
        }

        .role-tag {
          font-size: 10px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .thread-meta {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 12px;
          color: #64748b;
        }

        .thread-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .thread-content {
          font-size: 15px;
          color: #e2e8f0;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        /* ── Replies ── */
        .replies-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 20px;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }

        .comment-card {
          background: rgba(15, 22, 36, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 20px;
          position: relative;
        }

        .comment-card.accepted-answer {
          border: 2px solid #10b981;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(15, 22, 36, 0.9));
        }

        .accepted-banner {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #10b981;
          color: #040812;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 12px;
          margin-bottom: 12px;
          text-transform: uppercase;
        }

        .comment-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .comment-author-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .comment-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .comment-author-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #fff;
        }

        .comment-time {
          font-size: 11px;
          color: #64748b;
          margin-left: 6px;
        }

        .comment-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-accept-answer {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          font-size: 11.5px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-accept-answer:hover,
        .btn-accept-answer.active {
          background: rgba(16, 185, 129, 0.2);
          border-color: #10b981;
          color: #34d399;
        }

        .btn-icon-sm {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          padding: 5px;
          border-radius: 6px;
          cursor: pointer;
        }

        .btn-icon-sm.danger:hover {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.15);
        }

        .comment-body {
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .add-reply-card {
          background: rgba(15, 22, 36, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 24px;
        }

        .add-reply-card h3 {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 14px 0;
        }

        .add-reply-card textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 12px;
          color: #fff;
          font-size: 14px;
          outline: none;
          margin-bottom: 14px;
          resize: vertical;
        }

        .reply-form-footer {
          display: flex;
          justify-content: flex-end;
        }

        .loading-container,
        .error-container {
          text-align: center;
          padding: 80px 20px;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
};
