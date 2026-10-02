import React, { useState } from 'react';
import { Database, Download, Upload, FileText, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useDatabase } from '../../../../context/DatabaseContext';
import { settingsService } from '../../../../services/settingsService';

interface DataManagementTabProps {
    adminEmail: string;
}

export const DataManagementTab: React.FC<DataManagementTabProps> = ({ adminEmail }) => {
    const { db } = useDatabase();
    const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleExportDataset = (dataset: 'bookings' | 'customers' | 'mechanics' | 'services' | 'parts') => {
        if (!db) return;
        const dataMap = {
            bookings: db.bookings || [],
            customers: db.customers || [],
            mechanics: db.mechanics || [],
            services: db.services || [],
            parts: db.parts || []
        };
        const items = dataMap[dataset] || [];
        settingsService.exportData(exportFormat, dataset.toUpperCase(), items, adminEmail);
        setFeedback(`Exported ${items.length} records from ${dataset.toUpperCase()} as ${exportFormat.toUpperCase()}.`);
        setTimeout(() => setFeedback(null), 3000);
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Export Center */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Download size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Structured Data Export Engine</h3>
                            <p className="text-xs text-gray-500">Generate clean CSV spreadsheets or JSON dumps of operational records.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Format:</span>
                        <div className="flex items-center bg-black/50 border border-white/10 rounded-xl p-1">
                            <button
                                type="button"
                                onClick={() => setExportFormat('csv')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                    exportFormat === 'csv' ? 'bg-primary text-white' : 'text-gray-400'
                                }`}
                            >
                                CSV
                            </button>
                            <button
                                type="button"
                                onClick={() => setExportFormat('json')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                    exportFormat === 'json' ? 'bg-primary text-white' : 'text-gray-400'
                                }`}
                            >
                                JSON
                            </button>
                        </div>
                    </div>
                </div>

                {feedback && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        <span>{feedback}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { id: 'bookings', label: 'Bookings & Dispatches', count: db?.bookings?.length ?? 0, desc: 'Complete appointment records, statuses, payments & locations.' },
                        { id: 'customers', label: 'Registered Customers', count: db?.customers?.length ?? 0, desc: 'Client vehicle profiles, contact details & garages.' },
                        { id: 'mechanics', label: 'Service Specialists', count: db?.mechanics?.length ?? 0, desc: 'Mechanic certifications, earnings, ratings & GPS.' },
                        { id: 'services', label: 'Service Catalog', count: db?.services?.length ?? 0, desc: 'Maintenance packages, pricing, durations & categories.' },
                        { id: 'parts', label: 'Inventory & Parts', count: db?.parts?.length ?? 0, desc: 'Automotive replacement parts, stock counts & prices.' }
                    ].map((d) => (
                        <div
                            key={d.id}
                            className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between gap-3"
                        >
                            <div>
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-white">{d.label}</h4>
                                    <span className="text-[10px] font-mono text-primary font-black">{d.count} Rows</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">{d.desc}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleExportDataset(d.id as any)}
                                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1.5 transition"
                            >
                                <Download size={13} className="text-primary" />
                                <span>Export {exportFormat.toUpperCase()}</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
