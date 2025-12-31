
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X, ChevronDown, Bot, AlertTriangle, User, Loader2, Check, Sparkles, Send, Command, ChevronUp, ZoomIn, ZoomOut, Maximize, Activity, GitBranch, Clock, Lightbulb, Terminal, Database, Cpu, History, RotateCcw, Play, FileJson, FileCode, FileType, FileImage, Folder, Star, Bookmark, FileText, Info, Pause, CircleStop, Table, Key, Hash, List, Calendar, Search, ArrowRight, Download, Share2, Layers, Box, Network, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, Eye, Trash2, Filter, ShieldAlert, Plus, LayoutTemplate, Settings, Workflow, Package, CheckCircle, Circle, Square, TerminalSquare, Radio, Mic } from 'lucide-react';
import { LogEntry, CommitEntry, TraceSpan, SchemaTable, Blueprint, GraphCheckpoint, InterruptPayload, RecentProject, StageNode, ArtefactNode, ActivityFeedItem } from './types';

// Utility for class merging
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

export interface PaperCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

export interface PaperButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export interface PaperInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export interface PaperTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export interface PaperBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export interface PaperSliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

export interface PaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | 'full';
}

export interface PaperMetadataRibbonProps {
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export interface PaperSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
}

export interface PaperTabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export interface PaperChatBubbleProps {
  role: 'analyst' | 'critic' | 'user';
  message: string;
  timestamp?: string;
}

export interface PaperToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'guidance';
  onClose: () => void;
}

export interface PaperStepLoaderProps {
  steps: string[];
  currentStepIndex: number;
}

export interface PaperCommandBarProps {
    onSend: (message: string) => void;
    onEnrich: () => void;
    isEnriching: boolean;
}

export interface PaperProgressDashboardProps {
    progress: number;
    stats: { label: string; value: string; status: 'pending' | 'active' | 'complete' }[];
    isPlaying: boolean;
    onTogglePlay: () => void;
}

export interface PaperZoomControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    scale: number;
}

export interface PaperObservabilityDashboardProps {
    traces: TraceSpan[];
    metrics: {
        totalTokens: number;
        avgLatency: number;
        enrichmentCycles: number;
        estCost: number;
    };
}

export interface PaperSwitchProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    description?: string;
}

export interface PaperConsoleProps {
    isOpen: boolean;
    onClose: () => void;
    logs: LogEntry[];
    commits: CommitEntry[];
}

export interface PaperPromptGuidanceProps {
    isOpen: boolean;
    originalPrompt: string;
    optimizedPrompt: string;
    reasoning: string;
    onAccept: () => void;
}

export interface PaperArtefactBadgeProps {
    type: 'code' | 'doc' | 'schema' | 'config';
    label: string;
    onClick: () => void;
}

export interface PaperUserMenuProps {
    projects: RecentProject[];
    favorites: { id: string; name: string; promptSnippet: string }[];
    onDeleteProject: (ids: string[]) => void;
}

export interface PaperTooltipPreviewProps {
    title: string;
    content: string;
    type: 'code' | 'text';
}

export interface PaperDataDictionaryProps {
    schemas: SchemaTable[];
    projectVersion: string;
}

export interface PaperBlueprintLibraryProps {
    blueprints: Blueprint[];
    onLoad: (id: string) => void;
    onDelete: (ids: string[]) => void;
}

export interface PaperChangelogProps {
    activityFeed: ActivityFeedItem[];
    commits: CommitEntry[];
}

export interface PaperGraphControlProps {
    activeAgent: string | null;
    isPaused: boolean;
    checkpoints: GraphCheckpoint[];
    onResume: (approved: boolean) => void;
    onRollback: (checkpointId: string) => void;
}

export interface PaperDeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    validationText: string;
}

export interface PaperReviewFooterProps {
    onApprove: () => void;
    onReject: (feedback: string) => void;
}

export interface PaperThinkingOverlayProps {
    agentActivity: Record<string, { status: 'thinking' | 'writing' | 'complete', message: string }>;
}

export interface PaperInterruptOverlayProps {
    isOpen: boolean;
    interruptPayload: InterruptPayload | null;
    onResolve: (feedback: string) => void;
}

export interface PaperViewToggleProps {
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    title: string;
}

export interface PaperTaskTreeProps {
    seed: string;
    onComplete: () => void;
}

export interface PaperBottomDockProps {
    isOpen: boolean;
    onToggle: (isOpen: boolean) => void;
    activeTab: 'artifacts' | 'logs' | 'graph';
    onTabChange: (tab: 'artifacts' | 'logs' | 'graph') => void;
    stages: StageNode[];
    artefacts: ArtefactNode[];
    logs: LogEntry[];
    commits: CommitEntry[];
    onDownload: (artefact: ArtefactNode) => void;
    onDownloadAll: () => void;
    
    // Simulation Control Props
    isSimulationRunning: boolean;
    isGraphPaused: boolean;
    isManualPaused: boolean;
    onTogglePause: () => void;
    onStartSimulation: () => void;
    onStopSimulation: () => void;

    // Graph Control Props
    checkpoints: GraphCheckpoint[];
    activeAgent: string | null;
    onRollback: (checkpointId: string) => void;
    interruptPayload: InterruptPayload | null;
    onResolveInterrupt: (feedback: string) => void;
}

// --- Components ---

export const PaperCard: React.FC<PaperCardProps> = ({ title, children, className, action, onClick, active }) => {
  return (
    <motion.div
      layout
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", layout: { duration: 0.3 } }}
      className={cn(
        "bg-paper border-2 border-ink shadow-hard overflow-hidden flex flex-col relative transition-colors",
        onClick ? "cursor-pointer" : "",
        active ? "ring-2 ring-accent ring-offset-2" : "",
        className
      )}
    >
      {title && (
        <div className="border-b-2 border-ink bg-zinc-50 px-4 py-3 flex justify-between items-center select-none">
          <h3 className="font-serif font-bold text-lg text-ink tracking-tight">{title}</h3>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6 h-full">{children}</div>
    </motion.div>
  );
};

export const PaperButton: React.FC<PaperButtonProps> = ({ children, variant = 'primary', size = 'md', icon, className, ...props }) => {
    return (
        <button 
            className={cn(
                "font-bold transition-all flex items-center justify-center gap-2 select-none border-2 border-ink active:translate-y-1 active:shadow-none",
                variant === 'primary' && "bg-ink text-white shadow-hard hover:bg-zinc-800",
                variant === 'secondary' && "bg-white text-ink shadow-hard hover:bg-zinc-50",
                variant === 'ghost' && "bg-transparent border-transparent shadow-none hover:bg-black/5",
                variant === 'danger' && "bg-red-500 text-white border-red-700 shadow-hard hover:bg-red-600",
                size === 'sm' && "px-3 py-1 text-xs",
                size === 'md' && "px-4 py-2 text-sm",
                size === 'lg' && "px-6 py-3 text-base",
                props.disabled && "opacity-50 cursor-not-allowed active:translate-y-0",
                className
            )}
            {...props}
        >
            {icon}
            {children}
        </button>
    );
}

// ... Re-export generic inputs
export const PaperInput: React.FC<PaperInputProps> = ({ label, error, className, ...props }) => {
    return (
        <div className={cn("flex flex-col gap-1", className)}>
            {label && <label className="text-xs font-bold uppercase text-zinc-500">{label}</label>}
            <input className="w-full border-2 border-ink px-3 py-2 outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 font-mono text-sm bg-white shadow-sm transition-all" {...props} />
            {error && <span className="text-xs text-red-500 font-bold">{error}</span>}
        </div>
    );
}
export const PaperTextArea: React.FC<PaperTextAreaProps> = ({ label, error, className, ...props }) => {
    return (
        <div className={cn("flex flex-col gap-1", className)}>
            {label && <label className="text-xs font-bold uppercase text-zinc-500">{label}</label>}
            <textarea className="w-full border-2 border-ink px-3 py-2 outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 font-mono text-sm bg-white shadow-sm transition-all resize-none" {...props} />
            {error && <span className="text-xs text-red-500 font-bold">{error}</span>}
        </div>
    );
}
export const PaperBadge: React.FC<PaperBadgeProps> = ({ children, variant = 'default', className }) => {
    return <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase border border-ink rounded-full tracking-wider", variant === 'default' && "bg-zinc-100 text-ink", variant === 'success' && "bg-emerald-100 text-emerald-800 border-emerald-800", variant === 'warning' && "bg-amber-100 text-amber-800 border-amber-800", variant === 'error' && "bg-red-100 text-red-800 border-red-800", variant === 'info' && "bg-blue-100 text-blue-800 border-blue-800", className)}>{children}</span>;
}

export const PaperSlider: React.FC<PaperSliderProps> = ({ label, value, min = 0, max = 100, step = 1, onChange, className }) => {
    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <div className="flex justify-between items-center">
                 <label className="text-xs font-bold uppercase text-zinc-500">{label}</label>
                 <span className="font-mono text-xs font-bold">{value}</span>
            </div>
            <input 
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer border border-ink accent-ink"
            />
        </div>
    );
};

export const PaperModal: React.FC<PaperModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                     <motion.div 
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         exit={{ opacity: 0 }}
                         onClick={onClose}
                         className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
                     />
                     <motion.div 
                         initial={{ opacity: 0, scale: 0.95, y: 10 }}
                         animate={{ opacity: 1, scale: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.95, y: 10 }}
                         className={cn(
                             "bg-white border-2 border-ink shadow-2xl overflow-hidden flex flex-col z-10 rounded-lg max-h-[90vh]",
                             size === 'md' ? "w-full max-w-lg" :
                             size === 'lg' ? "w-full max-w-4xl" :
                             size === 'xl' ? "w-full max-w-6xl" : "w-full h-full max-w-none rounded-none m-0 max-h-screen"
                         )}
                     >
                        <div className="px-6 py-4 border-b-2 border-ink bg-zinc-50 flex items-center justify-between shrink-0">
                             <h3 className="font-serif font-black text-xl">{title}</h3>
                             <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-white">
                            {children}
                        </div>
                        {footer && (
                            <div className="px-6 py-4 border-t-2 border-ink bg-zinc-50 shrink-0 flex justify-end gap-3">
                                {footer}
                            </div>
                        )}
                     </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export const PaperSelect: React.FC<PaperSelectProps> = ({ label, options, className, ...props }) => {
    return (
        <div className={cn("flex flex-col gap-1", className)}>
             {label && <label className="text-xs font-bold uppercase text-zinc-500">{label}</label>}
             <div className="relative">
                 <select 
                    className="w-full appearance-none border-2 border-ink bg-white px-3 py-2 pr-8 outline-none focus:ring-2 focus:ring-accent font-mono text-sm shadow-sm"
                    {...props}
                 >
                     {options.map(opt => (
                         <option key={opt.value} value={opt.value}>{opt.label}</option>
                     ))}
                 </select>
                 <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink" />
             </div>
        </div>
    );
};

export const PaperSwitch: React.FC<PaperSwitchProps> = ({ label, checked, onChange, className, description }) => {
    return (
        <div className={cn("flex items-start justify-between gap-4", className)}>
            <div>
                 <div className="font-bold text-sm">{label}</div>
                 {description && <div className="text-xs text-zinc-500 max-w-[200px]">{description}</div>}
            </div>
            <button 
                onClick={() => onChange(!checked)}
                className={cn(
                    "w-12 h-6 rounded-full border-2 border-ink relative transition-colors shadow-sm",
                    checked ? "bg-accent" : "bg-zinc-200"
                )}
            >
                <motion.div 
                    layout
                    className="w-4 h-4 bg-white border-2 border-ink rounded-full absolute top-[2px]"
                    animate={{ left: checked ? "26px" : "2px" }}
                />
            </button>
        </div>
    );
};

export const PaperTabs: React.FC<PaperTabsProps> = ({ tabs, activeTab, onChange, className }) => (
    <div className={cn("flex gap-2 border-b-2 border-ink/10", className)}>{tabs.map(tab => <button key={tab.id} onClick={() => onChange(tab.id)} className={cn("px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors", activeTab === tab.id ? "border-ink text-ink" : "border-transparent text-zinc-400 hover:text-zinc-600")}>{tab.icon}{tab.label}</button>)}</div>
);
export const PaperChatBubble: React.FC<PaperChatBubbleProps> = (props) => <div {...props}/>; 
export const PaperReviewFooter: React.FC<PaperReviewFooterProps> = ({ onApprove, onReject }) => {
    const [isRejecting, setIsRejecting] = useState(false);
    const [feedback, setFeedback] = useState('');
    if (isRejecting) {
        return <div className="flex flex-col gap-3 w-full animate-in fade-in slide-in-from-bottom-2"><label className="text-xs font-bold text-red-700 uppercase">Rejection Feedback</label><PaperTextArea placeholder="Describe issue..." value={feedback} onChange={e => setFeedback(e.target.value)} className="border-red-300" /><div className="flex gap-2"><PaperButton variant="secondary" size="sm" onClick={() => setIsRejecting(false)}>Cancel</PaperButton><PaperButton variant="danger" size="sm" onClick={() => onReject(feedback)} disabled={!feedback.trim()} icon={<RotateCcw size={14}/>} className="flex-1">Confirm</PaperButton></div></div>
    }
    return <div className="flex w-full gap-2"><PaperButton onClick={onApprove} className="flex-1 bg-emerald-600 border-emerald-800 hover:bg-emerald-500 text-white" icon={<ThumbsUp size={16}/>}>Approve</PaperButton><PaperButton onClick={() => setIsRejecting(true)} className="flex-1 bg-red-50 text-red-900 border-red-200 hover:bg-red-100" icon={<ThumbsDown size={16}/>}>Reject</PaperButton></div>
}
export const PaperTooltipPreview: React.FC<PaperTooltipPreviewProps> = (props) => <div {...props}/>; 
export const PaperToast: React.FC<PaperToastProps> = ({ message, type = 'info', onClose }) => { useEffect(() => { const timer = setTimeout(onClose, 5000); return () => clearTimeout(timer); }, [onClose]); return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("fixed bottom-24 right-8 z-[200] px-6 py-4 border-2 shadow-hard flex items-start gap-4 max-w-sm bg-white", type === 'success' && "border-emerald-600 bg-emerald-50", type === 'error' && "border-red-600 bg-red-50", type === 'guidance' && "border-accent bg-indigo-50", type === 'info' && "border-ink")}><div className={cn("p-1 rounded-full text-white mt-1", type === 'success' && "bg-emerald-600", type === 'error' && "bg-red-600", type === 'guidance' && "bg-accent", type === 'info' && "bg-ink")}>{type === 'success' ? <Check size={14} /> : <Info size={14} />}</div><div className="flex-1"><h4 className="font-bold text-sm uppercase mb-1 tracking-wider text-ink">{type}</h4><p className="text-sm font-medium text-zinc-700 leading-snug">{message}</p></div><button onClick={onClose}><X size={14}/></button></motion.div>; };

export const PaperStepLoader: React.FC<PaperStepLoaderProps> = ({ steps, currentStepIndex }) => {
    return (
        <div className="flex flex-col gap-3 py-2">
            {steps.map((step, i) => {
                const isComplete = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const isPending = i > currentStepIndex;
                
                return (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn("flex items-center gap-3 text-sm transition-all", isPending && "opacity-40")}
                    >
                        <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors duration-300",
                            isComplete ? "bg-emerald-500 border-emerald-600 text-white" : 
                            isCurrent ? "border-accent text-accent" : "border-zinc-300 text-zinc-300"
                        )}>
                            {isComplete ? (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                    <Check size={12} />
                                </motion.div>
                            ) : (
                                isCurrent ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    i + 1
                                )
                            )}
                        </div>
                        <span className={cn(
                            "font-mono transition-all duration-300", 
                            isComplete ? "text-zinc-500 line-through decoration-zinc-400" : isCurrent ? "text-ink font-bold scale-105 origin-left" : "text-zinc-400"
                        )}>
                            {step}
                        </span>
                    </motion.div>
                )
            })}
        </div>
    );
}

export const PaperCommandBar: React.FC<PaperCommandBarProps> = ({ onSend, onEnrich, isEnriching }) => (<div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl"><div className="bg-white border-2 border-ink shadow-hard p-2 flex gap-2 items-center rounded-lg"><button onClick={onEnrich} disabled={isEnriching} className={cn("p-2 hover:bg-zinc-100 rounded text-accent", isEnriching && "animate-spin")}><Sparkles size={20} /></button><input className="flex-1 bg-transparent border-none outline-none font-mono text-sm" placeholder="Ask an agent to update..." onChange={()=>{}} /><button className="p-2 bg-ink text-white rounded hover:bg-zinc-800"><ArrowRight size={16} /></button></div></div>);

export const PaperProgressDashboard: React.FC<PaperProgressDashboardProps> = ({ progress, stats, isPlaying, onTogglePlay }) => (
    <div className="absolute top-6 left-0 right-0 z-[120] pointer-events-none flex justify-center">
        <div className="pointer-events-auto flex items-center gap-4">
            {/* Play/Pause Button - Neo-Brutal Style */}
            <button 
                onClick={onTogglePlay}
                className={cn(
                    "h-12 w-12 flex items-center justify-center bg-white border-2 border-ink shadow-hard rounded-lg transition-all active:translate-y-1 active:shadow-none hover:bg-zinc-50",
                    isPlaying ? "text-red-500 border-red-500" : "text-emerald-500 border-emerald-600"
                )}
            >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>

            {/* Dashboard */}
            <div className="bg-white/95 backdrop-blur-md border-2 border-ink shadow-hard px-6 py-3 rounded-full flex items-center gap-6 transition-all hover:scale-105">
                <div className="flex items-center gap-3">
                    <span className="font-serif font-black text-lg min-w-[3ch] text-right">{progress}%</span>
                    <div className="w-32 h-3 bg-zinc-100 rounded-full overflow-hidden border border-zinc-300 relative">
                        <motion.div 
                            className="h-full bg-emerald-500" 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-white/30 skew-x-12 w-full translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                    </div>
                </div>
                <div className="h-6 w-px bg-zinc-300" />
                <div className="flex gap-4">
                    {stats.map((s, i) => (
                        <div key={i} className="flex flex-col items-center group">
                            <span className="text-[9px] uppercase font-bold text-zinc-400 mb-1 group-hover:text-ink transition-colors">{s.label}</span>
                            <motion.div 
                                className={cn("w-2 h-2 rounded-full", s.status === 'complete' ? "bg-emerald-500" : s.status === 'active' ? "bg-amber-500" : "bg-zinc-300")}
                                animate={s.status === 'active' ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

export const PaperZoomControls: React.FC<PaperZoomControlsProps> = ({ onZoomIn, onZoomOut, onReset }) => (<div className="fixed bottom-24 right-8 z-[100] flex flex-col gap-2"><div className="bg-white border-2 border-ink shadow-hard rounded-lg overflow-hidden flex flex-col"><button onClick={onZoomIn} className="p-2 hover:bg-zinc-100 border-b border-zinc-200"><ZoomIn size={18} /></button><button onClick={onReset} className="p-2 hover:bg-zinc-100 border-b border-zinc-200"><Maximize size={18}/></button><button onClick={onZoomOut} className="p-2 hover:bg-zinc-100"><ZoomOut size={18} /></button></div></div>);

// --- 1. Observability Dashboard ---
export const PaperObservabilityDashboard: React.FC<PaperObservabilityDashboardProps> = ({ traces, metrics }) => {
    return (
        <div className="p-8 h-full overflow-hidden flex flex-col gap-6">
            <h2 className="font-serif font-black text-4xl mb-2">System Telemetry</h2>
            
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border-2 border-ink p-4 shadow-hard">
                    <div className="flex justify-between items-center text-xs font-bold uppercase text-zinc-400 mb-2"><span>Total Tokens</span> <Cpu size={14}/></div>
                    <div className="font-mono text-2xl font-bold">{metrics.totalTokens.toLocaleString()}</div>
                </div>
                <div className="bg-white border-2 border-ink p-4 shadow-hard">
                    <div className="flex justify-between items-center text-xs font-bold uppercase text-zinc-400 mb-2"><span>Est. Cost</span> <span className="text-emerald-500">$</span></div>
                    <div className="font-mono text-2xl font-bold">${metrics.estCost.toFixed(4)}</div>
                </div>
                <div className="bg-white border-2 border-ink p-4 shadow-hard">
                    <div className="flex justify-between items-center text-xs font-bold uppercase text-zinc-400 mb-2"><span>Avg Latency</span> <Clock size={14}/></div>
                    <div className="font-mono text-2xl font-bold">{Math.round(metrics.avgLatency || 1200)}ms</div>
                </div>
                <div className="bg-white border-2 border-ink p-4 shadow-hard">
                     <div className="flex justify-between items-center text-xs font-bold uppercase text-zinc-400 mb-2"><span>Status</span> <Activity size={14}/></div>
                     <div className="flex items-center gap-2">
                         <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"/>
                         <span className="font-bold">OPERATIONAL</span>
                     </div>
                </div>
            </div>

            {/* Trace List */}
            <div className="flex-1 bg-zinc-900 border-2 border-ink rounded-lg flex flex-col overflow-hidden text-zinc-400 font-mono text-xs">
                <div className="flex items-center gap-4 p-3 border-b border-zinc-800 bg-black text-zinc-500 font-bold uppercase tracking-wider">
                    <div className="w-24">Timestamp</div>
                    <div className="w-32">Status</div>
                    <div className="flex-1">Trace / Span Name</div>
                    <div className="w-24 text-right">Duration</div>
                    <div className="w-24 text-right">Cost</div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {traces.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 gap-4">
                            <Activity size={48} />
                            <p>No active traces captured.</p>
                        </div>
                    ) : (
                        traces.map(t => (
                            <div key={t.id} className="flex items-center gap-4 p-3 hover:bg-zinc-800 border-b border-zinc-800/50 transition-colors">
                                <div className="w-24 text-zinc-500">{new Date(t.startTime).toLocaleTimeString()}</div>
                                <div className="w-32">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] uppercase font-bold text-black",
                                        t.status === 'success' ? "bg-emerald-500" : 
                                        t.status === 'error' ? "bg-red-500" : "bg-amber-500"
                                    )}>
                                        {t.status}
                                    </span>
                                </div>
                                <div className="flex-1 truncate text-zinc-300">
                                    <span className="text-zinc-500 mr-2">[{t.type.toUpperCase()}]</span>
                                    {t.name}
                                </div>
                                <div className="w-24 text-right text-zinc-500">
                                    {t.endTime ? `${t.endTime - t.startTime}ms` : '...'}
                                </div>
                                <div className="w-24 text-right text-zinc-500">
                                    {t.cost ? `$${t.cost.toFixed(5)}` : '-'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// --- 2. Data Dictionary ---
export const PaperDataDictionary: React.FC<PaperDataDictionaryProps> = ({ schemas, projectVersion }) => {
    return (
        <div className="p-8 h-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="font-serif font-black text-4xl mb-2">Schema Registry</h2>
                    <p className="font-mono text-zinc-500">Project Version: v{projectVersion}</p>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white border-2 border-ink px-3 py-1.5 font-bold text-sm hover:bg-zinc-50 flex items-center gap-2"><Filter size={14}/> Filter</button>
                    <button className="bg-ink text-white px-3 py-1.5 font-bold text-sm hover:bg-zinc-800 flex items-center gap-2"><Download size={14}/> Export SQL</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-8">
                {schemas.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 rounded-lg text-zinc-400">
                        <Database size={48} className="mb-4 opacity-50"/>
                        <p className="font-bold">No Schema Defined Yet</p>
                        <p className="text-sm">Run the Data Architect agent to populate this registry.</p>
                    </div>
                ) : (
                    schemas.map((table, idx) => (
                        <div key={idx} className="bg-white border-2 border-ink shadow-hard rounded overflow-hidden">
                            <div className="bg-zinc-50 px-4 py-3 border-b-2 border-ink flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-amber-100 border border-amber-300 text-amber-700 rounded"><Table size={16}/></div>
                                    <div>
                                        <h3 className="font-mono font-bold text-lg">{table.name}</h3>
                                        <div className="text-xs text-zinc-500 font-mono">Module: <span className="text-ink font-bold">{table.module || 'Core'}</span></div>
                                    </div>
                                </div>
                                <div className="text-xs font-mono text-zinc-400">{table.fields.length} Columns</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left font-mono text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-200 bg-zinc-50/50 text-xs uppercase text-zinc-500">
                                            <th className="px-4 py-2 font-bold w-48">Column</th>
                                            <th className="px-4 py-2 font-bold w-32">Type</th>
                                            <th className="px-4 py-2 font-bold w-24">Attributes</th>
                                            <th className="px-4 py-2 font-bold">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {table.fields.map((field, fIdx) => (
                                            <tr key={fIdx} className="hover:bg-zinc-50">
                                                <td className="px-4 py-2 font-bold text-ink flex items-center gap-2">
                                                    {field.name}
                                                    {field.isKey && <Key size={12} className="text-amber-500 rotate-45"/>}
                                                </td>
                                                <td className="px-4 py-2 text-blue-600">{field.type}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex gap-1">
                                                        {field.required ? (
                                                            <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded font-bold">REQ</span>
                                                        ) : (
                                                            <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1 rounded font-bold">NULL</span>
                                                        )}
                                                        {field.isKey && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded font-bold">PK</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-zinc-500 text-xs italic">{field.description || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export const PaperInterruptOverlay: React.FC<PaperInterruptOverlayProps> = ({isOpen, interruptPayload, onResolve}) => {
    if (!isOpen || !interruptPayload) return null;
    return <div className="fixed inset-0 z-[200] bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white border-2 border-ink shadow-2xl max-w-2xl w-full rounded-lg overflow-hidden flex flex-col"><div className="bg-amber-500 text-white p-4 flex items-center gap-3"><ShieldAlert size={24} /><div><h2 className="font-serif font-black text-xl">INTERRUPT</h2><p className="text-xs font-bold uppercase">Human Review Required</p></div></div><div className="p-8"><h3 className="font-bold text-lg mb-2">@{interruptPayload.node.toUpperCase()}</h3><p className="text-zinc-600 bg-zinc-50 p-4 border rounded">{interruptPayload.message}</p></div><div className="p-4 bg-zinc-50 border-t-2 border-ink flex justify-end"><PaperReviewFooter onApprove={()=>onResolve('Approved')} onReject={(f)=>onResolve(f)}/></div></div></div>;
};

// --- Updated: Parallel Thinking Overlay ---
export const PaperThinkingOverlay: React.FC<PaperThinkingOverlayProps> = ({ agentActivity }) => {
    const activeAgents = Object.entries(agentActivity);

    return (
        <AnimatePresence>
            {activeAgents.length > 0 && (
                <motion.div
                    key="overlay"
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-36 left-1/2 -translate-x-1/2 z-[110] flex flex-col gap-2 min-w-[300px] pointer-events-none"
                >
                    {/* Header Ppill */}
                    <div className="self-center bg-black/90 backdrop-blur text-white px-4 py-1.5 rounded-full border border-zinc-700 shadow-lg flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Active Process</span>
                    </div>

                    {/* Agent Cards */}
                    {activeAgents.map(([agentId, activity]) => (
                        <motion.div
                            key={agentId}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-white/95 backdrop-blur border-2 border-ink shadow-[4px_4px_0px_rgba(0,0,0,0.1)] rounded-lg p-3 flex items-center gap-4 relative overflow-hidden"
                        >
                            {/* Visual Indicator */}
                            <div className="relative shrink-0">
                                <div className="w-8 h-8 bg-zinc-100 rounded-md border border-zinc-200 flex items-center justify-center">
                                    <Bot size={16} className="text-zinc-600" />
                                </div>
                                <div className={cn(
                                    "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white",
                                    activity.status === 'thinking' ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
                                )} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="text-[10px] font-bold uppercase text-ink tracking-wider">{agentId} AGENT</span>
                                    <span className="text-[9px] font-mono text-zinc-400 uppercase">{activity.status}</span>
                                </div>
                                <p className="font-mono text-xs text-zinc-600 truncate">{activity.message}</p>
                            </div>

                            {/* Progress Bar (Fake but enticing) */}
                            {activity.status === 'thinking' && (
                                <motion.div 
                                    className="absolute bottom-0 left-0 h-[2px] bg-amber-400"
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                />
                            )}
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export const PaperPromptGuidance: React.FC<PaperPromptGuidanceProps> = ({ isOpen, originalPrompt, optimizedPrompt, reasoning, onAccept }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] bg-zinc-900/50 backdrop-blur-sm flex items-end justify-center pb-24 pointer-events-none">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-ink shadow-hard p-6 max-w-xl w-full mx-4 rounded-lg pointer-events-auto"
            >
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg"><Sparkles size={24}/></div>
                    <div>
                        <h3 className="font-bold text-lg">Prompt Enhancement Available</h3>
                        <p className="text-xs text-zinc-500 mt-1">{reasoning}</p>
                    </div>
                </div>
                <div className="bg-zinc-50 p-3 rounded border border-zinc-200 mb-4">
                    <div className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Proposed Optimization</div>
                    <p className="font-mono text-xs text-ink">{optimizedPrompt}</p>
                </div>
                <div className="flex justify-end gap-2">
                    <PaperButton variant="ghost" size="sm" onClick={() => {}}>Dismiss</PaperButton>
                    <PaperButton variant="secondary" size="sm" onClick={onAccept} icon={<Sparkles size={14}/>}>Apply & Ignite</PaperButton>
                </div>
            </motion.div>
        </div>
    );
};

export const PaperConsole: React.FC<PaperConsoleProps> = ({ isOpen, onClose, logs }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed bottom-0 left-0 right-0 h-64 bg-zinc-900 text-zinc-400 font-mono text-xs z-[200] border-t-2 border-ink flex flex-col shadow-2xl">
            <div className="flex justify-between items-center px-4 py-2 bg-black border-b border-zinc-800">
                <span className="font-bold flex items-center gap-2"><Terminal size={14} /> SYSTEM CONSOLE</span>
                <button onClick={onClose}><X size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {logs.map(log => (
                    <div key={log.id} className="flex gap-3 hover:bg-zinc-800/50 px-2 rounded">
                        <span className="text-zinc-600 shrink-0">{log.timestamp}</span>
                        <span className={cn(
                            "font-bold shrink-0 w-24 uppercase text-[10px] pt-0.5",
                            log.type === 'error' ? "text-red-500" :
                            log.type === 'success' ? "text-emerald-500" :
                            log.type === 'warning' ? "text-amber-500" : "text-blue-500"
                        )}>{log.source}</span>
                        <span className="text-zinc-300">{log.message}</span>
                    </div>
                ))}
                <div className="h-4" /> {/* Spacer */}
            </div>
        </div>
    );
};

// --- 3. Blueprint Library ---
export const PaperBlueprintLibrary: React.FC<PaperBlueprintLibraryProps> = ({ blueprints, onLoad, onDelete }) => {
    return (
        <div className="p-8 h-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="font-serif font-black text-4xl mb-2">Architecture Templates</h2>
                    <p className="text-zinc-500">Jumpstart your project with pre-validated patterns.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-8">
                {blueprints.map(bp => (
                    <div key={bp.id} className="bg-zinc-900 text-white rounded-lg p-6 shadow-hard flex flex-col group relative overflow-hidden">
                        {/* Tech Background Pattern */}
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
                        
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-zinc-800 rounded-lg border border-zinc-700 text-accent">
                                    <Box size={24}/>
                                </div>
                                <div className="flex gap-2">
                                    {bp.tags.map(t => (
                                        <span key={t} className="text-[10px] font-bold uppercase bg-zinc-800 px-2 py-1 rounded text-zinc-400">{t}</span>
                                    ))}
                                </div>
                            </div>
                            
                            <h3 className="font-bold text-xl mb-2 group-hover:text-accent transition-colors">{bp.name}</h3>
                            <p className="text-sm text-zinc-400 mb-6 flex-1">{bp.description}</p>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                                <div className="text-xs text-zinc-500 font-mono flex gap-3">
                                    <span className="flex items-center gap-1"><Layers size={12}/> {bp.stageCount} Stages</span>
                                    <span className="flex items-center gap-1"><Activity size={12}/> {bp.status}</span>
                                </div>
                                <button 
                                    onClick={() => onLoad(bp.id)}
                                    className="bg-white text-black px-4 py-2 font-bold text-sm rounded hover:bg-accent hover:text-white transition-colors flex items-center gap-2"
                                >
                                    Use Template <ArrowRight size={14}/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 4. Changelog ---
// Updated to consume high-frequency activity feed
export const PaperChangelog: React.FC<PaperChangelogProps> = ({ activityFeed, commits }) => {
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [activityFeed]);

    return (
        <div className="p-8 h-full flex flex-col gap-8">
            <div>
                <h2 className="font-serif font-black text-4xl mb-2">System Pulse</h2>
                <p className="text-zinc-500">Live consolidated stream of all agent activities.</p>
            </div>
            
            {/* Live Feed Container */}
            <div className="flex-1 bg-zinc-900 border-2 border-ink rounded-lg shadow-hard overflow-hidden flex flex-col">
                <div className="bg-black px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-zinc-400 flex items-center gap-2">
                        <Activity size={14} className="text-accent animate-pulse"/> Live Stream
                    </span>
                    <span className="text-[10px] font-mono text-zinc-600">Buffer: 50/50</span>
                </div>
                
                <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                    {activityFeed.length === 0 && (
                        <div className="text-zinc-600 italic text-center mt-10">Waiting for signal...</div>
                    )}
                    {activityFeed.map((item, i) => (
                        <motion.div 
                            key={`${item.timestamp}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-4 items-start"
                        >
                            <span className="text-zinc-600 shrink-0 min-w-[60px]">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                            </span>
                            <span className={cn(
                                "font-bold uppercase tracking-wider shrink-0 min-w-[80px]",
                                item.agentId === 'prd' ? "text-blue-400" : 
                                item.agentId === 'data' ? "text-amber-400" :
                                item.agentId === 'logic' ? "text-purple-400" : "text-zinc-400"
                            )}>
                                {item.agentId}
                            </span>
                            <span className="text-zinc-300 break-words whitespace-pre-wrap">
                                {item.status === 'thinking' ? (
                                    <span className="text-zinc-500 italic flex items-center gap-2">
                                        Thinking: {item.delta}
                                    </span>
                                ) : (
                                    item.delta
                                )}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Commits Section */}
            <div className="h-1/3 bg-white border-2 border-ink rounded-lg p-4 overflow-y-auto">
                <h3 className="font-bold text-sm uppercase text-zinc-500 mb-4 sticky top-0 bg-white">Version History</h3>
                <div className="space-y-4 border-l-2 border-zinc-200 ml-2 pl-4">
                    {commits.map((commit) => (
                        <div key={commit.id} className="relative">
                            <div className="absolute -left-[21px] top-1 w-3 h-3 bg-white border-2 border-ink rounded-full" />
                            <div className="text-sm font-bold">{commit.message}</div>
                            <div className="text-xs text-zinc-400 font-mono">{commit.timestamp} • {commit.author}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const PaperUserMenu: React.FC<PaperUserMenuProps> = ({ projects, favorites, onDeleteProject }) => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
                 {/* Projects List */}
                 <div className="mb-8">
                     <h3 className="font-bold text-xs uppercase text-zinc-500 mb-4 px-2">Recent Projects</h3>
                     <div className="space-y-1">
                         {projects.map(p => (
                             <div key={p.id} className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded group">
                                 <div>
                                     <div className="font-bold text-sm">{p.name}</div>
                                     <div className="text-xs text-zinc-400">{p.date} • {p.id}</div>
                                 </div>
                                 <button onClick={() => onDeleteProject([p.id])} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-red-500"><Trash2 size={14}/></button>
                             </div>
                         ))}
                     </div>
                 </div>

                 {/* Favorites */}
                 <div>
                     <h3 className="font-bold text-xs uppercase text-zinc-500 mb-4 px-2">Saved Prompts</h3>
                     <div className="grid gap-3">
                         {favorites.map(f => (
                             <div key={f.id} className="border-2 border-zinc-200 p-3 rounded hover:border-ink cursor-pointer transition-colors">
                                 <div className="flex justify-between items-center mb-2">
                                     <span className="font-bold text-sm">{f.name}</span>
                                     <Star size={12} className="text-amber-400 fill-current"/>
                                 </div>
                                 <p className="text-xs text-zinc-500 line-clamp-2">{f.promptSnippet}</p>
                             </div>
                         ))}
                     </div>
                 </div>
            </div>
            
            <div className="pt-4 border-t border-zinc-200 mt-4">
                <button className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-sm font-bold rounded">Sign Out</button>
            </div>
        </div>
    );
};

export const PaperDeleteConfirmationModal: React.FC<PaperDeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, description }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white border-2 border-ink p-6 max-w-md w-full shadow-2xl rounded-lg animate-in fade-in zoom-in duration-200">
                <h3 className="font-serif font-black text-2xl mb-2 text-red-600">{title}</h3>
                <p className="text-zinc-600 mb-6 text-sm">{description}</p>
                <div className="flex justify-end gap-3">
                    <PaperButton variant="secondary" onClick={onClose}>Cancel</PaperButton>
                    <PaperButton variant="danger" onClick={onConfirm}>Confirm Delete</PaperButton>
                </div>
            </div>
        </div>
    );
};

export const PaperViewToggle: React.FC<PaperViewToggleProps> = ({ icon, onClick, isActive }) => <button onClick={onClick} className={cn("p-2 rounded border-2 shadow-sm transition-all", isActive ? "bg-ink border-ink text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-ink hover:text-ink")}>{icon}</button>;

export const PaperArtefactBadge: React.FC<PaperArtefactBadgeProps> = ({ type, label, onClick }) => {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="group flex items-center gap-2 bg-white border-2 border-ink shadow-hard px-3 py-1.5 rounded-full hover:scale-105 transition-transform active:scale-95"
        >
            <div className={cn(
                "p-1 rounded-full text-white",
                type === 'code' ? "bg-blue-600" :
                type === 'schema' ? "bg-amber-600" :
                type === 'config' ? "bg-purple-600" : "bg-zinc-600"
            )}>
                {type === 'code' ? <FileCode size={12} /> :
                 type === 'schema' ? <Database size={12} /> : <FileText size={12} />}
            </div>
            <span className="text-xs font-bold text-ink max-w-[100px] truncate">{label}</span>
        </button>
    );
}

// --- 5. Paper Metadata Ribbon ---
export const PaperMetadataRibbon: React.FC<PaperMetadataRibbonProps> = ({ isOpen, onToggle, title, children, footer }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 400, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="h-full bg-white border-l-2 border-ink shadow-2xl z-20 flex flex-col shrink-0 overflow-hidden"
                >
                    <div className="w-[400px] flex flex-col h-full">
                        <div className="p-4 border-b-2 border-ink bg-zinc-50 flex items-center justify-between">
                            <h3 className="font-serif font-bold text-xl">{title}</h3>
                            <button onClick={onToggle} className="p-2 hover:bg-zinc-200 rounded-full"><X size={18} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                            {children}
                        </div>
                        {footer && (
                            <div className="p-4 border-t-2 border-ink bg-zinc-50">
                                {footer}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export const PaperTaskTree: React.FC<PaperTaskTreeProps> = ({ seed, onComplete }) => {
    // Simulated decomposition visualizer
    const [progress, setProgress] = useState(0);
    
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(interval);
                    setTimeout(onComplete, 500);
                    return 100;
                }
                return p + 2;
            });
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center justify-center h-full bg-surface/90 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white border-2 border-ink shadow-hard p-8 rounded-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-serif font-black text-2xl">Decomposing...</h3>
                    <div className="text-4xl font-mono font-bold text-zinc-200">{progress}%</div>
                </div>
                
                <div className="space-y-3 font-mono text-sm">
                    <div className={cn("flex items-center gap-3", progress > 20 ? "text-ink" : "text-zinc-300")}>
                        {progress > 20 ? <CheckCircle size={16} className="text-emerald-500" /> : <Circle size={16} />}
                        <span>Analyzing Requirements</span>
                    </div>
                    <div className={cn("flex items-center gap-3", progress > 50 ? "text-ink" : "text-zinc-300")}>
                        {progress > 50 ? <CheckCircle size={16} className="text-emerald-500" /> : <Circle size={16} />}
                        <span>Generating Stage Graph</span>
                    </div>
                    <div className={cn("flex items-center gap-3", progress > 80 ? "text-ink" : "text-zinc-300")}>
                        {progress > 80 ? <CheckCircle size={16} className="text-emerald-500" /> : <Circle size={16} />}
                        <span>Seeding Context Context</span>
                    </div>
                </div>

                <div className="mt-8 h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                    <motion.div 
                        className="h-full bg-ink"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

// --- 6. Bottom Dock ---
export const PaperBottomDock: React.FC<PaperBottomDockProps> = ({ 
    isOpen, onToggle, activeTab, onTabChange, 
    stages, artefacts, logs, commits, onDownload, onDownloadAll, 
    isSimulationRunning, isGraphPaused, isManualPaused, onTogglePause, 
    onStartSimulation, onStopSimulation, checkpoints, activeAgent, onRollback,
    interruptPayload, onResolveInterrupt
}) => {
    return (
        <motion.div 
            initial={{ y: "calc(100% - 48px)" }}
            animate={{ y: isOpen ? 0 : "calc(100% - 48px)" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-ink shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-[140] flex flex-col max-h-[400px]"
        >
            {/* Dock Header/Handle */}
            <div 
                onClick={() => onToggle(!isOpen)}
                className="h-12 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between px-6 cursor-pointer hover:bg-zinc-100 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500">
                        <TerminalSquare size={16} /> System Dock
                    </div>
                    {/* Status Pill */}
                    <div className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-2",
                        isSimulationRunning ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-zinc-100 text-zinc-500 border-zinc-300"
                    )}>
                        <div className={cn("w-2 h-2 rounded-full", isSimulationRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
                        {isSimulationRunning ? (isGraphPaused || isManualPaused ? "PAUSED" : "RUNNING") : "IDLE"}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Dock Tabs */}
                    <div className="flex mr-4 bg-zinc-200 p-1 rounded gap-1" onClick={e => e.stopPropagation()}>
                        {[
                            { id: 'artifacts', label: 'Artifacts', icon: <FileText size={14}/> },
                            { id: 'logs', label: 'Logs', icon: <List size={14}/> },
                            { id: 'graph', label: 'Controls', icon: <Workflow size={14}/> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id as any)}
                                className={cn(
                                    "px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all",
                                    activeTab === tab.id ? "bg-white text-ink shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                                )}
                            >
                                {tab.icon}{tab.label}
                            </button>
                        ))}
                    </div>
                    {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>
            </div>

            {/* Dock Content */}
            <div className="flex-1 overflow-hidden flex bg-zinc-50/50">
                {activeTab === 'artifacts' && (
                    <div className="flex-1 p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-sm">Generated Artifacts ({artefacts.length})</h4>
                            <PaperButton size="sm" variant="secondary" onClick={onDownloadAll} icon={<Download size={14}/>}>Download All</PaperButton>
                        </div>
                        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-2">
                            {artefacts.map(art => (
                                <div key={art.id} className="bg-white border border-zinc-200 p-3 rounded shadow-sm flex items-center gap-3 group hover:border-ink transition-colors">
                                    <div className={cn(
                                        "w-8 h-8 rounded flex items-center justify-center shrink-0",
                                        art.type === 'code' ? "bg-blue-100 text-blue-600" : "bg-zinc-100 text-zinc-500"
                                    )}>
                                        {art.type === 'code' ? <FileCode size={16}/> : <FileText size={16}/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-mono text-xs font-bold truncate">{art.label}</div>
                                        <div className="text-[10px] text-zinc-400 uppercase">{art.sourceStageId}</div>
                                    </div>
                                    <button onClick={() => onDownload(art)} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-ink"><Download size={14}/></button>
                                </div>
                            ))}
                            {artefacts.length === 0 && <div className="col-span-full text-center text-zinc-400 py-8 text-sm italic">No artifacts generated yet. Run the simulation.</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="flex-1 flex flex-col font-mono text-xs">
                         <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-2 flex font-bold text-zinc-500 uppercase tracking-wider text-[10px]">
                             <span className="w-24">Time</span>
                             <span className="w-32">Source</span>
                             <span className="flex-1">Message</span>
                         </div>
                         <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
                             {logs.map(log => (
                                 <div key={log.id} className="flex gap-4 px-2 py-1 hover:bg-zinc-50 rounded">
                                     <span className="text-zinc-400 w-24 shrink-0">{log.timestamp}</span>
                                     <span className={cn(
                                         "w-32 shrink-0 font-bold",
                                         log.type === 'error' ? "text-red-600" : log.type === 'success' ? "text-emerald-600" : "text-blue-600"
                                     )}>{log.source}</span>
                                     <span className="text-zinc-700">{log.message}</span>
                                 </div>
                             ))}
                         </div>
                    </div>
                )}

                {activeTab === 'graph' && (
                    <div className="flex-1 p-6 flex gap-8">
                        {/* Simulation Controls */}
                        <div className="w-64 flex flex-col gap-4 border-r border-zinc-200 pr-8">
                            <h4 className="font-bold text-sm uppercase text-zinc-500">Simulation Control</h4>
                            <div className="flex gap-2">
                                {!isSimulationRunning ? (
                                    <PaperButton onClick={onStartSimulation} className="flex-1 bg-emerald-600 border-emerald-800 text-white" icon={<Play size={16}/>}>Start Run</PaperButton>
                                ) : (
                                    <PaperButton onClick={onStopSimulation} className="flex-1" variant="danger" icon={<CircleStop size={16}/>}>Stop</PaperButton>
                                )}
                                <PaperButton onClick={onTogglePause} disabled={!isSimulationRunning} variant="secondary" icon={<Pause size={16}/>}>
                                    {isManualPaused ? "Resume" : "Pause"}
                                </PaperButton>
                            </div>
                            
                            {/* Active State */}
                            {activeAgent && (
                                <div className="bg-zinc-100 p-3 rounded border border-zinc-200">
                                    <div className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Active Worker</div>
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin text-accent" />
                                        <span className="font-bold text-sm">{activeAgent}</span>
                                    </div>
                                </div>
                            )}

                            {/* Interrupt Resolver */}
                            {interruptPayload && (
                                <div className="bg-amber-50 p-3 rounded border border-amber-200 animate-pulse">
                                    <div className="text-[10px] font-bold uppercase text-amber-600 mb-2 flex items-center gap-1"><AlertTriangle size={12}/> Interaction Required</div>
                                    <div className="text-xs mb-3">{interruptPayload.message}</div>
                                    <div className="flex gap-2">
                                        <button onClick={() => onResolveInterrupt('Approved')} className="flex-1 bg-amber-500 text-white text-xs font-bold py-1 rounded">Approve</button>
                                        <button onClick={() => onResolveInterrupt('Rejected')} className="flex-1 bg-white border border-amber-300 text-amber-700 text-xs font-bold py-1 rounded">Reject</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Checkpoints / Time Travel */}
                        <div className="flex-1 flex flex-col">
                             <h4 className="font-bold text-sm uppercase text-zinc-500 mb-4">State Checkpoints (Time Travel)</h4>
                             <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                 {checkpoints.map((cp, i) => (
                                     <div key={cp.id} className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded hover:border-ink group">
                                         <div className="flex items-center gap-3">
                                             <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 border border-zinc-300">
                                                 {i + 1}
                                             </div>
                                             <div>
                                                 <div className="font-bold text-sm">{cp.agent}</div>
                                                 <div className="text-xs text-zinc-400">{new Date(cp.timestamp).toLocaleTimeString()}</div>
                                             </div>
                                         </div>
                                         <button 
                                            onClick={() => onRollback(cp.id)}
                                            className="text-xs font-bold bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-ink hover:text-white flex items-center gap-2"
                                         >
                                             <History size={12}/> Rollback
                                         </button>
                                     </div>
                                 ))}
                                 {checkpoints.length === 0 && <div className="text-zinc-400 text-sm italic">No checkpoints created yet.</div>}
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
