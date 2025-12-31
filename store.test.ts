
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './store';
import { INTERRUPT_STAGES } from './constants';

// Mock localStorage for Zustand persistence
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Architecture Builder Store (Outcome Based)', () => {
  
  beforeEach(() => {
    useAppStore.getState().resetProject();
    localStorageMock.clear();
  });

  it('should successfully ignite (seed) a new project structure', () => {
    const store = useAppStore.getState();
    const prompt = "A cloud-native e-commerce platform";
    
    // Action: Seed the project
    store.seedProject(prompt);
    
    // Outcome: Project is initialized
    const updatedState = useAppStore.getState();
    expect(updatedState.isSeeded).toBe(true);
    expect(updatedState.productSeed).toBe(prompt);
    
    // Outcome: Stages are generated according to the Evolution Map
    expect(updatedState.stages.length).toBeGreaterThan(0);
    expect(updatedState.stages.find(s => s.id === 'prd')).toBeDefined();
    expect(updatedState.stages.find(s => s.id === 'design')).toBeDefined();
    expect(updatedState.stages.find(s => s.id === 'api')).toBeDefined();
    
    // Outcome: First stage is ready, others are locked
    expect(updatedState.stages.find(s => s.id === 'prd')?.status).toBe('idle');
    expect(updatedState.stages.find(s => s.id === 'design')?.status).toBe('locked');
  });

  it('should trigger a HITL interrupt when running a critical stage', async () => {
    const store = useAppStore.getState();
    store.seedProject("Test Project");
    
    // Identify a stage that requires interrupt (e.g., 'data')
    const criticalStageId = INTERRUPT_STAGES[0]; 
    if (!criticalStageId) throw new Error("No interrupt stages defined in constants");

    // Pre-condition: Unlock the stage for testing purposes
    store.updateStage(criticalStageId, { status: 'idle' });

    // Action: Run the Agent on the critical stage
    const runPromise = store.runAgent(criticalStageId);
    
    // Note: The interrupt logic executes synchronously before the async processing loop begins.
    // Outcome: The Graph status should be 'interrupted' immediately
    expect(useAppStore.getState().graphStatus).toBe('interrupted');

    // Fast-forward or await execution (Mocking time or awaiting promise)
    await runPromise;

    const interruptedState = useAppStore.getState();
    expect(interruptedState.isGraphPaused).toBe(true);

    // Outcome: Interrupt Payload should be populated for the UI Overlay
    expect(interruptedState.interruptPayload).not.toBeNull();
    expect(interruptedState.interruptPayload?.node).toBe(criticalStageId);
    expect(interruptedState.interruptPayload?.snapshot).toBeDefined();

    // Outcome: The specific stage should be awaiting approval
    const stage = interruptedState.stages.find(s => s.id === criticalStageId);
    expect(stage?.status).toBe('awaiting_approval');
  });

  it('should resume execution when Human Feedback approves the interrupt', async () => {
    // Setup: Get into interrupted state
    const store = useAppStore.getState();
    store.seedProject("Test Project");
    const criticalStageId = INTERRUPT_STAGES[0];
    store.updateStage(criticalStageId, { status: 'awaiting_approval' });
    useAppStore.setState({ 
        graphStatus: 'interrupted', 
        isGraphPaused: true, 
        interruptPayload: { node: criticalStageId, message: 'Review me', snapshot: {} } 
    });

    // Action: User approves via UI Overlay
    await store.resolveInterrupt("Approved, looks good.");

    // Outcome: Interrupt state is cleared
    const resumedState = useAppStore.getState();
    expect(resumedState.interruptPayload).toBeNull();
    expect(resumedState.isGraphPaused).toBe(false);
    
    // Outcome: Stage should transition out of 'awaiting_approval'
    // (runAgent is called internally by resolveInterrupt, setting it to processing/complete)
    const stage = resumedState.stages.find(s => s.id === criticalStageId);
    expect(stage?.status).not.toBe('awaiting_approval');
  });

  it('should fail the stage when Human Feedback rejects the interrupt', async () => {
    // Setup: Get into interrupted state
    const store = useAppStore.getState();
    store.seedProject("Test Project");
    const criticalStageId = INTERRUPT_STAGES[0];
    store.updateStage(criticalStageId, { status: 'awaiting_approval' });
    useAppStore.setState({ 
        graphStatus: 'interrupted', 
        isGraphPaused: true, 
        interruptPayload: { node: criticalStageId, message: 'Review me', snapshot: {} } 
    });

    // Action: User rejects
    await store.resolveInterrupt("Rejected, missing fields.");

    // Outcome: Graph is idle (not running)
    const failedState = useAppStore.getState();
    expect(failedState.graphStatus).toBe('idle');
    expect(failedState.interruptPayload).toBeNull();

    // Outcome: Stage marked as failed
    const stage = failedState.stages.find(s => s.id === criticalStageId);
    expect(stage?.status).toBe('failed');
  });

});
