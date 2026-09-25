import React, { Component } from 'react';
import { MdErrorOutline } from 'react-icons/md';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-5">
              <MdErrorOutline size={44} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              We encountered an unexpected glitch. Please refresh the page or try again in a few moments.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-6 rounded-2xl bg-[#ff4d2d] text-white font-semibold shadow-md hover:bg-[#e03d1e] transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
