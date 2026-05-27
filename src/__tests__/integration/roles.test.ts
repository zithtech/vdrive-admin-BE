/// <reference types="jest" />
import request from 'supertest';
import express from 'express';
import rolesRoutes from '../../modules/roles/roles.routes';

declare const jest: any;

// Mock RolesService
jest.mock('../../modules/roles/roles.service', () => ({
  RolesService: {
    getAllRoles: jest.fn().mockResolvedValue([
      { id: '1', name: 'super_admin', description: 'Super Admin', is_system: true },
      { id: '2', name: 'admin', description: 'Admin', is_system: true },
    ]),
    getRolePermissions: jest.fn().mockResolvedValue({
      permissions: {
        dashboard: { create: false, read: true, update: false, delete: false },
        drivers: { create: true, read: true, update: true, delete: false },
      }
    }),
    updateRolePermissions: jest.fn().mockResolvedValue(undefined),
    createRole: jest.fn().mockResolvedValue({
      id: '3',
      name: 'support_agent',
      description: 'Support Agent',
      is_system: false,
    }),
  },
}));

describe('Roles Integration Endpoints', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/roles', rolesRoutes);
  });

  it('should successfully retrieve all roles (200 OK)', async () => {
    const response = await request(app).get('/api/roles');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.statusCode).toBe(200);
    expect(response.body.message).toBe('Roles retrieved successfully');
    expect(response.body.data).toEqual([
      { id: '1', name: 'super_admin', description: 'Super Admin', is_system: true },
      { id: '2', name: 'admin', description: 'Admin', is_system: true },
    ]);
  });

  it('should successfully create a new role (201 Created)', async () => {
    const response = await request(app)
      .post('/api/roles')
      .send({ name: 'support_agent', description: 'Support Agent' });
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.statusCode).toBe(201);
    expect(response.body.message).toBe('Role created successfully');
    expect(response.body.data).toEqual({
      id: '3',
      name: 'support_agent',
      description: 'Support Agent',
      is_system: false,
    });
  });

  it('should successfully retrieve permissions for a role (200 OK)', async () => {
    const response = await request(app).get('/api/roles/2/permissions');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Role permissions retrieved successfully');
    expect(response.body.data.permissions.drivers.read).toBe(true);
  });

  it('should successfully update permissions for a role (200 OK)', async () => {
    const response = await request(app)
      .put('/api/roles/2/permissions')
      .send({
        permissions: [
          { module: 'drivers', actions: ['read', 'create'] }
        ]
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Role permissions updated successfully');
  });
});

