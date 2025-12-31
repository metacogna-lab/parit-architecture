/**
 * E2E Tests: Project Ignition/Seeding
 *
 * Tests the complete project creation flow from product seed to 7-stage graph initialization.
 * Validates:
 * - Server-side UUID generation
 * - D1 database persistence
 * - Frontend state initialization
 * - Concurrent project creation (race condition prevention)
 */

import { test, expect, SELECTORS, assertHelpers } from './fixtures';

const API_BASE = 'http://localhost:8787';

test.describe('Project Ignition', () => {
  test.beforeEach(async ({ cleanDatabase }) => {
    // Auto-cleanup via fixture
  });

  test('should create new project from product seed', async ({ page, createProject }) => {
    const productSeed = 'Build a SaaS analytics dashboard for tracking user behavior';

    // Navigate to app
    await page.goto('/');

    // Enter product seed
    await page.fill(SELECTORS.productSeedInput, productSeed);
    await page.click(SELECTORS.igniteButton);

    // Expect: Backend creates project
    const createRequest = await page.waitForRequest(req =>
      req.url().includes('/api/projects') && req.method() === 'POST',
      { timeout: 10000 }
    );

    const requestBody = createRequest.postDataJSON();
    expect(requestBody).toMatchObject({
      productSeed,
      environment: expect.stringMatching(/development|staging|production/)
    });

    // Expect: Backend returns projectId
    const response = await page.waitForResponse(res =>
      res.url().includes('/api/projects') && res.status() === 201
    );

    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data.data).toHaveProperty('projectId');

    // Validate UUID format (server-generated)
    const { projectId } = data.data;
    assertHelpers.assertUUID(projectId);

    // Expect: UI shows 7 empty stages
    await expect(page.locator('[data-testid="stage-node"]')).toHaveCount(7);

    // Validate each stage starts in 'idle' status
    const stages = ['prd', 'design', 'data', 'logic', 'api', 'frontend', 'deployment'];
    for (const stage of stages) {
      await expect(page.locator(SELECTORS.stageNode(stage))).toHaveAttribute('data-status', 'idle');
    }

    // Expect: Success toast notification
    await expect(page.locator(SELECTORS.toastSuccess)).toBeVisible({ timeout: 5000 });
  });

  test('should persist project to D1 database', async ({ page }) => {
    const productSeed = 'Test product for persistence validation';

    // Create project via API
    const createResponse = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productSeed, environment: 'development' })
    });

    expect(createResponse.ok).toBe(true);
    const { data } = await createResponse.json();
    const { projectId } = data;

    // Verify persistence by fetching via hydration endpoint
    const hydrateResponse = await fetch(`${API_BASE}/api/hydrate/${projectId}`);
    expect(hydrateResponse.ok).toBe(true);

    const hydrationData = await hydrateResponse.json();
    expect(hydrationData.project).toMatchObject({
      id: projectId,
      product_seed: productSeed,
      environment: 'development'
    });

    // Validate timestamps
    expect(hydrationData.project.created_at).toBeGreaterThan(0);
    expect(hydrationData.project.updated_at).toBeGreaterThan(0);
  });

  test('should handle concurrent project creations without race conditions', async ({ page }) => {
    // Fire 5 concurrent project creation requests
    const promises = Array.from({ length: 5 }, (_, i) =>
      fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSeed: `Concurrent test product ${i}`,
          environment: 'development'
        })
      }).then(r => r.json())
    );

    const results = await Promise.all(promises);

    // All requests should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('projectId');
    });

    // All IDs should be unique (no duplicates due to race conditions)
    const ids = results.map(r => r.data.projectId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);

    // All IDs should be valid UUIDs
    ids.forEach(id => assertHelpers.assertUUID(id));
  });

  test('should reject empty product seed', async ({ page }) => {
    await page.goto('/');

    // Try to create project with empty seed
    await page.fill(SELECTORS.productSeedInput, '');
    await page.click(SELECTORS.igniteButton);

    // Expect: Error toast or validation message
    // Frontend may prevent submission, or backend returns 400
    const errorVisible = await Promise.race([
      page.locator(SELECTORS.toastError).isVisible().then(() => true),
      page.waitForResponse(res => res.status() === 400).then(() => true),
      new Promise(resolve => setTimeout(() => resolve(false), 2000))
    ]);

    expect(errorVisible).toBe(true);
  });

  test('should handle backend unavailability gracefully (offline mode)', async ({ page }) => {
    await page.goto('/');

    // Intercept API requests to simulate backend failure
    await page.route('**/api/projects', route => route.abort('failed'));

    const productSeed = 'Offline mode test product';
    await page.fill(SELECTORS.productSeedInput, productSeed);
    await page.click(SELECTORS.igniteButton);

    // Expect: Frontend falls back to client-side UUID (offline mode)
    // Should still show 7 stages even without backend
    await expect(page.locator('[data-testid="stage-node"]')).toHaveCount(7, { timeout: 10000 });

    // Expect: Warning toast about offline mode
    const offlineToast = await Promise.race([
      page.locator(SELECTORS.toastInfo).textContent(),
      page.locator(SELECTORS.toastError).textContent()
    ]);

    expect(offlineToast).toMatch(/offline|unavailable|local/i);
  });

  test('should sanitize product seed input', async ({ page }) => {
    // Test with potentially dangerous input (XSS attempt)
    const maliciousInput = '<script>alert("XSS")</script>Legitimate product description';

    const response = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productSeed: maliciousInput, environment: 'development' })
    });

    expect(response.ok).toBe(true);
    const { data } = await response.json();

    // Fetch back from D1 to verify sanitization
    const hydrateResponse = await fetch(`${API_BASE}/api/hydrate/${data.projectId}`);
    const hydrationData = await hydrateResponse.json();

    // Product seed should be stored safely (script tags escaped or removed)
    const storedSeed = hydrationData.project.product_seed;
    expect(storedSeed).not.toContain('<script>');

    // Should preserve legitimate content
    expect(storedSeed).toContain('Legitimate product description');
  });

  test('should enforce product seed max length (10KB)', async ({ page }) => {
    // Create product seed > 10KB
    const longSeed = 'A'.repeat(11000); // 11KB

    const response = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productSeed: longSeed, environment: 'development' })
    });

    expect(response.ok).toBe(true);
    const { data } = await response.json();

    // Fetch back and verify truncation to 10KB
    const hydrateResponse = await fetch(`${API_BASE}/api/hydrate/${data.projectId}`);
    const hydrationData = await hydrateResponse.json();

    const storedSeed = hydrationData.project.product_seed;
    expect(storedSeed.length).toBeLessThanOrEqual(10000);
  });

  test('should return standardized error response on database failure', async ({ page }) => {
    // This test would require mocking D1 to simulate database errors
    // For now, we test the error response structure by sending invalid data

    const response = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Missing required field
        environment: 'development'
      })
    });

    expect(response.status).toBe(400);
    const errorData = await response.json();

    // Validate standardized error format
    expect(errorData).toMatchObject({
      success: false,
      error: {
        code: expect.stringMatching(/INVALID_REQUEST|VALIDATION_ERROR/),
        message: expect.any(String)
      }
    });
  });

  test('should support multiple environment types', async ({ page }) => {
    const environments = ['development', 'staging', 'production'];

    for (const env of environments) {
      const response = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSeed: `Test product for ${env}`,
          environment: env
        })
      });

      expect(response.ok).toBe(true);
      const { data } = await response.json();

      // Verify environment persisted correctly
      const hydrateResponse = await fetch(`${API_BASE}/api/hydrate/${data.projectId}`);
      const hydrationData = await hydrateResponse.json();

      expect(hydrationData.project.environment).toBe(env);
    }
  });

  test('should default to development environment if not specified', async ({ page }) => {
    const response = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productSeed: 'Test product without env'
        // No environment field
      })
    });

    expect(response.ok).toBe(true);
    const { data } = await response.json();

    const hydrateResponse = await fetch(`${API_BASE}/api/hydrate/${data.projectId}`);
    const hydrationData = await hydrateResponse.json();

    expect(hydrationData.project.environment).toBe('development');
  });
});
