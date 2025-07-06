import { useEffect, useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Shield, Eye, EyeOff, Clock, Zap, CheckCircle, XCircle, Minimize2, Maximize2, X, AlertCircle, Copy, Clipboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface AntiCheatProps {
  userId?: number;
  isInWorkspace?: boolean;
  onViolation?: (violationType: string, details: string) => void;
  isMonitoringActive?: boolean;
  setIsMonitoringActive?: (active: boolean) => void;
  isMonitoringMinimized?: boolean;
  setIsMonitoringMinimized?: (minimized: boolean) => void;
}

interface ViolationRecord {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface WarningPopup {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  autoClose?: boolean;
}

interface BottomRightNotification {
  id: string;
  message: string;
  type: 'warning' | 'error' | 'info';
  timestamp: Date;
  duration?: number;
}

export default function AntiCheat({ 
  userId, 
  isInWorkspace = false, 
  onViolation,
  isMonitoringActive = true,
  setIsMonitoringActive,
  isMonitoringMinimized = false,
  setIsMonitoringMinimized
}: AntiCheatProps) {
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  // Use external monitoring state instead of internal state
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionStartTime] = useState(Date.now());
  const [warningPopups, setWarningPopups] = useState<WarningPopup[]>([]);
  const [bottomNotifications, setBottomNotifications] = useState<BottomRightNotification[]>([]);
  const iframeMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Add bottom-right notification
  const addBottomNotification = useCallback((message: string, type: 'warning' | 'error' | 'info' = 'warning', duration = 5000) => {
    const notification: BottomRightNotification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      message,
      type,
      timestamp: new Date(),
      duration
    };

    setBottomNotifications(prev => [...prev, notification].slice(-3)); // Keep only last 3

    // Auto-remove after duration
    setTimeout(() => {
      setBottomNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, duration);
  }, []);
  
  // Show warning popup
  const showWarningPopup = useCallback((title: string, message: string, severity: ViolationRecord['severity'], autoClose = true) => {
    const popup: WarningPopup = {
      id: `popup-${Date.now()}-${Math.random()}`,
      title,
      message,
      severity,
      timestamp: new Date(),
      autoClose
    };

    setWarningPopups(prev => [...prev, popup]);

    // Auto-close popup after 4 seconds for non-critical warnings
    if (autoClose && severity !== 'critical') {
      setTimeout(() => {
        setWarningPopups(prev => prev.filter(p => p.id !== popup.id));
      }, 4000);
    }
  }, []);

  // Dismiss popup
  const dismissPopup = useCallback((popupId: string) => {
    setWarningPopups(prev => prev.filter(p => p.id !== popupId));
  }, []);

  const reportViolation = useCallback((type: string, details: string, severity: ViolationRecord['severity'] = 'medium') => {
    const newViolation: ViolationRecord = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message: details,
      timestamp: new Date(),
      severity
    };
    
    setViolations(prev => {
      // Keep only last 10 violations to prevent memory issues
      const updated = [...prev, newViolation].slice(-10);
      return updated;
    });
    
    // Call external violation handler if provided
    onViolation?.(type, details);
    
    // Show warning popup based on violation type and severity
    let popupTitle = "Security Warning";
    let popupMessage = details;
    let showPopup = false;

    switch (type) {
      case "TAB_SWITCH":
        if (isInWorkspace) {
          popupTitle = "🚨 CRITICAL VIOLATION: Workspace Tab Switch";
          popupMessage = `You switched away from the coding workspace during an active session! This is a serious academic integrity violation. Your session is being monitored and this incident will be reported to instructors immediately.`;
          addBottomNotification("🚨 WORKSPACE VIOLATION - INSTRUCTOR ALERTED!", 'error');
        } else {
          popupTitle = "🚨 SECURITY ALERT: Tab Switch Detected";
          popupMessage = `You switched away from the exam window. This action has been logged and flagged for review. Multiple tab switches may result in automatic session termination. Please keep focus on your exam at all times.`;
          addBottomNotification("🚨 TAB SWITCH DETECTED - Action logged!", 'error');
        }
        showPopup = true;
        
        // Show additional warning for repeated switches
        if (details.includes('times')) {
          toast({
            title: isInWorkspace ? "🚨 CRITICAL WORKSPACE VIOLATIONS" : "⚠️ MULTIPLE TAB SWITCHES",
            description: `${details}. ${isInWorkspace ? 'Workspace violations are automatically reported!' : 'Continued violations may terminate your session.'}`,
            variant: "destructive",
          });
        }
        break;
      case "IFRAME_COPY":
        popupTitle = "🚫 Copy Blocked";
        popupMessage = `Copy operation was blocked in the coding environment. Please work independently without external assistance.`;
        showPopup = true;
        break;
      case "IFRAME_PASTE":
        popupTitle = "🚫 Paste Blocked";
        popupMessage = `Paste operation was blocked in the coding environment. Please type your code manually to ensure academic integrity.`;
        showPopup = true;
        break;
      case "SHORTCUT_DETECTED":
        if (severity === 'high' || severity === 'critical') {
          popupTitle = "🚫 Prohibited Action";
          popupMessage = `Unauthorized keyboard shortcut detected: ${details}. This action is not allowed during the exam.`;
          showPopup = true;
        } else if (details.includes('Copy') || details.includes('Paste')) {
          popupTitle = "📋 Copy/Paste Detected";
          popupMessage = `${details}. Please ensure you're working independently on your exam.`;
          showPopup = true;
          addBottomNotification("📋 Copy/Paste attempt logged", 'warning');
        }
        break;
      case "RIGHT_CLICK":
        popupTitle = "🖱️ Right-Click Disabled";
        popupMessage = "Right-click functionality is disabled during the exam for security purposes.";
        showPopup = true;
        break;
    }

    if (showPopup) {
      showWarningPopup(popupTitle, popupMessage, severity, severity !== 'critical');
    }
    
    // Show toast notification only for high/critical violations
    if (severity === 'high' || severity === 'critical') {
      toast({
        title: "Security Notice",
        description: details,
        variant: severity === 'critical' ? "destructive" : "default",
      });
    }

    // Log to server
    fetch("/api/log-violation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        type,
        details,
        severity,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }),
    }).catch(err => console.error("Failed to log violation:", err));

  }, [userId, onViolation, toast, showWarningPopup, addBottomNotification, isInWorkspace]);

  // Tab visibility detection with improved logic and immediate alerts
  useEffect(() => {
    let switchTimeout: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (document.hidden && isMonitoringActive) {
        // Show immediate alert without debounce for first detection
        const count = tabSwitchCount + 1;
        setTabSwitchCount(count);
        
        let severity: ViolationRecord['severity'] = 'medium';
        if (count > 5) severity = 'high';
        if (count > 10) severity = 'critical';
        
        // Play audio alert for tab switch
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+TwrmEcBjiR2e7dfTUEL4DW8M19NT0U');
          audio.volume = 0.1;
          audio.play().catch(() => {}); // Ignore errors if audio blocked
        } catch (e) {
          // Ignore errors if audio not supported
        }
        
        // Clear previous timeout and show immediate alert
        clearTimeout(switchTimeout);
        
        // Show immediate notification
        reportViolation(
          "TAB_SWITCH", 
          `Lost focus on exam window${count > 3 ? ` (${count} times)` : ''} - IMMEDIATE ALERT`,
          severity
        );
        
        // Show additional browser alert for critical violations
        if (count > 3 || (isInWorkspace && count > 1)) {
          try {
            const workspaceWarning = isInWorkspace 
              ? `\n\n🚨 WORKSPACE VIOLATION DETECTED 🚨\nYou are currently in an active coding session!\nTab switching during coding is a serious academic integrity violation.`
              : '';
            
            if (confirm(`⚠️ SECURITY VIOLATION ⚠️\n\nYou have switched tabs ${count} times during the exam.\nThis behavior is being monitored and logged.${workspaceWarning}\n\nContinued violations may result in automatic session termination.\n\nClick OK to acknowledge this warning.`)) {
              console.log('Student acknowledged tab switch warning');
            }
          } catch (e) {
            // Fallback if confirm dialog blocked
            console.warn('Tab switch warning - confirmation dialog blocked');
          }
        }
        
        // Additional immediate workspace alert
        if (isInWorkspace) {
          setTimeout(() => {
            try {
              alert(`🚨 WORKSPACE MONITORING ALERT 🚨\n\nYou switched away from your coding workspace!\n\nThis incident has been logged and will be reviewed by instructors.\n\nPlease return to your coding environment immediately.`);
            } catch (e) {
              console.warn('Workspace alert blocked');
            }
          }, 500);
        }
      }
      setLastActivity(Date.now());
    };

    const handleFocus = () => {
      setLastActivity(Date.now());
      clearTimeout(switchTimeout);
    };

    const handleBlur = () => {
      setLastActivity(Date.now());
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      clearTimeout(switchTimeout);
    };
  }, [isMonitoringActive, tabSwitchCount, reportViolation, isInWorkspace]);

  // Keyboard shortcuts detection with better UX
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isMonitoringActive) return;

      // Only block truly problematic shortcuts
      const criticalShortcuts = [
        { keys: ["F12"], description: "Developer tools blocked", severity: 'high' as const },
        { keys: ["Control", "Shift", "I"], description: "Developer tools blocked", severity: 'high' as const },
        { keys: ["Control", "Shift", "J"], description: "Console access blocked", severity: 'high' as const },
        { keys: ["Control", "u"], description: "View source blocked", severity: 'medium' as const },
      ];

      // Enhanced copy/paste detection with warnings
      const warningShortcuts = [
        { keys: ["Control", "c"], description: "Copy detected - ensure academic integrity", severity: 'medium' as const },
        { keys: ["Control", "v"], description: "Paste detected - ensure academic integrity", severity: 'medium' as const },
      ];

      const allShortcuts = [...criticalShortcuts, ...warningShortcuts];

      for (const shortcut of allShortcuts) {
        const isPressed = shortcut.keys.every(key => {
          if (key === "Control") return event.ctrlKey;
          if (key === "Shift") return event.shiftKey;
          if (key === "Alt") return event.altKey;
          return event.key === key || event.code === key;
        });

        if (isPressed) {
          // Only prevent critical shortcuts
          if (criticalShortcuts.includes(shortcut)) {
            event.preventDefault();
          } else {
            // For copy/paste, show warning but allow for now (can be disabled completely if needed)
            addBottomNotification(
              shortcut.keys.includes("c") ? "📋 Copy action detected" : "📋 Paste action detected", 
              'warning'
            );
          }
          reportViolation("SHORTCUT_DETECTED", shortcut.description, shortcut.severity);
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMonitoringActive, reportViolation, addBottomNotification]);

  // Right-click with educational message
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      if (isMonitoringActive) {
        event.preventDefault();
        reportViolation("RIGHT_CLICK", "Right-click disabled during exam", 'low');
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [isMonitoringActive, reportViolation]);

  // Enhanced iframe copy-paste prevention
  useEffect(() => {
    if (!isMonitoringActive) return;

    const preventIframeCopyPaste = () => {
      // Find all iframes (especially VS Code)
      const iframes = document.querySelectorAll('iframe');
      
      iframes.forEach((iframe) => {
        try {
          // Inject anti-copy-paste script into iframe
          const injectedScript = `
            (function() {
              console.log('🛡️ Anti-cheat protection injected into iframe');
              
              // Prevent copy shortcuts
              document.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.parent.postMessage({
                    type: 'IFRAME_COPY_ATTEMPT',
                    source: 'vs-code-iframe',
                    timestamp: new Date().toISOString()
                  }, '*');
                  return false;
                }
                
                // Prevent paste shortcuts
                if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.parent.postMessage({
                    type: 'IFRAME_PASTE_ATTEMPT',
                    source: 'vs-code-iframe',
                    timestamp: new Date().toISOString()
                  }, '*');
                  return false;
                }

                // Block other problematic shortcuts
                if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
                  // Allow select all but log it
                  window.parent.postMessage({
                    type: 'IFRAME_SELECT_ALL',
                    source: 'vs-code-iframe',
                    timestamp: new Date().toISOString()
                  }, '*');
                }
              }, true);

              // Prevent right-click context menu
              document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                window.parent.postMessage({
                  type: 'IFRAME_RIGHT_CLICK',
                  source: 'vs-code-iframe',
                  timestamp: new Date().toISOString()
                }, '*');
                return false;
              }, true);

              // Monitor clipboard access attempts
              if (navigator.clipboard) {
                const originalRead = navigator.clipboard.read;
                const originalReadText = navigator.clipboard.readText;
                const originalWrite = navigator.clipboard.write;
                const originalWriteText = navigator.clipboard.writeText;

                navigator.clipboard.read = function() {
                  window.parent.postMessage({
                    type: 'IFRAME_CLIPBOARD_READ',
                    source: 'vs-code-iframe',
                    timestamp: new Date().toISOString()
                  }, '*');
                  return Promise.reject(new Error('Clipboard access blocked'));
                };

                navigator.clipboard.readText = function() {
                  window.parent.postMessage({
                    type: 'IFRAME_CLIPBOARD_READ_TEXT',
                    source: 'vs-code-iframe',
                    timestamp: new Date().toISOString()
                  }, '*');
                  return Promise.reject(new Error('Clipboard access blocked'));
                };

                navigator.clipboard.write = function() {
                  window.parent.postMessage({
                    type: 'IFRAME_CLIPBOARD_WRITE',
                    source: 'vs-code-iframe',
                    timestamp: new Date().toISOString()
                  }, '*');
                  return Promise.reject(new Error('Clipboard access blocked'));
                };

                navigator.clipboard.writeText = function() {
                  window.parent.postMessage({
                    type: 'IFRAME_CLIPBOARD_WRITE_TEXT',
                    source: 'vs-code-iframe',
                    timestamp: new Date().toISOString()
                  }, '*');
                  return Promise.reject(new Error('Clipboard access blocked'));
                };
              }
            })();
          `;

          // Try to inject script (will fail for cross-origin iframes, but worth trying)
          try {
            if (iframe.contentDocument) {
              const script = iframe.contentDocument.createElement('script');
              script.textContent = injectedScript;
              iframe.contentDocument.head?.appendChild(script);
            }
          } catch (e) {
            // Cross-origin restriction - use postMessage approach
            console.log('Cross-origin iframe detected, using postMessage monitoring');
          }

          // Set iframe attributes to prevent copying
          iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox');
          iframe.style.userSelect = 'none';
          iframe.style.webkitUserSelect = 'none';
          
        } catch (error) {
          console.warn('Failed to apply iframe protection:', error);
        }
      });
    };

    // Initial injection
    preventIframeCopyPaste();

    // Monitor for new iframes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && (node as Element).tagName === 'IFRAME') {
            setTimeout(() => preventIframeCopyPaste(), 1000); // Delay to allow iframe to load
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Set up periodic re-injection for dynamic content
    iframeMonitorRef.current = setInterval(preventIframeCopyPaste, 5000);

    return () => {
      observer.disconnect();
      if (iframeMonitorRef.current) {
        clearInterval(iframeMonitorRef.current);
      }
    };
  }, [isMonitoringActive]);

  // Listen for iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isMonitoringActive) return;

      const { type, source } = event.data;
      
      if (source === 'vs-code-iframe') {
        switch (type) {
          case 'IFRAME_COPY_ATTEMPT':
            reportViolation("IFRAME_COPY", "Copy attempt blocked in VS Code", 'high');
            addBottomNotification("🚫 Copy disabled in coding environment", 'error');
            break;
          case 'IFRAME_PASTE_ATTEMPT':
            reportViolation("IFRAME_PASTE", "Paste attempt blocked in VS Code", 'high');
            addBottomNotification("🚫 Paste disabled in coding environment", 'error');
            break;
          case 'IFRAME_RIGHT_CLICK':
            reportViolation("IFRAME_RIGHT_CLICK", "Right-click blocked in VS Code", 'medium');
            addBottomNotification("🖱️ Right-click disabled during exam", 'warning');
            break;
          case 'IFRAME_SELECT_ALL':
            reportViolation("IFRAME_SELECT_ALL", "Select all used in VS Code", 'low');
            addBottomNotification("ℹ️ Text selection logged", 'info');
            break;
          case 'IFRAME_CLIPBOARD_READ':
          case 'IFRAME_CLIPBOARD_READ_TEXT':
            reportViolation("IFRAME_CLIPBOARD_READ", "Clipboard read attempt blocked", 'high');
            addBottomNotification("🚫 Clipboard access denied", 'error');
            break;
          case 'IFRAME_CLIPBOARD_WRITE':
          case 'IFRAME_CLIPBOARD_WRITE_TEXT':
            reportViolation("IFRAME_CLIPBOARD_WRITE", "Clipboard write attempt blocked", 'high');
            addBottomNotification("🚫 Clipboard access denied", 'error');
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isMonitoringActive, addBottomNotification]);
  
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSessionDuration = () => {
    const duration = Math.floor((Date.now() - sessionStartTime) / 1000 / 60);
    return `${duration}m`;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-3 w-3 text-red" />;
      case 'high': return <AlertTriangle className="h-3 w-3 text-orange" />;
      case 'medium': return <AlertTriangle className="h-3 w-3 text-yellow" />;
      default: return <CheckCircle className="h-3 w-3 text-blue" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return "bg-red/10 text-red border-red/20";
      case 'high': return "bg-orange/10 text-orange border-orange/20";
      case 'medium': return "bg-yellow/10 text-yellow border-yellow/20";
      default: return "bg-blue/10 text-blue border-blue/20";
    }
  };

  const getPopupSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return "border-red bg-red/5";
      case 'high': return "border-orange bg-orange/5";
      case 'medium': return "border-yellow bg-yellow/5";
      default: return "border-blue bg-blue/5";
    }
  };

  const getPopupIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-6 w-6 text-red" />;
      case 'high': return <AlertTriangle className="h-6 w-6 text-orange" />;
      case 'medium': return <AlertCircle className="h-6 w-6 text-yellow" />;
      default: return <Shield className="h-6 w-6 text-blue" />;
    }
  };

  const criticalViolations = violations.filter(v => v.severity === 'critical').length;
  const highViolations = violations.filter(v => v.severity === 'high').length;

  if (isMonitoringMinimized) {
    return (
      <>
        {/* Warning Popups */}
        {warningPopups.map((popup) => (
          <div key={popup.id} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] max-w-md w-full mx-4">
            <Card className={`shadow-2xl border-2 ${getPopupSeverityColor(popup.severity)} animate-in zoom-in-95 duration-300`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getPopupIcon(popup.severity)}
                    <div>
                      <CardTitle className="text-lg font-bold text-foreground">{popup.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{formatTime(popup.timestamp)}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => dismissPopup(popup.id)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed">{popup.message}</p>
                {popup.severity === 'critical' && (
                  <div className="mt-4 p-3 bg-red/10 border border-red/20 rounded-lg">
                    <p className="text-sm text-red font-medium">
                      ⚠️ This is a serious violation. Continued suspicious activity may result in exam termination.
                    </p>
                  </div>
                )}
                <div className="mt-4 flex justify-end space-x-2">
                  <Button
                    onClick={() => dismissPopup(popup.id)}
                    variant="outline"
                    size="sm"
                  >
                    Understood
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Bottom-right notifications */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-80">
          {bottomNotifications.map((notification) => (
            <Card key={notification.id} className={`
              shadow-lg border transition-all duration-300 animate-in slide-in-from-right-5
              ${notification.type === 'error' ? 'border-red bg-red/5' : 
                notification.type === 'warning' ? 'border-orange bg-orange/5' : 
                'border-blue bg-blue/5'}
            `}>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  {notification.type === 'error' && <XCircle className="h-4 w-4 text-red flex-shrink-0" />}
                  {notification.type === 'warning' && <AlertTriangle className="h-4 w-4 text-orange flex-shrink-0" />}
                  {notification.type === 'info' && <CheckCircle className="h-4 w-4 text-blue flex-shrink-0" />}
                  <p className="text-sm font-medium text-foreground">{notification.message}</p>
                  <Button
                    onClick={() => setBottomNotifications(prev => prev.filter(n => n.id !== notification.id))}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 flex-shrink-0 ml-auto"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom-right notifications */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-80">
          {bottomNotifications.map((notification) => (
            <Card key={notification.id} className={`
              shadow-lg border transition-all duration-300 animate-in slide-in-from-right-5
              ${notification.type === 'error' ? 'border-red bg-red/5' : 
                notification.type === 'warning' ? 'border-orange bg-orange/5' : 
                'border-blue bg-blue/5'}
            `}>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  {notification.type === 'error' && <XCircle className="h-4 w-4 text-red flex-shrink-0" />}
                  {notification.type === 'warning' && <AlertTriangle className="h-4 w-4 text-orange flex-shrink-0" />}
                  {notification.type === 'info' && <CheckCircle className="h-4 w-4 text-blue flex-shrink-0" />}
                  <p className="text-sm font-medium text-foreground">{notification.message}</p>
                  <Button
                    onClick={() => setBottomNotifications(prev => prev.filter(n => n.id !== notification.id))}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 flex-shrink-0 ml-auto"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="fixed top-28 right-4 z-50">
          <Button
            onClick={() => setIsMonitoringMinimized?.(false)}
            className="bg-card-elevated border border-border-accent hover:bg-background-secondary p-3 shadow-elevated"
            variant="ghost"
          >
            <Shield className={`h-4 w-4 ${isMonitoringActive ? 'text-green' : 'text-muted-foreground'}`} />
            {criticalViolations > 0 && (
              <Badge className="ml-2 bg-red text-white text-xs px-1 py-0 h-4 min-w-4">
                {criticalViolations}
              </Badge>
            )}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Warning Popups */}
      {warningPopups.map((popup) => (
        <div key={popup.id} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] max-w-md w-full mx-4">
          <Card className={`shadow-2xl border-2 ${getPopupSeverityColor(popup.severity)} animate-in zoom-in-95 duration-300 bg-background`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getPopupIcon(popup.severity)}
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground">{popup.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{formatTime(popup.timestamp)}</p>
                  </div>
                </div>
                <Button
                  onClick={() => dismissPopup(popup.id)}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed">{popup.message}</p>
              {popup.severity === 'critical' && (
                <div className="mt-4 p-3 bg-red/10 border border-red/20 rounded-lg">
                  <p className="text-sm text-red font-medium">
                    ⚠️ This is a serious violation. Continued suspicious activity may result in exam termination.
                  </p>
                </div>
              )}
              <div className="mt-4 flex justify-end space-x-2">
                <Button
                  onClick={() => dismissPopup(popup.id)}
                  variant="outline"
                  size="sm"
                >
                  Understood
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}

      {!isInWorkspace && (
        <div className="fixed top-48 right-4 z-50 max-w-96">
          <Card className="card-elevated border-border-accent shadow-elevated bg-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl transition-all duration-300 ${
                  isMonitoringActive 
                    ? 'bg-gradient-to-r from-green to-cyan shadow-glow-green' 
                    : 'bg-background-secondary'
                }`}>
                  <Shield className={`h-5 w-5 ${isMonitoringActive ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">Exam Monitor</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Session: {getSessionDuration()} • {isMonitoringActive ? 'Active' : 'Paused'}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Statistics Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-background-secondary rounded-lg border border-border">
                <div className="text-2xl font-bold text-blue">{tabSwitchCount}</div>
                <div className="text-sm text-muted-foreground">Focus Lost</div>
              </div>
              <div className="text-center p-4 bg-background-secondary rounded-lg border border-border">
                <div className="text-2xl font-bold text-orange">{highViolations}</div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div className="text-center p-4 bg-background-secondary rounded-lg border border-border">
                <div className="text-2xl font-bold text-red">{criticalViolations}</div>
                <div className="text-sm text-muted-foreground">Critical</div>
              </div>
            </div>

            {/* Recent Activity */}
            {violations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Recent Activity</span>
                  <Badge variant="outline" className="text-xs px-2 py-0">
                    {violations.length} events
                  </Badge>
                </div>
                
                <div className="max-h-28 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {violations.slice(-4).reverse().map((violation) => (
                    <div key={violation.id} className={`p-2 rounded-lg border text-xs ${getSeverityColor(violation.severity)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1">
                          {getSeverityIcon(violation.severity)}
                          <span className="font-medium capitalize">{violation.type.replace('_', ' ').toLowerCase()}</span>
                        </div>
                        <span className="text-xs opacity-60">{formatTime(violation.timestamp)}</span>
                      </div>
                      <div className="text-xs opacity-80">{violation.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {violations.length === 0 && (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 text-green mx-auto mb-2" />
                <p className="text-sm text-green font-medium">All Clear</p>
                <p className="text-xs text-muted-foreground">No security events detected</p>
              </div>
            )}

            {/* Security Features Status */}
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-xs text-muted-foreground">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between">
                    <span>Tab Monitor</span>
                    <Zap className="h-3 w-3 text-green" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Key Logging</span>
                    <Zap className="h-3 w-3 text-green" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Right-click Block</span>
                    <Zap className="h-3 w-3 text-green" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dev Tools Block</span>
                    <Zap className="h-3 w-3 text-green" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Bottom-right notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-80">
        {bottomNotifications.map((notification) => (
          <Card key={notification.id} className={`
            shadow-lg border transition-all duration-300 animate-in slide-in-from-right-5
            ${notification.type === 'error' ? 'border-red bg-red/5' : 
              notification.type === 'warning' ? 'border-orange bg-orange/5' : 
              'border-blue bg-blue/5'}
          `}>
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                {notification.type === 'error' && <XCircle className="h-4 w-4 text-red flex-shrink-0" />}
                {notification.type === 'warning' && <AlertTriangle className="h-4 w-4 text-orange flex-shrink-0" />}
                {notification.type === 'info' && <CheckCircle className="h-4 w-4 text-blue flex-shrink-0" />}
                <p className="text-sm font-medium text-foreground">{notification.message}</p>
                <Button
                  onClick={() => setBottomNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 flex-shrink-0 ml-auto"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
