import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../../../PaperComponents';

export const SettingsRibbon: React.FC = () => {
    const [isOnline, setIsOnline] = useState(true);
    const [latency, setLatency] = useState(0);

    // Simulate connection check
    useEffect(() => {
        const interval = setInterval(() => {
            const simulatedLatency = Math.floor(Math.random() * 50) + 20; // 20-70ms
            setLatency(simulatedLatency);
            setIsOnline(simulatedLatency < 100);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-4 py-2 px-4 bg-zinc-900 text-zinc-400 font-mono text-[10px] border-b border-zinc-800">
            <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                <span className="uppercase tracking-wider font-bold">{isOnline ? "Supervisor Connected" : "Connection Lost"}</span>
            </div>
            
            <div className="h-4 w-px bg-zinc-700 mx-2" />
            
            <div className="flex items-center gap-2">
                <Activity size={12} />
                <span>{latency}ms</span>
            </div>

            <div className="flex-1" />
            
            <div className="flex items-center gap-2 text-zinc-500">
                <Wifi size={12} />
                <span>Cloudflare Edge (v1.0.4)</span>
            </div>
        </div>
    );
};