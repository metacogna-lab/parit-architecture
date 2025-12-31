
import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout } from './Layout';
import { useAppStore } from './store';
import { useHydration } from './src/hooks/useHydration';
import { StageType, StageNode, ArtefactNode } from './types';
import { SettingsRoot } from './src/pages/Settings/SettingsRoot';
import JSZip from 'jszip'; 
import { 
  PaperCard, 
  PaperInput, 
  PaperTextArea, 
  PaperButton, 
  PaperBadge, 
  PaperMetadataRibbon,
  PaperToast, 
  PaperStepLoader,
  PaperTabs,
  PaperModal,
  PaperCommandBar,
  PaperProgressDashboard,
  PaperZoomControls,
  PaperObservabilityDashboard,
  PaperDataDictionary,
  PaperBlueprintLibrary,
  PaperChangelog,
  PaperPromptGuidance,
  PaperArtefactBadge,
  PaperTooltipPreview,
  PaperThinkingOverlay,
  PaperInterruptOverlay, 
  PaperReviewFooter,
  PaperViewToggle,
  PaperTaskTree, 
  PaperBottomDock, 
  cn
} from './PaperComponents';
import { ApiKeyModal } from './src/components/Paper/ApiKeyModal';
import { 
  ArrowRight, 
  Bot, 
  Zap, 
  Check, 
  Download, 
  Play, 
  Terminal, 
  FileCode, 
  Maximize2,
  FileText,
  LayoutTemplate,
  Database,
  Server,
  Layers,
  Rocket,
  AlertTriangle,
  FileJson,
  Eye,
  EyeOff,
  Sidebar,
  Loader2,
  Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STAGE_ICONS: Record<StageType, React.ReactNode> = {
    prd: <FileText size={24} />,
    design: <LayoutTemplate size={24} />,
    data: <Database size={24} />,
    logic: <Server size={24} />,
    api: <FileJson size={24} />,
    frontend: <Layers size={24} />,
    deployment: <Rocket size={24} />
};

const App = () => {
  const { 
    productSeed, isSeeded, isDecomposing, setDecomposing, stages, artefacts, logs, commits, traces, metrics, schemas, blueprints, recentProjects,
    activeStageId, selectedArtefact, toast, processingStepIndex, isEnriching, isSimulationRunning, showPromptGuidance, isConsoleOpen,
    activeAgentId, isGraphPaused, isManualPaused, checkpoints, currentThinkingStep, currentThinkingAgent, interruptPayload, graphStatus,
    activityFeed, agentActivity, projectSettings, hasUsedFreeTier,
    setProductSeed, seedProject, setActiveStageId, setSelectedArtefact, setToast, setShowPromptGuidance, setIsConsoleOpen,
    runAgent, startSimulation, stopSimulation, toggleSimulationPause, enrichArchitecture, handleAgentCommand, resolveInterrupt, timeTravel,
    deleteBlueprints, deleteProjects, addLog, loadBlueprint
  } = useAppStore();

  const { isHydrating } = useHydration();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('llm');
  const [currentView, setCurrentView] = useState('board');
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // Dock States
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [activeDockTab, setActiveDockTab] = useState<'artifacts' | 'logs' | 'graph'>('artifacts');

  // Visibility States
  const [showStats, setShowStats] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Check for API Keys on mount
  useEffect(() => {
      const hasKeys = !!projectSettings.googleApiKey || !!projectSettings.openaiApiKey;
      if (!hasKeys && !hasUsedFreeTier) {
          // Slight delay for effect
          const timer = setTimeout(() => setIsKeyModalOpen(true), 1000);
          return () => clearTimeout(timer);
      } else if (!hasKeys && hasUsedFreeTier) {
          // Force open if trial is used up (simplified logic: check on every load if no keys)
          // In a real app we might differentiate "currently in trial session" vs "new session"
          // For now, we enforce keys if trial is marked used.
          setIsKeyModalOpen(true);
      }
  }, [projectSettings.googleApiKey, projectSettings.openaiApiKey, hasUsedFreeTier]);
  
  const handleSeed = () => {
      if(!productSeed.trim()) return;
      if (productSeed.length < 20) {
          setShowPromptGuidance(true);
          return;
      }
      seedProject(productSeed);
      setIsDockOpen(true); // Open dock to show progress starts
  };

  const handleStageClick = (id: StageType) => {
      setActiveStageId(id);
  };

  // Zoom Handlers
  const handleZoomIn = () => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.1, 2) }));
  const handleZoomOut = () => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.1, 0.5) }));
  const handleReset = () => setTransform({ x: 0, y: 0, scale: 1 });

  // Navigation
  const handleNavigate = (view: string) => {
      if (view === 'settings') {
          setIsSettingsOpen(true);
      } else {
          setCurrentView(view);
      }
  };

  // Download Handlers
  const handleDownloadArtifact = (artifact: ArtefactNode) => {
      const extension = artifact.type === 'code' ? 'tsx' : artifact.type === 'schema' ? 'json' : 'md';
      const blob = new Blob([artifact.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${artifact.label.replace(/\s+/g, '_')}_${artifact.id.substring(0,6)}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: "Download started", type: 'success' });
  };

  const handleDownloadAllArtifacts = async () => {
      if (artefacts.length === 0) return;
      const zip = new JSZip();
      
      artefacts.forEach(a => {
          const extension = a.type === 'code' ? 'tsx' : a.type === 'schema' ? 'json' : 'md';
          const filename = `${a.sourceStageId}/${a.label.replace(/\s+/g, '_')}.${extension}`;
          zip.file(filename, a.content);
      });

      // Add Readme
      zip.file("README.md", `# Project: ${productSeed}\nGenerated by Parit Architecture AI.`);

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Parit_Project_Export_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: "Project Archive Downloaded", type: 'success' });
  };

  // --- Specific OnAgentAction Handlers ---
  const handleAgentAction = async (stageId: StageType) => {
      // Logic before running the agent
      console.log(`[Controller] Initiating Agent for stage: ${stageId}`);
      
      const stage = stages.find(s => s.id === stageId);
      if (!stage) return;

      // 1. Context validation
      if (stageId !== 'prd') {
          const prdStage = stages.find(s => s.id === 'prd');
          if (prdStage?.status !== 'complete') {
              setToast({ message: "Cannot run this agent until PRD is complete.", type: 'error' });
              return;
          }
      }

      // 2. Specific Pre-Run Actions
      switch (stageId) {
          case 'prd':
              addLog('Controller', 'Validating product seed...', 'system');
              if (!productSeed) {
                  setToast({ message: "Product seed is missing.", type: 'error' });
                  return;
              }
              break;
          case 'data':
              addLog('Controller', 'Preparing Schema Validator...', 'system');
              break;
          case 'frontend':
              addLog('Controller', 'Loading Design Tokens...', 'system');
              break;
      }

      // 3. Execute the agent via Store
      await runAgent(stageId);
  };

  const progressPercent = Math.round((stages.filter(s => s.status === 'complete').length / stages.length) * 100);
  const dashboardStats = stages.map(s => ({
      label: s.id.toUpperCase(),
      value: s.status === 'complete' ? 'Done' : s.status === 'processing' ? 'Working' : s.status === 'idle' ? 'Ready' : (s.status === 'awaiting_approval' ? 'Review' : 'Locked'),
      status: s.status === 'complete' ? 'complete' : s.status === 'processing' ? 'active' : (s.status === 'awaiting_approval' ? 'active' : 'pending') as any
  }));

  const activeStage = stages.find(s => s.id === activeStageId);

  return (
    <Layout 
        isCanvasMode={currentView === 'board'} 
        onNavigate={handleNavigate} 
        currentView={currentView}
        projects={recentProjects}
        onDeleteProject={deleteProjects}
    >
      
      <ApiKeyModal 
          isOpen={isKeyModalOpen} 
          onClose={() => setIsKeyModalOpen(false)} 
      />

      {/* Hydration Loader */}
      <AnimatePresence>
          {isHydrating && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[300] bg-white/80 backdrop-blur-sm flex items-center justify-center flex-col gap-4"
              >
                  <Cloud size={48} className="text-accent animate-pulse" />
                  <div className="text-ink font-bold font-serif text-xl">Syncing with Cloud...</div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* === BOARD VIEW === */}
      {currentView === 'board' && (
        <div className="flex w-full h-full overflow-hidden">
            
            {/* Center Canvas Area (Squeezable) */}
            <div className="flex-1 relative bg-surface overflow-hidden flex flex-col items-center justify-center">
                <div className="absolute inset-0 dot-matrix-bg opacity-40 pointer-events-none" />

                {/* Task Decomposition Visualization (Loading Phase) */}
                <AnimatePresence>
                    {isDecomposing && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[200]"
                        >
                            <PaperTaskTree 
                                seed={productSeed} 
                                onComplete={() => setDecomposing(false)} 
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Top Stats & Controls */}
                {isSeeded && showStats && !isDecomposing && (
                    <PaperProgressDashboard 
                        progress={progressPercent} 
                        stats={dashboardStats} 
                        isPlaying={isSimulationRunning && !isManualPaused}
                        onTogglePlay={() => {
                            if (isSimulationRunning) {
                                toggleSimulationPause();
                            } else {
                                startSimulation();
                            }
                        }}
                    />
                )}
                
                {/* View Toggles */}
                {isSeeded && !isDecomposing && (
                    <div className="fixed top-6 right-6 z-[130] flex gap-2">
                        <PaperViewToggle 
                            icon={showStats ? <Eye size={16} /> : <EyeOff size={16} />} 
                            isActive={showStats} 
                            onClick={() => setShowStats(!showStats)} 
                            title="Toggle Stats"
                        />
                        <PaperViewToggle 
                            icon={<Sidebar size={16} />} 
                            isActive={!!activeStageId} 
                            onClick={() => setActiveStageId(activeStageId ? null : 'prd')} 
                            title="Toggle Metadata Panel"
                        />
                    </div>
                )}

                {isSeeded && !isDecomposing && (
                    <PaperCommandBar 
                        onSend={handleAgentCommand} 
                        onEnrich={enrichArchitecture}
                        isEnriching={isEnriching}
                    />
                )}
                {isSeeded && !isDecomposing && (
                    <PaperZoomControls 
                        onZoomIn={handleZoomIn} 
                        onZoomOut={handleZoomOut} 
                        onReset={handleReset} 
                        scale={transform.scale}
                    />
                )}
                
                {/* Updated Parallel Thinking Overlay */}
                <PaperThinkingOverlay 
                    agentActivity={agentActivity}
                />

                {/* Full Screen Interrupt Overlay */}
                <PaperInterruptOverlay 
                    isOpen={graphStatus === 'interrupted'}
                    interruptPayload={interruptPayload}
                    onResolve={resolveInterrupt}
                />

                {/* Seeding Input */}
                <AnimatePresence>
                    {!isSeeded && !isDecomposing && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                            className="z-10 w-full max-w-2xl px-4"
                        >
                            <PaperCard className="text-center py-12 px-8">
                                <div className="w-16 h-16 bg-ink text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-hard">
                                    <Bot size={32} />
                                </div>
                                <h1 className="font-serif font-black text-4xl mb-4">What are we building?</h1>
                                <p className="text-zinc-500 mb-8 max-w-lg mx-auto">Enter your product description. The AI Agents will break it down into a complete architecture specification.</p>
                                <div className="flex gap-2">
                                    <PaperInput 
                                        className="flex-1" 
                                        placeholder="e.g. A marketplace for vintage typewriters..." 
                                        value={productSeed}
                                        onChange={(e) => setProductSeed(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSeed()}
                                    />
                                    <PaperButton onClick={handleSeed} icon={<ArrowRight size={18} />}>Ignite</PaperButton>
                                </div>
                            </PaperCard>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Canvas (Graph Visualization) */}
                <AnimatePresence>
                    {isSeeded && !isDecomposing && (
                        <motion.div 
                            ref={containerRef}
                            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing origin-center"
                            drag
                            dragMomentum={false}
                            onDrag={(e, info) => {
                                setTransform(prev => ({ ...prev, x: prev.x + info.delta.x, y: prev.y + info.delta.y }));
                            }}
                            style={{ x: transform.x, y: transform.y, scale: transform.scale }}
                        >
                            {/* Dynamic SVG Connections */}
                            <svg className="absolute -top-[2000px] -left-[2000px] w-[5000px] h-[5000px] pointer-events-none z-0">
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#18181b" />
                                    </marker>
                                    <marker id="arrowhead-reverse" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                        <polygon points="10 0, 0 3.5, 10 7" fill="#10b981" />
                                    </marker>
                                    <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                                        <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {stages.map((stage, i) => {
                                    if (i === stages.length - 1) return null;
                                    const nextStage = stages[i+1];
                                    const offset = 2000; 
                                    const x1 = stage.x + 100 + offset; 
                                    const y1 = stage.y + 60 + offset;
                                    const x2 = nextStage.x + 100 + offset; 
                                    const y2 = nextStage.y + 60 + offset;
                                    
                                    const isFlowing = stage.status === 'complete' && nextStage.status !== 'locked';
                                    const isActiveConnection = stage.status === 'processing' || nextStage.status === 'processing';
                                    
                                    return (
                                        <g key={i}>
                                            {/* Base Line */}
                                            <path 
                                                d={`M ${x1} ${y1} L ${x2} ${y2}`} 
                                                stroke={stage.status === 'complete' ? "#18181b" : "#e4e4e7"} 
                                                strokeWidth={stage.status === 'complete' ? "3" : "2"}
                                                strokeDasharray={stage.status === 'complete' ? "0" : "5,5"}
                                                markerEnd={stage.status === 'complete' ? "url(#arrowhead)" : ""}
                                                className="transition-all duration-500"
                                            />
                                            
                                            {/* Animated Flow Gradient for 'Active' Connections */}
                                            {isActiveConnection && (
                                                <motion.path 
                                                    d={`M ${x1} ${y1} L ${x2} ${y2}`}
                                                    stroke="url(#flow-gradient)"
                                                    strokeWidth="4"
                                                    fill="none"
                                                    initial={{ strokeDasharray: "100 1000", strokeDashoffset: 1000 }}
                                                    animate={{ strokeDashoffset: 0 }}
                                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                />
                                            )}

                                            {/* Back-Propagation Flow (Enrichment) */}
                                            {isEnriching && (
                                                <motion.path 
                                                    d={`M ${x1} ${y1 + 10} L ${x2} ${y2 + 10}`}
                                                    stroke="#10b981"
                                                    strokeWidth="2"
                                                    strokeDasharray="5,5"
                                                    initial={{ pathLength: 0, opacity: 0 }}
                                                    animate={{ pathLength: 1, opacity: 1 }}
                                                    markerStart="url(#arrowhead-reverse)"
                                                />
                                            )}

                                            {/* Forward Data Packet Flow */}
                                            {isFlowing && !isEnriching && (
                                                <>
                                                    <motion.circle 
                                                        r="4" 
                                                        fill="#10b981"
                                                        animate={{ 
                                                            offsetDistance: "100%", 
                                                            cx: [x1, x2],
                                                            cy: [y1, y2],
                                                            scale: [1, 1.2, 1]
                                                        }}
                                                        transition={{ 
                                                            duration: 1.5, 
                                                            repeat: Infinity, 
                                                            ease: "linear" 
                                                        }}
                                                    />
                                                </>
                                            )}
                                        </g>
                                    )
                                })}
                            </svg>

                            {/* Stages Nodes */}
                            {stages.map((stage) => {
                                const existingArtefact = artefacts.find(a => a.sourceStageId === stage.id);
                                
                                return (
                                    <motion.div
                                        key={stage.id}
                                        layout
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="absolute"
                                        style={{ left: stage.x + 2000, top: stage.y + 2000 }}
                                    >
                                        {/* Active Agent Orbital Animation */}
                                        {stage.status === 'processing' && (
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="absolute -inset-2 border-2 border-accent/50 rounded-lg animate-ping opacity-20"/>
                                                <motion.div 
                                                    className="absolute -top-2 -right-2 w-4 h-4 bg-accent rounded-full border-2 border-white z-50 shadow-sm"
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ duration: 1, repeat: Infinity }}
                                                />
                                            </div>
                                        )}

                                        <div 
                                            onClick={(e) => { e.stopPropagation(); handleStageClick(stage.id); }}
                                            className={cn(
                                                "w-[220px] bg-white border-2 p-5 flex flex-col gap-3 transition-all relative group rounded-sm",
                                                stage.status === 'locked' ? "border-zinc-200 text-zinc-400 cursor-not-allowed" : "border-ink shadow-hard cursor-pointer hover:bg-zinc-50",
                                                stage.status === 'processing' ? "ring-2 ring-accent border-accent" : "",
                                                stage.status === 'awaiting_approval' ? "ring-2 ring-amber-500 bg-amber-50" : "",
                                                stage.status === 'complete' ? "border-ink" : "",
                                                activeStageId === stage.id ? "ring-2 ring-ink ring-offset-2" : ""
                                            )}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className={cn(
                                                    "p-2 rounded-md border-2 transition-colors",
                                                    stage.status === 'complete' ? "bg-accent border-ink text-ink" : 
                                                    stage.status === 'locked' ? "bg-zinc-50 border-zinc-200" : "bg-white border-ink"
                                                )}>
                                                    {STAGE_ICONS[stage.id]}
                                                </div>
                                                {stage.status === 'complete' && <PaperBadge variant="success">DONE</PaperBadge>}
                                                {stage.status === 'processing' && <PaperBadge variant="warning">BUSY</PaperBadge>}
                                                {stage.status === 'awaiting_approval' && <PaperBadge variant="warning">REVIEW</PaperBadge>}
                                            </div>
                                            
                                            <div>
                                                <h3 className="font-serif font-bold text-lg leading-tight">{stage.title}</h3>
                                                <div className="min-h-[20px] mt-1">
                                                    {stage.status === 'complete' && stage.summary ? (
                                                        <p className="font-mono text-xs font-bold text-ink">{stage.summary}</p>
                                                    ) : stage.status === 'locked' ? (
                                                        <p className="font-mono text-xs text-zinc-400">Waiting for upstream...</p>
                                                    ) : stage.status === 'processing' ? (
                                                        <div className="flex flex-col gap-2 mt-2">
                                                            <div className="flex items-center gap-2 text-xs font-mono text-accent font-bold animate-pulse">
                                                                <Loader2 size={12} className="animate-spin" /> 
                                                                {currentThinkingAgent || "Agent"} Working...
                                                            </div>
                                                            {currentThinkingStep && (
                                                                <p className="text-[10px] text-zinc-500 font-mono leading-tight bg-zinc-50 p-1 rounded border border-zinc-100">
                                                                    {currentThinkingStep}
                                                                </p>
                                                            )}
                                                            <div className="mt-1 opacity-80 scale-95 origin-top-left -ml-1">
                                                                <PaperStepLoader steps={stage.reasoningSteps} currentStepIndex={processingStepIndex} />
                                                            </div>
                                                        </div>
                                                    ) : stage.status === 'awaiting_approval' ? (
                                                        <div className="flex items-center gap-1 text-xs font-mono text-amber-600 font-bold animate-pulse">
                                                            <AlertTriangle size={10} /> Approval Required
                                                        </div>
                                                    ) : (
                                                        <p className="font-mono text-xs text-zinc-500 italic">To Be Designed</p>
                                                    )}
                                                </div>
                                                
                                                {/* Validation Status Indicator */}
                                                {stage.validationStatus && stage.validationStatus !== 'pending' && (
                                                    <div className={cn(
                                                        "mt-2 text-[10px] font-bold uppercase flex items-center gap-1",
                                                        stage.validationStatus === 'valid' ? "text-emerald-600" : "text-red-600"
                                                    )}>
                                                        {stage.validationStatus === 'valid' ? <Check size={10} /> : <AlertTriangle size={10} />}
                                                        {stage.validationStatus === 'valid' ? "VALIDATED" : "ISSUES FOUND"}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Direct Artifact Action Button */}
                                            {stage.status === 'complete' && existingArtefact && (
                                                <div className="mt-2 pt-3 border-t-2 border-dashed border-ink/20">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedArtefact(existingArtefact);
                                                        }}
                                                        className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded px-2 py-1 text-xs font-bold transition-colors"
                                                    >
                                                        <FileCode size={12} /> View Artifact
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {/* Edit Action Hint */}
                                            {stage.status !== 'locked' && stage.status !== 'complete' && (
                                                <div className="absolute inset-0 bg-ink/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                                    <span className="bg-white border-2 border-ink px-2 py-1 text-xs font-bold shadow-sm">
                                                        OPEN DETAIL
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Persistent Bottom Dock (Inside the Canvas Container to avoid stacking context issues with right panel) */}
                {isSeeded && !isDecomposing && (
                    <PaperBottomDock 
                        isOpen={isDockOpen}
                        onToggle={setIsDockOpen}
                        activeTab={activeDockTab}
                        onTabChange={setActiveDockTab}
                        stages={stages}
                        artefacts={artefacts}
                        logs={logs}
                        commits={commits}
                        onDownload={handleDownloadArtifact}
                        onDownloadAll={handleDownloadAllArtifacts}
                        isSimulationRunning={isSimulationRunning}
                        isGraphPaused={isGraphPaused}
                        isManualPaused={isManualPaused}
                        onTogglePause={toggleSimulationPause}
                        onStartSimulation={startSimulation}
                        onStopSimulation={stopSimulation}
                        checkpoints={checkpoints}
                        activeAgent={activeAgentId}
                        onRollback={timeTravel}
                        interruptPayload={interruptPayload}
                        onResolveInterrupt={(feedback) => resolveInterrupt(feedback === 'Approved' ? 'Approved by user' : `Rejected: ${feedback}`)}
                    />
                )}
            </div>

            {/* Right Side Panel (Metadata Ribbon) */}
            {/* Now sits statically in the flex flow, squeezing the center canvas when open */}
            <PaperMetadataRibbon
                isOpen={!!activeStageId} 
                onToggle={() => setActiveStageId(null)}
                title={activeStage?.title || 'Stage Metadata'}
                footer={
                    activeStage?.status === 'locked' ? (
                        <div className="text-center text-xs text-zinc-400 italic">Unlock this stage by completing the previous step.</div>
                    ) : activeStage?.status === 'processing' ? (
                        <PaperButton disabled className="w-full opacity-100 bg-zinc-100 text-ink border-zinc-300">Processing...</PaperButton>
                    ) : activeStage?.status === 'awaiting_approval' ? (
                        <PaperReviewFooter 
                            onApprove={() => resolveInterrupt('Approved by User')}
                            onReject={(feedback) => resolveInterrupt(`Rejected: ${feedback}`)}
                        />
                    ) : (
                        <PaperButton 
                            className="w-full" 
                            onClick={() => handleAgentAction(activeStageId!)}
                            icon={<Zap size={18} />}
                        >
                            {activeStage?.status === 'complete' ? 'Regenerate' : 'Run Agent'}
                        </PaperButton>
                    )
                }
            >
                {activeStage && (
                    <div className="space-y-6">
                        {/* Audit Trail Link */}
                        <div className="flex justify-end">
                            <button onClick={() => { setIsDockOpen(true); setActiveDockTab('logs'); }} className="text-[10px] font-bold uppercase text-zinc-400 hover:text-ink underline decoration-dotted">
                                View Audit Logs
                            </button>
                        </div>

                        {/* Status Banners */}
                        {activeStage.status === 'complete' && (
                            <div className="bg-emerald-50 border-2 border-emerald-600 p-4 flex items-start gap-3">
                                <Check className="text-emerald-700 mt-0.5" size={18} />
                                <div>
                                    <h4 className="font-bold text-emerald-900 text-sm">Output Generated</h4>
                                    <p className="text-emerald-800 text-xs">This stage is complete. You can modify the prompt and regenerate if needed.</p>
                                </div>
                            </div>
                        )}
                        {activeStage.status === 'awaiting_approval' && (
                            <div className="bg-amber-50 border-2 border-amber-600 p-4 flex items-start gap-3">
                                <AlertTriangle className="text-amber-700 mt-0.5" size={18} />
                                <div>
                                    <h4 className="font-bold text-amber-900 text-sm">Supervisor Check</h4>
                                    <p className="text-amber-800 text-xs">
                                        {interruptPayload?.message || "The Supervisor Agent has paused execution for human review of the generated logic."}
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {/* Validation Feedback */}
                        {activeStage.validationStatus === 'invalid' && (
                            <div className="bg-red-50 border-2 border-red-600 p-4 flex items-start gap-3">
                                <AlertTriangle className="text-red-700 mt-0.5" size={18} />
                                <div>
                                    <h4 className="font-bold text-red-900 text-sm">Validation Issues</h4>
                                    <ul className="text-red-800 text-xs list-disc pl-4 mt-1">
                                        {activeStage.validationErrors?.map((err, i) => <li key={i}>{err}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Agent Instructions</label>
                            <PaperTextArea 
                                className="font-mono text-xs min-h-[150px] leading-relaxed"
                                value={activeStage.userPrompt ? `${activeStage.basePrompt}\n\nInput Context: ${activeStage.userPrompt}` : activeStage.basePrompt}
                                onChange={(e) => {}}
                                disabled={activeStage.status === 'locked' || activeStage.status === 'processing'}
                            />
                        </div>

                        {activeStage.status === 'processing' && (
                            <div className="border-t-2 border-dashed border-ink/20 pt-4">
                                <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-2 block">Agent Reasoning</label>
                                <PaperStepLoader 
                                    steps={activeStage.reasoningSteps} 
                                    currentStepIndex={processingStepIndex} 
                                />
                            </div>
                        )}

                        {activeStage.status === 'complete' && activeStage.output && (
                            <div className="border-t-2 border-ink pt-4">
                                <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-2 block flex justify-between">
                                    <span>Artifact</span>
                                    <span className="text-zinc-400">MARKDOWN</span>
                                </label>
                                <div className="bg-zinc-50 border-2 border-ink p-4 font-mono text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                                    {activeStage.output}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </PaperMetadataRibbon>

            {/* Artefact Detail Modal */}
            <PaperModal 
                isOpen={!!selectedArtefact}
                onClose={() => setSelectedArtefact(null)}
                title={`Artefact: ${selectedArtefact?.label}`}
                size="lg"
            >
                {selectedArtefact && (
                    <div className="grid grid-cols-2 gap-0 h-[600px] border-2 border-ink">
                         <div className="border-r-2 border-ink bg-zinc-50 p-4 font-mono text-sm overflow-y-auto">
                             <h4 className="font-bold text-xs uppercase mb-4 text-zinc-500">Source Prompt</h4>
                             <div className="whitespace-pre-wrap text-zinc-600">{selectedArtefact.promptContext}</div>
                         </div>
                         <div className="p-4 bg-white overflow-y-auto font-mono text-sm">
                             <div className="flex justify-between items-center mb-4">
                                 <h4 className="font-bold text-xs uppercase text-zinc-500">Generated Output</h4>
                                 <PaperBadge variant="info">{selectedArtefact.type.toUpperCase()}</PaperBadge>
                             </div>
                             <div className="whitespace-pre-wrap text-ink">{selectedArtefact.content}</div>
                         </div>
                    </div>
                )}
                <div className="flex justify-end p-4 border-t-2 border-ink bg-zinc-50 gap-2">
                    <PaperButton variant="secondary" onClick={() => setSelectedArtefact(null)}>Close</PaperButton>
                    <PaperButton onClick={() => selectedArtefact && handleDownloadArtifact(selectedArtefact)} icon={<Download size={16} />}>Download</PaperButton>
                </div>
            </PaperModal>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[200] bg-white">
                    <SettingsRoot onClose={() => setIsSettingsOpen(false)} />
                </div>
            )}
        </div>
      )}

      {/* === OTHER VIEWS (Placeholders) === */}
      {currentView === 'blueprints' && <PaperBlueprintLibrary blueprints={blueprints} onLoad={(id) => { loadBlueprint(id); setCurrentView('board'); }} onDelete={deleteBlueprints} />}
      {currentView === 'data' && <PaperDataDictionary schemas={schemas} projectVersion="1.0.4" />}
      {currentView === 'logs' && <PaperChangelog activityFeed={activityFeed} commits={commits} />}
      {currentView === 'agents' && <PaperObservabilityDashboard traces={traces} metrics={metrics} />}

    </Layout>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
