'use client';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  delayMinutes: number;
  reason?: string | null;
  showText?: boolean;
}

const formatDelay = (minutes: number) => {
  if (minutes < 60) {
    return `+${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    return mins > 0 ? `+${hours}h ${mins}m` : `+${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days === 1) {
    return remainingHours > 0 ? `+1 day ${remainingHours}h` : `+1 day`;
  }
  return remainingHours > 0 ? `+${days} days ${remainingHours}h` : `+${days} days`;
};

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
          {formatDelay(delayMinutes)}
        </span>
        {showText && reason && <span className="text-xs text-slate-500">{reason}</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="badge-very-delayed flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        {formatDelay(delayMinutes)}
      </span>
      {showText && reason && <span className="text-xs text-slate-500">{reason}</span>}
    </div>
  );
}
