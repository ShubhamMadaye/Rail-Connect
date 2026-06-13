'use client';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  delayMinutes: number;
  reason?: string | null;
  showText?: boolean;
}

export default function DelayBadge({ delayMinutes, reason, showText = false }: Props) {
  if (delayMinutes === 0) {
    return (
      <span className="badge-on-time flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        On Time
      </span>
    );
  }
  if (delayMinutes <= 30) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="badge-delayed flex items-center gap-1">
          <Clock className="w-3 h-3" />
          +{delayMinutes} min
        </span>
        {showText && reason && <span className="text-xs text-slate-500">{reason}</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="badge-very-delayed flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        +{delayMinutes} min
      </span>
      {showText && reason && <span className="text-xs text-slate-500">{reason}</span>}
    </div>
  );
}
