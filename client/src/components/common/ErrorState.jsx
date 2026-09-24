import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Failed to load data',
  message = 'An error occurred while fetching information from the server.',
  onRetry,
}) {
  return (
    <div className="flex items-start gap-4 p-5 bg-rose-50 border border-rose-200 rounded-xl my-4 text-rose-800">
      <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-xs text-rose-700 mt-1">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
