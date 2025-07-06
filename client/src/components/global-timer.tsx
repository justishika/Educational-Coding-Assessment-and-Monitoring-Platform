import { useEffect, useState, useRef } from "react";
import { Clock, AlertTriangle, CheckCircle, Move } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

interface GlobalTimerProps {
  duration: number; // in seconds
  isActive: boolean;
  questionId: number | null;
  onComplete: () => void;
  onWarning?: (timeLeft: number) => void;
  onTimeUpdate?: (timeLeft: number) => void;
}

export default function GlobalTimer({ 
  duration, 
  isActive, 
  questionId, 
  onComplete, 
  onWarning,
  onTimeUpdate 
}: GlobalTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const [isDownloadWarning, setIsDownloadWarning] = useState(false);
  // Initialize position at center top
  const [position, setPosition] = useState(() => {
    const centerX = typeof window !== 'undefined' ? (window.innerWidth - 400) / 2 : 200;
    return { x: centerX, y: 20 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const timerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          
          // Update parent component with current time
          onTimeUpdate?.(newTime);
          
          // Warning at 5 minutes (300 seconds)
          if (newTime <= 300 && !isWarning) {
            setIsWarning(true);
            onWarning?.(newTime);
          }
          
          // Critical at 1 minute (60 seconds)
          if (newTime <= 60 && !isCritical) {
            setIsCritical(true);
          }
          
          // Download warning at 20 seconds
          if (newTime <= 20 && !isDownloadWarning) {
            setIsDownloadWarning(true);
            onWarning?.(newTime);
          }
          
          // Time's up
          if (newTime <= 0) {
            onComplete();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isActive, timeLeft, isWarning, isCritical, isDownloadWarning, onComplete, onWarning]);

  // Reset states when question changes
  useEffect(() => {
    setTimeLeft(duration);
    setIsWarning(false);
    setIsCritical(false);
    setIsDownloadWarning(false);
  }, [duration, questionId]);

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!timerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    // Store the offset between mouse and timer position
    const rect = timerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !timerRef.current) return;
    
    e.preventDefault();
    
    // Calculate new position based on mouse movement and initial offset
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Get timer dimensions for boundary checking
    const rect = timerRef.current.getBoundingClientRect();
    const timerWidth = rect.width;
    const timerHeight = rect.height;
    
    // Allow more liberal boundaries - especially for leftward movement
    const minX = -timerWidth / 2; // Allow timer to go partially off-screen to the left
    const maxX = window.innerWidth - timerWidth / 2; // Allow timer to go partially off-screen to the right
    const minY = 0; // Keep top edge visible
    const maxY = window.innerHeight - timerHeight - 10; // 10px margin from bottom
    
    const constrainedX = Math.max(minX, Math.min(newX, maxX));
    const constrainedY = Math.max(minY, Math.min(newY, maxY));
    
    setPosition({
      x: constrainedX,
      y: constrainedY
    });
  };

  const handleMouseUp = (e: MouseEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      // Add event listeners to document to capture events even over iframes
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      
      // Prevent pointer events on iframes during dragging
      document.body.style.userSelect = 'none';
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        iframe.style.pointerEvents = 'none';
      });
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Restore pointer events
        document.body.style.userSelect = '';
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          iframe.style.pointerEvents = '';
        });
      };
    }
  }, [isDragging, dragOffset]);

  // Handle window resize to keep timer in bounds
  useEffect(() => {
    const handleResize = () => {
      if (!timerRef.current) return;
      
      const rect = timerRef.current.getBoundingClientRect();
      const timerWidth = rect.width;
      const timerHeight = rect.height;
      
      // Use same liberal boundaries as drag logic
      const minX = -timerWidth / 2;
      const maxX = window.innerWidth - timerWidth / 2;
      const minY = 0;
      const maxY = window.innerHeight - timerHeight - 10;
      
      setPosition(prev => ({
        x: Math.max(minX, Math.min(prev.x, maxX)),
        y: Math.max(minY, Math.min(prev.y, maxY))
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isActive || !questionId) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (isCritical) return "text-red";
    if (isWarning) return "text-orange";
    return "text-green";
  };

  const getBackgroundColor = () => {
    if (isCritical) return "bg-red/10 border-red/20";
    if (isWarning) return "bg-orange/10 border-orange/20";
    return "bg-green/10 border-green/20";
  };

  const getIcon = () => {
    if (isCritical) return <AlertTriangle className="h-4 w-4 text-red" />;
    if (isWarning) return <AlertTriangle className="h-4 w-4 text-orange" />;
    return <CheckCircle className="h-4 w-4 text-green" />;
  };

  const getStatusText = () => {
    if (isCritical) return "Critical";
    if (isWarning) return "Warning";
    return "Active";
  };

  return (
    <div 
      ref={timerRef}
      className={`fixed select-none ${isDragging ? 'z-[10000]' : 'z-50'} transition-all duration-200`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'all 0.2s ease-out',
        transform: isDragging ? 'scale(1.05)' : 'scale(1)'
      }}
    >
      <Card className={`shadow-2xl backdrop-blur-glass border-2 transition-all duration-300 hover:scale-105 ${getBackgroundColor()} ${isDragging ? 'shadow-glow-pink' : ''}`}>
        <CardContent className="p-4">
          {/* Drag Handle */}
          <div 
            className={`flex items-center justify-center mb-2 py-1 px-2 rounded transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
              isDragging 
                ? 'opacity-100 bg-pink/20 text-pink scale-110' 
                : 'opacity-60 hover:opacity-100 hover:bg-muted-foreground/10'
            }`}
            onMouseDown={handleMouseDown}
            title="Drag to move timer"
          >
            <Move className={`h-4 w-4 transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`} />
            <span className="text-xs ml-1 font-medium">Drag</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {getIcon()}
              <div className="flex items-center space-x-2">
                <Clock className={`h-6 w-6 ${getTimerColor()}`} />
                <span className={`text-3xl font-bold font-mono ${getTimerColor()} ${isCritical ? 'animate-pulse' : ''}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            
            <div className="h-8 w-px bg-border"></div>
            
            <div className="flex flex-col items-center space-y-1">
              <Badge variant="outline" className={`text-sm border font-medium ${getBackgroundColor()}`}>
                Question {questionId}
              </Badge>
              <span className={`text-sm font-medium ${getTimerColor()}`}>
                {getStatusText()}
              </span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 w-full bg-background-secondary rounded-full h-2 shadow-inner">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 shadow-sm ${
                isCritical ? 'bg-gradient-to-r from-red to-pink animate-pulse' : 
                isWarning ? 'bg-gradient-to-r from-orange to-yellow' : 
                'bg-gradient-to-r from-green to-cyan'
              }`}
              style={{ 
                width: `${(timeLeft / duration) * 100}%` 
              }}
            ></div>
          </div>
          
          {/* Time left indicator */}
          <div className="mt-2 text-center">
            <span className="text-xs text-muted-foreground">
              {Math.floor((timeLeft / duration) * 100)}% remaining
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 