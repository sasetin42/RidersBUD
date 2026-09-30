import { Settings } from '../types';

/**
 * Sends an email using SMTP.js (https://smtpjs.com/v3/smtpjs.aspx)
 * This allows the client-side app to send emails by securely bridging 
 * through SMTP.js to the user's configured SMTP server.
 */
export interface EmailSendResult {
    success: boolean;
    message: string;
    messageId?: string;
    response?: string;
    latencyMs?: number;
    details?: string;
}

/**
 * Sends an email using the native secure SMTP bridge with detailed status and error messaging
 */
export const sendEmail = async (
    to: string, 
    subject: string, 
    body: string, 
    settings: Settings
): Promise<boolean> => {
    const result = await sendEmailWithDiagnostics(to, subject, body, settings);
    return result.success;
};

export const sendEmailWithDiagnostics = async (
    to: string, 
    subject: string, 
    body: string, 
    settings: Settings
): Promise<EmailSendResult> => {
    // Validate required SMTP settings
    if (!settings.smtpHost || !settings.smtpPort) {
        return {
            success: false,
            message: 'SMTP host and port are required. Please configure them in Admin Settings > SMTP Server.'
        };
    }

    const authRequired = settings.smtpAuthRequired !== false;
    if (authRequired && (!settings.smtpUsername || !settings.smtpPassword)) {
        return {
            success: false,
            message: 'SMTP authentication credentials (Username & Password) are missing. Please provide them in settings.'
        };
    }

    const fromAddress = settings.smtpFromEmail || settings.smtpUsername;
    if (!fromAddress) {
        return {
            success: false,
            message: 'Sender email address is missing. Please configure "From Email Address" in settings.'
        };
    }

    const formattedFrom = settings.smtpFromName 
        ? `"${settings.smtpFromName}" <${fromAddress}>` 
        : fromAddress;

    try {
        const payload = {
            action: 'send',
            host: settings.smtpHost,
            port: settings.smtpPort,
            encryption: settings.smtpEncryption || (settings.smtpPort === '465' ? 'SSL/TLS' : 'STARTTLS'),
            username: settings.smtpUsername,
            password: settings.smtpPassword,
            authRequired,
            from: formattedFrom,
            to,
            replyTo: settings.smtpReplyTo || undefined,
            subject,
            body
        };

        const response = await fetch('/api/smtp-bridge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => null);

        if (response.ok && data && data.success) {
            return {
                success: true,
                message: data.message || `Test email successfully submitted to and accepted by ${settings.smtpHost}:${settings.smtpPort}!`,
                messageId: data.messageId,
                response: data.response,
                latencyMs: data.latencyMs,
                details: data.details || `Submitted & accepted by ${settings.smtpHost}:${settings.smtpPort}`
            };
        }

        const errorMessage = data?.error || data?.message || `SMTP dispatch failed with status ${response.status}.`;
        return {
            success: false,
            message: errorMessage,
            latencyMs: data?.latencyMs,
            details: data?.rawError ? `Server error: ${data.rawError}` : `Host: ${settings.smtpHost}:${settings.smtpPort}`
        };

    } catch (error: any) {
        return {
            success: false,
            message: error?.message || 'Unexpected network error occurred reaching the SMTP gateway.'
        };
    }
};


import { DEFAULT_EMAIL_TEMPLATES, renderEmailTemplate } from '../data/defaultEmailTemplates';

/**
 * Sends an email using a configured EmailTemplate (with fallback to system defaults)
 */
export const sendTemplatedEmail = async (
    templateId: string,
    to: string,
    data: Record<string, any>,
    settings?: Settings
): Promise<boolean> => {
    if (!settings || !to) return false;

    // Fetch custom template from settings or fallback to system defaults
    const customTemplate = settings.emailTemplates?.[templateId];
    const defaultTemplate = DEFAULT_EMAIL_TEMPLATES[templateId];
    const activeTemplate = customTemplate || defaultTemplate;

    if (!activeTemplate) {
        console.warn(`Template with id '${templateId}' not found.`);
        return false;
    }

    if (activeTemplate.enabled === false) {
        console.log(`Email notification for template '${templateId}' is disabled.`);
        return false;
    }

    const { subject, html } = renderEmailTemplate(activeTemplate, data, settings);
    return sendEmail(to, subject, html, settings);
};

