import { jest } from '@jest/globals';
import { createHmac } from 'crypto';
import worker from './index';

const SECRET = 'test-secret';

const signToken = (route: string) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      projectId: 'test',
      route,
      exp: Math.floor(Date.now() / 1000) + 60,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
};

const createEnv = () =>
  ({
    GATEWAY_JWT_SECRET: SECRET,
    PRD_AGENT: { fetch: jest.fn() },
    DATA_AGENT: { fetch: jest.fn() },
    LOGIC_AGENT: { fetch: jest.fn() },
    AGENT_ROLE: 'supervisor',
    DB: {
      prepare: () => ({
        run: async () => ({ results: [] }),
        first: async () => null,
        bind() {
          return this;
        },
      }),
    },
    STORAGE: { get: jest.fn(), put: jest.fn() },
  } as any);

describe('parti supervisor worker', () => {
  it('rejects requests with missing gateway token', async () => {
    const request = new Request('https://build.metacogna.ai/api/projects', { method: 'GET' });
    const response = await worker.fetch(request, createEnv(), {} as any);
    expect(response.status).toBe(401);
  });

  it('lists projects when a valid token is provided', async () => {
    const token = signToken('BUILD');
    const request = new Request('https://build.metacogna.ai/api/projects', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const response = await worker.fetch(request, createEnv(), {} as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
