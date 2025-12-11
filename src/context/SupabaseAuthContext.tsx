import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, metadata?: any) => Promise<{ user: User | null; error: AuthError | null }>;
    signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
    signOut: () => Promise<{ error: AuthError | null }>;
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
    updateProfile: (updates: any) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const SupabaseAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured, authentication disabled');
            setLoading(false);
            return;
        }

        // Get initial session
        supabase!.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase!.auth.onAuthStateChange((_event, session) => {
            console.log('[Auth] State changed:', _event);
            setSession(session);
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, metadata?: any) => {
        if (!isSupabaseConfigured()) {
            return {
                user: null,
                error: new AuthError('Supabase not configured') as AuthError,
            };
        }

        const { data, error } = await supabase!.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
            },
        });

        if (error) {
            console.error('[Auth] Sign up error:', error);
        }

        return { user: data.user, error };
    };

    const signIn = async (email: string, password: string) => {
        if (!isSupabaseConfigured()) {
            return {
                user: null,
                error: new AuthError('Supabase not configured') as AuthError,
            };
        }

        const { data, error } = await supabase!.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('[Auth] Sign in error:', error);
        }

        return { user: data.user, error };
    };

    const signOut = async () => {
        if (!isSupabaseConfigured()) {
            return { error: new AuthError('Supabase not configured') as AuthError };
        }

        const { error } = await supabase!.auth.signOut();

        if (error) {
            console.error('[Auth] Sign out error:', error);
        }

        return { error };
    };

    const resetPassword = async (email: string) => {
        if (!isSupabaseConfigured()) {
            return { error: new AuthError('Supabase not configured') as AuthError };
        }

        const { error } = await supabase!.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            console.error('[Auth] Reset password error:', error);
        }

        return { error };
    };

    const updateProfile = async (updates: any) => {
        if (!isSupabaseConfigured()) {
            return { error: new AuthError('Supabase not configured') as AuthError };
        }

        const { error } = await supabase!.auth.updateUser({
            data: updates,
        });

        if (error) {
            console.error('[Auth] Update profile error:', error);
        }

        return { error };
    };

    const value: AuthContextType = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
