import React, { useState } from 'react';
import { History, Search, Download, Filter, Eye, ArrowUpDown, CheckCircle2, AlertTriangle, User } from 'lucide-react';
import { AuditLogEntry } from '../../../../types';
import { settingsService } from '../../../../services/settingsService';

interface AuditLogsTabProps {
    adminEmail: string;
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({ adminEmail }) => {
    const [logs] = useState<AuditLogEntry[]>(() => settingsService.getLocalAuditLogs());
    const [searchTerm, setSearchTerm] = useState('');
    const [moduleFilter, setModuleFilter] = useState('All');
    const [actionFilter, setActionFilter] = useState('All');
    const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.module.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;
        const matchesAction = actionFilter === 'All' || log.action === actionFilter;
        return matchesSearch && matchesModule && matchesAction;
    });

    const handleExport = (format: 'csv' | 'json') => {
        settingsService.exportData(format, 'Audit-Logs', filteredLogs, adminEmail);
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header & Controls */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <History size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Enterprise Audit Trail</h3>
                            <p className="text-xs text-gray-500">Immutable ledger of administrative actions, config edits, and security events.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleExport('csv')}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 flex items-center gap-1.5 transition"
                        >
                            <Download size={13} />
                            <span>Export CSV</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleExport('json')}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 flex items-center gap-1.5 transition"
                        >
                            <Download size={13} />
                            <span>Export JSON</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Filter audit entries..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-primary"
                        />
                    </div>

                    <select
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                        <option value="All">All Modules</option>
                        <option value="General">General</option>
                        <option value="Appearance">Appearance</option>
                        <option value="Operations">Operations</option>
                        <option value="Financials">Financials</option>
                        <option value="Map & Location">Map & Location</option>
                        <option value="Security">Security</option>
                        <option value="Backup & Restore">Backup & Restore</option>
                    </select>

                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                        <option value="All">All Actions</option>
                        <option value="Configuration Changed">Configuration Changed</option>
                        <option value="Login">Login</option>
                        <option value="Exported">Exported</option>
                        <option value="Imported">Imported</option>
                        <option value="Updated">Updated</option>
                    </select>
                </div>

                {/* Log Stream */}
                <div className="space-y-2 pt-2">
                    {filteredLogs.length === 0 ? (
                        <div className="p-8 text-center text-xs text-gray-500 bg-black/30 rounded-2xl border border-white/5">
                            No audit log entries match your filter criteria.
                        </div>
                    ) : (
                        filteredLogs.map((log) => (
                            <div
                                key={log.id}
                                onClick={() => setSelectedEntry(log)}
                                className="p-3.5 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/20 transition cursor-pointer flex items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 text-gray-400">
                                        <User size={15} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-white truncate">{log.user}</span>
                                            <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black uppercase text-primary">
                                                {log.action}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">
                                                [{log.module}]
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{log.details}</p>
                                    </div>
                                </div>

                                <div className="text-right flex-shrink-0">
                                    <span className="text-[10px] font-mono text-gray-500 block">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[9px] text-gray-600 block">
                                        {new Date(log.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Before / After Detail Modal */}
            {selectedEntry && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#161616] border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-white">Audit Event Details</h4>
                            <button
                                type="button"
                                onClick={() => setSelectedEntry(null)}
                                className="text-gray-400 hover:text-white text-xs px-2.5 py-1 bg-white/5 rounded-lg"
                            >
                                Close
                            </button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="p-3 bg-black/50 rounded-xl space-y-1">
                                <p className="text-gray-400"><span className="text-gray-200 font-bold">User:</span> {selectedEntry.user} ({selectedEntry.userEmail})</p>
                                <p className="text-gray-400"><span className="text-gray-200 font-bold">Action:</span> {selectedEntry.action} in [{selectedEntry.module}]</p>
                                <p className="text-gray-400"><span className="text-gray-200 font-bold">Time:</span> {selectedEntry.timestamp}</p>
                                <p className="text-gray-400"><span className="text-gray-200 font-bold">Details:</span> {selectedEntry.details}</p>
                            </div>

                            {selectedEntry.previousValue && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
                                    <p className="text-[10px] font-black uppercase text-rose-400">Previous Configuration</p>
                                    <p className="text-xs font-mono text-rose-200">{selectedEntry.previousValue}</p>
                                </div>
                            )}

                            {selectedEntry.newValue && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                                    <p className="text-[10px] font-black uppercase text-emerald-400">New Value Applied</p>
                                    <p className="text-xs font-mono text-emerald-200">{selectedEntry.newValue}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
