import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordFieldProps {
    id?: string;
    name?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    required?: boolean;
    className?: string;
    showLockIcon?: boolean;
    disabled?: boolean;
    autoComplete?: string;
}

const PasswordField: React.FC<PasswordFieldProps> = ({
    id,
    name,
    value,
    onChange,
    placeholder = '••••••••',
    label,
    error,
    required = false,
    className = '',
    showLockIcon = true,
    disabled = false,
    autoComplete,
}) => {
    const [show, setShow] = useState(false);

    return (
        <div className="space-y-2">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-300">
                    {label}
                    {required && <span className="text-primary ml-1">*</span>}
                </label>
            )}
            <div className="relative group">
                {showLockIcon && (
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                    </div>
                )}
                <input
                    id={id}
                    name={name}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    autoComplete={autoComplete}
                    className={`w-full ${showLockIcon ? 'pl-12' : 'pl-4'} pr-12 py-3.5 bg-[#0A0A0A]/50 border rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-red-500' : 'border-white/10'} ${className}`}
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-primary transition-colors"
                    tabIndex={-1}
                    aria-label={show ? 'Hide password' : 'Show password'}
                >
                    {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-1 animate-shake">{error}</p>}
        </div>
    );
};

export default PasswordField;
