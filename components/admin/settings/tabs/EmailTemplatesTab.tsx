import React, { useState, useRef } from 'react';
import { Sparkles, Eye, Code, Send, RotateCcw, Copy, Check, FileText } from 'lucide-react';
import { Settings, EmailTemplate } from '../../../../types';
import { DEFAULT_EMAIL_TEMPLATES, renderEmailTemplate } from '../../../../data/defaultEmailTemplates';

interface EmailTemplatesTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
    onSendTest: (templateId: string, targetEmail: string) => Promise<void>;
}

export const EmailTemplatesTab: React.FC<EmailTemplatesTabProps> = ({
    settings,
    onChange,
    onSendTest
}) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('booking_confirmed');
    const [mode, setMode] = useState<'edit' | 'preview'>('edit');
    const [testEmail, setTestEmail] = useState<string>('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [copiedVar, setCopiedVar] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const getEffectiveTemplate = (id: string): EmailTemplate => {
        if (settings.emailTemplates?.[id]) {
            return settings.emailTemplates[id];
        }
        return DEFAULT_EMAIL_TEMPLATES[id] || {
            id,
            name: 'Template',
            category: 'Operations',
            subject: 'Notice from RidersBUD',
            body: '<p>Hello {{customer_name}},</p>',
            enabled: true,
            variables: ['customer_name'],
            description: ''
        };
    };

    const activeTemplate = getEffectiveTemplate(selectedTemplateId);

    const handleSubjectChange = (subject: string) => {
        const updated = {
            ...(settings.emailTemplates || {}),
            [selectedTemplateId]: {
                ...activeTemplate,
                subject,
                updatedAt: new Date().toISOString()
            }
        };
        onChange('emailTemplates', updated);
    };

    const handleBodyChange = (body: string) => {
        const updated = {
            ...(settings.emailTemplates || {}),
            [selectedTemplateId]: {
                ...activeTemplate,
                body,
                updatedAt: new Date().toISOString()
            }
        };
        onChange('emailTemplates', updated);
    };

    const handleInsertVariable = (variableTag: string) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const placeholder = `{{${variableTag}}}`;
        const newBody = activeTemplate.body.substring(0, start) + placeholder + activeTemplate.body.substring(end);
        
        handleBodyChange(newBody);
        setCopiedVar(variableTag);
        setTimeout(() => setCopiedVar(null), 2000);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
        }, 50);
    };

    const handleResetToDefault = () => {
        const defaultTpl = DEFAULT_EMAIL_TEMPLATES[selectedTemplateId];
        if (!defaultTpl) return;
        const updated = {
            ...(settings.emailTemplates || {}),
            [selectedTemplateId]: { ...defaultTpl }
        };
        onChange('emailTemplates', updated);
    };

    const samplePreviewData: Record<string, any> = {
        customer_name: 'Juan Dela Cruz',
        customer_email: 'juan@example.ph',
        customer_phone: '0917-888-9999',
        booking_number: 'BK-8942',
        service_name: 'Comprehensive Engine Diagnostic & PMS',
        date: 'Sept 14, 2026',
        time: '10:00 AM',
        amount: '4,500.00',
        total_amount: '4,500.00',
        status: 'Confirmed',
        mechanic_name: 'Master Tech Roberto',
        vehicle_name: 'Toyota Fortuner (NAA-1234)',
        pickup_location: 'Carmona, Cavite',
        destination: 'Makati Central Business District'
    };

    const renderedHtmlPreview = renderEmailTemplate(activeTemplate, samplePreviewData, settings).html;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header & Template Switcher */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Email Notification Layouts & Preview</h3>
                            <p className="text-xs text-gray-500">Design dynamic HTML templates with live tag injection and visual preview.</p>
                        </div>
                    </div>

                    {/* Template Picker */}
                    <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-primary"
                    >
                        {Object.values(DEFAULT_EMAIL_TEMPLATES).map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                                [{tpl.category}] {tpl.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Subject & Mode Toggles */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between gap-4">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase">Email Subject Line</label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setMode('edit')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                    mode === 'edit' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white bg-white/5'
                                }`}
                            >
                                <Code size={13} />
                                <span>HTML Editor</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('preview')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                    mode === 'preview' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white bg-white/5'
                                }`}
                            >
                                <Eye size={13} />
                                <span>Visual Preview</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleResetToDefault}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-400 hover:text-amber-400 bg-white/5 flex items-center gap-1 transition"
                                title="Reset template to factory default"
                            >
                                <RotateCcw size={12} />
                                <span>Reset</span>
                            </button>
                        </div>
                    </div>

                    <input
                        type="text"
                        value={activeTemplate.subject}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        placeholder="Subject line with {{customer_name}}..."
                        className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none font-semibold"
                    />
                </div>

                {/* Variable Tags Cloud */}
                <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Dynamic Variables (Click to Insert)</label>
                    <div className="flex flex-wrap gap-2">
                        {['customer_name', 'booking_number', 'service_name', 'amount', 'date', 'time', 'status', 'vehicle_name', 'mechanic_name'].map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => handleInsertVariable(tag)}
                                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-primary/20 hover:border-primary/40 border border-white/5 text-[11px] font-mono text-gray-300 hover:text-white transition flex items-center gap-1"
                            >
                                <span>{`{{${tag}}}`}</span>
                                {copiedVar === tag && <Check size={11} className="text-emerald-400" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor vs Preview Body */}
                <div className="pt-2">
                    {mode === 'edit' ? (
                        <textarea
                            ref={textareaRef}
                            rows={12}
                            value={activeTemplate.body}
                            onChange={(e) => handleBodyChange(e.target.value)}
                            className="w-full bg-black/60 border border-white/10 focus:border-primary rounded-2xl p-4 text-xs font-mono text-gray-200 outline-none leading-relaxed transition"
                        />
                    ) : (
                        <div className="bg-white rounded-2xl p-6 shadow-inner text-gray-900 min-h-[300px] overflow-y-auto">
                            <div dangerouslySetInnerHTML={{ __html: renderedHtmlPreview }} />
                        </div>
                    )}
                </div>

                {/* Test Email Dispatcher */}
                <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                    <div className="w-full sm:w-auto flex-1">
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="Recipient email for live test..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            if (!testEmail) return;
                            setIsSendingTest(true);
                            try {
                                await onSendTest(selectedTemplateId, testEmail);
                            } finally {
                                setIsSendingTest(false);
                            }
                        }}
                        disabled={isSendingTest || !testEmail}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                        <Send size={13} />
                        <span>{isSendingTest ? 'Sending Test...' : 'Send Live Test'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
