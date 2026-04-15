const request = require('supertest');

jest.mock('../db', () => ({
  init: jest.fn(async () => {}),
  getRecent: jest.fn(async () => [{ id: 1, indicator: '1.1.1.1', type: 'ip', source: 'test' }]),
  addThreat: jest.fn(async (payload) => ({ id: 2, ...payload })),
  getById: jest.fn(async (id) => ({ id, indicator: '1.1.1.1', type: 'ip', source: 'test' })),
  updateById: jest.fn(async (id, payload) => ({ id, ...payload })),
  deleteById: jest.fn(async (id) => ({ id }))
}));

jest.mock('../poller', () => ({
  startPoller: jest.fn()
}));

jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    }
    req.context = { user: { id: 'test-user' } };
    return next();
  }
}));

const { app } = require('../server');

describe('API integration', () => {
  test('GET /health returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('GET /api/threats returns threat list', async () => {
    const res = await request(app).get('/api/threats');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('indicator');
  });

  test('POST /api/threats rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/threats')
      .send({ indicator: '2.2.2.2', type: 'ip', source: 'otx', raw_json: {} });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/threats accepts authenticated valid payload', async () => {
    const res = await request(app)
      .post('/api/threats')
      .set('Authorization', 'Bearer test-token')
      .send({ indicator: '2.2.2.2', type: 'ip', source: 'otx', raw_json: {} });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.indicator).toBe('2.2.2.2');
  });
});
