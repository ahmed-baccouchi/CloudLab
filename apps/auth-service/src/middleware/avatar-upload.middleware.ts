import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      if (!fs.existsSync(config.avatarsDir)) {
        fs.mkdirSync(config.avatarsDir, { recursive: true });
      }
    } catch (e) {
      // Directory creation failure is non-fatal; multer will surface the write error
    }
    cb(null, config.avatarsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
    const id = uuidv4().replace(/-/g, '').substring(0, 16);
    cb(null, `avatar_${id}_${Date.now()}${ext}`);
  },
});

export const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF'));
    }
  },
});
