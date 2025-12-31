
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Shield, ExternalLink, Check, Lock } from 'lucide-react';
import { PaperButton, PaperInput } from '../../../PaperComponents';
import { useAppStore } from '../../../store';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
    const { projectSettings, updateProjectSettings, hasUsedFreeTier, markFreeTierUsed, setToast } = useAppStore();
    
    const [googleKey, setGoogleKey] = useState(projectSettings.googleApiKey || '');
    const [openaiKey, setOpenaiKey] = useState(projectSettings.openaiApiKey || '');

    const handleSave = () => {
        if (!googleKey && !openaiKey) {
            setToast({ message: "At least one API key is required to proceed.", type: 'error' });
            return;
        }
        updateProjectSettings({ googleApiKey: googleKey, openaiApiKey: openaiKey });
        setToast({ message: "Security Credentials Updated", type: 'success' });
        onClose();
    };

    const handleFreeTier = () => {
        markFreeTierUsed();
        setToast({ message: "Trial Project Activated. Please configure keys for your next session.", type: 'info' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-zinc-900/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border-2 border-ink shadow-2xl w-full max-w-lg rounded-lg overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="bg-zinc-50 border-b-2 border-ink p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-ink text-white rounded-lg">
                            <Shield size={24} />
                        </div>
                        <h2 className="font-serif font-black text-2xl">Security Clearance</h2>
                    </div>
                    <p className="text-zinc-600 text-sm">
                        To access the autonomous agent network, you must provide your own API credentials. Your keys are stored locally in your browser.
                    </p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    
                    {/* Google Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"/> Google Gemini API Key
                            </label>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                Get Key <ExternalLink size={10} />
                            </a>
                        </div>
                        <PaperInput 
                            type="password" 
                            placeholder="AIzaSy..." 
                            value={googleKey}
                            onChange={(e) => setGoogleKey(e.target.value)}
                            className="font-mono text-xs"
                        />
                    </div>

                    {/* OpenAI Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"/> OpenAI API Key
                            </label>
                            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[10px] text-green-600 hover:underline flex items-center gap-1">
                                Get Key <ExternalLink size={10} />
                            </a>
                        </div>
                        <PaperInput 
                            type="password" 
                            placeholder="sk-..." 
                            value={openaiKey}
                            onChange={(e) => setOpenaiKey(e.target.value)}
                            className="font-mono text-xs"
                        />
                    </div>

                    {/* Free Tier Option */}
                    {!hasUsedFreeTier && (
                        <div className="bg-zinc-50 border border-zinc-200 p-3 rounded flex items-start gap-3">
                            <div className="p-1 bg-zinc-200 rounded-full mt-0.5"><Key size={14} className="text-zinc-500"/></div>
                            <div>
                                <h4 className="font-bold text-sm">One-Time Trial Access</h4>
                                <p className="text-xs text-zinc-500 mb-2">You can launch one project using the system's demo credits.</p>
                                <button onClick={handleFreeTier} className="text-xs font-bold text-ink underline decoration-dashed hover:text-accent">
                                    Activate Trial Session
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-zinc-50 border-t-2 border-ink flex justify-between items-center">
                    <div className="flex items-center gap-2 text-zinc-400 text-[10px] uppercase font-bold">
                        <Lock size={12} /> Local Encryption
                    </div>
                    <PaperButton onClick={handleSave} icon={<Check size={16}/>}>
                        Authenticate
                    </PaperButton>
                </div>
            </motion.div>
        </div>
    );
};
