import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import {
  AnnouncementDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  ForumCategoryDto,
  DiscussionDto,
  CreateDiscussionDto,
  UpdateDiscussionDto,
  CommentDto,
  CreateCommentDto,
  UpdateCommentDto,
  NotificationDto,
  CreateNotificationDto,
  AnnouncementType,
  AnnouncementTargetAudience,
  DiscussionStatus,
  NotificationType,
} from '@cloudlab/shared-types';

export class CommunicationRepository {
  private pool: mysql.Pool | null = null;
  private isConnected = false;

  private announcements: Map<string, AnnouncementDto> = new Map();
  private forumCategories: Map<string, ForumCategoryDto> = new Map();
  private discussions: Map<string, DiscussionDto> = new Map();
  private comments: Map<string, CommentDto> = new Map(); // key: commentId
  private notifications: Map<string, NotificationDto> = new Map();

  async initialize(): Promise<void> {
    try {
      const bootstrapConn = await mysql.createConnection({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
      });
      await bootstrapConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.database}\`;`);
      await bootstrapConn.end();

      this.pool = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      const conn = await this.pool.getConnection();
      await this.createTables(conn);
      conn.release();

      this.isConnected = true;
      console.log('✅ [Communication Service] Connected to MySQL:', config.database.database);

      await this.seedDefaultCategoriesAndAnnouncements();
    } catch (err: any) {
      console.warn('⚠️ [Communication Service] MySQL connection failed. Falling back to in-memory store:', err.message);
      this.isConnected = false;
      this.seedInMemory();
    }
  }

  private async createTables(conn: mysql.PoolConnection): Promise<void> {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id VARCHAR(36) NOT NULL,
        author_name VARCHAR(255) NOT NULL,
        author_role VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        target_audience VARCHAR(50) NOT NULL,
        target_id VARCHAR(36) NULL,
        is_published TINYINT(1) DEFAULT 1,
        publication_date DATETIME NOT NULL,
        attachment_url VARCHAR(500) NULL,
        read_by_user_ids JSON NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS forum_categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        icon VARCHAR(100) NULL,
        created_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS discussions (
        id VARCHAR(36) PRIMARY KEY,
        category_id VARCHAR(36) NOT NULL,
        author_id VARCHAR(36) NOT NULL,
        author_name VARCHAR(255) NOT NULL,
        author_role VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'OPEN',
        accepted_comment_id VARCHAR(36) NULL,
        views_count INT DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(36) PRIMARY KEY,
        discussion_id VARCHAR(36) NOT NULL,
        author_id VARCHAR(36) NOT NULL,
        author_name VARCHAR(255) NOT NULL,
        author_role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        is_accepted_answer TINYINT(1) DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        reference_id VARCHAR(36) NULL,
        link_url VARCHAR(500) NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  private seedInMemory() {
    if (this.forumCategories.size === 0) {
      const defaultCategories: ForumCategoryDto[] = [
        { id: 'cat-general', name: 'General', description: 'General discussions & community talk', slug: 'general', icon: 'MessageSquare', createdAt: new Date().toISOString() },
        { id: 'cat-courses', name: 'Courses', description: 'Course questions, learning tracks & feedback', slug: 'courses', icon: 'BookOpen', createdAt: new Date().toISOString() },
        { id: 'cat-projects', name: 'Projects', description: 'CloudLab squads, project help & team collaboration', slug: 'projects', icon: 'FolderGit2', createdAt: new Date().toISOString() },
        { id: 'cat-programming', name: 'Programming', description: 'Code snippets, language tips & debugging', slug: 'programming', icon: 'Code', createdAt: new Date().toISOString() },
        { id: 'cat-devops', name: 'DevOps', description: 'CI/CD, Docker, Kubernetes & Cloud Architecture', slug: 'devops', icon: 'Terminal', createdAt: new Date().toISOString() },
        { id: 'cat-other', name: 'Other', description: 'Anything else related to cloud computing & technology', slug: 'other', icon: 'HelpCircle', createdAt: new Date().toISOString() },
      ];
      defaultCategories.forEach((cat) => this.forumCategories.set(cat.id, cat));
    }

    if (this.announcements.size === 0) {
      const sampleAnnouncements: AnnouncementDto[] = [
        {
          id: 'ann-1',
          title: 'Welcome to CloudLab Platform!',
          content: 'We are thrilled to launch the new Communication & AI Assistant module on CloudLab. Connect with your peers in the Forum, stay updated with Announcements, and ask questions to the CloudLab AI Assistant anytime!',
          authorId: 'admin-1',
          authorName: 'CloudLab Admin',
          authorRole: 'ADMIN',
          type: 'IMPORTANT',
          targetAudience: 'ALL',
          isPublished: true,
          publicationDate: new Date().toISOString(),
          readByUserIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'ann-2',
          title: 'New DevOps & Kubernetes Tracks Available',
          content: 'Explore our latest hands-on microservice and container orchestration courses under Courses & Tracks.',
          authorId: 'instructor-1',
          authorName: 'Prof. Alex Rivera',
          authorRole: 'INSTRUCTOR',
          type: 'COURSE',
          targetAudience: 'STUDENTS',
          isPublished: true,
          publicationDate: new Date().toISOString(),
          readByUserIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      sampleAnnouncements.forEach((ann) => this.announcements.set(ann.id, ann));
    }
  }

  private async seedDefaultCategoriesAndAnnouncements() {
    if (!this.isConnected || !this.pool) return;
    try {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM forum_categories');
      if (rows[0].count === 0) {
        const defaultCategories = [
          ['cat-general', 'General', 'General discussions & community talk', 'general', 'MessageSquare', new Date()],
          ['cat-courses', 'Courses', 'Course questions, learning tracks & feedback', 'courses', 'BookOpen', new Date()],
          ['cat-projects', 'Projects', 'CloudLab squads, project help & team collaboration', 'projects', 'FolderGit2', new Date()],
          ['cat-programming', 'Programming', 'Code snippets, language tips & debugging', 'programming', 'Code', new Date()],
          ['cat-devops', 'DevOps', 'CI/CD, Docker, Kubernetes & Cloud Architecture', 'devops', 'Terminal', new Date()],
          ['cat-other', 'Other', 'Anything else related to cloud computing & technology', 'other', 'HelpCircle', new Date()],
        ];
        for (const cat of defaultCategories) {
          await this.pool.query(
            'INSERT INTO forum_categories (id, name, description, slug, icon, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            cat
          );
        }
      }

      const [annRows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM announcements');
      if (annRows[0].count === 0) {
        const ann1 = [
          'ann-1',
          'Welcome to CloudLab Platform!',
          'We are thrilled to launch the new Communication & AI Assistant module on CloudLab. Connect with your peers in the Forum, stay updated with Announcements, and ask questions to the CloudLab AI Assistant anytime!',
          'admin-1',
          'CloudLab Admin',
          'ADMIN',
          'IMPORTANT',
          'ALL',
          null,
          1,
          new Date(),
          null,
          JSON.stringify([]),
          new Date(),
          new Date(),
        ];
        await this.pool.query(
          `INSERT INTO announcements (id, title, content, author_id, author_name, author_role, type, target_audience, target_id, is_published, publication_date, attachment_url, read_by_user_ids, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ann1
        );
      }
    } catch (e: any) {
      console.warn('⚠️ Seeding database failed:', e.message);
    }
  }

  // ----------------------------------------------------
  // ANNOUNCEMENTS
  // ----------------------------------------------------

  async getAnnouncements(filters?: { targetAudience?: string; targetId?: string; isPublished?: boolean }): Promise<AnnouncementDto[]> {
    if (this.isConnected && this.pool) {
      let sql = 'SELECT * FROM announcements WHERE 1=1';
      const params: any[] = [];
      if (filters?.isPublished !== undefined) {
        sql += ' AND is_published = ?';
        params.push(filters.isPublished ? 1 : 0);
      }
      if (filters?.targetAudience) {
        sql += ' AND (target_audience = ? OR target_audience = "ALL")';
        params.push(filters.targetAudience);
      }
      if (filters?.targetId) {
        sql += ' AND (target_id = ? OR target_id IS NULL)';
        params.push(filters.targetId);
      }
      sql += ' ORDER BY publication_date DESC, created_at DESC';
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(sql, params);
      return rows.map((r) => this.mapRowToAnnouncement(r));
    }

    let list = Array.from(this.announcements.values());
    if (filters?.isPublished !== undefined) {
      list = list.filter((a) => a.isPublished === filters.isPublished);
    }
    if (filters?.targetAudience) {
      list = list.filter((a) => a.targetAudience === 'ALL' || a.targetAudience === filters.targetAudience);
    }
    if (filters?.targetId) {
      list = list.filter((a) => !a.targetId || a.targetId === filters.targetId);
    }
    return list.sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
  }

  async getAnnouncementById(id: string): Promise<AnnouncementDto | null> {
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM announcements WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return this.mapRowToAnnouncement(rows[0]);
    }
    return this.announcements.get(id) || null;
  }

  async createAnnouncement(
    dto: CreateAnnouncementDto,
    author: { id: string; name: string; role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' }
  ): Promise<AnnouncementDto> {
    const now = new Date().toISOString();
    const ann: AnnouncementDto = {
      id: uuidv4(),
      title: dto.title,
      content: dto.content,
      authorId: author.id,
      authorName: author.name,
      authorRole: author.role,
      type: dto.type || 'GENERAL',
      targetAudience: dto.targetAudience || 'ALL',
      targetId: dto.targetId,
      isPublished: dto.isPublished !== undefined ? dto.isPublished : true,
      publicationDate: now,
      attachmentUrl: dto.attachmentUrl,
      readByUserIds: [],
      createdAt: now,
      updatedAt: now,
    };

    if (this.isConnected && this.pool) {
      await this.pool.query(
        `INSERT INTO announcements (id, title, content, author_id, author_name, author_role, type, target_audience, target_id, is_published, publication_date, attachment_url, read_by_user_ids, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ann.id,
          ann.title,
          ann.content,
          ann.authorId,
          ann.authorName,
          ann.authorRole,
          ann.type,
          ann.targetAudience,
          ann.targetId || null,
          ann.isPublished ? 1 : 0,
          new Date(ann.publicationDate),
          ann.attachmentUrl || null,
          JSON.stringify(ann.readByUserIds),
          new Date(ann.createdAt),
          new Date(ann.updatedAt),
        ]
      );
    } else {
      this.announcements.set(ann.id, ann);
    }
    return ann;
  }

  async updateAnnouncement(id: string, dto: UpdateAnnouncementDto): Promise<AnnouncementDto | null> {
    const existing = await this.getAnnouncementById(id);
    if (!existing) return null;

    const updated: AnnouncementDto = {
      ...existing,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    if (this.isConnected && this.pool) {
      await this.pool.query(
        `UPDATE announcements SET title = ?, content = ?, type = ?, target_audience = ?, target_id = ?, is_published = ?, attachment_url = ?, updated_at = ?
         WHERE id = ?`,
        [
          updated.title,
          updated.content,
          updated.type,
          updated.targetAudience,
          updated.targetId || null,
          updated.isPublished ? 1 : 0,
          updated.attachmentUrl || null,
          new Date(updated.updatedAt),
          id,
        ]
      );
    } else {
      this.announcements.set(id, updated);
    }
    return updated;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      const [res] = await this.pool.query<mysql.ResultSetHeader>('DELETE FROM announcements WHERE id = ?', [id]);
      return res.affectedRows > 0;
    }
    return this.announcements.delete(id);
  }

  async markAnnouncementRead(id: string, userId: string): Promise<AnnouncementDto | null> {
    const existing = await this.getAnnouncementById(id);
    if (!existing) return null;

    const readSet = new Set(existing.readByUserIds || []);
    readSet.add(userId);
    const readArray = Array.from(readSet);

    existing.readByUserIds = readArray;

    if (this.isConnected && this.pool) {
      await this.pool.query('UPDATE announcements SET read_by_user_ids = ? WHERE id = ?', [
        JSON.stringify(readArray),
        id,
      ]);
    } else {
      this.announcements.set(id, existing);
    }
    return existing;
  }

  private mapRowToAnnouncement(row: any): AnnouncementDto {
    let readBy: string[] = [];
    if (row.read_by_user_ids) {
      try {
        readBy = typeof row.read_by_user_ids === 'string' ? JSON.parse(row.read_by_user_ids) : row.read_by_user_ids;
      } catch {
        readBy = [];
      }
    }
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      authorId: row.author_id,
      authorName: row.author_name,
      authorRole: row.author_role,
      type: row.type as AnnouncementType,
      targetAudience: row.target_audience as AnnouncementTargetAudience,
      targetId: row.target_id,
      isPublished: Boolean(row.is_published),
      publicationDate: new Date(row.publication_date).toISOString(),
      attachmentUrl: row.attachment_url,
      readByUserIds: readBy,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  // ----------------------------------------------------
  // FORUM CATEGORIES
  // ----------------------------------------------------

  async getForumCategories(): Promise<ForumCategoryDto[]> {
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM forum_categories ORDER BY name ASC');
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        slug: r.slug,
        icon: r.icon,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    }
    return Array.from(this.forumCategories.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createForumCategory(name: string, description: string, icon?: string): Promise<ForumCategoryDto> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const cat: ForumCategoryDto = {
      id: uuidv4(),
      name,
      description,
      slug,
      icon: icon || 'MessageSquare',
      createdAt: new Date().toISOString(),
    };

    if (this.isConnected && this.pool) {
      await this.pool.query(
        'INSERT INTO forum_categories (id, name, description, slug, icon, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [cat.id, cat.name, cat.description, cat.slug, cat.icon, new Date(cat.createdAt)]
      );
    } else {
      this.forumCategories.set(cat.id, cat);
    }
    return cat;
  }

  // ----------------------------------------------------
  // FORUM DISCUSSIONS
  // ----------------------------------------------------

  async getDiscussions(filters?: { categoryId?: string; status?: string; search?: string }): Promise<DiscussionDto[]> {
    if (this.isConnected && this.pool) {
      let sql = `
        SELECT d.*, c.name as category_name,
        (SELECT COUNT(*) FROM comments cm WHERE cm.discussion_id = d.id) as replies_count
        FROM discussions d
        LEFT JOIN forum_categories c ON d.category_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (filters?.categoryId) {
        sql += ' AND d.category_id = ?';
        params.push(filters.categoryId);
      }
      if (filters?.status) {
        sql += ' AND d.status = ?';
        params.push(filters.status);
      }
      if (filters?.search) {
        sql += ' AND (d.title LIKE ? OR d.content LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }
      sql += ' ORDER BY d.created_at DESC';

      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(sql, params);
      return rows.map((r) => this.mapRowToDiscussion(r));
    }

    let list = Array.from(this.discussions.values());
    if (filters?.categoryId) {
      list = list.filter((d) => d.categoryId === filters.categoryId);
    }
    if (filters?.status) {
      list = list.filter((d) => d.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
    }
    return list.map((d) => {
      const cat = this.forumCategories.get(d.categoryId);
      const comments = Array.from(this.comments.values()).filter((c) => c.discussionId === d.id);
      return {
        ...d,
        categoryName: cat?.name || 'General',
        repliesCount: comments.length,
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getDiscussionById(id: string, incrementViews = false): Promise<DiscussionDto | null> {
    if (this.isConnected && this.pool) {
      if (incrementViews) {
        await this.pool.query('UPDATE discussions SET views_count = views_count + 1 WHERE id = ?', [id]);
      }
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        `SELECT d.*, c.name as category_name,
         (SELECT COUNT(*) FROM comments cm WHERE cm.discussion_id = d.id) as replies_count
         FROM discussions d
         LEFT JOIN forum_categories c ON d.category_id = c.id
         WHERE d.id = ?`,
        [id]
      );
      if (rows.length === 0) return null;
      return this.mapRowToDiscussion(rows[0]);
    }

    const disc = this.discussions.get(id);
    if (!disc) return null;
    if (incrementViews) {
      disc.viewsCount += 1;
    }
    const cat = this.forumCategories.get(disc.categoryId);
    const comments = Array.from(this.comments.values()).filter((c) => c.discussionId === disc.id);
    return {
      ...disc,
      categoryName: cat?.name || 'General',
      repliesCount: comments.length,
    };
  }

  async createDiscussion(
    dto: CreateDiscussionDto,
    author: { id: string; name: string; role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' }
  ): Promise<DiscussionDto> {
    const now = new Date().toISOString();
    const discussion: DiscussionDto = {
      id: uuidv4(),
      categoryId: dto.categoryId,
      authorId: author.id,
      authorName: author.name,
      authorRole: author.role,
      title: dto.title,
      content: dto.content,
      status: 'OPEN',
      viewsCount: 0,
      repliesCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (this.isConnected && this.pool) {
      await this.pool.query(
        `INSERT INTO discussions (id, category_id, author_id, author_name, author_role, title, content, status, views_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          discussion.id,
          discussion.categoryId,
          discussion.authorId,
          discussion.authorName,
          discussion.authorRole,
          discussion.title,
          discussion.content,
          discussion.status,
          0,
          new Date(discussion.createdAt),
          new Date(discussion.updatedAt),
        ]
      );
    } else {
      this.discussions.set(discussion.id, discussion);
    }
    return discussion;
  }

  async updateDiscussion(id: string, dto: UpdateDiscussionDto): Promise<DiscussionDto | null> {
    const existing = await this.getDiscussionById(id);
    if (!existing) return null;

    const updated: DiscussionDto = {
      ...existing,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    if (this.isConnected && this.pool) {
      await this.pool.query(
        `UPDATE discussions SET title = ?, content = ?, status = ?, accepted_comment_id = ?, updated_at = ? WHERE id = ?`,
        [
          updated.title,
          updated.content,
          updated.status,
          updated.acceptedCommentId || null,
          new Date(updated.updatedAt),
          id,
        ]
      );
    } else {
      this.discussions.set(id, updated);
    }
    return updated;
  }

  async deleteDiscussion(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      await this.pool.query('DELETE FROM comments WHERE discussion_id = ?', [id]);
      const [res] = await this.pool.query<mysql.ResultSetHeader>('DELETE FROM discussions WHERE id = ?', [id]);
      return res.affectedRows > 0;
    }

    // Delete associated comments in memory
    for (const [commentId, comment] of Array.from(this.comments.entries())) {
      if (comment.discussionId === id) {
        this.comments.delete(commentId);
      }
    }
    return this.discussions.delete(id);
  }

  private mapRowToDiscussion(row: any): DiscussionDto {
    return {
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      authorId: row.author_id,
      authorName: row.author_name,
      authorRole: row.author_role,
      title: row.title,
      content: row.content,
      status: row.status as DiscussionStatus,
      acceptedCommentId: row.accepted_comment_id,
      viewsCount: row.views_count || 0,
      repliesCount: row.replies_count || 0,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  // ----------------------------------------------------
  // FORUM COMMENTS
  // ----------------------------------------------------

  async getCommentsByDiscussionId(discussionId: string): Promise<CommentDto[]> {
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM comments WHERE discussion_id = ? ORDER BY created_at ASC',
        [discussionId]
      );
      return rows.map((r) => ({
        id: r.id,
        discussionId: r.discussion_id,
        authorId: r.author_id,
        authorName: r.author_name,
        authorRole: r.author_role,
        content: r.content,
        isAcceptedAnswer: Boolean(r.is_accepted_answer),
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    }

    return Array.from(this.comments.values())
      .filter((c) => c.discussionId === discussionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getCommentById(id: string): Promise<CommentDto | null> {
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>('SELECT * FROM comments WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        discussionId: r.discussion_id,
        authorId: r.author_id,
        authorName: r.author_name,
        authorRole: r.author_role,
        content: r.content,
        isAcceptedAnswer: Boolean(r.is_accepted_answer),
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    }
    return this.comments.get(id) || null;
  }

  async createComment(
    discussionId: string,
    dto: CreateCommentDto,
    author: { id: string; name: string; role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' }
  ): Promise<CommentDto> {
    const now = new Date().toISOString();
    const comment: CommentDto = {
      id: uuidv4(),
      discussionId,
      authorId: author.id,
      authorName: author.name,
      authorRole: author.role,
      content: dto.content,
      isAcceptedAnswer: false,
      createdAt: now,
      updatedAt: now,
    };

    if (this.isConnected && this.pool) {
      await this.pool.query(
        `INSERT INTO comments (id, discussion_id, author_id, author_name, author_role, content, is_accepted_answer, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          comment.id,
          comment.discussionId,
          comment.authorId,
          comment.authorName,
          comment.authorRole,
          comment.content,
          0,
          new Date(comment.createdAt),
          new Date(comment.updatedAt),
        ]
      );
    } else {
      this.comments.set(comment.id, comment);
    }

    // Touch discussion updated_at timestamp
    if (this.isConnected && this.pool) {
      await this.pool.query('UPDATE discussions SET updated_at = ? WHERE id = ?', [new Date(now), discussionId]);
    } else {
      const disc = this.discussions.get(discussionId);
      if (disc) {
        disc.updatedAt = now;
      }
    }

    return comment;
  }

  async updateComment(id: string, dto: UpdateCommentDto): Promise<CommentDto | null> {
    const existing = await this.getCommentById(id);
    if (!existing) return null;

    const updated: CommentDto = {
      ...existing,
      content: dto.content,
      updatedAt: new Date().toISOString(),
    };

    if (this.isConnected && this.pool) {
      await this.pool.query('UPDATE comments SET content = ?, updated_at = ? WHERE id = ?', [
        updated.content,
        new Date(updated.updatedAt),
        id,
      ]);
    } else {
      this.comments.set(id, updated);
    }
    return updated;
  }

  async setAcceptedComment(discussionId: string, commentId: string | null): Promise<boolean> {
    if (this.isConnected && this.pool) {
      // Clear previous accepted flags for discussion
      await this.pool.query('UPDATE comments SET is_accepted_answer = 0 WHERE discussion_id = ?', [discussionId]);
      if (commentId) {
        await this.pool.query('UPDATE comments SET is_accepted_answer = 1 WHERE id = ? AND discussion_id = ?', [
          commentId,
          discussionId,
        ]);
        await this.pool.query('UPDATE discussions SET accepted_comment_id = ?, status = "SOLVED" WHERE id = ?', [
          commentId,
          discussionId,
        ]);
      } else {
        await this.pool.query('UPDATE discussions SET accepted_comment_id = NULL WHERE id = ?', [discussionId]);
      }
      return true;
    }

    // In-memory update
    for (const comment of Array.from(this.comments.values())) {
      if (comment.discussionId === discussionId) {
        comment.isAcceptedAnswer = comment.id === commentId;
      }
    }
    const disc = this.discussions.get(discussionId);
    if (disc) {
      disc.acceptedCommentId = commentId || undefined;
      if (commentId) disc.status = 'SOLVED';
    }
    return true;
  }

  async deleteComment(id: string): Promise<boolean> {
    const comment = await this.getCommentById(id);
    if (!comment) return false;

    if (this.isConnected && this.pool) {
      const [res] = await this.pool.query<mysql.ResultSetHeader>('DELETE FROM comments WHERE id = ?', [id]);
      if (comment.isAcceptedAnswer) {
        await this.pool.query('UPDATE discussions SET accepted_comment_id = NULL WHERE id = ?', [comment.discussionId]);
      }
      return res.affectedRows > 0;
    }

    const disc = this.discussions.get(comment.discussionId);
    if (disc && disc.acceptedCommentId === id) {
      disc.acceptedCommentId = undefined;
    }
    return this.comments.delete(id);
  }

  // ----------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------

  async getNotifications(userId: string): Promise<NotificationDto[]> {
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        type: r.type as NotificationType,
        title: r.title,
        message: r.message,
        referenceId: r.reference_id,
        linkUrl: r.link_url,
        isRead: Boolean(r.is_read),
        createdAt: new Date(r.created_at).toISOString(),
      }));
    }

    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadCount(userId: string): Promise<number> {
    if (this.isConnected && this.pool) {
      const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
        [userId]
      );
      return rows[0]?.count || 0;
    }

    return Array.from(this.notifications.values()).filter((n) => n.userId === userId && !n.isRead).length;
  }

  async createNotification(dto: CreateNotificationDto): Promise<NotificationDto> {
    const notif: NotificationDto = {
      id: uuidv4(),
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      referenceId: dto.referenceId,
      linkUrl: dto.linkUrl,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    if (this.isConnected && this.pool) {
      await this.pool.query(
        `INSERT INTO notifications (id, user_id, type, title, message, reference_id, link_url, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notif.id,
          notif.userId,
          notif.type,
          notif.title,
          notif.message,
          notif.referenceId || null,
          notif.linkUrl || null,
          0,
          new Date(notif.createdAt),
        ]
      );
    } else {
      this.notifications.set(notif.id, notif);
    }
    return notif;
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      const [res] = await this.pool.query<mysql.ResultSetHeader>(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      return res.affectedRows > 0;
    }

    const notif = this.notifications.get(id);
    if (notif && notif.userId === userId) {
      notif.isRead = true;
      return true;
    }
    return false;
  }

  async markAllNotificationsRead(userId: string): Promise<number> {
    if (this.isConnected && this.pool) {
      const [res] = await this.pool.query<mysql.ResultSetHeader>(
        'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
        [userId]
      );
      return res.affectedRows;
    }

    let count = 0;
    for (const notif of Array.from(this.notifications.values())) {
      if (notif.userId === userId && !notif.isRead) {
        notif.isRead = true;
        count++;
      }
    }
    return count;
  }
}

export const communicationRepository = new CommunicationRepository();
