import React from "react";

type State = { hasError: boolean; error?: Error };

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  State
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Send to logging service here if desired
    // console.error('Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: 20,
            zIndex: 9999,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Something went wrong.</h2>
            <p style={{ opacity: 0.85 }}>
              The visualiser encountered an error but the app is still running.
            </p>
            <pre
              style={{
                maxWidth: 600,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {String(this.state.error)}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
