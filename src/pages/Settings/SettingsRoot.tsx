
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Cpu, HardDrive, X } from 'lucide-react';
import { PaperTabs, PaperButton } from '../../../PaperComponents';
import { SettingsRibbon } from '../../components/Paper/SettingsRibbon';
import { ProfileSection } from './ProfileSection';
import { IntelligenceSection } from './IntelligenceSection';
import { ExportSection } from './ExportSection';
import { useAppStore } from '../../../store';

interface SettingsRootProps {
    onClose: () => void;
}

export const SettingsRoot: React.FC<SettingsRootProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const { userProfile } = useAppStore();

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header / Ribbon */}
            <div className="bg-zinc-50 border-b-2 border-ink">
                <SettingsRibbon />
                <div className="flex items-center justify-between px-6 py-4">
                    <h1 className="font-serif font-black text-2xl flex items-center gap-3">
                        System Configuration 
                        <span className="text-zinc-400 font-sans text-lg font-medium hidden sm:inline-block">
                            / {userProfile.name}
                        </span>
                    </h1>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="px-6">
                    <PaperTabs 
                        activeTab={activeTab}
                        onChange={setActiveTab}
                        tabs={[
                            { id: 'profile', label: 'Identity & Session', icon: <User size={16} /> },
                            { id: 'intelligence', label: 'Models & Intelligence', icon: <Cpu size={16} /> },
                            { id: 'export', label: 'Data Management', icon: <HardDrive size={16} /> }
                        ]}
                        className="border-none"
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-surface/30">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {activeTab === 'profile' && <ProfileSection />}
                        {activeTab === 'intelligence' && <IntelligenceSection />}
                        {activeTab === 'export' && <ExportSection />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
