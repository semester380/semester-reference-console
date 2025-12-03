
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
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
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 bg-nano-gray-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-lg w-full">
                        <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
                        <p className="text-nano-gray-600 mb-4">The component crashed with the following error:</p>
                        <pre className="bg-nano-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-48 mb-4 border border-nano-gray-200 font-mono text-red-800">
                            {this.state.error?.toString()}
                        </pre>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-2 bg-nano-gray-100 hover:bg-nano-gray-200 text-nano-gray-900 rounded-lg font-medium transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
