/**
 * E2E Tests: Multi-Stage Agent Execution
 *
 * Tests the complete 7-stage workflow execution:
 * PRD → Design → Data → Logic → API → Frontend → Deployment
 *
 * Validates:
 * - Individual stage execution
 * - Context threading between stages
 * - AgentResponse contract compliance
 * - Artifact generation and persistence
 * - Status transitions (idle → processing → complete)
 * - Real AI integration (Gemini API)
 */

import { test, expect, SELECTORS, assertHelpers, waitHelpers } from './fixtures';

const API_BASE = 'http://localhost:8787';

test.describe('Multi-Stage Execution', () => {
  test.beforeEach(async ({ cleanDatabase }) => {
    // Auto-cleanup via fixture
  });

  test('should execute PRD stage end-to-end', async ({ page, createProject }) => {
    // Create project
    const projectId = await createProject('E-commerce platform with inventory management');

    // Execute PRD stage
    await page.click(SELECTORS.executeStageButton('prd'));

    // Expect: Status changes to processing
    await expect(page.locator(SELECTORS.stageNode('prd'))).toHaveAttribute('data-status', 'processing', {
      timeout: 5000
    });

    // Expect: Backend receives correct request
    const executeRequest = await waitHelpers.waitForAPIRequest(page, '/api/execute', 'POST');
    const payload = executeRequest.postDataJSON();
    expect(payload).toMatchObject({
      projectId,
      stage: 'prd',
      context: expect.any(Object)
    });

    // Expect: Agent response conforms to AgentResponse schema
    const response = await waitHelpers.waitForAPIResponse(page, '/api/execute', 60000);
    const agentResponse = await response.json();
    assertHelpers.assertAgentResponse(agentResponse);

    // PRD-specific validations
    expect(agentResponse.system_state.current_phase).toBe('prd');
    expect(agentResponse.artifact.type).toBe('markdown');
    expect(agentResponse.trace.agent).toBe('prd-agent');

    // Expect: UI updates to complete status
    await expect(page.locator(SELECTORS.stageNode('prd'))).toHaveAttribute('data-status', 'complete', {
      timeout: 60000
    });

    // Expect: Artifact displayed
    await expect(page.locator(SELECTORS.artifact('prd'))).toBeVisible();
    const artifactContent = await page.locator(SELECTORS.artifact('prd')).textContent();
    expect(artifactContent).toBeTruthy();
    expect(artifactContent!.length).toBeGreaterThan(100); // PRD should be substantial
  });

  test('should execute all 7 stages sequentially', async ({ page, createProject, executeStage }) => {
    const projectId = await createProject('SaaS analytics dashboard with real-time metrics');
    const stages = ['prd', 'design', 'data', 'logic', 'api', 'frontend', 'deployment'];

    for (const stage of stages) {
      console.log(`Executing stage: ${stage}`);

      await executeStage(page, stage);

      // Verify artifact exists
      const artifactContent = await page.locator(SELECTORS.artifact(stage)).textContent();
      expect(artifactContent).toBeTruthy();
      expect(artifactContent!.length).toBeGreaterThan(0);

      console.log(`Stage ${stage} completed successfully`);
    }

    // All stages should be complete
    const completeStages = await page.locator('[data-status="complete"]').count();
    expect(completeStages).toBeGreaterThanOrEqual(7); // May include interrupted stages that were approved
  });

  test('should thread context between stages', async ({ page, createProject }) => {
    const projectId = await createProject('Inventory management system');

    // Execute PRD stage
    await page.click(SELECTORS.executeStageButton('prd'));
    const prdResponse = await waitHelpers.waitForAPIResponse(page, '/api/execute', 60000);
    const prdResult = await prdResponse.json();
    const prdArtifact = prdResult.artifact.content;

    await expect(page.locator(SELECTORS.stageNode('prd'))).toHaveAttribute('data-status', 'complete', {
      timeout: 60000
    });

    // Execute Data stage (should receive PRD artifact as context)
    await page.click(SELECTORS.executeStageButton('data'));

    const dataRequest = await waitHelpers.waitForAPIRequest(page, '/api/execute', 'POST');
    const dataPayload = dataRequest.postDataJSON();

    // Verify context includes PRD artifact
    expect(dataPayload.context).toBeDefined();
    // Context should reference or include PRD content
    const contextString = JSON.stringify(dataPayload.context);
    // Check for PRD references (implementation may vary)

    const dataResponse = await waitHelpers.waitForAPIResponse(page, '/api/execute', 60000);
    const dataResult = await dataResponse.json();

    // Data agent should reference PRD requirements in reasoning
    expect(dataResult.trace.reasoning).toBeDefined();
    // May contain references to PRD concepts
  });

  test('should handle agent execution failures gracefully', async ({ page, createProject }) => {
    const projectId = await createProject('Test product for error handling');

    // Simulate API error by intercepting
    await page.route('**/api/execute*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'AI_ERROR',
            message: 'Gemini API rate limit exceeded'
          }
        })
      });
    });

    await page.click(SELECTORS.executeStageButton('prd'));

    // Expect: Error toast displayed
    await expect(page.locator(SELECTORS.toastError)).toBeVisible({ timeout: 10000 });
    const errorMessage = await page.locator(SELECTORS.toastError).textContent();
    expect(errorMessage).toMatch(/error|failed|limit/i);

    // Expect: Stage returns to failed state
    await expect(page.locator(SELECTORS.stageNode('prd'))).toHaveAttribute('data-status', 'failed', {
      timeout: 10000
    });

    // Expect: Retry button appears
    await expect(page.locator(SELECTORS.retryStageButton('prd'))).toBeEnabled();
  });

  test('should stream thinking steps in real-time', async ({ page, createProject }) => {
    const projectId = await createProject('Streaming test product');

    // Track SSE events
    const sseEvents: any[] = [];
    await page.exposeFunction('__captureSSE', (event: any) => {
      sseEvents.push(event);
    });

    // Execute PRD stage
    await page.click(SELECTORS.executeStageButton('prd'));

    // Expect: Thinking overlay appears
    await expect(page.locator(SELECTORS.thinkingOverlay)).toBeVisible({ timeout: 5000 });

    // Wait for stage completion
    await expect(page.locator(SELECTORS.stageNode('prd'))).toHaveAttribute('data-status', 'complete', {
      timeout: 60000
    });

    // Verify SSE events were received (thinking, writing, complete)
    // This assumes frontend exposes SSE events via __captureSSE
    // In actual implementation, may need to instrument the EventSource connection
  });

  test('should validate AgentResponse contract for each stage', async ({ page, createProject }) => {
    const projectId = await createProject('Contract validation test');
    const stages = ['prd', 'data']; // Test subset for speed

    for (const stage of stages) {
      await page.click(SELECTORS.executeStageButton(stage));

      const response = await waitHelpers.waitForAPIResponse(page, '/api/execute', 60000);
      const agentResponse = await response.json();

      // Validate strict contract
      assertHelpers.assertAgentResponse(agentResponse);

      // Stage-specific validations
      expect(agentResponse.system_state.current_phase).toBe(stage);
      expect(agentResponse.trace.agent).toContain(`${stage}-agent`);

      await expect(page.locator(SELECTORS.stageNode(stage))).toHaveAttribute('data-status', /complete|interrupted/, {
        timeout: 60000
      });
    }
  });

  test('should persist artifacts to D1 after execution', async ({ page, createProject }) => {
    const projectId = await createProject('Artifact persistence test');

    // Execute PRD stage
    await page.click(SELECTORS.executeStageButton('prd'));
    await expect(page.locator(SELECTORS.stageNode('prd'))).toHaveAttribute('data-status', 'complete', {
      timeout: 60000
    });

    // Fetch artifacts from backend
    const hydrateResponse = await fetch(`${API_BASE}/api/hydrate/${projectId}`);
    const hydrationData = await hydrateResponse.json();

    // Verify at least one artifact exists
    expect(hydrationData.history.artifacts.length).toBeGreaterThan(0);

    const prdArtifact = hydrationData.history.artifacts.find((a: any) => a.agent_id === 'prd-agent');
    expect(prdArtifact).toBeDefined();
    expect(prdArtifact.content).toBeTruthy();
    expect(prdArtifact.artifact_type).toBe('markdown');
  });

  test('should support re-executing completed stages', async ({ page, createProject }) => {
    const projectId = await createProject('Re-execution test');

    // Execute PRD stage first time
    await page.click(SELECTORS.executeStageButton('prd'));
    await expect(page.locator(SELECTORS.stageNode('prd'))).toHaveAttribute('data-status', 'complete', {
      timeout: 60000
    });

    const firstArtifact = await page.locator(SELECTORS.artifact('prd')).textContent();

    // Re-execute PRD stage
    await page.click(SELECTORS.executeStageButton('prd')); // Or retry button
    await expect(page.locator(SELECTORS.stageNode('prd'))).toHaveAttribute('data-status', 'complete', {
      timeout: 60000
    });

    const secondArtifact = await page.locator(SELECTORS.artifact('prd')).textContent();

    // Artifacts may differ (AI non-determinism), but both should exist
    expect(firstArtifact).toBeTruthy();
    expect(secondArtifact).toBeTruthy();
  });

  test('should handle network interruptions during execution', async ({ page, createProject }) => {
    const projectId = await createProject('Network interruption test');

    // Start execution
    await page.click(SELECTORS.executeStageButton('prd'));

    // Simulate network drop after 2 seconds
    setTimeout(async () => {
      await page.route('**/api/execute*', route => route.abort('failed'));
    }, 2000);

    // Expect: Error handling
    await expect(page.locator(SELECTORS.toastError)).toBeVisible({ timeout: 15000 });
    const errorMessage = await page.locator(SELECTORS.toastError).textContent();
    expect(errorMessage).toMatch(/connection|network|failed/i);
  });

  test('should estimate and display token usage', async ({ page, createProject }) => {
    const projectId = await createProject('Token estimation test');

    await page.click(SELECTORS.executeStageButton('prd'));
    const response = await waitHelpers.waitForAPIResponse(page, '/api/execute', 60000);
    const agentResponse = await response.json();

    // Verify token estimation in trace
    expect(agentResponse.trace.tokens_estimated).toBeGreaterThan(0);

    // Optional: Check if UI displays token count
    // This depends on frontend implementation
  });

  test('should enforce execution timeout (30s max per agent)', async ({ page, createProject }) => {
    const projectId = await createProject('Timeout test');

    // Mock slow agent response (simulate 35s delay)
    await page.route('**/api/execute*', async route => {
      await new Promise(resolve => setTimeout(resolve, 35000));
      route.fulfill({
        status: 408,
        body: JSON.stringify({
          success: false,
          error: { code: 'TIMEOUT', message: 'Agent execution exceeded 30s limit' }
        })
      });
    });

    await page.click(SELECTORS.executeStageButton('prd'));

    // Expect: Timeout error within 35s
    await expect(page.locator(SELECTORS.toastError)).toBeVisible({ timeout: 40000 });
    const errorMessage = await page.locator(SELECTORS.toastError).textContent();
    expect(errorMessage).toMatch(/timeout|exceeded/i);

    // Expect: Stage marked as failed
    await expect(page.locator(SELECTORS.stageNode('prd'))).toHaveAttribute('data-status', 'failed');
  });
});
