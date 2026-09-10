import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  incidentId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    incidentId: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const incidentId = Math.random().toString(36).substring(2, 10).toUpperCase();
    return { hasError: true, error, incidentId };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Uncaught frontend error captured by ErrorBoundary", error, {
      componentStack: errorInfo.componentStack,
      incidentId: this.state.incidentId,
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 mb-4 shadow-sm">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-2">Something went wrong</h2>
          <p className="max-w-md text-xs text-slate-600 dark:text-zinc-400 mb-4 leading-relaxed">
            An unexpected error occurred while rendering this view. Our team has been notified.
          </p>
          {this.state.incidentId && (
            <p className="text-[11px] font-mono text-zinc-500 mb-6 bg-zinc-100 dark:bg-zinc-900 py-1 px-3 rounded-full">
              Reference ID: {this.state.incidentId}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null, incidentId: null });
              }}
              variant="outline"
              className="gap-2 font-medium"
            >
              Try Again
            </Button>
            <Button
              onClick={() => {
                window.location.href = "/";
              }}
              variant="ghost"
              className="gap-2 font-medium"
            >
              <Home className="h-4 w-4" /> Home
            </Button>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null, incidentId: null });
                window.location.reload();
              }}
              className="gap-2 font-bold"
            >
              <RefreshCw className="h-4 w-4" /> Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
