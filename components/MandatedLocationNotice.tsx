import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Settings, AlertTriangle, RefreshCw, X, CheckCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { openDeviceLocationSettings, checkDeviceGpsStatus, GpsCheckResult } from '../utils/locationHelper';

interface MandatedLocationNoticeProps {
    isOpen: boolean;
    onClose?: () => void;
    onGpsEnabled?: () => void;
    title?: string;
    description?: string;
    variant?: 'modal' | 'banner';
    isMandatory?: boolean; // If true, user cannot simply dismiss without enabling
}

export const MandatedLocationNotice: React.FC<MandatedLocationNoticeProps> = ({
    isOpen,
    onClose,
    onGpsEnabled,
    title = 'Phone GPS Location Required',
    description = 'Real-time location is required to pinpoint your exact location for technician dispatch, routing, and live tracking.',
    variant = 'modal',
    isMandatory = false
}) => {
    const [isChecking, setIsChecking] = useState(false);
    const [gpsState, setGpsState] = useState<GpsCheckResult | null>(null);
    const [justEnabled, setJustEnabled] = useState(false);

    const isNative = Capacitor.isNativePlatform();

    const runCheck = useCallback(async () => {
        setIsChecking(true);
        try {
            const status = await checkDeviceGpsStatus();
            setGpsState(status);

            if (status.hasPermission && !status.isGpsDisabled) {
                setJustEnabled(true);
                setTimeout(() => {
                    setJustEnabled(false);
                    onGpsEnabled?.();
                    if (!isMandatory) onClose?.();
                }, 1000);
            }
        } catch (e) {
            console.warn('[MandatedLocationNotice] GPS check failed:', e);
        } finally {
            setIsChecking(false);
        }
    }, [onGpsEnabled, onClose, isMandatory]);

    // Check GPS automatically whenever modal opens
    useEffect(() => {
        if (isOpen) {
            runCheck();
        }
    }, [isOpen, runCheck]);

    // Also auto-recheck when returning to app / tab focus
    useEffect(() => {
        if (!isOpen) return;

        const onFocus = () => {
            runCheck();
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                runCheck();
            }
        });

        return () => {
            window.removeEventListener('focus', onFocus);
        };
    }, [isOpen, runCheck]);

    const handleOpenSettings = async () => {
        setIsChecking(true);
        if (isNative) {
            await openDeviceLocationSettings();
            // Give native OS 1.5s then poll
            setTimeout(() => {
                runCheck();
            }, 1500);
        } else {
            // Web / PWA: browser settings can't be deep-linked, so trigger browser prompt / recheck
            runCheck();
        }
    };

    if (!isOpen) return null;

    if (variant === 'banner') {
        return (
            <div className="w-full bg-gradient-to-r from-amber-950/80 via-orange-950/90 to-amber-950/80 border-b border-orange-500/30 p-3 sm:p-4 text-white shadow-xl backdrop-blur-md transition-all animate-fadeIn">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0 text-orange-400">
                            <AlertTriangle className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-black text-orange-200 tracking-wide uppercase">
                                {title}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-orange-100/80 line-clamp-1">
                                {description}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            onClick={handleOpenSettings}
                            disabled={isChecking}
                            className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black rounded-lg shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95 disabled:opacity-60"
                        >
                            {isChecking ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Settings className="w-3.5 h-3.5" />
                            )}
                            <span>{isNative ? 'Enable in Phone Settings' : 'Enable Location'}</span>
                        </button>

                        {!isMandatory && onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 text-orange-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Modal Variant
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-sm bg-[#121214] border border-orange-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-5 overflow-hidden">
                {/* Glow backdrop */}
                <div className="absolute -top-16 -left-16 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* Header Icon */}
                <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/40 flex items-center justify-center shadow-lg">
                    {justEnabled ? (
                        <CheckCircle className="w-10 h-10 text-emerald-400 animate-bounce" />
                    ) : (
                        <div className="relative">
                            <Navigation className="w-9 h-9 text-orange-400 animate-pulse" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-ping" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="space-y-2">
                    <h3 className="text-lg font-black text-white tracking-tight">
                        {justEnabled ? 'GPS Enabled Successfully!' : title}
                    </h3>
                    <p className="text-xs text-gray-300 font-medium leading-relaxed">
                        {justEnabled
                            ? 'Acquiring satellite lock and synchronizing real-time service coordinates...'
                            : description}
                    </p>
                </div>

                {/* Device Status Pills */}
                {gpsState && !justEnabled && (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-left space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between text-gray-400">
                            <span>Phone GPS Hardware:</span>
                            <span className={gpsState.isGpsDisabled ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                                {gpsState.isGpsDisabled ? 'OFF / Disabled' : 'Active'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-gray-400">
                            <span>App Permission:</span>
                            <span className={gpsState.hasPermission ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                                {gpsState.hasPermission ? 'Granted' : gpsState.isPermissionDenied ? 'Blocked' : 'Prompt'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2.5 pt-1">
                    <button
                        onClick={handleOpenSettings}
                        disabled={isChecking || justEnabled}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                    >
                        {isChecking ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Checking GPS Status...</span>
                            </>
                        ) : (
                            <>
                                <Settings className="w-4 h-4" />
                                <span>{isNative ? 'Open Phone Settings & Turn ON GPS' : 'Enable Location & Refresh'}</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={runCheck}
                        disabled={isChecking}
                        className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-orange-400' : ''}`} />
                        <span>I have turned it ON, Verify Now</span>
                    </button>

                    {!isMandatory && onClose && (
                        <button
                            onClick={onClose}
                            className="text-xs text-gray-500 hover:text-gray-300 font-medium transition-colors pt-1"
                        >
                            Cancel / Dismiss
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
export default MandatedLocationNotice;
