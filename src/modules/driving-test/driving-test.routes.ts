import { Router } from 'express';
import { DrivingTestController } from './driving-test.controller';
import isAuthenticated from '../../shared/authentication';

const router = Router();

// Gated with admin authentication
router.use(isAuthenticated);

// Driving Assessment Sessions List
router.get('/', DrivingTestController.listSessions);
router.get('/sessions', DrivingTestController.listSessions);
router.get('/admin/sessions', DrivingTestController.listSessions);

// Single Session Review Report & Synchronized Playback
router.get('/sessions/:id/report', DrivingTestController.getSessionReport);
router.get('/admin/sessions/:id/report', DrivingTestController.getSessionReport);

// Decision Submission (Approve / Retest / Reject)
router.post('/sessions/:id/decision', DrivingTestController.submitDecision);
router.post('/admin/sessions/:id/decision', DrivingTestController.submitDecision);

// Route Management (Section 5)
router.get('/routes', DrivingTestController.listRoutes);
router.post('/routes', DrivingTestController.createRoute);
router.put('/routes/:id', DrivingTestController.updateRoute);

export default router;
