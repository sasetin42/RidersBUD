import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        const { hasError, error } = this.state;
        const { children, fallback } = (this as any).props;

        if (hasError) {
            if (fallback) return fallback;

            const isChunkError = error?.message?.includes('Failed to fetch dynamically imported module') ||
                                 error?.message?.includes('Importing a module script failed') ||
                                 error?.message?.includes('Loading chunk');

            return (
                <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center text-white">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl max-w-sm w-full space-y-4 shadow-xl">
                        <div className="w-12 h-12 rounded-full bg-orange-500/20 text-primary flex items-center justify-center mx-auto text-xl font-black">
                            !
                        </div>
                        <h2 className="text-base font-bold text-white">
                            {isChunkError ? 'Connection Interrupted' : 'Temporary Display Issue'}
                        </h2>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            {isChunkError 
                                ? 'A network blip prevented loading this page. Tap below to reload.'
                                : (error?.message || 'Something went wrong while rendering.')}
                        </p>
                        <button
                            onClick={() => {
                                (this as any).setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="w-full py-2.5 bg-primary hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition"
                        >
                            Tap to Reload
                        </button>
                    </div>
                </div>
            );
        }

        return children;
    }
}

export default ErrorBoundary;
