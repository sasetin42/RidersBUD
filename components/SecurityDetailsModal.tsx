import React from 'react';

type Props = {
  open: boolean;
  roleLabel: 'Customer' | 'Mechanic';
  onClose: () => void;
};

const SecurityDetailsModal = ({ open, roleLabel, onClose }: Props) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md rounded-2xl bg-[#121212] border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white">
                Security & Notification Details
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {roleLabel} account notifications security settings
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
              aria-label="Close"
              type="button"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-3 text-sm text-gray-300 leading-relaxed">
            <p>
              RidersBUD uses in-app notifications to keep you updated about jobs,
              messages, and payment status. These notifications may include
              booking/job references and other operational details.
            </p>
            <p>
              Your data is always tied to your signed-in account. Avoid sharing
              your login credentials—notifications will only appear for the role
              and account you signed in with.
            </p>
            <p>
              If you log in with a different account type (Customer vs Mechanic),
              you may see different notification controls and job-related updates.
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gradient-to-r from-primary to-orange-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
            >
              OK, I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDetailsModal;


