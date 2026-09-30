import React from 'react';
import { Save, RotateCcw, RefreshCw, Check, AlertCircle } from 'lucide-react';
import Spinner from '../../Spinner';

interface SettingsToolbarProps {
    hasChanges: boolean;
    isSaving: boolean;
    onSave: () => void;
    onSaveAndContinue?: () => void;
    onResetSection: () => void;
    onRestoreDefaults: () => void;
}

export const SettingsToolbar: React.FC<SettingsToolbarProps> = ({
    hasChanges,
    isSaving,
    onSave,
    onSaveAndContinue,
    onResetSection,
    onRestoreDefaults
}) => {
    return (
        <div className="sticky bottom-4 z-30 mt-8 w-full bg-[#141414]/90 backdrop-blur-xl border border-white/10 p-3.5 sm:p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-2">
                    {hasChanges ? (
                        <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-wider">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                            <span>Unsaved Changes</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                            <Check size={16} />
                            <span>All Changes Saved</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onResetSection}
                        disabled={!hasChanges || isSaving}
                        className="px-3 py-2 rounded-xl text-[11px] font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                    >
                        Revert Edits
                    </button>
                    <button
                        type="button"
                        onClick={onRestoreDefaults}
                        disabled={isSaving}
                        className="px-3 py-2 rounded-xl text-[11px] font-bold text-gray-500 hover:text-amber-400 bg-white/5 hover:bg-amber-500/10 transition-all flex items-center gap-1.5"
                    >
                        <RotateCcw size={12} />
                        <span>Defaults</span>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {onSaveAndContinue && (
                    <button
                        type="button"
                        onClick={onSaveAndContinue}
                        disabled={!hasChanges || isSaving}
                        className="px-5 py-3 rounded-2xl text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 transition-all"
                    >
                        Save & Next
                    </button>
                )}
                <button
                    type="button"
                    onClick={onSave}
                    disabled={!hasChanges || isSaving}
                    className={`flex items-center justify-center gap-2.5 px-7 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${
                        hasChanges
                            ? 'bg-primary hover:bg-orange-600 text-white shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                    }`}
                >
                    {isSaving ? (
                        <>
                            <Spinner size="sm" color="text-white" />
                            <span>Committing...</span>
                        </>
                    ) : (
                        <>
                            <Save size={16} />
                            <span>Save Changes</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
