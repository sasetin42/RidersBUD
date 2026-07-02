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

        // Making POST request to smtpjs.com
        const response = await fetch('https://smtpjs.com/v3/smtpjs.aspx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        const resultText = await response.text();
        
        if (resultText === "OK") {
            return true;
        } else {
            console.error("SMTP JS Error: ", resultText);
            throw new Error(resultText);
        }

    } catch (error) {
        console.error("Failed to send email: ", error);
        throw error;
    }
};
