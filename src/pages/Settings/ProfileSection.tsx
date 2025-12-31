
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, RotateCcw, Fingerprint, Hash, AlertTriangle, CheckCircle, Edit2, Save, X } from 'lucide-react';
import { useAppStore } from '../../../store';
import { PaperButton, PaperCard, PaperInput } from '../../../PaperComponents';
import { cn } from '../../../PaperComponents';

const getApiBaseUrl = () => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://127.0.0.1:8787';
    }
    return '';
};

export const ProfileSection: React.FC = () => {
    const { projectSettings, rotateSession, userProfile, updateUserProfile } = useAppStore();
    const [healthStatus, setHealthStatus] = useState<'nominal' | 'degraded' | 'offline'>('nominal');
    const [latency, setLatency] = useState(0);
    
    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(userProfile);

    useEffect(() => {
        setFormData(userProfile);
    }, [userProfile]);

    useEffect(() => {
        const checkHealth = async () => {
            const start = Date.now();
            try {
                // Ping the supervisor (root endpoint typically returns status JSON)
                const res = await fetch(`${getApiBaseUrl()}/api/projects`, { method: 'OPTIONS' });
                if (res.ok) {
                    setHealthStatus('nominal');
                } else {
                    setHealthStatus('degraded');
                }
            } catch (e) {
                setHealthStatus('offline');
            }
            setLatency(Date.now() - start);
        };
        
        checkHealth();
        const interval = setInterval(checkHealth, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleSave = () => {
        updateUserProfile(formData);
        setIsEditing(false);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ID Card Aesthetic */}
                <PaperCard className="bg-zinc-50 border-ink relative overflow-hidden group transition-all">
                    {/* Background Decoration */}
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                        <Fingerprint size={120} />
                    </div>

                    {/* Edit Toggle */}
                    <div className="absolute top-4 right-4 z-20">
                        {isEditing ? (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsEditing(false)} 
                                    className="p-2 bg-white border-2 border-ink rounded-full hover:bg-zinc-100 text-zinc-500"
                                >
                                    <X size={14} />
                                </button>
                                <button 
                                    onClick={handleSave} 
                                    className="p-2 bg-emerald-500 border-2 border-emerald-700 rounded-full hover:bg-emerald-400 text-white shadow-sm"
                                >
                                    <Save size={14} />
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="p-2 bg-white border-2 border-ink rounded-full hover:bg-zinc-100 text-ink shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Edit2 size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col h-full justify-between relative z-10 min-h-[220px]">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">
                                <User size={14} /> Personnel Identity
                            </div>
                            
                            {isEditing ? (
                                <div className="space-y-3 mb-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <PaperInput 
                                        value={formData.name} 
                                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                        placeholder="Full Name"
                                        className="font-serif font-black text-xl"
                                    />
                                    <PaperInput 
                                        value={formData.role} 
                                        onChange={(e) => setFormData({...formData, role: e.target.value})} 
                                        placeholder="Role / Title"
                                        className="font-mono text-sm"
                                    />
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-3xl font-serif font-black mb-1 break-words">{userProfile.name}</h2>
                                    <p className="font-mono text-sm text-zinc-600">{userProfile.role}</p>
                                </>
                            )}
                        </div>

                        <div className="mt-8 pt-4 border-t-2 border-dashed border-zinc-200 font-mono text-xs text-zinc-500 space-y-2">
                            <div className="flex justify-between items-center h-8">
                                <span>CLEARANCE</span>
                                {isEditing ? (
                                    <input 
                                        className="w-32 bg-white border border-zinc-300 px-2 py-1 text-right font-bold text-ink outline-none focus:border-accent"
                                        value={formData.clearance}
                                        onChange={(e) => setFormData({...formData, clearance: e.target.value})}
                                    />
                                ) : (
                                    <span className="font-bold text-ink">{userProfile.clearance}</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center h-8">
                                <span>UNIT</span>
                                {isEditing ? (
                                    <input 
                                        className="w-32 bg-white border border-zinc-300 px-2 py-1 text-right font-bold text-ink outline-none focus:border-accent"
                                        value={formData.unit}
                                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                                    />
                                ) : (
                                    <span className="font-bold text-ink">{userProfile.unit}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </PaperCard>

                {/* Session Card */}
                <PaperCard className="relative">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">
                            <Hash size={14} /> Active Session
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-2 mb-6">
                            <div className="font-mono text-2xl font-bold text-ink break-all">
                                {projectSettings.id || "NO_ACTIVE_SESSION"}
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold uppercase tracking-wider">
                                {projectSettings.environment.toUpperCase()} ENVIRONMENT
                            </span>
                        </div>

                        <div className="pt-4 border-t-2 border-ink">
                            <PaperButton 
                                onClick={rotateSession} 
                                variant="secondary" 
                                className="w-full justify-center"
                                icon={<RotateCcw size={16} />}
                            >
                                Rotate Session ID
                            </PaperButton>
                            <p className="text-[10px] text-zinc-400 mt-2 text-center">
                                Triggers a new handshake with the Supervisor. Local state will be reset.
                            </p>
                        </div>
                    </div>
                </PaperCard>
            </div>
            
            {/* System Status Banner */}
            <div className={cn(
                "p-4 rounded-lg flex items-center justify-between shadow-hard transition-colors duration-300",
                healthStatus === 'nominal' ? "bg-zinc-900 text-white" :
                healthStatus === 'degraded' ? "bg-amber-900 text-white" : "bg-red-900 text-white"
            )}>
                <div className="flex items-center gap-3">
                    {healthStatus === 'nominal' ? <Shield size={20} className="text-emerald-400" /> : 
                     healthStatus === 'degraded' ? <AlertTriangle size={20} className="text-amber-400" /> :
                     <RotateCcw size={20} className="text-red-400 animate-spin" />}
                    
                    <div>
                        <h4 className="font-bold text-sm">
                            System Integrity: {healthStatus === 'nominal' ? 'Nominal' : healthStatus === 'degraded' ? 'Degraded' : 'Critical Failure'}
                        </h4>
                        <p className="text-xs text-zinc-400 font-mono">
                            {healthStatus === 'offline' ? 'Supervisor Unreachable.' : `All worker nodes operational. Latency ${latency}ms.`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className={cn("w-1 h-8 rounded-full", healthStatus === 'nominal' ? "bg-emerald-500/20" : "bg-red-500/20")}>
                            <div 
                                className={cn("w-full rounded-full animate-pulse", healthStatus === 'nominal' ? "bg-emerald-500" : "bg-red-500")} 
                                style={{ height: `${Math.random() * 100}%` }} 
                            />
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};
