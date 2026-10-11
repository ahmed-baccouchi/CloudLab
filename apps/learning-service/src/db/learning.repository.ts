import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import {
  TrackDto,
  CourseDto,
  ModuleDto,
  LessonDto,
  CourseDifficulty,
  LessonType,
  QuizDto,
  CreateTrackDto,
  UpdateTrackDto,
  CreateCourseDto,
  UpdateCourseDto,
  CreateModuleDto,
  UpdateModuleDto,
  CreateLessonDto,
  UpdateLessonDto,
  CourseEnrollmentDto,
  CourseAnalyticsDto,
  ResourceAttachmentDto,
  ModuleQuizDto,
  CourseQuizDto,
  UserModuleProgressDto,
  UserLessonCompletionDto,
  QuizSubmissionHistoryDto,
} from '@cloudlab/shared-types';

export class LearningRepository {
  private pool: mysql.Pool | null = null;
  private isConnected = false;

  private tracks: Map<string, TrackDto> = new Map();
  private courses: Map<string, CourseDto> = new Map();
  private modules: Map<string, ModuleDto> = new Map();
  private lessons: Map<string, LessonDto> = new Map();
  private quizzes: Map<string, QuizDto> = new Map();
  private moduleQuizzes: Map<string, ModuleQuizDto> = new Map(); // key: moduleId
  private courseQuizzes: Map<string, CourseQuizDto> = new Map(); // key: courseId
  private enrollments: Map<string, CourseEnrollmentDto> = new Map(); // key: `${userId}_${courseId}`
  private userModuleProgress: Map<string, UserModuleProgressDto> = new Map(); // key: `${userId}_${moduleId}`
  private userLessonCompletions: Map<string, Set<string>> = new Map(); // key: userId, value: Set of lessonIds
  private quizSubmissionsLog: Map<string, { userId: string; lessonId: string; score: number; passed: boolean }[]> = new Map(); // key: courseId

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
      });

      const conn = await this.pool.getConnection();
      await this.createTables(conn);
      conn.release();
      this.isConnected = true;
      console.log('✅ [Learning Service] Connected to MySQL database:', config.database.database);

      // Load persisted rows back into memory maps so reads stay fast
      try {
        await this.loadPersistedRows();
      } catch (loadErr: any) {
        console.warn('⚠️ [Learning Service] Could not hydrate memory maps from MySQL (' + loadErr.message + '). Seeding fresh.');
      }
    } catch (err: any) {
      console.warn('⚠️ [Learning Service] MySQL unavailable (' + err.message + '). Using in-memory curriculum store for development.');
      this.isConnected = false;
    }

    // Seed realistic DevOps curriculum if empty
    await this.seedCurriculum();
  }

  private async createTables(conn: mysql.PoolConnection): Promise<void> {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tracks (
        id VARCHAR(36) PRIMARY KEY,
        slug VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(50) DEFAULT 'terminal',
        order_index INT DEFAULT 1,
        is_published BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id VARCHAR(36) PRIMARY KEY,
        track_id VARCHAR(36) NOT NULL,
        instructor_id VARCHAR(36),
        instructor_name VARCHAR(100),
        slug VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        difficulty_level VARCHAR(20) DEFAULT 'BEGINNER',
        estimated_hours INT DEFAULT 4,
        order_index INT DEFAULT 1,
        is_published BOOLEAN DEFAULT FALSE,
        resources_json JSON,
        attached_challenges_json JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id VARCHAR(36) PRIMARY KEY,
        course_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        order_index INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id VARCHAR(36) PRIMARY KEY,
        module_id VARCHAR(36) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        content_markdown MEDIUMTEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'READING',
        order_index INT DEFAULT 1,
        duration_minutes INT DEFAULT 20,
        challenge_id VARCHAR(50),
        resources_json JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id VARCHAR(36) PRIMARY KEY,
        lesson_id VARCHAR(36) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        passing_score INT DEFAULT 70,
        questions_json JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS course_enrollments (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        course_id VARCHAR(36) NOT NULL,
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_lessons_count INT DEFAULT 0,
        total_lessons_count INT DEFAULT 0,
        progress_percentage INT DEFAULT 0,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at DATETIME,
        quizzes_completed_count INT DEFAULT 0,
        challenges_completed_count INT DEFAULT 0,
        UNIQUE KEY uq_user_course (user_id, course_id),
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    const columnExists = async (tbl: string, col: string): Promise<boolean> => {
      try {
        const [rows]: any = await conn.query(
          `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [config.database.database, tbl, col]
        );
        return rows[0]?.cnt > 0;
      } catch {
        return false;
      }
    };
    const addColIfMissing = async (tbl: string, col: string, definition: string) => {
      if (!(await columnExists(tbl, col))) {
        try { await conn.query(`ALTER TABLE \`${tbl}\` ADD COLUMN \`${col}\` ${definition}`); } catch (_e) {}
      }
    };

    await addColIfMissing('course_enrollments', 'total_lessons_count', 'INT DEFAULT 0');
    await addColIfMissing('courses', 'instructor_id', 'VARCHAR(36)');
    await addColIfMissing('courses', 'instructor_name', 'VARCHAR(100)');
    await addColIfMissing('courses', 'resources_json', 'JSON');
    await addColIfMissing('courses', 'attached_challenges_json', 'JSON');
    await addColIfMissing('lessons', 'challenge_id', 'VARCHAR(50)');
    await addColIfMissing('lessons', 'resources_json', 'JSON');
    await addColIfMissing('courses', 'target_skill', 'VARCHAR(30)');
    await addColIfMissing('modules', 'target_skill', 'VARCHAR(30)');
    await addColIfMissing('modules', 'skill_points_on_pass', 'INT DEFAULT 40');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS module_quizzes (
        id VARCHAR(36) PRIMARY KEY,
        module_id VARCHAR(36) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        passing_score INT DEFAULT 80,
        questions_json JSON NOT NULL,
        ai_generated BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS course_quizzes (
        id VARCHAR(36) PRIMARY KEY,
        course_id VARCHAR(36) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        passing_score INT DEFAULT 90,
        questions_json JSON NOT NULL,
        ai_generated BOOLEAN DEFAULT TRUE,
        xp_on_pass INT DEFAULT 500,
        skill_points_on_pass INT DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS quiz_submissions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        quiz_type ENUM('MODULE','COURSE','LESSON') NOT NULL,
        quiz_id VARCHAR(36) NOT NULL,
        course_id VARCHAR(36),
        module_id VARCHAR(36),
        score INT NOT NULL,
        passed BOOLEAN NOT NULL,
        answers_json JSON NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_quiz (user_id, quiz_type, quiz_id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_module_progress (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        course_id VARCHAR(36) NOT NULL,
        module_id VARCHAR(36) NOT NULL,
        all_lessons_read BOOLEAN DEFAULT FALSE,
        quiz_passed BOOLEAN DEFAULT FALSE,
        quiz_best_score INT DEFAULT 0,
        completed_at DATETIME,
        UNIQUE KEY uq_user_module (user_id, module_id),
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_lesson_completions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        lesson_id VARCHAR(36) NOT NULL,
        course_id VARCHAR(36) NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        xp_earned INT DEFAULT 20,
        UNIQUE KEY uq_user_lesson (user_id, lesson_id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_progress_profiles (
        user_id VARCHAR(36) PRIMARY KEY,
        total_xp INT DEFAULT 0,
        level INT DEFAULT 1,
        current_level_xp INT DEFAULT 0,
        total_lessons_completed INT DEFAULT 0,
        total_challenges_completed INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS skill_gain_history (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        skill_id VARCHAR(36) NOT NULL,
        source_type VARCHAR(50) NOT NULL,
        source_id VARCHAR(36),
        xp_gained INT DEFAULT 0,
        level_before INT DEFAULT 1,
        level_after INT DEFAULT 1,
        confidence_change FLOAT DEFAULT 0,
        gained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async loadPersistedRows(): Promise<void> {
    if (!this.pool) return;

    const [trackRows]: any = await this.pool.query('SELECT * FROM tracks');
    for (const row of trackRows) {
      this.tracks.set(row.id, {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description ?? '',
        icon: row.icon ?? 'terminal',
        orderIndex: row.order_index ?? 1,
        isPublished: !!row.is_published,
        courses: [],
      });
    }

    const [courseRows]: any = await this.pool.query('SELECT * FROM courses');
    for (const row of courseRows) {
      let resources: ResourceAttachmentDto[] = [];
      let attachedChallengeIds: string[] = [];
      try { resources = row.resources_json ? JSON.parse(row.resources_json) : []; } catch {}
      try { attachedChallengeIds = row.attached_challenges_json ? JSON.parse(row.attached_challenges_json) : []; } catch {}
      this.courses.set(row.id, {
        id: row.id,
        trackId: row.track_id,
        instructorId: row.instructor_id,
        instructorName: row.instructor_name,
        slug: row.slug,
        title: row.title,
        summary: row.summary ?? '',
        difficultyLevel: (row.difficulty_level as CourseDifficulty) ?? CourseDifficulty.BEGINNER,
        estimatedHours: row.estimated_hours ?? 4,
        orderIndex: row.order_index ?? 1,
        isPublished: !!row.is_published,
        resources,
        attachedChallengeIds,
        modules: [],
        targetSkill: row.target_skill,
      });
    }

    const [moduleRows]: any = await this.pool.query('SELECT * FROM modules');
    for (const row of moduleRows) {
      this.modules.set(row.id, {
        id: row.id,
        courseId: row.course_id,
        title: row.title,
        description: row.description ?? '',
        orderIndex: row.order_index ?? 1,
        lessons: [],
        targetSkill: row.target_skill,
        skillPointsOnPass: row.skill_points_on_pass ?? 40,
      });
    }

    const [lessonRows]: any = await this.pool.query('SELECT * FROM lessons');
    for (const row of lessonRows) {
      let resources: ResourceAttachmentDto[] = [];
      try { resources = row.resources_json ? JSON.parse(row.resources_json) : []; } catch {}
      this.lessons.set(row.id, {
        id: row.id,
        moduleId: row.module_id,
        slug: row.slug,
        title: row.title,
        contentMarkdown: row.content_markdown ?? '',
        type: (row.type as LessonType) ?? LessonType.READING,
        orderIndex: row.order_index ?? 1,
        durationMinutes: row.duration_minutes ?? 20,
        challengeId: row.challenge_id,
        resources,
      });
    }

    const [quizRows]: any = await this.pool.query('SELECT * FROM quizzes');
    for (const row of quizRows) {
      let questions: any[] = [];
      try { questions = row.questions_json ? JSON.parse(row.questions_json) : []; } catch {}
      this.quizzes.set(row.id, {
        id: row.id,
        lessonId: row.lesson_id,
        title: row.title,
        passingScore: row.passing_score ?? 70,
        questions,
      });
    }

    const [moduleQuizRows]: any = await this.pool.query('SELECT * FROM module_quizzes');
    for (const row of moduleQuizRows) {
      let questions: any[] = [];
      try { questions = row.questions_json ? JSON.parse(row.questions_json) : []; } catch {}
      this.moduleQuizzes.set(row.module_id, {
        id: row.id,
        moduleId: row.module_id,
        title: row.title,
        passingScore: row.passing_score ?? 80,
        questions,
        aiGenerated: !!row.ai_generated,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    const [courseQuizRows]: any = await this.pool.query('SELECT * FROM course_quizzes');
    for (const row of courseQuizRows) {
      let questions: any[] = [];
      try { questions = row.questions_json ? JSON.parse(row.questions_json) : []; } catch {}
      this.courseQuizzes.set(row.course_id, {
        id: row.id,
        courseId: row.course_id,
        title: row.title,
        passingScore: row.passing_score ?? 90,
        questions,
        aiGenerated: !!row.ai_generated,
        xpOnPass: row.xp_on_pass ?? 500,
        skillPointsOnPass: row.skill_points_on_pass ?? 100,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    const [moduleProgressRows]: any = await this.pool.query('SELECT * FROM user_module_progress');
    for (const row of moduleProgressRows) {
      this.userModuleProgress.set(`${row.user_id}_${row.module_id}`, {
        id: row.id,
        userId: row.user_id,
        courseId: row.course_id,
        moduleId: row.module_id,
        allLessonsRead: !!row.all_lessons_read,
        quizPassed: !!row.quiz_passed,
        quizBestScore: row.quiz_best_score ?? 0,
        completedAt: row.completed_at,
      });
    }

    const [lessonCompletionRows]: any = await this.pool.query('SELECT * FROM user_lesson_completions');
    for (const row of lessonCompletionRows) {
      const userSet = this.userLessonCompletions.get(row.user_id) || new Set();
      userSet.add(row.lesson_id);
      this.userLessonCompletions.set(row.user_id, userSet);
    }

    const [enrollmentRows]: any = await this.pool.query('SELECT * FROM course_enrollments');
    for (const row of enrollmentRows) {
      const dto: CourseEnrollmentDto = {
        id: row.id,
        userId: row.user_id,
        courseId: row.course_id,
        userEmail: row.user_email,
        userName: row.user_name,
        enrolledAt: row.enrolled_at,
        completedLessonsCount: row.completed_lessons_count ?? 0,
        totalLessonsCount: row.total_lessons_count ?? 0,
        progressPercentage: row.progress_percentage ?? 0,
        isCompleted: !!row.is_completed,
        completedAt: row.completed_at,
        quizzesCompletedCount: row.quizzes_completed_count ?? 0,
        challengesCompletedCount: row.challenges_completed_count ?? 0,
      };
      this.enrollments.set(`${dto.userId}_${dto.courseId}`, dto);
    }

    console.log(`✅ [Learning Service] Hydrated from MySQL: tracks=${this.tracks.size} courses=${this.courses.size} modules=${this.modules.size} lessons=${this.lessons.size} enrollments=${this.enrollments.size}`);
  }

  private async persistSeedCurriculumToDb(): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      for (const track of this.tracks.values()) {
        await this.pool.query(
          `INSERT IGNORE INTO tracks (id, slug, title, description, icon, order_index, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [track.id, track.slug, track.title, track.description ?? null, track.icon, track.orderIndex, track.isPublished]
        );
      }
      for (const course of this.courses.values()) {
        await this.pool.query(
          `INSERT IGNORE INTO courses (id, track_id, instructor_id, instructor_name, slug, title, summary, difficulty_level, estimated_hours, order_index, is_published, resources_json, attached_challenges_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            course.id,
            course.trackId,
            course.instructorId ?? null,
            course.instructorName ?? null,
            course.slug,
            course.title,
            course.summary ?? null,
            course.difficultyLevel,
            course.estimatedHours,
            course.orderIndex,
            course.isPublished,
            JSON.stringify(course.resources ?? []),
            JSON.stringify(course.attachedChallengeIds ?? []),
          ]
        );
      }
      for (const mod of this.modules.values()) {
        await this.pool.query(
          `INSERT IGNORE INTO modules (id, course_id, title, description, order_index) VALUES (?, ?, ?, ?, ?)`,
          [mod.id, mod.courseId, mod.title, mod.description ?? null, mod.orderIndex]
        );
      }
      for (const lesson of this.lessons.values()) {
        await this.pool.query(
          `INSERT IGNORE INTO lessons (id, module_id, slug, title, content_markdown, type, order_index, duration_minutes, challenge_id, resources_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            lesson.id,
            lesson.moduleId,
            lesson.slug,
            lesson.title,
            lesson.contentMarkdown,
            lesson.type,
            lesson.orderIndex,
            lesson.durationMinutes,
            lesson.challengeId ?? null,
            JSON.stringify(lesson.resources ?? []),
          ]
        );
      }
      for (const quiz of this.quizzes.values()) {
        await this.pool.query(
          `INSERT IGNORE INTO quizzes (id, lesson_id, title, passing_score, questions_json) VALUES (?, ?, ?, ?, ?)`,
          [quiz.id, quiz.lessonId, quiz.title, quiz.passingScore, JSON.stringify(quiz.questions ?? [])]
        );
      }
      for (const enr of this.enrollments.values()) {
        await this.pool.query(
          `INSERT IGNORE INTO course_enrollments (id, user_id, course_id, user_email, user_name, enrolled_at, completed_lessons_count, total_lessons_count, progress_percentage, is_completed, completed_at, quizzes_completed_count, challenges_completed_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            enr.id,
            enr.userId,
            enr.courseId,
            enr.userEmail ?? null,
            enr.userName ?? null,
            enr.enrolledAt,
            enr.completedLessonsCount,
            enr.totalLessonsCount,
            enr.progressPercentage,
            enr.isCompleted,
            enr.completedAt ?? null,
            enr.quizzesCompletedCount,
            enr.challengesCompletedCount,
          ]
        );
      }
      console.log('✅ [Learning Service] Seed curriculum persisted to MySQL');
    } catch (err: any) {
      console.warn('⚠️ [Learning Service] Failed to persist seed curriculum to MySQL:', err.message);
    }
  }

  private async seedCurriculum(): Promise<void> {
    if (this.tracks.size > 0) return;

    // 1. Linux Track
    const linuxTrack: TrackDto = {
      id: 'track-linux',
      slug: 'linux-systems',
      title: 'Linux Systems & Kernel Diagnostics',
      description: 'Master core Linux administration, process states, systemd services, filesystem permissions, and network troubleshooting.',
      icon: 'terminal',
      orderIndex: 1,
      isPublished: true,
    };

    const linuxLesson1Quiz: QuizDto = {
      id: 'quiz-linux-1',
      lessonId: 'lesson-linux-1',
      title: 'Process Lifecycle & Signals Assessment',
      passingScore: 70,
      questions: [
        {
          id: 'q1',
          question: 'Which signal cannot be caught, blocked, or ignored by a process?',
          options: ['SIGTERM (15)', 'SIGKILL (9)', 'SIGINT (2)', 'SIGHUP (1)'],
          correctIndex: 1,
          explanation: 'SIGKILL (9) is handled directly by the Linux kernel and terminates the process unconditionally.',
        },
        {
          id: 'q2',
          question: 'What process state code in ps/top indicates an uninterruptible sleep (usually waiting for Disk I/O)?',
          options: ['R (Running)', 'S (Interruptible Sleep)', 'D (Uninterruptible Sleep)', 'Z (Zombie)'],
          correctIndex: 2,
          explanation: 'D state means the process is waiting on kernel resources (e.g. disk read or hardware sync) and cannot be interrupted.',
        },
      ],
    };

    const linuxLesson1: LessonDto = {
      id: 'lesson-linux-1',
      moduleId: 'mod-linux-1',
      slug: 'process-lifecycle-and-signals',
      title: 'Understanding Linux Process Lifecycle & Signals',
      contentMarkdown: `# Linux Process Architecture & Signals

In production systems engineering, understanding process management is essential for incident response.

## Key Process States
- **R (Running / Runnable)**: The process is executing or waiting in the CPU run queue.
- **S (Interruptible Sleep)**: Waiting on events like user input, sockets, or sleep timer.
- **D (Uninterruptible Sleep)**: Waiting on direct hardware I/O.
- **Z (Zombie)**: Child has exited but parent has not called \`wait()\` to collect its exit status.

\`\`\`bash
# List all zombie processes on the host
ps aux | grep 'Z'

# Check parent process ID (PPID)
ps -o pid,ppid,state,cmd -p <PID>
\`\`\`
`,
      type: LessonType.READING,
      orderIndex: 1,
      durationMinutes: 20,
      quiz: linuxLesson1Quiz,
      challengeId: 'chal-linux-zombie',
      resources: [
        {
          id: 'res-linux-cheat',
          title: 'Linux Kernel Signals & Diagnostics Cheat Sheet',
          fileUrl: 'https://raw.githubusercontent.com/cloudlab/docs/main/linux-signals-cheatsheet.pdf',
          fileType: 'PDF',
          fileSizeBytes: 420000,
          uploadedAt: new Date().toISOString(),
        },
      ],
    };

    const linuxModule: ModuleDto = {
      id: 'mod-linux-1',
      courseId: 'course-linux-internals',
      title: 'Kernel Processes & Subsystems',
      description: 'Diving deep into Linux process hierarchies, namespaces, and cgroups.',
      orderIndex: 1,
      lessons: [linuxLesson1],
    };

    const linuxCourse: CourseDto = {
      id: 'course-linux-internals',
      trackId: linuxTrack.id,
      instructorId: '22222222-2222-2222-2222-222222222222',
      instructorName: 'Sarah Architect',
      slug: 'linux-kernel-internals',
      title: 'Linux Kernel & System Diagnostics',
      summary: 'Master Linux process scheduling, signals, disk I/O, and troubleshooting.',
      difficultyLevel: CourseDifficulty.BEGINNER,
      estimatedHours: 4,
      isPublished: true,
      orderIndex: 1,
      modules: [linuxModule],
      attachedChallengeIds: ['chal-linux-zombie'],
      resources: [
        {
          id: 'res-course-linux-syllabus',
          title: 'Official Linux Diagnostics Curriculum Syllabus.pdf',
          fileUrl: 'https://raw.githubusercontent.com/cloudlab/docs/main/syllabus-linux.pdf',
          fileType: 'PDF',
          fileSizeBytes: 650000,
          uploadedAt: new Date().toISOString(),
        },
      ],
    };

    linuxTrack.courses = [linuxCourse];

    // 2. Docker Track
    const dockerTrack: TrackDto = {
      id: 'track-docker',
      slug: 'docker-containers',
      title: 'Containerization & Docker Engine',
      description: 'Master image layers, multi-stage builds, storage drivers, volume mounts, and container isolation.',
      icon: 'box',
      orderIndex: 2,
      isPublished: true,
    };

    const dockerLesson1Quiz: QuizDto = {
      id: 'quiz-docker-1',
      lessonId: 'lesson-docker-1',
      title: 'Docker Port Mapping & Network Verification',
      passingScore: 70,
      questions: [
        {
          id: 'qd1',
          question: 'What does the syntax `-p 8080:80` represent in `docker run`?',
          options: [
            'Maps container port 8080 to host port 80',
            'Maps host port 8080 to container port 80',
            'Opens port 8080 and 80 inside container',
            'Sets network rate limit between 80 and 8080 KB/s',
          ],
          correctIndex: 1,
          explanation: 'The format is always -p <HOST_PORT>:<CONTAINER_PORT>.',
        },
      ],
    };

    const dockerLesson1: LessonDto = {
      id: 'lesson-docker-1',
      moduleId: 'mod-docker-1',
      slug: 'container-networking-and-ports',
      title: 'Container Network Namespace & Port Redirection',
      contentMarkdown: `# Container Networking Architecture

Docker utilizes Linux **network namespaces**, **veth pairs**, and **iptables NAT rules** to route packets between the host and isolated containers.

\`\`\`bash
# Inspect container port assignments
docker port <container_name>

# View the Docker bridge network
docker network inspect bridge
\`\`\`
`,
      type: LessonType.READING,
      orderIndex: 1,
      durationMinutes: 25,
      quiz: dockerLesson1Quiz,
      challengeId: 'chal-docker-port-conflict',
    };

    const dockerModule: ModuleDto = {
      id: 'mod-docker-1',
      courseId: 'course-docker-mastery',
      title: 'Container Networking & Ports',
      description: 'Demystifying container packet flow and port mappings.',
      orderIndex: 1,
      lessons: [dockerLesson1],
    };

    const dockerCourse: CourseDto = {
      id: 'course-docker-mastery',
      trackId: dockerTrack.id,
      instructorId: '22222222-2222-2222-2222-222222222222',
      instructorName: 'Sarah Architect',
      slug: 'docker-mastery',
      title: 'Docker Mastery & Multi-Stage Builds',
      summary: 'Practical container construction, networking, and production optimization.',
      difficultyLevel: CourseDifficulty.INTERMEDIATE,
      estimatedHours: 6,
      isPublished: true,
      orderIndex: 1,
      modules: [dockerModule],
      attachedChallengeIds: ['chal-docker-port-conflict'],
    };

    dockerTrack.courses = [dockerCourse];

    // 3. Kubernetes Track
    const k8sTrack: TrackDto = {
      id: 'track-kubernetes',
      slug: 'kubernetes-production',
      title: 'Kubernetes Orchestration & Incident Response',
      description: 'Triage CrashLoopBackOff, configure probes, deploy high-availability workloads, and debug services.',
      icon: 'kubernetes',
      orderIndex: 3,
      isPublished: true,
    };

    const k8sLesson1Quiz: QuizDto = {
      id: 'quiz-k8s-1',
      lessonId: 'lesson-k8s-1',
      title: 'Kubernetes Troubleshooting Assessment',
      passingScore: 70,
      questions: [
        {
          id: 'qk1',
          question: 'What is the most effective first command to investigate a Pod in CrashLoopBackOff state?',
          options: [
            'kubectl delete pod <pod-name>',
            'kubectl describe pod <pod-name> && kubectl logs <pod-name> --previous',
            'kubectl restart deployment <name>',
            'kubectl cordon node <node-name>',
          ],
          correctIndex: 1,
          explanation: 'kubectl describe pod reveals termination exit codes and events, while kubectl logs --previous reveals why the container crashed.',
        },
      ],
    };

    const k8sLesson1: LessonDto = {
      id: 'lesson-k8s-1',
      moduleId: 'mod-k8s-1',
      slug: 'triage-crashloopbackoff',
      title: 'Triaging CrashLoopBackOff & Application Failures',
      contentMarkdown: `# Triaging CrashLoopBackOff Incidents

**CrashLoopBackOff** indicates that Kubernetes is repeatedly trying to run a container that terminates with a non-zero exit code or fails its liveness probe.

\`\`\`bash
# 1. Inspect events and container termination reason
kubectl describe pod <pod-name>

# 2. Check logs of previously crashed container instance
kubectl logs <pod-name> --previous
\`\`\`
`,
      type: LessonType.READING,
      orderIndex: 1,
      durationMinutes: 30,
      quiz: k8sLesson1Quiz,
      challengeId: 'chal-k8s-crashloop',
    };

    const k8sModule: ModuleDto = {
      id: 'mod-k8s-1',
      courseId: 'course-k8s-incident',
      title: 'Pod Failures & Diagnostics',
      description: 'Techniques for diagnosing crashing containers and scheduling failures.',
      orderIndex: 1,
      lessons: [k8sLesson1],
    };

    const k8sCourse: CourseDto = {
      id: 'course-k8s-incident',
      trackId: k8sTrack.id,
      instructorId: '22222222-2222-2222-2222-222222222222',
      instructorName: 'Sarah Architect',
      slug: 'kubernetes-incident-response',
      title: 'Kubernetes Incident Response & Reliability',
      summary: 'Diagnose real production Kubernetes failures and restore cluster services.',
      difficultyLevel: CourseDifficulty.ADVANCED,
      estimatedHours: 8,
      isPublished: true,
      orderIndex: 1,
      modules: [k8sModule],
      attachedChallengeIds: ['chal-k8s-crashloop'],
    };

    k8sTrack.courses = [k8sCourse];

    // Store in memory
    [linuxTrack, dockerTrack, k8sTrack].forEach((t) => this.tracks.set(t.id, t));
    [linuxCourse, dockerCourse, k8sCourse].forEach((c) => this.courses.set(c.id, c));
    [linuxModule, dockerModule, k8sModule].forEach((m) => this.modules.set(m.id, m));
    [linuxLesson1, dockerLesson1, k8sLesson1].forEach((l) => this.lessons.set(l.id, l));
    [linuxLesson1Quiz, dockerLesson1Quiz, k8sLesson1Quiz].forEach((q) => this.quizzes.set(q.lessonId, q));

    // Seed mock student enrollment for initial analytics demonstration
    const mockEnrollment: CourseEnrollmentDto = {
      id: 'enr-sample-1',
      userId: '11111111-1111-1111-1111-111111111111',
      courseId: linuxCourse.id,
      userEmail: 'student@cloudlab.local',
      userName: 'Alex DevOps',
      enrolledAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      completedLessonsCount: 1,
      totalLessonsCount: 1,
      progressPercentage: 100,
      isCompleted: true,
      completedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      quizzesCompletedCount: 1,
      challengesCompletedCount: 1,
    };
    this.enrollments.set(`${mockEnrollment.userId}_${mockEnrollment.courseId}`, mockEnrollment);
    this.quizSubmissionsLog.set(linuxCourse.id, [
      {
        userId: '11111111-1111-1111-1111-111111111111',
        lessonId: linuxLesson1.id,
        score: 100,
        passed: true,
      },
    ]);

    await this.persistSeedCurriculumToDb();
  }

  // ==========================================
  // Track CRUD & Filtering
  // ==========================================
  async getAllTracks(role?: string): Promise<TrackDto[]> {
    const isInstructorOrAdmin = role === 'INSTRUCTOR' || role === 'ADMIN';
    const trackList = Array.from(this.tracks.values())
      .filter((t) => (isInstructorOrAdmin ? true : t.isPublished))
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return trackList.map((t) => ({
      ...t,
      courses: this.getCoursesByTrackId(t.id, role),
    }));
  }

  async getTrackById(id: string, role?: string): Promise<TrackDto | null> {
    const track = this.tracks.get(id);
    if (!track) return null;
    const isInstructorOrAdmin = role === 'INSTRUCTOR' || role === 'ADMIN';
    if (!isInstructorOrAdmin && !track.isPublished) return null;
    return { ...track, courses: this.getCoursesByTrackId(track.id, role) };
  }

  async getTrackBySlug(slug: string, role?: string): Promise<TrackDto | null> {
    for (const t of this.tracks.values()) {
      if (t.slug === slug) {
        const isInstructorOrAdmin = role === 'INSTRUCTOR' || role === 'ADMIN';
        if (!isInstructorOrAdmin && !t.isPublished) return null;
        return { ...t, courses: this.getCoursesByTrackId(t.id, role) };
      }
    }
    return null;
  }

  async createTrack(dto: CreateTrackDto): Promise<TrackDto> {
    const id = uuidv4();
    const track: TrackDto = {
      id,
      slug: dto.slug.toLowerCase().trim(),
      title: dto.title.trim(),
      description: dto.description.trim(),
      icon: dto.icon || 'terminal',
      orderIndex: dto.orderIndex || this.tracks.size + 1,
      isPublished: dto.isPublished !== undefined ? dto.isPublished : true,
      courses: [],
    };
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO tracks (id, slug, title, description, icon, order_index, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [track.id, track.slug, track.title, track.description ?? null, track.icon, track.orderIndex, track.isPublished]
        );
      } catch (err: any) {
        console.error('❌ [Learning Repository] createTrack MySQL INSERT failed:', err.message);
      }
    }
    this.tracks.set(id, track);
    return track;
  }

  async updateTrack(id: string, dto: UpdateTrackDto): Promise<TrackDto | null> {
    const existing = this.tracks.get(id);
    if (!existing) return null;

    const updated: TrackDto = {
      ...existing,
      slug: dto.slug ? dto.slug.toLowerCase().trim() : existing.slug,
      title: dto.title ? dto.title.trim() : existing.title,
      description: dto.description !== undefined ? dto.description.trim() : existing.description,
      icon: dto.icon || existing.icon,
      orderIndex: dto.orderIndex !== undefined ? dto.orderIndex : existing.orderIndex,
      isPublished: dto.isPublished !== undefined ? dto.isPublished : existing.isPublished,
    };
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `UPDATE tracks SET slug=?, title=?, description=?, icon=?, order_index=?, is_published=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          [updated.slug, updated.title, updated.description ?? null, updated.icon, updated.orderIndex, updated.isPublished, id]
        );
      } catch (err: any) {
        console.error('❌ [Learning Repository] updateTrack MySQL UPDATE failed:', err.message);
      }
    }
    this.tracks.set(id, updated);
    return { ...updated, courses: this.getCoursesByTrackId(id) };
  }

  async deleteTrack(id: string): Promise<boolean> {
    if (!this.tracks.has(id)) return false;
    for (const course of this.courses.values()) {
      if (course.trackId === id) {
        await this.deleteCourse(course.id);
      }
    }
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(`DELETE FROM tracks WHERE id=?`, [id]);
      } catch (err: any) {
        console.error('❌ [Learning Repository] deleteTrack MySQL DELETE failed:', err.message);
      }
    }
    return this.tracks.delete(id);
  }

  // ==========================================
  // Course CRUD & Publishing Controls
  // ==========================================
  getCoursesByTrackId(trackId: string, role?: string): CourseDto[] {
    const isInstructorOrAdmin = role === 'INSTRUCTOR' || role === 'ADMIN';
    const list: CourseDto[] = [];
    for (const c of this.courses.values()) {
      if (c.trackId === trackId) {
        if (isInstructorOrAdmin || c.isPublished) {
          list.push(this.enrichCourse(c));
        }
      }
    }
    return list.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getAllCourses(role?: string, instructorId?: string): Promise<CourseDto[]> {
    const isInstructorOrAdmin = role === 'INSTRUCTOR' || role === 'ADMIN';
    const list: CourseDto[] = [];
    for (const c of this.courses.values()) {
      if (!isInstructorOrAdmin && !c.isPublished) continue;
      if (role === 'INSTRUCTOR' && instructorId && c.instructorId && c.instructorId !== instructorId) {
        continue;
      }
      list.push(this.enrichCourse(c));
    }
    return list.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getCourseById(id: string, role?: string): Promise<CourseDto | null> {
    const course = this.courses.get(id);
    if (!course) return null;
    const isInstructorOrAdmin = role === 'INSTRUCTOR' || role === 'ADMIN';
    if (!isInstructorOrAdmin && !course.isPublished) return null;
    return this.enrichCourse(course);
  }

  async getCourseBySlug(slug: string, role?: string): Promise<CourseDto | null> {
    for (const c of this.courses.values()) {
      if (c.slug === slug) {
        const isInstructorOrAdmin = role === 'INSTRUCTOR' || role === 'ADMIN';
        if (!isInstructorOrAdmin && !c.isPublished) return null;
        return this.enrichCourse(c);
      }
    }
    return null;
  }

  private enrichCourse(c: CourseDto): CourseDto {
    const modules = this.getModulesByCourseId(c.id);
    let totalLessons = 0;
    modules.forEach((m) => {
      totalLessons += m.lessons?.length || 0;
    });

    let enrolledCount = 0;
    for (const enr of this.enrollments.values()) {
      if (enr.courseId === c.id) enrolledCount++;
    }

    return {
      ...c,
      modules,
      totalLessons,
      enrolledStudentsCount: enrolledCount,
    };
  }

  async createCourse(dto: CreateCourseDto): Promise<CourseDto> {
    const id = uuidv4();
    const resources = dto.resources || [];
    const attachedChallengeIds = dto.attachedChallengeIds || [];
    const course: CourseDto = {
      id,
      trackId: dto.trackId,
      instructorId: dto.instructorId,
      instructorName: dto.instructorName || 'Instructor',
      slug: dto.slug.toLowerCase().trim(),
      title: dto.title.trim(),
      summary: dto.summary.trim(),
      difficultyLevel: dto.difficultyLevel || CourseDifficulty.BEGINNER,
      estimatedHours: dto.estimatedHours || 4,
      orderIndex: dto.orderIndex || 1,
      isPublished: dto.isPublished !== undefined ? dto.isPublished : false,
      resources,
      attachedChallengeIds,
      modules: [],
    };
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO courses (id, track_id, instructor_id, instructor_name, slug, title, summary, difficulty_level, estimated_hours, order_index, is_published, resources_json, attached_challenges_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            course.trackId,
            course.instructorId ?? null,
            course.instructorName ?? null,
            course.slug,
            course.title,
            course.summary ?? null,
            course.difficultyLevel,
            course.estimatedHours,
            course.orderIndex,
            course.isPublished,
            JSON.stringify(resources),
            JSON.stringify(attachedChallengeIds),
          ]
        );
      } catch (err: any) {
        console.error('❌ [Learning Repository] createCourse MySQL INSERT failed:', err.message);
      }
    }
    this.courses.set(id, course);
    return this.enrichCourse(course);
  }

  async updateCourse(id: string, dto: UpdateCourseDto): Promise<CourseDto | null> {
    const existing = this.courses.get(id);
    if (!existing) return null;

    const resources = dto.resources !== undefined ? dto.resources : existing.resources;
    const attachedChallengeIds = dto.attachedChallengeIds !== undefined ? dto.attachedChallengeIds : existing.attachedChallengeIds;
    const updated: CourseDto = {
      ...existing,
      trackId: dto.trackId || existing.trackId,
      instructorId: dto.instructorId !== undefined ? dto.instructorId : existing.instructorId,
      instructorName: dto.instructorName !== undefined ? dto.instructorName : existing.instructorName,
      slug: dto.slug ? dto.slug.toLowerCase().trim() : existing.slug,
      title: dto.title ? dto.title.trim() : existing.title,
      summary: dto.summary !== undefined ? dto.summary.trim() : existing.summary,
      difficultyLevel: dto.difficultyLevel || existing.difficultyLevel,
      estimatedHours: dto.estimatedHours !== undefined ? dto.estimatedHours : existing.estimatedHours,
      orderIndex: dto.orderIndex !== undefined ? dto.orderIndex : existing.orderIndex,
      isPublished: dto.isPublished !== undefined ? dto.isPublished : existing.isPublished,
      resources,
      attachedChallengeIds,
    };
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `UPDATE courses SET track_id=?, instructor_id=?, instructor_name=?, slug=?, title=?, summary=?, difficulty_level=?, estimated_hours=?, order_index=?, is_published=?, resources_json=?, attached_challenges_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          [
            updated.trackId,
            updated.instructorId ?? null,
            updated.instructorName ?? null,
            updated.slug,
            updated.title,
            updated.summary ?? null,
            updated.difficultyLevel,
            updated.estimatedHours,
            updated.orderIndex,
            updated.isPublished,
            JSON.stringify(resources),
            JSON.stringify(attachedChallengeIds),
            id,
          ]
        );
      } catch (err: any) {
        console.error('❌ [Learning Repository] updateCourse MySQL UPDATE failed:', err.message);
      }
    }
    this.courses.set(id, updated);
    return this.enrichCourse(updated);
  }

  async setCoursePublishStatus(id: string, isPublished: boolean): Promise<CourseDto | null> {
    const course = this.courses.get(id);
    if (!course) return null;
    course.isPublished = isPublished;
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(`UPDATE courses SET is_published=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [isPublished, id]);
      } catch (err: any) {
        console.error('❌ [Learning Repository] setCoursePublishStatus MySQL UPDATE failed:', err.message);
      }
    }
    this.courses.set(id, course);
    return this.enrichCourse(course);
  }

  async deleteCourse(id: string): Promise<boolean> {
    if (!this.courses.has(id)) return false;
    for (const mod of this.modules.values()) {
      if (mod.courseId === id) {
        await this.deleteModule(mod.id);
      }
    }
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(`DELETE FROM courses WHERE id=?`, [id]);
      } catch (err: any) {
        console.error('❌ [Learning Repository] deleteCourse MySQL DELETE failed:', err.message);
      }
    }
    return this.courses.delete(id);
  }

  // ==========================================
  // Module CRUD & Reordering
  // ==========================================
  getModulesByCourseId(courseId: string): ModuleDto[] {
    const list: ModuleDto[] = [];
    for (const m of this.modules.values()) {
      if (m.courseId === courseId) {
        list.push({ ...m, lessons: this.getLessonsByModuleId(m.id) });
      }
    }
    return list.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getModuleById(id: string): Promise<ModuleDto | null> {
    const m = this.modules.get(id);
    if (!m) return null;
    return { ...m, lessons: this.getLessonsByModuleId(m.id) };
  }

  async createModule(dto: CreateModuleDto): Promise<ModuleDto> {
    const id = uuidv4();
    const module: ModuleDto = {
      id,
      courseId: dto.courseId,
      title: dto.title.trim(),
      description: dto.description.trim(),
      orderIndex: dto.orderIndex || 1,
      lessons: [],
    };
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO modules (id, course_id, title, description, order_index) VALUES (?, ?, ?, ?, ?)`,
          [module.id, module.courseId, module.title, module.description ?? null, module.orderIndex]
        );
      } catch (err: any) {
        console.error('❌ [Learning Repository] createModule MySQL INSERT failed:', err.message);
      }
    }
    this.modules.set(id, module);
    return module;
  }

  async updateModule(id: string, dto: UpdateModuleDto): Promise<ModuleDto | null> {
    const existing = this.modules.get(id);
    if (!existing) return null;

    const updated: ModuleDto = {
      ...existing,
      courseId: dto.courseId || existing.courseId,
      title: dto.title ? dto.title.trim() : existing.title,
      description: dto.description !== undefined ? dto.description.trim() : existing.description,
      orderIndex: dto.orderIndex !== undefined ? dto.orderIndex : existing.orderIndex,
    };
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `UPDATE modules SET course_id=?, title=?, description=?, order_index=? WHERE id=?`,
          [updated.courseId, updated.title, updated.description ?? null, updated.orderIndex, id]
        );
      } catch (err: any) {
        console.error('❌ [Learning Repository] updateModule MySQL UPDATE failed:', err.message);
      }
    }
    this.modules.set(id, updated);
    return { ...updated, lessons: this.getLessonsByModuleId(id) };
  }

  async deleteModule(id: string): Promise<boolean> {
    if (!this.modules.has(id)) return false;
    for (const lesson of this.lessons.values()) {
      if (lesson.moduleId === id) {
        await this.deleteLesson(lesson.id);
      }
    }
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(`DELETE FROM modules WHERE id=?`, [id]);
      } catch (err: any) {
        console.error('❌ [Learning Repository] deleteModule MySQL DELETE failed:', err.message);
      }
    }
    return this.modules.delete(id);
  }

  async reorderModules(courseId: string, moduleIdsInOrder: string[]): Promise<ModuleDto[]> {
    moduleIdsInOrder.forEach((id, idx) => {
      const mod = this.modules.get(id);
      if (mod && mod.courseId === courseId) {
        mod.orderIndex = idx + 1;
        this.modules.set(id, mod);
      }
    });
    if (this.isConnected && this.pool) {
      try {
        for (let i = 0; i < moduleIdsInOrder.length; i++) {
          await this.pool.query(`UPDATE modules SET order_index=? WHERE id=?`, [i + 1, moduleIdsInOrder[i]]);
        }
      } catch (err: any) {
        console.error('❌ [Learning Repository] reorderModules MySQL UPDATE failed:', err.message);
      }
    }
    return this.getModulesByCourseId(courseId);
  }

  // ==========================================
  // Lesson CRUD, Reordering, Quizzes, & Challenge Attachments
  // ==========================================
  getLessonsByModuleId(moduleId: string): LessonDto[] {
    const list: LessonDto[] = [];
    for (const l of this.lessons.values()) {
      if (l.moduleId === moduleId) {
        list.push({ ...l, quiz: this.quizzes.get(l.id) });
      }
    }
    return list.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getLessonById(id: string): Promise<LessonDto | null> {
    const lesson = this.lessons.get(id);
    if (!lesson) return null;
    return { ...lesson, quiz: this.quizzes.get(lesson.id) };
  }

  async createLesson(dto: CreateLessonDto): Promise<LessonDto> {
    const id = uuidv4();
    const lesson: LessonDto = {
      id,
      moduleId: dto.moduleId,
      slug: dto.slug.toLowerCase().trim(),
      title: dto.title.trim(),
      contentMarkdown: dto.contentMarkdown,
      type: dto.type || LessonType.READING,
      orderIndex: dto.orderIndex || 1,
      durationMinutes: dto.durationMinutes || 20,
      challengeId: dto.challengeId,
      resources: dto.resources || [],
    };
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO lessons (id, module_id, slug, title, content_markdown, type, order_index, duration_minutes, challenge_id, resources_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            lesson.id,
            lesson.moduleId,
            lesson.slug,
            lesson.title,
            lesson.contentMarkdown,
            lesson.type,
            lesson.orderIndex,
            lesson.durationMinutes,
            lesson.challengeId ?? null,
            JSON.stringify(lesson.resources ?? []),
          ]
        );
      } catch (err: any) {
        console.error('❌ [Learning Repository] createLesson MySQL INSERT failed:', err.message);
      }
    }
    this.lessons.set(id, lesson);

    if (dto.quiz) {
      const quiz: QuizDto = {
        ...dto.quiz,
        id: dto.quiz.id || uuidv4(),
        lessonId: id,
      };
      if (this.isConnected && this.pool) {
        try {
          await this.pool.query(
            `INSERT INTO quizzes (id, lesson_id, title, passing_score, questions_json) VALUES (?, ?, ?, ?, ?)`,
            [quiz.id, quiz.lessonId, quiz.title, quiz.passingScore, JSON.stringify(quiz.questions ?? [])]
          );
        } catch (err: any) {
          console.error('❌ [Learning Repository] createQuiz MySQL INSERT failed:', err.message);
        }
      }
      this.quizzes.set(id, quiz);
      lesson.quiz = quiz;
    }
    return lesson;
  }

  async updateLesson(id: string, dto: UpdateLessonDto): Promise<LessonDto | null> {
    const existing = this.lessons.get(id);
    if (!existing) return null;

    const updated: LessonDto = {
      ...existing,
      moduleId: dto.moduleId || existing.moduleId,
      slug: dto.slug ? dto.slug.toLowerCase().trim() : existing.slug,
      title: dto.title ? dto.title.trim() : existing.title,
      contentMarkdown: dto.contentMarkdown !== undefined ? dto.contentMarkdown : existing.contentMarkdown,
      type: dto.type || existing.type,
      orderIndex: dto.orderIndex !== undefined ? dto.orderIndex : existing.orderIndex,
      durationMinutes: dto.durationMinutes !== undefined ? dto.durationMinutes : existing.durationMinutes,
      challengeId: dto.challengeId !== undefined ? dto.challengeId : existing.challengeId,
      resources: dto.resources !== undefined ? dto.resources : existing.resources,
    };
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `UPDATE lessons SET module_id=?, slug=?, title=?, content_markdown=?, type=?, order_index=?, duration_minutes=?, challenge_id=?, resources_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          [
            updated.moduleId,
            updated.slug,
            updated.title,
            updated.contentMarkdown,
            updated.type,
            updated.orderIndex,
            updated.durationMinutes,
            updated.challengeId ?? null,
            JSON.stringify(updated.resources ?? []),
            id,
          ]
        );
      } catch (err: any) {
        console.error('❌ [Learning Repository] updateLesson MySQL UPDATE failed:', err.message);
      }
    }
    this.lessons.set(id, updated);

    if (dto.quiz) {
      const quizData = { ...dto.quiz, lessonId: id };
      if (this.isConnected && this.pool) {
        try {
          await this.pool.query(
            `INSERT INTO quizzes (id, lesson_id, title, passing_score, questions_json) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), passing_score=VALUES(passing_score), questions_json=VALUES(questions_json)`,
            [quizData.id, quizData.lessonId, quizData.title, quizData.passingScore, JSON.stringify(quizData.questions ?? [])]
          );
        } catch (err: any) {
          console.error('❌ [Learning Repository] updateQuiz MySQL UPSERT failed:', err.message);
        }
      }
      this.quizzes.set(id, quizData);
      updated.quiz = this.quizzes.get(id);
    }
    return updated;
  }

  async deleteLesson(id: string): Promise<boolean> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(`DELETE FROM quizzes WHERE lesson_id=?`, [id]);
        await this.pool.query(`DELETE FROM lessons WHERE id=?`, [id]);
      } catch (err: any) {
        console.error('❌ [Learning Repository] deleteLesson MySQL DELETE failed:', err.message);
      }
    }
    this.quizzes.delete(id);
    return this.lessons.delete(id);
  }

  async reorderLessons(moduleId: string, lessonIdsInOrder: string[]): Promise<LessonDto[]> {
    lessonIdsInOrder.forEach((id, idx) => {
      const les = this.lessons.get(id);
      if (les && les.moduleId === moduleId) {
        les.orderIndex = idx + 1;
        this.lessons.set(id, les);
      }
    });
    if (this.isConnected && this.pool) {
      try {
        for (let i = 0; i < lessonIdsInOrder.length; i++) {
          await this.pool.query(`UPDATE lessons SET order_index=? WHERE id=?`, [i + 1, lessonIdsInOrder[i]]);
        }
      } catch (err: any) {
        console.error('❌ [Learning Repository] reorderLessons MySQL UPDATE failed:', err.message);
      }
    }
    return this.getLessonsByModuleId(moduleId);
  }

  async getQuizByLessonId(lessonId: string): Promise<QuizDto | null> {
    return this.quizzes.get(lessonId) || null;
  }

  // ==========================================
  // Student Enrollment & Progress Tracking
  // ==========================================
  async enrollStudent(userId: string, courseId: string, userEmail?: string, userName?: string): Promise<CourseEnrollmentDto> {
    const key = `${userId}_${courseId}`;
    if (this.enrollments.has(key)) {
      return this.enrollments.get(key)!;
    }

    const course = await this.getCourseById(courseId, 'ADMIN');
    const totalLessons = course?.totalLessons || 0;

    const enrollment: CourseEnrollmentDto = {
      id: uuidv4(),
      userId,
      courseId,
      userEmail,
      userName: userName || userEmail || 'Student',
      enrolledAt: new Date().toISOString(),
      completedLessonsCount: 0,
      totalLessonsCount: totalLessons,
      progressPercentage: 0,
      isCompleted: false,
      quizzesCompletedCount: 0,
      challengesCompletedCount: 0,
    };
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO course_enrollments (id, user_id, course_id, user_email, user_name, enrolled_at, completed_lessons_count, total_lessons_count, progress_percentage, is_completed, completed_at, quizzes_completed_count, challenges_completed_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            enrollment.id,
            enrollment.userId,
            enrollment.courseId,
            enrollment.userEmail ?? null,
            enrollment.userName ?? null,
            enrollment.enrolledAt,
            enrollment.completedLessonsCount,
            enrollment.totalLessonsCount,
            enrollment.progressPercentage,
            enrollment.isCompleted,
            enrollment.completedAt ?? null,
            enrollment.quizzesCompletedCount,
            enrollment.challengesCompletedCount,
          ]
        );
      } catch (err: any) {
        console.error('❌ [Learning Repository] enrollStudent MySQL INSERT failed:', err.message);
      }
    }
    this.enrollments.set(key, enrollment);
    return enrollment;
  }

  async getEnrollment(userId: string, courseId: string): Promise<CourseEnrollmentDto | null> {
    console.log('🔍 [Learning Repository] getEnrollment:', { userId, courseId });
    
    const enrollment = this.enrollments.get(`${userId}_${courseId}`) || null;
    
    if (!enrollment) {
      console.log('   ❌ No enrollment found in memory');
      return null;
    }
    
    console.log('   ✅ Found enrollment in memory:', { completedLessonsCount: enrollment.completedLessonsCount });
    
    if (this.isConnected && this.pool) {
      try {
        // Query the database for all lesson completions for this user
        const [rows]: any = await this.pool.query(
          'SELECT lesson_id FROM cloudlab_learning.user_lesson_completions WHERE user_id = ?',
          [userId]
        );
        enrollment.completedLessonIds = rows.map((row: any) => row.lesson_id);
        console.log(`   ✅ Fetched ${enrollment.completedLessonIds!.length} completed lessons from DB:`, enrollment.completedLessonIds);
      } catch (err: any) {
        console.error('❌ [Learning Repository] getEnrollment query failed:', err.message);
        // Fallback to in-memory data
        enrollment.completedLessonIds = Array.from(this.userLessonCompletions.get(userId) || new Set());
        console.log(`   ⚠️ Fallback to in-memory: ${enrollment.completedLessonIds.length} lessons`);
      }
    } else {
      // Database not connected, use in-memory data
      enrollment.completedLessonIds = Array.from(this.userLessonCompletions.get(userId) || new Set());
      console.log(`   ⚠️ Database not connected. In-memory: ${enrollment.completedLessonIds.length} lessons`);
    }
    
    console.log('   📤 Returning enrollment with completedLessonIds:', enrollment.completedLessonIds);
    return enrollment;
  }

  async getUserEnrollments(userId: string): Promise<CourseEnrollmentDto[]> {
    const list: CourseEnrollmentDto[] = [];
    for (const enr of this.enrollments.values()) {
      if (enr.userId === userId) {
        list.push(enr);
      }
    }
    return list;
  }

  async updateStudentLessonProgress(userId: string, courseId: string, lessonId: string): Promise<CourseEnrollmentDto | null> {
    console.log('📝 [Learning Repository] updateStudentLessonProgress called:', { userId, courseId, lessonId });
    
    const key = `${userId}_${courseId}`;
    let enr = this.enrollments.get(key);
    if (!enr) {
      console.log('   Enrolling user in course...');
      enr = await this.enrollStudent(userId, courseId);
    }

    // Phase 2: Track specific lesson completion for gating
    const userCompletions = this.userLessonCompletions.get(userId) || new Set();
    const isNewCompletion = !userCompletions.has(lessonId);
    
    if (!userCompletions.has(lessonId)) {
      userCompletions.add(lessonId);
      this.userLessonCompletions.set(userId, userCompletions);
    }
    
    // Always try to save to database (new or existing)
    if (this.isConnected && this.pool) {
      try {
        const completionId = uuidv4();
        const now = new Date().toISOString();
        
        await this.pool.query(
          `INSERT INTO user_lesson_completions (id, user_id, lesson_id, course_id, xp_earned, completed_at) 
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE completed_at=?, xp_earned=?`,
          [completionId, userId, lessonId, courseId, 20, now, now, 20]
        );
        console.log('   ✅ Inserted/Updated user_lesson_completions');
      } catch (err: any) {
        console.error('❌ [Learning Repository] user_lesson_completions INSERT failed:', err.message);
        console.error('   SQL Error Details:', err);
      }
    } else {
      console.log('   ⚠️ Database not connected, saved to memory only');
    }

    if (isNewCompletion) {
      console.log('   📝 New lesson completion tracked');
      // Check if this completes all lessons in the module
      const lesson = this.lessons.get(lessonId);
      if (lesson) {
        await this.syncModuleProgressAfterLesson(userId, courseId, lesson.moduleId);
      }
    } else {
      console.log('   Lesson already marked as complete (in memory)');
    }

    const course = await this.getCourseById(courseId, 'ADMIN');
    const total = course?.totalLessons || 1;

    // Use Set size to avoid double counting if the student re-marks a lesson
    enr.completedLessonsCount = userCompletions.size;
    enr.progressPercentage = Math.round((enr.completedLessonsCount / total) * 100);
    if (enr.progressPercentage >= 100) {
      enr.isCompleted = true;
      enr.completedAt = new Date().toISOString();
    }
    
    console.log('   Updating enrollment:', { completedLessonsCount: enr.completedLessonsCount, progressPercentage: enr.progressPercentage });
    
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `UPDATE course_enrollments SET completed_lessons_count=?, total_lessons_count=?, progress_percentage=?, is_completed=?, completed_at=? WHERE id=?`,
          [
            enr.completedLessonsCount,
            enr.totalLessonsCount,
            enr.progressPercentage,
            enr.isCompleted,
            enr.completedAt ?? null,
            enr.id,
          ]
        );
        console.log('   ✅ Updated course_enrollments');
      } catch (err: any) {
        console.error('❌ [Learning Repository] updateStudentLessonProgress MySQL UPDATE failed:', err.message);
      }
    } else {
      console.log('   ⚠️ Database not connected for enrollment update');
    }
    
    this.enrollments.set(key, enr);
    console.log('✅ [Learning Repository] Lesson completion saved. Returning:', { completedLessonsCount: enr.completedLessonsCount });
    return enr;
  }

  private async syncModuleProgressAfterLesson(userId: string, courseId: string, moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) return;

    const allLessons = this.getLessonsByModuleId(moduleId);
    const userCompletions = this.userLessonCompletions.get(userId) || new Set();

    const allRead = allLessons.every(l => userCompletions.has(l.id));

    if (allRead) {
      const key = `${userId}_${moduleId}`;
      let progress = this.userModuleProgress.get(key);
      if (!progress) {
        progress = {
          id: uuidv4(),
          userId,
          courseId,
          moduleId,
          allLessonsRead: true,
          quizPassed: false,
          quizBestScore: 0,
        };
      } else {
        progress.allLessonsRead = true;
      }

      this.userModuleProgress.set(key, progress);

      if (this.isConnected && this.pool) {
        try {
          await this.pool.query(
            `INSERT INTO user_module_progress (id, user_id, course_id, module_id, all_lessons_read)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE all_lessons_read = TRUE`,
            [progress.id, userId, courseId, moduleId, true]
          );
        } catch (err: any) {
          console.error('❌ [Learning Repository] user_module_progress UPDATE failed:', err.message);
        }
      }
    }
  }

  async getModuleQuiz(moduleId: string): Promise<ModuleQuizDto | null> {
    console.log('🔍 [Learning Repository] getModuleQuiz:', moduleId);
    
    // Check in-memory cache first
    let quiz = this.moduleQuizzes.get(moduleId);
    if (quiz) {
      console.log('   ✅ Found in memory cache');
      return quiz;
    }

    // If not in memory, query the database
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query(
          'SELECT * FROM module_quizzes WHERE module_id = ?',
          [moduleId]
        );
        
        if (rows && rows.length > 0) {
          const row = rows[0];
          let questions: any[] = [];
          try {
            questions = JSON.parse(row.questions_json || '[]');
          } catch (e) {
            console.warn('   ⚠️ Failed to parse questions_json:', e);
          }
          
          quiz = {
            id: row.id,
            moduleId: row.module_id,
            title: row.title,
            passingScore: row.passing_score || 80,
            questions,
            aiGenerated: row.ai_generated || false,
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
          };
          
          // Cache it in memory for future access
          this.moduleQuizzes.set(moduleId, quiz);
          console.log('   ✅ Fetched from database and cached in memory');
          return quiz;
        }
        
        console.log('   ❌ No quiz found in database');
        return null;
      } catch (err: any) {
        console.error('❌ [Learning Repository] getModuleQuiz database query failed:', err.message);
        return null;
      }
    }

    console.log('   ⚠️ Database not connected');
    return null;
  }

  async getCourseQuiz(courseId: string): Promise<CourseQuizDto | null> {
    console.log('🔍 [Learning Repository] getCourseQuiz:', courseId);
    
    // Check in-memory cache first
    let quiz = this.courseQuizzes.get(courseId);
    if (quiz) {
      console.log('   ✅ Found in memory cache');
      return quiz;
    }

    // If not in memory, query the database
    if (this.isConnected && this.pool) {
      try {
        const [rows]: any = await this.pool.query(
          'SELECT * FROM course_quizzes WHERE course_id = ?',
          [courseId]
        );
        
        if (rows && rows.length > 0) {
          const row = rows[0];
          let questions: any[] = [];
          try {
            questions = JSON.parse(row.questions_json || '[]');
          } catch (e) {
            console.warn('   ⚠️ Failed to parse questions_json:', e);
          }
          
          quiz = {
            id: row.id,
            courseId: row.course_id,
            title: row.title,
            passingScore: row.passing_score || 90,
            questions,
            aiGenerated: row.ai_generated || false,
            xpOnPass: row.xp_on_pass || 500,
            skillPointsOnPass: row.skill_points_on_pass || 100,
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
          };
          
          // Cache it in memory for future access
          this.courseQuizzes.set(courseId, quiz);
          console.log('   ✅ Fetched from database and cached in memory');
          return quiz;
        }
        
        console.log('   ❌ No quiz found in database');
        return null;
      } catch (err: any) {
        console.error('❌ [Learning Repository] getCourseQuiz database query failed:', err.message);
        return null;
      }
    }

    console.log('   ⚠️ Database not connected');
    return null;
  }

  async getUserModuleProgress(userId: string, moduleId: string): Promise<UserModuleProgressDto | null> {
    return this.userModuleProgress.get(`${userId}_${moduleId}`) || null;
  }

  async recordQuizSubmission(submission: QuizSubmissionHistoryDto): Promise<void> {
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO quiz_submissions (id, user_id, quiz_type, quiz_id, course_id, module_id, score, passed, answers_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            submission.id,
            submission.userId,
            submission.quizType,
            submission.quizId,
            submission.courseId ?? null,
            submission.moduleId ?? null,
            submission.score,
            submission.passed,
            JSON.stringify(submission.answers),
          ]
        );

        if (submission.quizType === 'MODULE' && submission.moduleId && submission.passed) {
          const key = `${submission.userId}_${submission.moduleId}`;
          let progress = this.userModuleProgress.get(key);
          if (progress) {
            progress.quizPassed = true;
            progress.quizBestScore = Math.max(progress.quizBestScore, submission.score);
            if (!progress.completedAt) progress.completedAt = new Date().toISOString();
            this.userModuleProgress.set(key, progress);

            await this.pool.query(
              `UPDATE user_module_progress SET quiz_passed = TRUE, quiz_best_score = ?, completed_at = ? WHERE id = ?`,
              [progress.quizBestScore, progress.completedAt, progress.id]
            );
          }
        }
      } catch (err: any) {
        console.error('❌ [Learning Repository] recordQuizSubmission failed:', err.message);
      }
    }
  }

  async saveModuleQuiz(quiz: ModuleQuizDto): Promise<void> {
    console.log('💾 [Learning Repository] Saving module quiz:', { 
      moduleId: quiz.moduleId, 
      questionCount: quiz.questions?.length,
      hasDatabase: !!this.isConnected && !!this.pool 
    });
    
    this.moduleQuizzes.set(quiz.moduleId, quiz);
    console.log('✅ [Learning Repository] Quiz saved to in-memory map');
    
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO module_quizzes (id, module_id, title, passing_score, questions_json, ai_generated)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE title=?, passing_score=?, questions_json=?, ai_generated=?, updated_at=CURRENT_TIMESTAMP`,
          [
            quiz.id,
            quiz.moduleId,
            quiz.title,
            quiz.passingScore,
            JSON.stringify(quiz.questions),
            quiz.aiGenerated,
            quiz.title,
            quiz.passingScore,
            JSON.stringify(quiz.questions),
            quiz.aiGenerated
          ]
        );
        console.log('✅ [Learning Repository] Quiz saved to MySQL database');
      } catch (err: any) {
        console.error('❌ [Learning Repository] saveModuleQuiz MySQL failed:', err.message);
        console.error('   SQL Error:', err.sqlMessage || err);
      }
    } else {
      console.warn('⚠️ [Learning Repository] MySQL not available - quiz only in memory');
    }
  }

  async saveCourseQuiz(quiz: CourseQuizDto): Promise<void> {
    this.courseQuizzes.set(quiz.courseId, quiz);
    if (this.isConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO course_quizzes (id, course_id, title, passing_score, questions_json, ai_generated, xp_on_pass, skill_points_on_pass)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE title=?, passing_score=?, questions_json=?, ai_generated=?, xp_on_pass=?, skill_points_on_pass=?, updated_at=CURRENT_TIMESTAMP`,
          [
            quiz.id,
            quiz.courseId,
            quiz.title,
            quiz.passingScore,
            JSON.stringify(quiz.questions),
            quiz.aiGenerated,
            quiz.xpOnPass,
            quiz.skillPointsOnPass,
            quiz.title,
            quiz.passingScore,
            JSON.stringify(quiz.questions),
            quiz.aiGenerated,
            quiz.xpOnPass,
            quiz.skillPointsOnPass
          ]
        );
      } catch (err: any) {
        console.error('❌ [Learning Repository] saveCourseQuiz failed:', err.message);
      }
    }
  }

  async recordQuizCompletion(userId: string, courseId: string, lessonId: string, score: number, passed: boolean): Promise<void> {
    const currentLogs = this.quizSubmissionsLog.get(courseId) || [];
    currentLogs.push({ userId, lessonId, score, passed });
    this.quizSubmissionsLog.set(courseId, currentLogs);

    const key = `${userId}_${courseId}`;
    const enr = this.enrollments.get(key);
    if (enr && passed) {
      enr.quizzesCompletedCount += 1;
      if (this.isConnected && this.pool) {
        try {
          await this.pool.query(
            `UPDATE course_enrollments SET quizzes_completed_count=? WHERE id=?`,
            [enr.quizzesCompletedCount, enr.id]
          );
        } catch (err: any) {
          console.error('❌ [Learning Repository] recordQuizCompletion MySQL UPDATE failed:', err.message);
        }
      }
      this.enrollments.set(key, enr);
    }
  }

  async recordChallengeCompletion(userId: string, courseId: string): Promise<void> {
    const key = `${userId}_${courseId}`;
    const enr = this.enrollments.get(key);
    if (enr) {
      enr.challengesCompletedCount += 1;
      if (this.isConnected && this.pool) {
        try {
          await this.pool.query(
            `UPDATE course_enrollments SET challenges_completed_count=? WHERE id=?`,
            [enr.challengesCompletedCount, enr.id]
          );
        } catch (err: any) {
          console.error('❌ [Learning Repository] recordChallengeCompletion MySQL UPDATE failed:', err.message);
        }
      }
      this.enrollments.set(key, enr);
    }
  }

  // ==========================================
  // Instructor Course Analytics
  // ==========================================
  async getCourseAnalytics(courseId: string): Promise<CourseAnalyticsDto> {
    const course = this.courses.get(courseId);
    const courseTitle = course ? course.title : 'Course';
    const isPublished = course ? course.isPublished : false;

    const courseEnrollments: CourseEnrollmentDto[] = [];
    for (const enr of this.enrollments.values()) {
      if (enr.courseId === courseId) {
        courseEnrollments.push(enr);
      }
    }

    const totalStudents = courseEnrollments.length;
    const completedStudents = courseEnrollments.filter((e) => e.isCompleted).length;
    const completionRate = totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;

    const logs = this.quizSubmissionsLog.get(courseId) || [];
    const avgScore = logs.length > 0 ? Math.round(logs.reduce((acc, l) => acc + l.score, 0) / logs.length) : 0;

    const students = courseEnrollments.map((e) => {
      const studentLogs = logs.filter((l) => l.userId === e.userId);
      return {
        userId: e.userId,
        userName: e.userName || 'Student',
        userEmail: e.userEmail || 'student@cloudlab.local',
        enrolledAt: e.enrolledAt,
        progressPercentage: e.progressPercentage,
        completedLessons: e.completedLessonsCount,
        totalLessons: e.totalLessonsCount,
        quizResults: studentLogs.map((sl) => {
          const les = this.lessons.get(sl.lessonId);
          return {
            lessonTitle: les ? les.title : 'Lesson Quiz',
            score: sl.score,
            passed: sl.passed,
          };
        }),
        challengesCompleted: course?.attachedChallengeIds || [],
      };
    });

    return {
      courseId,
      courseTitle,
      isPublished,
      enrolledCount: totalStudents,
      completionRate,
      averageQuizScore: avgScore,
      students,
    };
  }
}

export const learningRepository = new LearningRepository();
