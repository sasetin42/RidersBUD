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
                        window.location.port !== '';

        const endpoint = isLocal
            ? '/api/smtp-bridge'
            : 'https://smtpjs.com/v3/smtpjs.aspx';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        }).catch(() => null);

        if (!response) {
            // Silently skip if client browser blocks cross-origin SMTP relay request
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

