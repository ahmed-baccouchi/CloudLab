-- ==============================================================================
-- CloudLab Comprehensive MySQL Initialization Script
-- ==============================================================================

-- 1. Create MySQL User & Grant Permissions
CREATE USER IF NOT EXISTS 'cloudlab'@'localhost' IDENTIFIED BY 'cloudlabpassword';
CREATE USER IF NOT EXISTS 'cloudlab'@'%' IDENTIFIED BY 'cloudlabpassword';
ALTER USER 'cloudlab'@'localhost' IDENTIFIED BY 'cloudlabpassword';
ALTER USER 'cloudlab'@'%' IDENTIFIED BY 'cloudlabpassword';

GRANT ALL PRIVILEGES ON *.* TO 'cloudlab'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'cloudlab'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;

-- 2. Create Databases
CREATE DATABASE IF NOT EXISTS cloudlab_auth;
CREATE DATABASE IF NOT EXISTS cloudlab_learning;
CREATE DATABASE IF NOT EXISTS cloudlab_challenges;
CREATE DATABASE IF NOT EXISTS cloudlab_progress;
CREATE DATABASE IF NOT EXISTS cloudlab_projects;
CREATE DATABASE IF NOT EXISTS cloudlab_communication;

-- ==============================================================================
-- 3. Communication Service Schema (cloudlab_communication)
-- ==============================================================================
USE cloudlab_communication;

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

CREATE TABLE IF NOT EXISTS forum_categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  icon VARCHAR(100) NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

-- Seed Default Forum Categories
INSERT IGNORE INTO forum_categories (id, name, description, slug, icon, created_at) VALUES
('cat-general', 'General', 'General discussions & community talk', 'general', 'MessageSquare', NOW()),
('cat-courses', 'Courses', 'Course questions, learning tracks & feedback', 'courses', 'BookOpen', NOW()),
('cat-projects', 'Projects', 'CloudLab squads, project help & team collaboration', 'projects', 'FolderGit2', NOW()),
('cat-programming', 'Programming', 'Code snippets, language tips & debugging', 'programming', 'Code', NOW()),
('cat-devops', 'DevOps', 'CI/CD, Docker, Kubernetes & Cloud Architecture', 'devops', 'Terminal', NOW()),
('cat-other', 'Other', 'Anything else related to cloud computing & technology', 'other', 'HelpCircle', NOW());

-- Seed Sample Welcome Announcement
INSERT IGNORE INTO announcements (id, title, content, author_id, author_name, author_role, type, target_audience, is_published, publication_date, read_by_user_ids, created_at, updated_at) VALUES
('ann-1', 'Welcome to CloudLab Platform!', 'We are thrilled to launch the new Communication & AI Assistant module on CloudLab. Connect with your peers in the Forum, stay updated with Announcements, and ask questions to the CloudLab AI Assistant anytime!', 'admin-1', 'CloudLab Admin', 'ADMIN', 'IMPORTANT', 'ALL', 1, NOW(), '[]', NOW(), NOW());
