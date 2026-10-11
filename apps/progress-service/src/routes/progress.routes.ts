import { Router } from 'express';
import { ProgressController } from '../controllers/progress.controller';
import { internalAuthMiddleware } from '@cloudlab/shared-auth';
import { config } from '../config';

const router = Router();

router.get('/leaderboard', ProgressController.getLeaderboard);

// User profile progress
router.get(
  '/me',
  internalAuthMiddleware({ required: false, internalSecret: config.internalSecret }),
  ProgressController.getMyProfile,
);

router.post(
  '/events',
  internalAuthMiddleware({ required: false, internalSecret: config.internalSecret }),
  ProgressController.recordEvent,
);

export const progressRoutes = router;
