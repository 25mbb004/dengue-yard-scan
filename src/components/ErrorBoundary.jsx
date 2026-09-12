import { Component } from "react";

/**
 * Last line of defence: a render error in one section degrades that section
 * to a friendly message instead of blanking the whole app.
 *
 * Raw error text is logged to the console for developers and never shown to
 * the user.
 */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("UI error:", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 text-center">
          <p className="text-sm leading-relaxed text-slate-400">
            {this.props.fallback ?? "Something went wrong here."}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
