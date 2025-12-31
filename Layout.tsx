
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings, 
  Box, 
  Database, 
  Menu, 
  X,
  Cpu,
  TerminalSquare
} from 'lucide-react';
import { PaperModal, PaperUserMenu } from './PaperComponents';
import { RecentProject } from './types';
import { useAppStore } from './store';

interface LayoutProps {
  children: React.ReactNode;
  isCanvasMode?: boolean;
  onNavigate?: (view: string) => void;
  currentView?: string;
  // New props for User Menu data management
  projects?: RecentProject[];
  onDeleteProject?: (ids: string[]) => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, 
    isCanvasMode = false, 
    onNavigate, 
    currentView = 'board',
    projects = [],
    onDeleteProject = () => {}
}) => {
  const { userProfile } = useAppStore();
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // Default to collapsed, expand on hover
  const isSidebarOpen = isSidebarHovered;

  const navItems = [
    { id: 'board', icon: <LayoutDashboard size={20} />, label: 'Architecture Board' },
    { id: 'blueprints', icon: <Box size={20} />, label: 'Blueprints' },
    { id: 'data', icon: <Database size={20} />, label: 'Data Dictionary' },
    { id: 'agents', icon: <Cpu size={20} />, label: 'Agents' },
    { id: 'logs', icon: <TerminalSquare size={20} />, label: 'Change Logs' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const mockFavorites = [
      { id: '1', name: 'System Architect Master', promptSnippet: 'Act as a Senior System Architect. Design a highly scalable, fault-tolerant system...' },
      { id: '2', name: 'Database Normalizer', promptSnippet: 'Analyze this schema and normalize to 3NF. Identify potential bottlenecks...' },
      { id: '3', name: 'React Component Generator', promptSnippet: 'Create a reusable React component using Tailwind CSS and Radix UI...' }
  ];

  // Helper to generate initials from name
  const getInitials = (name: string) => {
      return name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
  };

  return (
    <div className="h-screen w-full bg-surface dot-matrix-bg text-ink font-sans overflow-hidden flex">
      {/* Sidebar */}
      <motion.aside 
        initial={{ width: 80 }}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className="h-full bg-white border-r-2 border-ink z-50 relative flex flex-col shadow-hard shrink-0 transition-all"
      >
        <div className="h-16 border-b-2 border-ink flex items-center px-4 justify-between bg-zinc-50 overflow-hidden whitespace-nowrap">
          <AnimatePresence mode='wait'>
            {isSidebarOpen ? (
              <motion.div 
                key="full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-serif font-black text-2xl tracking-tighter"
              >
                PARIT.
              </motion.div>
            ) : (
               <motion.div 
                key="short"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-serif font-black text-2xl tracking-tighter pl-1"
              >
                P.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 py-6 px-2 flex flex-col gap-2 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={`
                group flex items-center gap-3 px-3 py-3 w-full transition-all border-2
                ${currentView === item.id 
                  ? 'bg-ink text-white border-ink shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]' 
                  : 'bg-transparent text-zinc-600 border-transparent hover:border-ink hover:bg-zinc-50 hover:shadow-[2px_2px_0px_0px_#18181b]'}
              `}
            >
              <span className={`shrink-0 ${currentView === item.id ? 'text-accent' : 'text-current'}`}>{item.icon}</span>
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="font-medium whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t-2 border-ink bg-zinc-50 overflow-hidden whitespace-nowrap">
           <button 
                onClick={() => setIsUserMenuOpen(true)}
                className="flex items-center gap-3 w-full hover:bg-zinc-200 p-2 -ml-2 rounded-sm transition-colors text-left"
           >
              <div className="w-8 h-8 shrink-0 bg-accent border-2 border-ink rounded-full flex items-center justify-center font-bold text-ink text-xs shadow-sm">
                {getInitials(userProfile.name)}
              </div>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col min-w-0"
                >
                  <span className="text-sm font-bold truncate">{userProfile.name}</span>
                  <span className="text-xs text-zinc-500 font-mono truncate">{userProfile.role}</span>
                </motion.div>
              )}
           </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 h-full relative z-0 overflow-hidden ${isCanvasMode ? 'p-0' : 'p-8 overflow-y-auto'}`}>
        {children}
      </main>

      {/* User Profile Modal */}
      <PaperModal
          isOpen={isUserMenuOpen}
          onClose={() => setIsUserMenuOpen(false)}
          title="User Workspace"
          size="md"
      >
          <PaperUserMenu 
            projects={projects} 
            favorites={mockFavorites} 
            onDeleteProject={onDeleteProject}
          />
      </PaperModal>
    </div>
  );
};
