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
            return fallback || (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
                    <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                    <p className="font-mono text-sm">{error?.message}</p>
                </div>
            );
        }

        return children;
    }
}

export default ErrorBoundary;
