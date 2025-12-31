import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Brain, Layers, ArrowRight } from 'lucide-react';
import { useAppStore, AVAILABLE_MODELS } from '../../../store';
import { PaperSelect, cn } from '../../../PaperComponents';
import { AgentTierConfig } from '../../../types';

export const IntelligenceSection: React.FC = () => {
    const { projectSettings, updateAgentTier } = useAppStore();
    const tiers = projectSettings.agentTiers || [];

    const handleModelChange = (tierId: string, modelId: string) => {
        const model = AVAILABLE_MODELS.find(m => m.id === modelId);
        if (model) {
            updateAgentTier(tierId, { model: modelId, provider: model.provider });
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-8 h-full min-h-[500px]"
        >
            {/* Left: Signal Tower (Visualizer) */}
            <div className="w-16 flex flex-col items-center py-4 gap-1 border-r-2 border-dashed border-zinc-200">
                <div className="text-[10px] font-bold writing-vertical-rl rotate-180 text-zinc-300 tracking-widest uppercase mb-4">Signal Hierarchy</div>
                {tiers.map((tier, i) => (
                    <React.Fragment key={tier.id}>
                        <div className={cn(
                            "w-3 h-12 rounded-full transition-all duration-500",
                            tier.model.includes('gpt-4') || tier.model.includes('opus') ? "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" :
                            tier.model.includes('gemini') ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-zinc-300"
                        )} />
                        {i < tiers.length - 1 && <div className="w-px h-8 bg-zinc-200" />}
                    </React.Fragment>
                ))}
            </div>

            {/* Right: Tier Configuration */}
            <div className="flex-1 space-y-6">
                <div className="flex justify-between items-end border-b-2 border-ink pb-4">
                    <div>
                        <h2 className="font-serif font-black text-2xl">Intelligence Map</h2>
                        <p className="text-sm text-zinc-500 font-mono">Configure the cognitive load for each architectural tier.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold uppercase text-zinc-400">Total Est. Cost</div>
                        <div className="font-mono text-xl font-bold">$0.042<span className="text-zinc-400 text-sm">/run</span></div>
                    </div>
                </div>

                <div className="space-y-4">
                    {tiers.map((tier) => (
                        <TierRow 
                            key={tier.id} 
                            tier={tier} 
                            onModelChange={(m) => handleModelChange(tier.id, m)} 
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const TierRow: React.FC<{ tier: AgentTierConfig; onModelChange: (modelId: string) => void }> = ({ tier, onModelChange }) => {
    const activeModel = AVAILABLE_MODELS.find(m => m.id === tier.model);

    return (
        <div className="bg-white border border-zinc-200 p-4 rounded-lg flex items-center gap-6 hover:shadow-md transition-shadow group">
            <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center border-2 shadow-sm shrink-0",
                tier.id === 'tier_0' ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-500"
            )}>
                {tier.id === 'tier_0' ? <Brain size={24} /> : 
                 tier.id === 'tier_1' ? <Zap size={24} /> : 
                 tier.id === 'tier_2' ? <Layers size={24} /> : <Cpu size={24} />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-sm uppercase tracking-wider">{tier.name}</h4>
                    <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded text-zinc-500 font-mono">{tier.id}</span>
                </div>
                <p className="text-xs text-zinc-400 truncate">{tier.description}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                    {tier.agents.map(a => (
                        <span key={a} className="text-[10px] border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-500 font-mono uppercase bg-zinc-50">{a}</span>
                    ))}
                    {tier.agents.length === 0 && <span className="text-[10px] text-zinc-300 italic">Orchestrator</span>}
                </div>
            </div>

            <div className="w-64">
                <PaperSelect 
                    options={AVAILABLE_MODELS.map(m => ({ 
                        label: `${m.name} (${m.costPer1k}/1k)`, 
                        value: m.id 
                    }))}
                    value={tier.model}
                    onChange={(e) => onModelChange(e.target.value)}
                />
            </div>

            <div className="w-24 text-right">
                 <div className="text-[10px] font-bold uppercase text-zinc-400">Context</div>
                 <div className="font-mono text-xs font-bold">{activeModel?.contextWindow}</div>
            </div>
        </div>
    );
};