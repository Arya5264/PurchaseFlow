import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Loading...', size = 'default' }) {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-10 h-10',
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-slate-500 gap-3">
      <Loader2 className={`${sizeClasses[size] || sizeClasses.default} animate-spin text-teal-600`} />
      {text && <span className="text-xs font-medium text-slate-500 tracking-wide">{text}</span>}
    </div>
  );
}
