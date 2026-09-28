import { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCw, LayoutDashboard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AdminErrorBoundary] Uncaught rendering error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  private handleGoDashboard = () => {
    this.setState({ hasError: false });
    window.location.href = "/admin";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <Card className="max-w-md w-full p-8 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 shadow-xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-50 dark:bg-rose-950 text-rose-600">
              <AlertOctagon className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Something went wrong</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The page could not be displayed correctly.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button size="sm" variant="outline" onClick={this.handleReset} className="rounded-xl text-xs font-bold gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </Button>
              <Button size="sm" onClick={this.handleGoDashboard} className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Back to Dashboard</span>
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
