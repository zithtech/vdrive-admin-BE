import request from 'supertest';
import express from 'express';
import { requirePermission } from '../../shared/authorization';

describe('Dynamic RBAC Middleware Integration', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware pre-attaching req.user
    const mockAuth = (userPayload: any) => {
      return (req: any, res: any, next: any) => {
        req.user = userPayload;
        next();
      };
    };

    app.get(
      '/api/test-drivers',
      mockAuth({ id: 'user-123', role: 'ops_manager', permissions: { drivers: { read: true } } }),
      requirePermission('drivers', 'read'),
      (req, res) => {
        res.status(200).json({ success: true, data: 'success' });
      }
    );

    app.post(
      '/api/test-pricing',
      mockAuth({ id: 'user-123', role: 'ops_manager', permissions: { drivers: { read: true } } }),
      requirePermission('pricing', 'create'),
      (req, res) => {
        res.status(200).json({ success: true, data: 'success' });
      }
    );

    app.get(
      '/api/test-super-admin',
      mockAuth({ id: 'super-admin-789', role: 'super_admin' }),
      requirePermission('pricing', 'delete'),
      (req, res) => {
        res.status(200).json({ success: true, data: 'bypass-success' });
      }
    );
  });

  it('should allow access (200 OK) if the user has the required permission', async () => {
    const response = await request(app).get('/api/test-drivers');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: 'success' });
  });

  it('should deny access (403 Forbidden) with correct error format if permission is missing', async () => {
    const response = await request(app).post('/api/test-pricing');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      status: 403,
      message: 'Forbidden: Missing pricing.create permission',
    });
  });

  it('should bypass all checks and allow access (200 OK) if user has super_admin role', async () => {
    const response = await request(app).get('/api/test-super-admin');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: 'bypass-success' });
  });
});
