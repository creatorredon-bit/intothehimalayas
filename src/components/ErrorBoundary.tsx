import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep this in the console so the failure is diagnosable without a service.
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-mint px-6">
          <div className="w-full max-w-lg rounded-2xl border border-stone-line bg-white p-8 text-center shadow-soft">
            <p className="eyebrow">Something went wrong</p>
            <h1 className="mt-3 text-2xl">This page could not be displayed</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              The rest of the site is still available. Reload to try again, or return to the home page.
            </p>
            <pre className="mt-5 max-h-32 overflow-auto rounded-lg bg-stone-paper p-3 text-left text-xs text-ink-muted">
              {this.state.error.message}
            </pre>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
                Reload page
              </button>
              <a href="/" className="btn-secondary">
                Back to home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
