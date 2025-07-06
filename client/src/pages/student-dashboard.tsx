import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AntiCheat from "@/components/anti-cheat";
// import ScreenCapture from "@/components/screen-capture"; // Disabled in favor of Puppeteer
import PuppeteerScreenshot from "@/components/puppeteer-screenshot";
import ScreenShare from "@/components/screen-share";
import { useToast } from "@/hooks/use-toast";
import CountdownTimer from "@/components/countdown-timer";
import { QuestionList } from "@/components/QuestionList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GradeCard from "@/components/GradeCard";
import GlobalTimer from "@/components/global-timer";
import FileUpload from "@/components/file-upload";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Grade {
  id: string;
  subject: string;
  score: number;
  maxScore: number;
  submittedAt: string;
  timestamp?: string; // API might return timestamp instead
  feedback?: string;
  status: "graded" | "pending" | "late";
}
import { 
  Play, 
  Code2, 
  Camera, 
  Monitor, 
  Share2, 
  Timer, 
  Trophy,
  Terminal,
  Zap,
  User,
  LogOut,
  BookOpen,
  Activity,
  Award,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Settings,
  Bell,
  Shield,
  Upload,
  StopCircle,
  Download,
  FileText,
  Clock,
  Eye,
  EyeOff
} from "lucide-react";

function Codespace({ url, isSessionEnded = false }: { url: string; isSessionEnded?: boolean }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleFullscreen = async () => {
    if (!containerRef.current || !iframeRef.current) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen mode - focus on the container for better UX
        setIsFullscreen(true);
        
        // Scroll to top to ensure proper fullscreen view
        window.scrollTo(0, 0);
        
        // Disable body scrolling when in fullscreen
        document.body.style.overflow = 'hidden';
        
        // Optional: Send a message to the iframe to maximize VS Code
        try {
          iframeRef.current.contentWindow?.postMessage({
            type: 'codelab-fullscreen',
            action: 'enter'
          }, '*');
        } catch (e) {
          // Ignore cross-origin errors
        }
      } else {
        // Exit fullscreen mode
        setIsFullscreen(false);
        
        // Re-enable body scrolling
        document.body.style.overflow = 'auto';
        
        // Optional: Send a message to the iframe to restore VS Code
        try {
          iframeRef.current.contentWindow?.postMessage({
            type: 'codelab-fullscreen',
            action: 'exit'
          }, '*');
        } catch (e) {
          // Ignore cross-origin errors
        }
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  // Listen for escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        // Re-enable body scrolling when exiting via ESC
        document.body.style.overflow = 'auto';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Cleanup on unmount - ensure body scrolling is restored
  useEffect(() => {
    return () => {
      if (isFullscreen) {
        document.body.style.overflow = 'auto';
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 z-[9999] bg-background w-screen h-screen' 
          : 'rounded-2xl border border-border-accent shadow-elevated'
      }`}
      style={isFullscreen ? { 
        width: '100vw', 
        height: '100vh',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        position: 'fixed',
        zIndex: 9999
      } : {}}
    >
      <div className={`absolute top-0 left-0 right-0 h-10 flex items-center px-4 z-10 transition-all duration-300 ${
        isFullscreen 
          ? 'bg-background-secondary/95 backdrop-blur-md border-b border-border-accent/50' 
          : 'bg-background-secondary border-b border-border-accent'
      }`}>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red"></div>
          <div className="w-3 h-3 rounded-full bg-yellow"></div>
          <div className="w-3 h-3 rounded-full bg-green"></div>
        </div>
        <div className="flex-1 text-center">
          <span className="text-sm text-muted-foreground font-medium">
            VS Code - CodeLab Pro {isFullscreen && '(Fullscreen Mode)'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {isFullscreen && (
            <div className="text-xs text-muted-foreground mr-2 hidden sm:block">
              Press ESC to exit
            </div>
          )}
          <Button
            onClick={toggleFullscreen}
            size="sm"
            variant="ghost"
            className={`h-6 w-6 p-0 transition-all duration-200 ${
              isFullscreen 
                ? 'hover:bg-pink/20 hover:text-pink text-pink' 
                : 'hover:bg-blue/20 hover:text-blue text-muted-foreground'
            }`}
            title={isFullscreen ? "Exit Fullscreen (ESC)" : "Enter Fullscreen Mode"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          <div className="pulse-glow w-3 h-3 rounded-full bg-green"></div>
        </div>
      </div>
      
      {/* Session Ended Warning Overlay */}
      {isSessionEnded && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <Timer className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Session Ended
              </h3>
              <p className="text-gray-600 mb-6">
                Your coding session has been terminated. VS Code is now in read-only mode.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  You can download files directly from VS Code using the File menu if needed
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        src={url}
        width="100%"
        height={isFullscreen ? "calc(100vh - 40px)" : "700"}
        style={{ 
          border: "none", 
          marginTop: "40px",
          width: isFullscreen ? "100vw" : "100%",
          height: isFullscreen ? "calc(100vh - 40px)" : "700px",
          minHeight: isFullscreen ? "calc(100vh - 40px)" : "700px",
          maxWidth: isFullscreen ? "100vw" : "100%",
          maxHeight: isFullscreen ? "calc(100vh - 40px)" : "700px",
          pointerEvents: isSessionEnded ? "none" : "auto",
          opacity: isSessionEnded ? 0.5 : 1,
          display: "block"
        }}
        title="Student Codespace"
        className={`bg-background-secondary transition-all duration-300 ${
          isFullscreen ? 'w-full h-full' : ''
        } ${isSessionEnded ? 'filter grayscale' : ''}`}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-top-navigation allow-top-navigation-by-user-activation allow-modals allow-orientation-lock allow-pointer-lock allow-presentation"
        allow="clipboard-read; clipboard-write; fullscreen; downloads; camera; microphone; display-capture; geolocation; autoplay"
      />
    </div>
  );
}

const waitForCodespace = (url: string, timeout = 15000) => {
  return new Promise<boolean>((resolve) => {
    const start = Date.now();
    let settled = false;

    async function tryLoad() {
      if (Date.now() - start > timeout) {
        if (!settled) {
          settled = true;
          resolve(false);
        }
        return;
      }

      try {
        await fetch(url, { mode: "no-cors" });
        if (!settled) {
          settled = true;
          resolve(true);
        }
      } catch (err) {
        setTimeout(tryLoad, 1000);
      }
    }

    tryLoad();
  });
};

export default function StudentDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState("JavaScript");
  const [codespaceUrl, setCodespaceUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [currentQuestionDetails, setCurrentQuestionDetails] = useState<{
    id: number;
    title: string;
    description: string;
    language: string;
    difficulty: string;
    timeLimit: number;
    createdAt: string;
  } | null>(null);
  const [showQuestionDetails, setShowQuestionDetails] = useState(false);

  const [code, setCode] = useState("");
  const [activeTab, setActiveTab] = useState("questions");
  const [sessionDuration, setSessionDuration] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isInWorkspaceTab, setIsInWorkspaceTab] = useState(false);
  const [isMonitoringActive, setIsMonitoringActive] = useState(true);
  const [isMonitoringMinimized, setIsMonitoringMinimized] = useState(false);

  // Track workspace tab usage for enhanced anti-cheat
  useEffect(() => {
    const newIsInWorkspace = activeTab === "workspace" && !!codespaceUrl;
    console.log('🔍 Workspace tracking update:', {
      activeTab,
      codespaceUrl: !!codespaceUrl,
      newIsInWorkspace,
      previousIsInWorkspace: isInWorkspaceTab
    });
    setIsInWorkspaceTab(newIsInWorkspace);
  }, [activeTab, codespaceUrl]);



  // Fetch grades with enhanced real-time updates
  const { data: gradesData, isLoading: isGradesLoading, isFetching: isFetchingGrades, refetch: refetchGrades } = useQuery<Grade[]>({
    queryKey: ["/api/student/grades"],
    queryFn: async () => {
      const response = await fetch("/api/student/grades", {
        credentials: "include",
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch grades: ${response.status}`);
      }
      const data = await response.json();
            
      // Ensure we always return an array for grades
      const gradesArray = Array.isArray(data) ? data : [];
        
      // Transform grades to ensure proper field mapping
      return gradesArray.map((grade: any) => ({
        ...grade,
        submittedAt: grade.submittedAt || grade.timestamp || new Date().toISOString(),
        status: grade.status || "graded", // Default status if not provided
        maxScore: grade.maxScore || 100 // Default max score
      }));
    },
    enabled: !!user?.email,
    refetchInterval: 2000, // Faster polling - every 2 seconds for immediate grade updates
    refetchIntervalInBackground: true,
    staleTime: 500, // Very short stale time to ensure fresh data
    retry: 3, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
  });

  const grades = gradesData || [];

  // Listen for real-time grade updates from admin dashboard
  useEffect(() => {
    let gradeUpdateChannel: BroadcastChannel | null = null;
    
    try {
      // Use BroadcastChannel for cross-tab communication
      gradeUpdateChannel = new BroadcastChannel('grade-updates');
      
      gradeUpdateChannel.onmessage = (event) => {
        if (event.data.type === 'GRADE_UPDATED') {
          console.log('📊 Grade update received via BroadcastChannel');
          
          // Immediately refetch grades
          refetchGrades();
          
          toast({
            title: "🎉 Grade Updated!",
            description: "Your grade has been updated by the instructor",
          });
        }
      };
    } catch (error) {
      console.log('BroadcastChannel not supported, using localStorage fallback');
      
      // Fallback: Listen for localStorage changes
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'grade-update-trigger') {
          console.log('📊 Grade update received via localStorage');
          
          // Immediately refetch grades
          refetchGrades();
          
          toast({
            title: "🎉 Grade Updated!",
            description: "Your grade has been updated by the instructor",
          });
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
    
    return () => {
      if (gradeUpdateChannel) {
        gradeUpdateChannel.close();
      }
    };
  }, [refetchGrades, toast]);

  // Listen for window focus to refresh grades immediately when tab becomes active
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔍 Window focused, checking for grade updates...');
      refetchGrades();
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetchGrades]);

  // Manual refresh function
  const handleManualRefresh = () => {
    refetchGrades();
    toast({
      title: "Grades refreshed",
      description: "Your grade data has been updated",
    });
  };

  const handleLaunchCodespace = async () => {
    setIsLoading(true);
    const res = await fetch("/api/container/spin-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: subject, userId: user?.id })
    });

    const data = await res.json();
    const ready = await waitForCodespace(data.url);
    setIsLoading(false);

    if (ready) {
      setCodespaceUrl(data.url);
      toast({
        title: "🚀 Codespace Launched!",
        description: "Your coding environment is ready. Automatic Puppeteer screenshots will begin in 5 seconds.",
      });
    } else {
      toast({
        title: "Codespace failed to start",
        description: "Timed out waiting for codespace to become available.",
        variant: "destructive",
      });
    }
  };

  const handleManualScreenshot = async () => {
    if (!codespaceUrl) {
      toast({
        title: "No Codespace Active",
        description: "Please launch a codespace first to capture a screenshot.",
        variant: "destructive",
      });
      return;
    }

    setIsCapturingScreenshot(true);

    try {
      const response = await fetch("/api/capture-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          containerUrl: codespaceUrl
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "📸 Puppeteer Screenshot Captured!",
          description: `High-quality screenshot saved to MongoDB Atlas (${result.imageSize}KB). Real codespace content captured!`,
        });
      } else {
        toast({
          title: "Screenshot Failed",
          description: result.error || "Failed to capture screenshot via Puppeteer",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Manual screenshot error:", error);
      toast({
        title: "Screenshot Error",
        description: "Failed to communicate with the server",
        variant: "destructive",
      });
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handleDesktopCapture = async () => {
    setIsCapturingScreenshot(true);

    try {
      console.log('🖥️ Starting desktop capture request...');

      const response = await fetch("/api/capture-desktop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `${subject}-desktop`
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('🖥️ Desktop capture response:', result);

      if (result.success) {
        toast({
          title: "🖥️ Desktop Screen Captured!",
          description: `Full desktop screenshot saved to MongoDB Atlas (${result.imageSize}KB). Entire screen captured!`,
        });
        console.log('✅ Desktop capture successful:', result.filename);
      } else {
        console.error('❌ Desktop capture failed:', result.error);
        toast({
          title: "Desktop Capture Failed",
          description: result.error || result.message || "Failed to capture desktop screen",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Desktop capture error:", error);

      let errorMessage = "Failed to communicate with the server";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      if (errorMessage.includes('permissions')) {
        errorMessage = "Desktop capture requires screen sharing permissions. Please allow when prompted.";
      } else if (errorMessage.includes('not supported')) {
        errorMessage = "Desktop capture is not supported in this browser. Please use Chrome or Edge.";
      } else if (errorMessage.includes('network')) {
        errorMessage = "Network error occurred. Please check your connection and try again.";
      }

      toast({
        title: "Desktop Capture Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const fetchQuestionDetails = async (questionId: number) => {
    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch question: ${response.status}`);
      }
      
      const questionData = await response.json();
      setCurrentQuestionDetails(questionData);
      return questionData;
    } catch (error) {
      console.error("Error fetching question details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch question details",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleStartQuestion = async (questionId: number, timeLimit: number) => {
    const durationInSeconds = timeLimit * 60; // Convert minutes to seconds
    setSelectedQuestion(questionId);
    setSessionDuration(durationInSeconds);
    setTimeLeft(durationInSeconds);
    setIsSessionActive(true);
    setShowQuestionDetails(true); // Show question details by default
    
    // Fetch question details for display in workspace
    await fetchQuestionDetails(questionId);
    
    // Auto-redirect to workspace tab
    setActiveTab("workspace");
    
    if (!codespaceUrl) {
      await handleLaunchCodespace();
    }
    
    toast({
      title: "Question Session Started",
      description: `${timeLimit} minute timer started. You've been redirected to the workspace.`,
    });
  };

  const handleTimerComplete = () => {
    // Force session termination
    setIsSessionActive(false);
    setSelectedQuestion(null);
    setCurrentQuestionDetails(null);
    setShowQuestionDetails(false);
    setSessionDuration(null);
    setTimeLeft(0);
    
    // Clear codespace URL to disable VS Code
    setCodespaceUrl(null);
    
    toast({
      title: "⏰ SESSION TERMINATED",
      description: "Time's up! Your coding session has been automatically terminated. VS Code is now disabled.",
      variant: "destructive",
    });
    
    // Auto-submit current work if any
    if (code.trim()) {
      handleSubmitCode();
    }
    
    // Force redirect to questions tab
    setActiveTab('questions');
  };

  const handleTimerWarning = (timeLeft: number) => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    // Critical download warning at 20 seconds
    if (timeLeft <= 20 && timeLeft > 0) {
      toast({
        title: "🚨 URGENT: Download Your Files NOW!",
        description: `Only ${timeLeft} seconds remaining! Your session will end automatically. Download your code immediately!`,
        variant: "destructive",
      });
    }
    // Show download warning when 5 minutes left
    else if (minutes <= 5 && minutes > 0) {
      toast({
        title: "⚠️ Time Warning - Download Your Files!",
        description: `Only ${minutes} minute${minutes !== 1 ? 's' : ''} remaining! Download your work now before the session ends.`,
        variant: "destructive",
      });
    }
    // Regular time warning
    else if (minutes > 5) {
      toast({
        title: "⚠️ Time Warning",
        description: `Only ${minutes} minute${minutes !== 1 ? 's' : ''} remaining!`,
        variant: "default",
      });
    }
  };

  const handleSubmitCode = async () => {
    if (!code.trim()) {
      toast({
        title: "No Code to Submit",
        description: "Please write some code before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          code,
          questionId: selectedQuestion
        })
      });

      if (response.ok) {
        toast({
          title: "Code Submitted Successfully!",
          description: "Your code has been submitted and a screenshot has been captured automatically.",
        });
        setCode("");
        
        // End session on successful submission
        if (isSessionActive) {
          setIsSessionActive(false);
          setSelectedQuestion(null);
          setCurrentQuestionDetails(null);
          setShowQuestionDetails(false);
          setSessionDuration(null);
        }
      } else {
        toast({
          title: "Submission Failed",
          description: "Failed to submit your code. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "Network error. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
    setSelectedQuestion(null);
    setCurrentQuestionDetails(null);
    setShowQuestionDetails(false);
    setSessionDuration(null);
    setTimeLeft(0);
    
    toast({
      title: "Session Ended",
      description: "Your coding session has been manually ended.",
    });
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background-secondary/20">
      <AntiCheat 
        userId={user?.id} 
        isInWorkspace={isInWorkspaceTab}
        isMonitoringActive={isMonitoringActive}
        setIsMonitoringActive={setIsMonitoringActive}
        isMonitoringMinimized={isMonitoringMinimized}
        setIsMonitoringMinimized={setIsMonitoringMinimized}
        onViolation={(type, details) => {
          // Enhanced logging for workspace violations
          if (isInWorkspaceTab && type === "TAB_SWITCH") {
            console.log(`🚨 CRITICAL: Tab switch during active coding session - ${details}`);
            toast({
              title: "🚨 CODING SESSION VIOLATION",
              description: "You switched tabs while actively coding. This is a serious violation!",
              variant: "destructive",
            });
          }
        }}
      />
      
      {/* Puppeteer Auto-Screenshot Component */}
      <PuppeteerScreenshot 
        userId={user?.id}
        codespaceUrl={codespaceUrl}
        subject={subject}
        interval={30000} // 30 seconds
        isCodespaceActive={isInWorkspaceTab && !!codespaceUrl}
      />
      
      {/* Minimalist Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-center py-8">
            {/* Clean Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="bg-gradient-pink-purple p-3 rounded-2xl shadow-lg">
                <Terminal className="h-6 w-6 text-white" />
              </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green rounded-full"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pink to-purple bg-clip-text text-transparent">
                  CodeLab Pro
                </h1>
                <p className="text-sm text-muted-foreground">Student Workspace</p>
              </div>
            </div>
            
            {/* Clean User Section */}
            <div className="flex items-center space-x-6">
              {/* Status Indicator */}
              <div className={`flex items-center space-x-2 ${isFetchingGrades ? 'text-blue' : 'text-green'}`}>
                <div className={`w-2 h-2 rounded-full ${isFetchingGrades ? 'bg-blue animate-pulse' : 'bg-green'}`}></div>
                <span className="text-sm font-medium">
                  {isFetchingGrades ? 'Syncing...' : 'Live'}
                </span>
              </div>
              
              {/* Session Status */}
              {isSessionActive && (
                <div className="flex items-center space-x-2 text-green">
                  <div className="w-2 h-2 rounded-full bg-green animate-pulse"></div>
                  <span className="text-sm font-bold">Session Active</span>
              </div>
              )}

              {/* Monitoring Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setIsMonitoringActive(!isMonitoringActive)}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-background-secondary"
                >
                  {isMonitoringActive ? (
                    <Eye className="h-4 w-4 text-green" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <div className="flex items-center space-x-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {isMonitoringActive ? 'Monitoring' : 'Paused'}
                  </span>
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-blue-purple flex items-center justify-center text-white text-sm font-bold">
                  {user?.email?.charAt(0).toUpperCase() || 'S'}
                </div>
                <span className="text-sm font-medium text-foreground">{user?.email}</span>
              </div>
              
              {/* Logout Button */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="text-red hover:bg-red/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Active Question Details Bar */}
        {isSessionActive && currentQuestionDetails && (
            <div className="border-t border-border/20 bg-gradient-to-r from-pink/5 to-purple/5 backdrop-blur-sm">
              <div className="max-w-7xl mx-auto px-8 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-pink-purple p-2 rounded-xl">
                      <Code2 className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex items-center space-x-6">
                      <div>
                        <h3 className="font-bold text-foreground text-lg">
                          {currentQuestionDetails.title}
                        </h3>
                        <div className="flex items-center space-x-3 mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-medium border ${
                              currentQuestionDetails.difficulty.toLowerCase() === 'easy' ? 'bg-green/20 text-green border-green/30' :
                              currentQuestionDetails.difficulty.toLowerCase() === 'medium' ? 'bg-blue/20 text-blue border-blue/30' :
                              currentQuestionDetails.difficulty.toLowerCase() === 'hard' ? 'bg-orange/20 text-orange border-orange/30' :
                              'bg-red/20 text-red border-red/30'
                            }`}
                          >
                            {currentQuestionDetails.difficulty.charAt(0).toUpperCase() + currentQuestionDetails.difficulty.slice(1)}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className="text-xs font-medium border border-blue/30 bg-blue/10 text-blue"
                          >
                            {currentQuestionDetails.language}
                          </Badge>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {currentQuestionDetails.timeLimit} min
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                                      <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuestionDetails(!showQuestionDetails)}
                    className="text-pink hover:bg-pink/10 hover:text-pink text-xs"
                  >
                    {showQuestionDetails ? "Hide Description" : "View Description"}
                  </Button>
                    <div className="w-2 h-2 bg-green rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green">Active Question</span>
                  </div>
                </div>
              </div>
            </div>
        )}
      </header>

      {/* Floating Timer */}
      {isSessionActive && sessionDuration && (
        <GlobalTimer
          duration={sessionDuration}
          isActive={isSessionActive}
          questionId={selectedQuestion}
          onComplete={handleTimerComplete}
          onWarning={handleTimerWarning}
          onTimeUpdate={setTimeLeft}
        />
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-12 px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* Clean Navigation Tabs */}
          <TabsList className="grid grid-cols-5 gap-1 bg-background-secondary/50 p-1 rounded-2xl border border-border/20">
                  <TabsTrigger 
                    value="questions" 
              className="data-[state=active]:bg-gradient-pink-purple data-[state=active]:text-white rounded-xl px-4 py-3 font-medium transition-all duration-300"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Questions
                    {isSessionActive && selectedQuestion && (
                <div className="ml-2 w-2 h-2 bg-green rounded-full animate-pulse"></div>
                    )}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="workspace"
              className="data-[state=active]:bg-gradient-blue-purple data-[state=active]:text-white rounded-xl px-4 py-3 font-medium transition-all duration-300"
            >
              <Code2 className="h-4 w-4 mr-2" />
              Workspace
                    {codespaceUrl && (
                <div className="ml-2 w-2 h-2 bg-blue rounded-full"></div>
                    )}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="monitoring"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green data-[state=active]:to-cyan data-[state=active]:text-white rounded-xl px-4 py-3 font-medium transition-all duration-300"
            >
              <Shield className="h-4 w-4 mr-2" />
              Monitoring
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="submissions"
              className="data-[state=active]:bg-gradient-purple-pink data-[state=active]:text-white rounded-xl px-4 py-3 font-medium transition-all duration-300"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="grades"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow data-[state=active]:to-orange data-[state=active]:text-white rounded-xl px-4 py-3 font-medium transition-all duration-300"
            >
              <Award className="h-4 w-4 mr-2" />
              Grades
                  </TabsTrigger>
                </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-pink to-purple bg-clip-text text-transparent mb-4">
                Coding Challenges
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Select a challenge to begin your coding session
              </p>
        </div>

            <QuestionList onStartQuestion={handleStartQuestion} />
            
            
            
            {isSessionActive && selectedQuestion && (
              <Card className="border-pink/20 bg-pink/5 hover:border-2 hover:border-pink-500/70 hover:ring-4 hover:ring-rose-500/50 hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green rounded-full animate-pulse"></div>
                      <span className="font-medium">Question {selectedQuestion} Active</span>
                      </div>
                    <div className="text-sm text-muted-foreground">
                      Timer visible at top of screen
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Workspace Tab */}
          <TabsContent value="workspace" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue to-purple bg-clip-text text-transparent mb-4">
                VS Code Workspace
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Full-featured development environment in your browser
              </p>
              {codespaceUrl && (
                <div className="mt-6 flex justify-center gap-4">
                  <div className="text-sm text-muted-foreground flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    Files are saved automatically
                  </div>
                </div>
              )}
            </div>

            {/* Question Details Box - Toggleable */}
            {isSessionActive && currentQuestionDetails && showQuestionDetails && (
              <div className="max-w-4xl mx-auto mb-8">
                <Card className="border-pink/20 bg-gradient-to-r from-pink/5 to-purple/5 hover:border-2 hover:border-pink-500/70 hover:ring-4 hover:ring-rose-500/50 hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-300">
                  <CardHeader className="border-b border-pink/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-gradient-pink-purple p-2 rounded-xl">
                          <Code2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-foreground">
                            {currentQuestionDetails.title}
                          </CardTitle>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs font-medium border ${
                                currentQuestionDetails.difficulty.toLowerCase() === 'easy' ? 'bg-green/20 text-green border-green/30' :
                                currentQuestionDetails.difficulty.toLowerCase() === 'medium' ? 'bg-blue/20 text-blue border-blue/30' :
                                currentQuestionDetails.difficulty.toLowerCase() === 'hard' ? 'bg-orange/20 text-orange border-orange/30' :
                                'bg-red/20 text-red border-red/30'
                              }`}
                            >
                              {currentQuestionDetails.difficulty.charAt(0).toUpperCase() + currentQuestionDetails.difficulty.slice(1)}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="text-xs font-medium border border-blue/30 bg-blue/10 text-blue"
                            >
                              {currentQuestionDetails.language}
                            </Badge>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-4 w-4 mr-1" />
                              {currentQuestionDetails.timeLimit} min
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowQuestionDetails(false)}
                          className="text-pink hover:bg-pink/10 hover:text-pink text-xs"
                        >
                          ✕ Close
                        </Button>
                        <div className="w-3 h-3 bg-green rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green">Active</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-3">Problem Description</h3>
                        <div className="bg-background-secondary/50 rounded-lg p-4 border border-border/30">
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                            {currentQuestionDetails.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="max-w-2xl mx-auto mb-8">
              <Card className="border-blue/20 bg-blue/5 hover:border-2 hover:border-blue-500/70 hover:ring-4 hover:ring-cyan-500/50 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="programming-language-select" className="text-sm font-medium text-foreground mb-2 block">
                        Programming Language
                      </label>
          <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger id="programming-language-select" className="bg-background border-border">
                          <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="JavaScript">JavaScript</SelectItem>
              <SelectItem value="Python">Python</SelectItem>
              <SelectItem value="Java">Java</SelectItem>
              <SelectItem value="C++">C++</SelectItem>
            </SelectContent>
          </Select>
        </div>

                    <div className="flex flex-col justify-end">
                      {!codespaceUrl ? (
                    <Button
                      onClick={handleLaunchCodespace}
                      disabled={isLoading}
                          className="w-full bg-gradient-blue-purple hover:opacity-90 text-white font-bold"
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                          Launching...
                        </div>
                      ) : (
                            <div className="flex items-center">
                          <Play className="h-4 w-4 mr-2" />
                          Launch Codespace
                            </div>
                      )}
                    </Button>
                      ) : (
                      <Button
                          onClick={handleEndSession}
                          disabled={!isSessionActive}
                          className="w-full bg-gradient-to-r from-red to-pink hover:opacity-90 text-white font-bold"
                        >
                          <div className="flex items-center">
                            <StopCircle className="h-4 w-4 mr-2" />
                            End Session
                          </div>
        </Button>
                    )}
                    </div>
                  </div>
                  </CardContent>
                </Card>
      </div>

            {codespaceUrl && (
                <Codespace 
                  url={codespaceUrl} 
                  isSessionEnded={!isSessionActive || timeLeft <= 0}
                />
            )}
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green to-cyan bg-clip-text text-transparent mb-4">
                Monitoring & Screenshots
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Capture your workspace and enable screen sharing
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card className="border-green/20 bg-green/5">
                <CardHeader>
                  <CardTitle className="flex items-center text-green">
                    <Camera className="h-5 w-5 mr-3" />
                    Screenshot Capture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
            <Button 
              onClick={handleManualScreenshot}
                      disabled={isCapturingScreenshot || !codespaceUrl}
                      className="w-full bg-gradient-to-r from-green to-cyan hover:opacity-90 text-white font-medium"
            >
              {isCapturingScreenshot ? (
                        <div className="flex items-center">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Capturing...
                        </div>
              ) : (
                        <div className="flex items-center">
                          <Camera className="h-4 w-4 mr-2" />
                          Capture Workspace
                        </div>
              )}
            </Button>
          
            <Button 
              onClick={handleDesktopCapture}
              disabled={isCapturingScreenshot}
                      className="w-full bg-gradient-purple-pink hover:opacity-90 text-white font-medium"
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      Capture Desktop
            </Button>
          </div>
                  
                  {codespaceUrl && (
                    <div className="p-3 bg-green/10 border border-green/20 rounded-lg">
                      <div className="flex items-center text-green text-sm">
                        <div className="w-2 h-2 rounded-full bg-green mr-2"></div>
                        VS Code ready for capture
                      </div>
                    </div>
                  )}
                  
                  {isInWorkspaceTab && codespaceUrl && (
                    <div className="p-3 bg-blue/10 border border-blue/20 rounded-lg">
                      <div className="flex items-center text-blue text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue animate-pulse mr-2"></div>
                        Automatic Puppeteer capture active (30s interval)
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-blue/20 bg-blue/5">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue">
                    <Share2 className="h-5 w-5 mr-3" />
                    Screen Sharing
                  </CardTitle>
                </CardHeader>
                <CardContent>
            <ScreenShare 
              userId={user?.id}
              onShareStart={() => setIsScreenSharing(true)}
              onShareEnd={() => setIsScreenSharing(false)}
            />
                  
            {isScreenSharing && (
                    <div className="mt-4 p-3 bg-green/10 border border-green/20 rounded-lg">
                      <div className="flex items-center text-green text-sm">
                        <div className="w-2 h-2 rounded-full bg-green animate-pulse mr-2"></div>
                        Live sharing active
              </div>
          </div>
        )}
                </CardContent>
              </Card>
      </div>
        </TabsContent>

          {/* File Submissions Tab */}
          <TabsContent value="submissions" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-purple-pink bg-clip-text text-transparent mb-4">
                File Submissions
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Upload your completed coding assignments
              </p>
            </div>

            <FileUpload onUploadSuccess={() => {
              toast({
                title: "Submission Complete! 🎉",
                description: "Your file has been submitted and will be reviewed by instructors.",
              });
            }} />
          </TabsContent>

          {/* Grades Tab */}
          <TabsContent value="grades" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow to-orange bg-clip-text text-transparent mb-4">
                Your Grades
              </h2>
              <div className="flex justify-center">
                <div className="flex items-center space-x-3 bg-background-secondary/40 px-4 py-2 rounded-full border border-border/20">
                  <div className={`w-2 h-2 rounded-full ${isFetchingGrades ? 'bg-blue animate-pulse' : 'bg-green'}`}></div>
                  <span className="text-sm text-muted-foreground">
                    {isFetchingGrades ? 'Syncing...' : 'Live updates'}
                  </span>
                </div>
              </div>
            </div>

            <GradeCard
              title="Your Performance"
              subtitle="Track your progress and view feedback from instructors"
              grades={grades}
              isLoading={isGradesLoading}
            />
</TabsContent>
      </Tabs>
      </div>
    </div>
  );
}