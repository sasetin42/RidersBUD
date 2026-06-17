/**
 * Maps raw Firebase authentication error codes or messages to user-friendly layman's terms.
 */
export function getFriendlyErrorMessage(err: unknown): string {
    if (!err) return 'An unknown error occurred.';

    const code = (err as any).code || '';
    const message = (err as any).message || '';

    // Check code or message contents
    if (code === 'auth/invalid-credential' || message.includes('auth/invalid-credential') || message.includes('invalid-credential')) {
        return 'Incorrect login details. Please check your email and password.';
    }
    if (code === 'auth/user-not-found' || message.includes('auth/user-not-found') || message.includes('user-not-found')) {
        return 'Account not found. Please register a new account.';
    }
    if (code === 'auth/wrong-password' || message.includes('auth/wrong-password') || message.includes('wrong-password')) {
        return 'Incorrect login details. Please check your email and password.';
    }
    if (code === 'auth/email-already-in-use' || message.includes('auth/email-already-in-use') || message.includes('email-already-in-use')) {
        return 'This email address is already in use by another account.';
    }
    if (code === 'auth/weak-password' || message.includes('auth/weak-password') || message.includes('weak-password')) {
        return 'The password is too weak. Please use a password with at least 6 characters.';
    }
    if (code === 'auth/invalid-email' || message.includes('auth/invalid-email') || message.includes('invalid-email')) {
        return 'Please enter a valid email address.';
    }
    if (code === 'auth/too-many-requests' || message.includes('auth/too-many-requests') || message.includes('too-many-requests')) {
        return 'Too many failed login attempts. Please try again later.';
    }
    if (code === 'auth/network-request-failed' || message.includes('auth/network-request-failed') || message.includes('network-request-failed')) {
        return 'Network error. Please check your internet connection and try again.';
    }

    // Default formatting cleanup if it contains Firebase prefix but doesn't match above patterns
    if (message.startsWith('Firebase:')) {
        return message.replace(/^Firebase:\s*(Error\s*)?\(auth\//, '').replace(/\)\.?$/, '').trim() || message;
    }

    return message || 'An unknown error occurred.';
}
