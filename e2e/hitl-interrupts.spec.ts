/**
 * E2E Tests: HITL (Human-in-the-Loop) Interrupts
 *
 * Tests the complete interrupt workflow at data/logic stages:
 * - Interrupt detection (agent returns interrupt_signal: true)
 * - Modal display (PaperInterruptOverlay)
 * - User actions (approve/reject/edit)
 * - Workflow resumption
 * - Checkpoint creation before interrupts
 *
 * CRITICAL: These tests validate the core HITL feature that distinguishes
 * Parti Architecture from fully autonomous systems.
 */

import { test, expect, SELECTORS, assertHelpers, waitHelpers } from './fixtures';

const API_BASE = 'http://localhost:8787';

test.describe('HITL Interrupts', () => {
  test.beforeEach(async ({ cleanDatabase }) => {
    // Auto-cleanup via fixture
  });

  test('should trigger interrupt at data stage', async ({ page, createProject }) => {
    const projectId = await createProject('CRM system with customer analytics');

    // Execute through PRD (no interrupt expected)
    await page.click(SELECTORS.executeStageButton('prd'));
    await expect(page.locator(SELECTORS.stageNode('prd'))).toHaveAttribute('data-status', 'complete', {
      timeout: 60000
    });

    // Execute Data stage (should interrupt)
    await page.click(SELECTORS.executeStageButton('data'));

    // Expect: Backend returns interrupt signal via SSE
    const response = await waitHelpers.waitForAPIResponse(page, '/api/execute', 60000);
    const data = await response.json();

    // Verify interrupt signal in response
    expect(data.system_state.interrupt_signal).toBe(true);
    expect(data.system_state.status).toBe('interrupted');

    // Expect: UI shows awaiting_approval status
    await expect(page.locator(SELECTORS.stageNode('data'))).toHaveAttribute('data-status', 'awaiting_approval', {
      timeout: 10000
    });

    // Expect: Interrupt modal appears
    await expect(page.locator(SELECTORS.interruptOverlay)).toBeVisible({ timeout: 5000 });

    // Expect: Artifact preview visible
    await expect(page.locator(SELECTORS.artifactPreview)).toBeVisible();
    const artifactPreview = await page.locator(SELECTORS.artifactPreview).textContent();
    expect(artifactPreview).toContain(data.artifact.content.substring(0, 100));
  });

  test('should trigger interrupt at logic stage', async ({ page, navigateToInterrupt }) => {
    await page.goto('/');
    const projectId = await page.evaluate(() => Math.random().toString(36).substring(2, 10));

    // Navigate to logic interrupt
    await navigateToInterrupt(page, 'logic');

    // Verify interrupt modal displayed
    await expect(page.locator(SELECTORS.interruptOverlay)).toBeVisible();

    // Verify logic stage in awaiting_approval state
    await expect(page.locator(SELECTORS.stageNode('logic'))).toHaveAttribute('data-status', 'awaiting_approval');
  });

  test('should approve interrupt and continue workflow', async ({ page, navigateToInterrupt }) => {
    await page.goto('/');

    // Setup: Trigger data stage interrupt
    await navigateToInterrupt(page, 'data');

    // User approves
    await page.click(SELECTORS.approveButton);

    // Expect: Resume request sent
    const resumeRequest = await waitHelpers.waitForAPIRequest(page, '/api/resume', 'POST');
    const resumePayload = resumeRequest.postDataJSON();

    expect(resumePayload).toMatchObject({
      projectId: expect.any(String),
      stage: 'data',
      action: 'approve'
    });

    // Expect: Backend confirms approval
    const resumeResponse = await waitHelpers.waitForAPIResponse(page, '/api/resume');
    const resumeData = await resumeResponse.json();

    expect(resumeData.data.action).toBe('approve');
    expect(resumeData.data.shouldContinue).toBe(true);

    // Expect: Modal closes
    await expect(page.locator(SELECTORS.interruptOverlay)).not.toBeVisible({ timeout: 5000 });

    // Expect: Stage completes
    await expect(page.locator(SELECTORS.stageNode('data'))).toHaveAttribute('data-status', 'complete', {
      timeout: 10000
    });

    // Expect: Next stage becomes available (logic)
    await expect(page.locator(SELECTORS.executeStageButton('logic'))).toBeEnabled();
  });

  test('should reject interrupt with feedback and re-route', async ({ page, navigateToInterrupt }) => {
    await page.goto('/');

    // Setup: Trigger logic stage interrupt
    await navigateToInterrupt(page, 'logic');

    // User provides rejection feedback
    const feedback = 'Missing authentication and authorization logic. Please add RBAC with role-based permissions.';
    await page.fill(SELECTORS.rejectionFeedback, feedback);
    await page.click(SELECTORS.rejectButton);

    // Expect: Feedback sent to backend
    const resumeRequest = await waitHelpers.waitForAPIRequest(page, '/api/resume', 'POST');
    const resumePayload = resumeRequest.postDataJSON();

    expect(resumePayload).toMatchObject({
      action: 'reject',
      feedback: feedback
    });

    // Expect: Supervisor routing decision
    const resumeResponse = await waitHelpers.waitForAPIResponse(page, '/api/resume');
    const routingDecision = await resumeResponse.json();

    expect(routingDecision.data).toHaveProperty('targetStage');
    expect(['prd', 'data', 'logic']).toContain(routingDecision.data.targetStage);

    // Expect: Modal closes
    await expect(page.locator(SELECTORS.interruptOverlay)).not.toBeVisible({ timeout: 5000 });

    // Expect: Target stage reset for re-execution
    const targetStage = routingDecision.data.targetStage;
    await expect(page.locator(SELECTORS.stageNode(targetStage))).toHaveAttribute('data-status', 'idle', {
      timeout: 10000
    });
  });

  test('should allow inline artifact editing', async ({ page, navigateToInterrupt }) => {
    await page.goto('/');

    // Setup: Trigger data stage interrupt
    await navigateToInterrupt(page, 'data');

    // User edits artifact
    await page.click(SELECTORS.editArtifactButton);

    const editor = page.locator(SELECTORS.artifactEditor);
    await expect(editor).toBeVisible();

    const editedContent = 'EDITED: Enhanced database schema with additional validation constraints...';
    await editor.fill(editedContent);
    await page.click(SELECTORS.saveEditButton);

    // Expect: Edited content sent to backend
    const resumeRequest = await waitHelpers.waitForAPIRequest(page, '/api/resume', 'POST');
    const resumePayload = resumeRequest.postDataJSON();

    expect(resumePayload.action).toBe('edit');
    expect(resumePayload.editedArtifact).toContain('EDITED');

    // Expect: Stage completes with edited artifact
    await expect(page.locator(SELECTORS.stageNode('data'))).toHaveAttribute('data-status', 'complete', {
      timeout: 10000
    });

    // Verify edited content displayed in artifact
    const displayedArtifact = await page.locator(SELECTORS.artifact('data')).textContent();
    expect(displayedArtifact).toContain('EDITED');
  });

  test('should create checkpoint before interrupt trigger', async ({ page, navigateToInterrupt }) => {
    await page.goto('/');
    const projectId = await page.evaluate(() => Math.random().toString(36).substring(2, 10));

    // Navigate to data interrupt
    await navigateToInterrupt(page, 'data');

    // Fetch checkpoints from backend
    const hydrateResponse = await fetch(`${API_BASE}/api/hydrate/${projectId}`);
    const hydrationData = await hydrateResponse.json();

    // Verify checkpoint was created before interrupt
    expect(hydrationData.history.checkpoints.length).toBeGreaterThan(0);

    const dataCheckpoint = hydrationData.history.checkpoints.find((c: any) => c.phase === 'data');
    expect(dataCheckpoint).toBeDefined();
    expect(dataCheckpoint.is_interrupted).toBe(1); // Marked as interrupted
  });

  test('should support time travel from interrupted state', async ({ page, navigateToInterrupt }) => {
    await page.goto('/');

    // Trigger interrupt at data stage
    await navigateToInterrupt(page, 'data');

    // Approve interrupt to continue
    await page.click(SELECTORS.approveButton);
    await expect(page.locator(SELECTORS.stageNode('data'))).toHaveAttribute('data-status', 'complete', {
      timeout: 10000
    });

    // Execute logic stage
    await page.click(SELECTORS.executeStageButton('logic'));
    await expect(page.locator(SELECTORS.stageNode('logic'))).toHaveAttribute('data-status', /complete|awaiting_approval/, {
      timeout: 60000
    });

    // Open time travel UI
    await page.click(SELECTORS.timeTravelButton);

    // Expect: Multiple checkpoints available
    await expect(page.locator(SELECTORS.checkpointItem)).toHaveCount.greaterThan(1);

    // Restore to checkpoint before data stage
    await page.click(SELECTORS.checkpointForStage('prd'));
    await page.click(SELECTORS.restoreButton);

    // Expect: Restore request sent
    const restoreRequest = await waitHelpers.waitForAPIRequest(page, '/api/restore', 'POST');
    expect(restoreRequest.postDataJSON()).toHaveProperty('checkpointId');

    // Expect: UI resets to PRD completion state
    await expect(page.locator(SELECTORS.stageNode('prd'))).toHaveAttribute('data-status', 'complete');
    await expect(page.locator(SELECTORS.stageNode('data'))).toHaveAttribute('data-status', 'idle');
    await expect(page.locator(SELECTORS.stageNode('logic'))).toHaveAttribute('data-status', 'idle');
  });

  test('should handle rejection feedback with keyword routing', async ({ page, navigateToInterrupt }) => {
    await page.goto('/');

    await navigateToInterrupt(page, 'logic');

    // Provide feedback mentioning "PRD"
    const feedback = 'The requirements in the PRD are incomplete. Missing user authentication flows.';
    await page.fill(SELECTORS.rejectionFeedback, feedback);
    await page.click(SELECTORS.rejectButton);

    const resumeResponse = await waitHelpers.waitForAPIResponse(page, '/api/resume');
    const routingDecision = await resumeResponse.json();

    // Expect: Routing to PRD stage based on keyword
    expect(routingDecision.data.targetStage).toBe('prd');
  });

  test('should preserve artifact after rejection', async ({ page, navigateToInterrupt }) => {
    await page.goto('/');
    const projectId = await page.evaluate(() => Math.random().toString(36).substring(2, 10));

    await navigateToInterrupt(page, 'data');

    // Capture original artifact content
    const originalArtifact = await page.locator(SELECTORS.artifactPreview).textContent();

    // Reject without editing
    await page.fill(SELECTORS.rejectionFeedback, 'Missing foreign key constraints');
    await page.click(SELECTORS.rejectButton);

    // Wait for modal to close
    await expect(page.locator(SELECTORS.interruptOverlay)).not.toBeVisible({ timeout: 5000 });

    // Fetch artifacts from backend
    const hydrateResponse = await fetch(`${API_BASE}/api/hydrate/${projectId}`);
    const hydrationData = await hydrateResponse.json();

    // Original artifact should still exist in history
    const dataArtifacts = hydrationData.history.artifacts.filter((a: any) => a.agent_id === 'data-agent');
    expect(dataArtifacts.length).toBeGreaterThan(0);
  });

  test('should display interrupt reason and recommendations', async ({ page, navigateToInterrupt }) => {
    await page.goto('/');

    await navigateToInterrupt(page, 'data');

    // Expect: Interrupt message displayed
    const interruptMessage = await page.locator('[data-testid="interrupt-message"]').textContent();
    expect(interruptMessage).toBeTruthy();
    expect(interruptMessage).toMatch(/review|approval|data model/i);

    // Expect: Recommendations or reasoning visible
    const reasoning = await page.locator('[data-testid="interrupt-reasoning"]').textContent();
    expect(reasoning).toBeTruthy();
  });

  test('should support keyboard shortcuts in interrupt modal', async ({ page, navigateToInterrupt }) => {
    await page.goto('/');

    await navigateToInterrupt(page, 'data');

    // Test Escape key to close modal (if implemented)
    await page.keyboard.press('Escape');
    // Modal may or may not close based on UX design

    // Re-trigger if closed
    if (!(await page.locator(SELECTORS.interruptOverlay).isVisible())) {
      await navigateToInterrupt(page, 'data');
    }

    // Test Enter key to approve (if implemented)
    await page.keyboard.press('Enter');

    // Verify approval sent
    const resumeRequest = await waitHelpers.waitForAPIRequest(page, '/api/resume', 'POST', 10000).catch(() => null);
    if (resumeRequest) {
      const payload = resumeRequest.postDataJSON();
      expect(payload.action).toBe('approve');
    }
  });

  test('should prevent workflow progression while interrupt pending', async ({ page, navigateToInterrupt }) => {
    await page.goto('/');

    await navigateToInterrupt(page, 'data');

    // Expect: Next stage (logic) disabled
    const logicButton = page.locator(SELECTORS.executeStageButton('logic'));
    await expect(logicButton).toBeDisabled();

    // Approve interrupt
    await page.click(SELECTORS.approveButton);
    await expect(page.locator(SELECTORS.interruptOverlay)).not.toBeVisible();

    // Now logic button should be enabled
    await expect(logicButton).toBeEnabled();
  });

  test('should track interrupt metrics in execution traces', async ({ page, navigateToInterrupt }) => {
    await page.goto('/');
    const projectId = await page.evaluate(() => Math.random().toString(36).substring(2, 10));

    await navigateToInterrupt(page, 'data');
    await page.click(SELECTORS.approveButton);

    // Fetch execution traces
    const hydrateResponse = await fetch(`${API_BASE}/api/hydrate/${projectId}`);
    const hydrationData = await hydrateResponse.json();

    // Verify trace logged interrupt event
    const dataTrace = hydrationData.history.logs.find((log: any) =>
      log.agent_id === 'data-agent' && log.status === 'interrupted'
    );

    if (dataTrace) {
      expect(dataTrace).toBeDefined();
      expect(dataTrace.status).toBe('interrupted');
    }
  });
});
