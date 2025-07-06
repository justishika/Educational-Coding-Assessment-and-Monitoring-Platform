import { useEffect, useState } from "react";
import { Timer, AlertCircle } from "lucide-react";

interface CountdownTimerProps {
  duration: number; // duration in seconds
  onComplete?: () => void;
  className?: string;
}

export default function CountdownTimer({ duration, onComplete, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => {
          if (timeLeft <= 1) {
            setIsActive(false);
            onComplete?.();
            return 0;
          }
          return timeLeft - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, onComplete]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    const percentage = (timeLeft / duration) * 100;
    if (percentage <= 10) return "text-red shadow-glow-red";
    if (percentage <= 25) return "text-orange shadow-glow-orange";
    if (percentage <= 50) return "text-yellow shadow-glow-yellow";
    return "text-green shadow-glow-green";
  };

  const getProgressPercentage = () => {
    return ((duration - timeLeft) / duration) * 100;
  };

  const isUrgent = timeLeft <= duration * 0.1; // Last 10% of time
  const isCritical = timeLeft <= 60; // Last minute

  return (
    <div className={`inline-flex items-center space-x-3 ${className}`}>
      {/* Timer Icon with Status */}
      <div className={`relative p-3 rounded-2xl border transition-all duration-300 ${
        isCritical 
          ? "bg-red/10 border-red/30 shadow-glow-red animate-pulse" 
          : isUrgent 
            ? "bg-orange/10 border-orange/30 shadow-glow-orange" 
            : "bg-background-secondary border-border-accent"
      }`}>
        {isCritical ? (
          <AlertCircle className={`h-5 w-5 ${getTimeColor()}`} />
        ) : (
          <Timer className={`h-5 w-5 ${getTimeColor()}`} />
        )}
        
        {/* Pulse indicator for active timer */}
        {isActive && !isCritical && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green rounded-full pulse-glow"></div>
        )}
      </div>

      {/* Time Display */}
      <div className="flex flex-col space-y-1">
        <div className={`font-mono text-2xl font-bold transition-all duration-300 ${getTimeColor()}`}>
          {formatTime(timeLeft)}
        </div>
        
        {/* Progress Bar */}
        <div className="relative w-24 h-1.5 bg-background-secondary rounded-full overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full transition-all duration-1000 ease-out ${
              isCritical 
                ? "bg-gradient-to-r from-red to-orange" 
                : isUrgent 
                  ? "bg-gradient-to-r from-orange to-yellow" 
                  : "bg-gradient-to-r from-pink to-purple"
            }`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        
        {/* Status Text */}
        <div className="text-xs text-muted-foreground">
          {isCritical ? "Critical" : isUrgent ? "Urgent" : "Active"}
        </div>
      </div>

      {/* Floating Animation for Critical State */}
      {isCritical && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-2 h-2 bg-red rounded-full animate-ping"></div>
        </div>
      )}
    </div>
  );
}
