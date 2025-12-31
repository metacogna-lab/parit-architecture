import React from 'react';
import { motion } from 'framer-motion';
import { Folder, FileText, Download, Trash2, Database, HardDrive, FileJson, FileCode } from 'lucide-react';
import { useAppStore } from '../../../store';
import { PaperButton, PaperDeleteConfirmationModal, cn } from '../../../PaperComponents';

export const ExportSection: React.FC = () => {
    const { artefacts, wipeProjectData, projectSettings } = useAppStore();
    const [isWipeModalOpen, setWipeModalOpen] = React.useState(false);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full gap-6"
        >
            <div className="bg-zinc-50 border-2 border-ink p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white border-2 border-ink rounded flex items-center justify-center">
                        <HardDrive size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Project Data (L3 Persistence)</h3>
                        <p className="text-xs text-zinc-500 font-mono">Managed via Cloudflare D1 & R2</p>
                    </div>
                </div>
                <PaperButton 
                    variant="danger" 
                    icon={<Trash2 size={16} />}
                    onClick={() => setWipeModalOpen(true)}
                >
                    Wipe All Data
                </PaperButton>
            </div>

            <div className="flex-1 border-2 border-ink rounded-lg flex flex-col overflow-hidden bg-white">
                <div className="bg-zinc-900 text-zinc-400 px-4 py-2 text-xs font-mono border-b border-zinc-800 flex justify-between">
                    <span>root/projects/{projectSettings.id}/artifacts/</span>
                    <span>{artefacts.length} objects</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                    {artefacts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-50">
                            <Database size={48} className="mb-4" />
                            <p>No artifacts in remote storage</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-1">
                            {artefacts.map((file) => (
                                <div key={file.id} className="flex items-center gap-3 p-2 hover:bg-zinc-50 rounded group cursor-default">
                                    <div className={cn(
                                        "w-8 h-8 flex items-center justify-center rounded",
                                        file.type === 'code' ? "bg-blue-100 text-blue-600" :
                                        file.type === 'schema' ? "bg-amber-100 text-amber-600" : "bg-zinc-100 text-zinc-500"
                                    )}>
                                        {file.type === 'code' ? <FileCode size={16} /> : 
                                         file.type === 'schema' ? <FileJson size={16} /> : <FileText size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-mono text-sm truncate">{file.label.replace(/\s+/g, '_').toLowerCase()}.{file.type === 'code' ? 'tsx' : 'md'}</div>
                                        <div className="text-[10px] text-zinc-400 uppercase">{file.sourceStageId} • 12KB</div>
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-zinc-200 rounded text-zinc-500 transition-opacity">
                                        <Download size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal (Mock Implementation reused if PaperDeleteConfirmationModal exists, else simple overlay) */}
            {isWipeModalOpen && (
                <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-ink p-6 max-w-md w-full shadow-2xl rounded-lg">
                        <h3 className="font-serif font-black text-2xl mb-2 text-red-600">CONFIRM WIPE</h3>
                        <p className="text-zinc-600 mb-6 text-sm">
                            This action will permanently delete all artifacts from R2 and drop all rows from D1 for this project ID. This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <PaperButton variant="secondary" onClick={() => setWipeModalOpen(false)}>Cancel</PaperButton>
                            <PaperButton variant="danger" onClick={() => { wipeProjectData(); setWipeModalOpen(false); }}>Yes, Delete Everything</PaperButton>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};