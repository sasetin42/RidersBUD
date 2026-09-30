import React from 'react';
import { AppVersionInfo, AppUpdateService } from '../services/AppUpdateService';
import { Download, Sparkles, AlertCircle, ExternalLink, X } from 'lucide-react';

interface UpdateModalProps {
  isOpen: boolean;
  updateInfo: AppVersionInfo | null;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  updateInfo,
  onClose,
}) => {
  if (!isOpen || !updateInfo) return null;

  const handleUpdateClick = () => {
    AppUpdateService.openDownloadUrl(updateInfo.apkUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-secondary border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-slate-100 shadow-glow-primary/20">
        
        {/* Header Background Banner - Sleek & Compact Signature Gradient */}
        <div className="relative bg-gradient-to-r from-primary via-orange-500 to-amber-500 px-5 py-4 flex items-center justify-between overflow-hidden">
          {/* Subtle Ambient Brand Glow */}
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/20 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black/25 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-sm flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-100/90 bg-black/20 px-2 py-0.5 rounded-md border border-white/10">
                  Update Available
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white leading-tight mt-0.5">
                RidersBUD v{updateInfo.versionName}
              </h2>
            </div>
          </div>

          {!updateInfo.mandatory && (
            <button
              onClick={onClose}
              className="relative z-10 p-1.5 rounded-full bg-black/25 text-white/80 hover:bg-black/40 hover:text-white transition backdrop-blur-sm"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-5 space-y-3.5 bg-admin-bg/95">
          <div className="flex items-start space-x-3 bg-field/60 border border-primary/20 p-3.5 rounded-2xl shadow-inner">
            <AlertCircle size={20} className="text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-200 leading-relaxed">
              A brand new version of RidersBUD is ready! Update now to access the latest features, security enhancements, and improvements.
            </p>
          </div>

          {updateInfo.releaseNotes && (
            <div>
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                What's New
              </h4>
              <div className="bg-secondary/90 rounded-xl p-3.5 text-xs text-slate-300 whitespace-pre-line border border-white/5 max-h-36 overflow-y-auto leading-relaxed">
                {updateInfo.releaseNotes}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col space-y-2.5">
            <button
              onClick={handleUpdateClick}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-primary to-primary-hover hover:brightness-110 text-white font-bold rounded-2xl shadow-glow-primary flex items-center justify-center space-x-2 transition-all transform active:scale-95 duration-200"
            >
              <Download size={18} />
              <span>Download & Install APK</span>
              <ExternalLink size={14} className="opacity-80 ml-1" />
            </button>

            {!updateInfo.mandatory && updateInfo.allowRemindLater !== false && (
              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition text-center"
              >
                Remind Me Later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
