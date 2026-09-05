import { Settings } from '../types';

/**
 * Sends an email using SMTP.js (https://smtpjs.com/v3/smtpjs.aspx)
 * This allows the client-side app to send emails by securely bridging 
 * through SMTP.js to the user's configured SMTP server.
 */
export const sendEmail = async (
    to: string, 
    subject: string, 
    body: string, 
    settings: Settings
): Promise<boolean> => {
    // Validate required SMTP settings
    if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUsername || !settings.smtpPassword || !settings.smtpFromEmail) {
        console.warn("SMTP settings are incomplete. Cannot send email.");
        return false;
    }

    try {
        // Construct the form data expected by smtpjs.com
        const formData = new URLSearchParams();
        formData.append('Action', 'Send');
        formData.append('Host', settings.smtpHost);
        formData.append('Port', settings.smtpPort);
        formData.append('Username', settings.smtpUsername);
        formData.append('Password', settings.smtpPassword);
        
        formData.append('From', settings.smtpFromName ? `${settings.smtpFromName} <${settings.smtpFromEmail}>` : settings.smtpFromEmail);
        formData.append('To', to);
        formData.append('Subject', subject);
        formData.append('Body', body);

        // Target either local development bridge or endpoint
        const isLocal = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.hostname.startsWith('192.168.') ||
                        window.location.hostname.startsWith('10.') ||
                        (window.location.port !== '' && window.location.port !== '80' && window.location.port !== '443');

        // Note: smtpjs.com has deprecated and blocked unauthenticated cross-origin browser relays (returning 403 Forbidden / CORS block).
        // If not in local dev mode with the backend bridge, we skip client-side SMTP dispatch safely without throwing CORS errors.
        if (!isLocal) {
            console.info("ℹ️ Direct client-side SMTP dispatch is disabled in production static hosting to preserve browser security and prevent CORS errors. Use a secure backend function or webhook for production email notifications.");
            return false;
        }

        const endpoint = '/api/smtp-bridge';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        }).catch(() => null);

        if (!response) {
            return false;
        }

        const resultText = await response.text();
        
        if (response.ok && (resultText === "OK" || resultText.includes("OK"))) {
            return true;
        } else {
            return false;
        }

    } catch (error: any) {
        return false;
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

