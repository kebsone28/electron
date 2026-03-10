import { useEffect, useState } from 'react';
import { getMemoryInfo } from '../utils/debugHelper';

/**
 * Development only: Shows memory and render diagnostics
 */
export function MemoryDiagnostic() {
    const [memInfo, setMemInfo] = useState<any>(null);
    const [showDiag, setShowDiag] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setMemInfo(getMemoryInfo());
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    if (process.env.NODE_ENV !== 'development' || !memInfo) return null;

    const bgColor = memInfo.isHighMemory 
        ? 'bg-red-900/80' 
        : 'bg-green-900/80';

    return (
        <>
            {/* Toggle button */}
            <button
                onClick={() => setShowDiag(!showDiag)}
                className={`fixed bottom-4 right-4 z-[9999] p-2 rounded-full text-xs font-bold text-white ${bgColor} hover:opacity-100 opacity-50 transition-opacity`}
                title="Toggle Memory Diagnostic"
            >
                {memInfo.isHighMemory ? '⚠️' : '💾'}
            </button>

            {/* Diagnostic panel */}
            {showDiag && (
                <div className="fixed bottom-16 right-4 z-[9999] bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white font-mono shadow-lg">
                    <div className="font-bold mb-2">Memory Diagnostic</div>
                    <div className="space-y-1">
                        <div>🎯 Used: <span className={memInfo.isHighMemory ? 'text-red-400' : 'text-green-400'}>{memInfo.used}</span></div>
                        <div>📊 Limit: {memInfo.limit}</div>
                        <div>📈 Total: {memInfo.total}</div>
                        <div>% Usage: <span className={memInfo.isHighMemory ? 'text-red-400' : 'text-green-400'}>{memInfo.percentUsed}</span></div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-700 text-yellow-400">
                        ⚡ Refresh page if memory stays high
                    </div>
                </div>
            )}
        </>
    );
}
