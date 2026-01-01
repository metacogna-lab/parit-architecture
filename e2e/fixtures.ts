/**
 * Playwright Test Fixtures for Parti Architecture E2E Tests
 *
 * Provides reusable utilities for:
 * - Database cleanup
 * - Project creation
 * - Stage execution
 * - Interrupt simulation
 * - Common test selectors
 */

import { test as base, expect, Page } from '@playwright/test';

const API_BASE = 'http://localhost:8787';
const FRONTEND_BASE = 'http://localhost:3000';

/**
 * Extended test fixture with custom utilities
 */
export const test = base.extend<{
  cleanDatabase: void;
  createProject: (seed: string) => Promise<string>;
  executeStage: (page: Page, stage: string) => Promise<void>;
  navigateToInterrupt: (page: Page, stage: string) => Promise<void>;
  getTraceData: (page: Page, stage: string) => Promise<any>;
}>({
  /**
   * Auto-cleanup fixture: Resets D1 database before each test
   * Ensures tests run in isolation without interference from previous runs
   */
  cleanDatabase: async ({}, use) => {
    try {
      // Attempt to reset database via test endpoint
      await fetch(`${API_BASE}/api/test/reset-db`, { method: 'POST' });
    } catch (e) {
      console.warn('Database cleanup failed (test endpoint may not exist):', e);
    }
    await use();
  },

  /**
   * Create a new project and return its ID
   * Usage: const projectId = await createProject('My test product');
   */
  createProject: async ({ page }, use) => {
    const createProject = async (seed: string): Promise<string> => {
      await page.goto(FRONTEND_BASE);

      // Fill product seed input
      await page.fill('[data-testid="product-seed-input"]', seed);
      await page.click('[data-testid="ignite-button"]');

      // Wait for backend response
      const response = await page.waitForResponse(
        (r) => r.url().includes('/api/projects') && r.request().method() === 'POST',
        { timeout: 10000 }
      );

      const data = await response.json();
      expect(data).toHaveProperty('projectId');

      return data.projectId;
    };

    await use(createProject);
  },

  /**
   * Execute a specific stage and wait for completion
   * Usage: await executeStage(page, 'prd');
   */
  executeStage: async ({ page }, use) => {
    const executeStage = async (stagePage: Page, stage: string): Promise<void> => {
      // Click execute button for the stage
      await stagePage.click(`[data-testid="execute-stage-${stage}"]`);

      // Wait for stage to complete (status changes to 'complete' or 'interrupted')
      await stagePage.waitForSelector(
        `[data-testid="stage-${stage}"][data-status="complete"], [data-testid="stage-${stage}"][data-status="interrupted"]`,
        { timeout: 60000 } // AI calls can take 30-60s
      );
    };

    await use(executeStage);
  },

  /**
   * Navigate to interrupt state at specified stage
   * Usage: await navigateToInterrupt(page, 'data');
   */
  navigateToInterrupt: async ({ page }, use) => {
    const navigateToInterrupt = async (interruptPage: Page, stage: string): Promise<void> => {
      // Execute up to the interrupt stage
      const stages = ['prd', 'design', 'data', 'logic', 'api', 'frontend', 'deployment'];
      const stageIndex = stages.indexOf(stage);

      for (let i = 0; i <= stageIndex; i++) {
        await interruptPage.click(`[data-testid="execute-stage-${stages[i]}"]`);

        if (stages[i] === stage && (stage === 'data' || stage === 'logic')) {
          // Wait for interrupt modal to appear
          await interruptPage.waitForSelector('[data-testid="interrupt-overlay"]', {
            timeout: 60000
          });
          break;
        } else {
          // Wait for completion
          await interruptPage.waitForSelector(
            `[data-testid="stage-${stages[i]}"][data-status="complete"]`,
            { timeout: 60000 }
          );
        }
      }
    };

    await use(navigateToInterrupt);
  },

  /**
   * Get trace data for a specific stage
   * Usage: const trace = await getTraceData(page, 'prd');
   */
  getTraceData: async ({ page }, use) => {
    const getTraceData = async (tracePage: Page, stage: string): Promise<any> => {
      // Assuming trace data is stored in data attributes or accessible via page context
      const traceElement = await tracePage.locator(`[data-testid="trace-${stage}"]`);
      const traceText = await traceElement.textContent();
      return traceText ? JSON.parse(traceText) : null;
    };

    await use(getTraceData);
  }
});

export { expect };

/**
 * Common Test Selectors
 *
 * Use these constants for consistent test selector references
 */
export const SELECTORS = {
  // Project Creation
  productSeedInput: '[data-testid="product-seed-input"]',
  igniteButton: '[data-testid="ignite-button"]',

  // Stage Nodes
  stageNode: (stage: string) => `[data-testid="stage-${stage}"]`,
  executeStageButton: (stage: string) => `[data-testid="execute-stage-${stage}"]`,
  retryStageButton: (stage: string) => `[data-testid="retry-${stage}"]`,

  // Artifacts
  artifact: (stage: string) => `[data-testid="artifact-${stage}"]`,
  artifactEditor: '[data-testid="artifact-editor"]',

  // Interrupt Modal
  interruptOverlay: '[data-testid="interrupt-overlay"]',
  artifactPreview: '[data-testid="artifact-preview"]',
  approveButton: '[data-testid="approve-button"]',
  rejectButton: '[data-testid="reject-button"]',
  editArtifactButton: '[data-testid="edit-artifact-button"]',
  saveEditButton: '[data-testid="save-edit-button"]',
  rejectionFeedback: '[data-testid="rejection-feedback"]',

  // Time Travel
  timeTravelButton: '[data-testid="time-travel-button"]',
  checkpointItem: '[data-testid="checkpoint-item"]',
  checkpointForStage: (stage: string) => `[data-testid="checkpoint-${stage}"]`,
  restoreButton: '[data-testid="restore-button"]',

  // Settings
  settingsButton: '[data-testid="settings-button"]',
  geminiApiKeyInput: '[data-testid="gemini-api-key"]',
  openaiApiKeyInput: '[data-testid="openai-api-key"]',
  defaultModelSelect: '[data-testid="default-model"]',
  saveSettingsButton: '[data-testid="save-settings"]',

  // Notifications
  toastSuccess: '[data-testid="toast-success"]',
  toastError: '[data-testid="toast-error"]',
  toastInfo: '[data-testid="toast-info"]',

  // Streaming
  thinkingOverlay: '[data-testid="thinking-overlay"]',
  thinkingContent: '[data-testid="thinking-content"]',

  // Trace
  trace: (stage: string) => `[data-testid="trace-${stage}"]`,
};

/**
 * Wait Helpers
 */
export const waitHelpers = {
  /**
   * Wait for API request with specific parameters
   */
  waitForAPIRequest: async (page: Page, urlPattern: string, method: string = 'POST', timeout: number = 30000) => {
    return await page.waitForRequest(
      (req) => req.url().includes(urlPattern) && req.method() === method,
      { timeout }
    );
  },

  /**
   * Wait for API response with specific parameters
   */
  waitForAPIResponse: async (page: Page, urlPattern: string, timeout: number = 30000) => {
    return await page.waitForResponse(
      (res) => res.url().includes(urlPattern) && res.ok(),
      { timeout }
    );
  },

  /**
   * Wait for SSE (Server-Sent Events) streaming
   */
  waitForSSE: async (page: Page, eventType: string, timeout: number = 60000) => {
    return await page.waitForFunction(
      (type) => {
        const events = (window as any).__sseEvents || [];
        return events.some((e: any) => e.type === type);
      },
      eventType,
      { timeout }
    );
  }
};

/**
 * Assertion Helpers
 */
export const assertHelpers = {
  /**
   * Assert AgentResponse structure matches contract
   */
  assertAgentResponse: (response: any) => {
    expect(response).toMatchObject({
      system_state: {
        current_phase: expect.stringMatching(/prd|design|data|logic|api|frontend|deployment/),
        status: expect.stringMatching(/complete|interrupted|failed/),
        interrupt_signal: expect.any(Boolean),
        message: expect.any(String)
      },
      artifact: {
        type: expect.stringMatching(/code|markdown|mermaid_erd|json/),
        content: expect.any(String),
        logic_summary: expect.any(String)
      },
      trace: {
        agent: expect.any(String),
        reasoning: expect.any(String),
        tokens_estimated: expect.any(Number)
      }
    });
  },

  /**
   * Assert UUID format
   */
  assertUUID: (uuid: string) => {
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  }
};
