
import { describe, it, expect } from 'vitest';
import { ArchitectureGraph } from './agentGraph';

describe('ArchitectureGraph Engine', () => {

  it('should initialize with default state', () => {
    const graph = new ArchitectureGraph();
    expect(graph.state.next).toBe('Supervisor');
    expect(graph.history.length).toBe(0);
  });

  it('should capture checkpoints when nodes execute', async () => {
    const graph = new ArchitectureGraph();
    
    // Action: Simulate Supervisor execution
    await graph.supervisorNode("Start Analysis", "prd");
    
    // Outcome: History should increase
    expect(graph.history.length).toBe(1);
    
    // Verify snapshot content
    const snapshot = graph.history[0];
    expect(snapshot.next).toBe('Supervisor'); // State before mutation
  });

  it('should perform Time Travel (restore checkpoint)', async () => {
    const graph = new ArchitectureGraph();
    
    // Step 1: Initial State
    graph.state.currentStage = 'prd';
    graph.saveCheckpoint(); // Checkpoint 0
    
    // Step 2: Mutate State
    graph.state.currentStage = 'design';
    graph.state.artifacts['design'] = 'Design Docs';
    graph.saveCheckpoint(); // Checkpoint 1
    
    // Step 3: Mutate Again
    graph.state.currentStage = 'data';
    
    // Action: Restore to Checkpoint 0 (PRD)
    const success = graph.restoreCheckpoint(0);
    
    // Outcome: Restoration successful
    expect(success).toBe(true);
    
    // Outcome: State matches Checkpoint 0
    expect(graph.state.currentStage).toBe('prd');
    expect(graph.state.artifacts['design']).toBeUndefined();
    
    // Outcome: Future history is truncated
    expect(graph.history.length).toBe(1);
  });

  it('should correctly identify interrupt stages', () => {
    const graph = new ArchitectureGraph();
    
    // Outcome: Data stage requires interrupt
    expect(graph.shouldInterrupt('data')).toBe(true);
    
    // Outcome: Logic stage requires interrupt
    expect(graph.shouldInterrupt('logic')).toBe(true);
    
    // Outcome: PRD stage does not
    expect(graph.shouldInterrupt('prd')).toBe(false);
  });

});
