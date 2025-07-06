import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Submission, Log, User } from "@shared/schema";
import { useState, useRef, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ScreenshotViewer from "@/components/admin/screenshot-viewer";
import EventLogsViewer from "@/components/admin/event-logs-viewer";
import { 
  Loader2, 
  PieChart, 
  BarChart, 
  AlertCircle, 
  Users, 
  Camera, 
  Clipboard, 
  Share2,
  Terminal,
  FileText,
  Monitor,
  Settings,
  Activity,
  Trophy,
  Code2,
  Eye,
  LogOut,
  User as UserIcon,
  TrendingUp,
  Shield,
  Bug,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  LayoutDashboard,
  Sparkles,
  Cpu,
  Database,
  Brain,
  RotateCcw
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { useToast } from "@/hooks/use-toast";
import { QuestionManager } from "@/components/QuestionManager";
import SubmissionCard from "@/components/SubmissionCard";

interface SubmissionWithUser extends Omit<Submission, 'timestamp' | 'hasFile' | 'filename' | 'fileSize'> {
  timestamp: string; // API returns timestamp as string
  hasFile: boolean; // API returns hasFile as boolean, not null
  filename?: string; // API returns filename as string | undefined
  fileSize?: number; // API returns fileSize as number | undefined
  user?: {
    id: number;
    email: string;
    role: string;
  };
  graded: boolean;
  grade?: {
    id: number;
    score: number;
    feedback: string;
    gradedAt: string;
    gradedBy: number;
  };
}

interface StudentCountData {
  totalStudents: number;
  activeStudents: number;
  studentDetails: Array<{ id: number; email: string }>;
}

interface SubmissionGrade {
  submissionId: number;
  score: number;
  feedback: string;
  autogradeId?: number;
  approveAutograde?: boolean;
}

interface StudentGrade {
  id: number;
  submissionId: number;
  userId: number;
  subject: string;
  score: number;
  feedback: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [gradeStatusFilter, setGradeStatusFilter] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithUser | null>(null);
  const [userEmailSearch, setUserEmailSearch] = useState("");
  const [submissionEmailSearch, setSubmissionEmailSearch] = useState("");
  const [gradeScore, setGradeScore] = useState("90");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [activeGroup, setActiveGroup] = useState("main");
  
  const studentEmailRef = useRef<HTMLInputElement>(null);
  
  // Fetch submissions with real-time updates
  const { data: submissions = [], isLoading: isLoadingSubmissions, isFetching: isFetchingSubmissions, refetch: refetchSubmissions } = useQuery<SubmissionWithUser[]>({
    queryKey: ["/api/submissions"],
    refetchInterval: 3000, // Refetch every 3 seconds
    refetchIntervalInBackground: true, // Continue refetching when tab is not focused
    staleTime: 1000, // Consider data stale after 1 second
  });

  
  // Fetch logs with real-time updates
  const { data: logs = [], isLoading: isLoadingLogs, isFetching: isFetchingLogs, refetch: refetchLogs } = useQuery<Log[]>({
    queryKey: ["/api/logs"],
    refetchInterval: 2000, // Refetch every 2 seconds (more frequent for logs)
    refetchIntervalInBackground: true,
    staleTime: 500, // Consider data stale after 0.5 seconds
  });
  
  // Fetch accurate student count from users table
  const { data: studentCountData, isLoading: isLoadingStudentCount, isFetching: isFetchingStudentCount, refetch: refetchStudentCount, error: studentCountError } = useQuery<StudentCountData>({
    queryKey: ["/api/admin/students/count"],
    queryFn: async () => {
      const response = await fetch("/api/admin/students/count", {
        credentials: "include",
      });
      
      if (response.status === 401) {
        console.warn('🔍 Student count endpoint: Authentication required');
        throw new Error('Authentication required');
      }
      
      if (!response.ok) {
        console.error('🔍 Student count endpoint error:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🔍 Student count data received:', data);
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchIntervalInBackground: true,
    staleTime: 2000, // Consider data stale after 2 seconds
    retry: (failureCount, error: Error) => {
      // Don't retry on auth errors, but retry on other errors
      if (error.message.includes('Authentication required')) {
        return false;
      }
      return failureCount < 2;
    }
  });
  
  // Fetch student grades (when email is provided)
  const { data: studentGrades = [], isLoading: isLoadingStudentGrades, isFetching: isFetchingGrades, refetch: refetchGrades, error: gradesError } = useQuery<StudentGrade[]>({
    queryKey: ["/api/admin/grades", userEmailSearch],
    queryFn: async () => {
      if (!userEmailSearch) return [];
      const response = await apiRequest("GET", `/api/admin/grades/${encodeURIComponent(userEmailSearch)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch grades: ${response.status}`);
      }
      return await response.json();
    },
    enabled: userEmailSearch !== "",
    refetchInterval: 5000, // Refetch every 5 seconds when enabled
    refetchIntervalInBackground: true,
    staleTime: 2000,
    retry: (failureCount, error: Error) => {
      // Don't retry for 404 errors (student not found)
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 3;
    },
  });
  
  // Submit grade mutation with enhanced real-time updates
  const gradeMutation = useMutation({
    mutationFn: async (data: SubmissionGrade) => {
      const res = await apiRequest("POST", "/api/admin/grade", data);
      return await res.json();
    },
    onSuccess: (responseData, variables) => {
      // Close the dialog and refresh data
      setSelectedSubmission(null);
      
      // Invalidate all related queries for immediate updates
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/grades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/grades"] }); // Also invalidate student grades
      
      // Broadcast grade update to all open tabs for instant cross-tab updates
      try {
        const gradeUpdateEvent = new BroadcastChannel('grade-updates');
        gradeUpdateEvent.postMessage({
          type: 'GRADE_UPDATED',
          submissionId: variables.submissionId,
          score: variables.score,
          timestamp: new Date().toISOString()
        });
        gradeUpdateEvent.close();
      } catch (error) {
        console.log('BroadcastChannel not supported, falling back to storage events');
        // Fallback for browsers that don't support BroadcastChannel
        localStorage.setItem('grade-update-trigger', Date.now().toString());
      }
      
      toast({
        title: "Grade submitted successfully! ✅",
        description: "The student will see this grade update immediately across all their open tabs",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit grade",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Filter submissions by subject, grading status, and email search
  const filteredSubmissions = submissions.filter(submission => {
    const subjectMatches = subjectFilter === "all" || submission.subject === subjectFilter;
    const gradeStatusMatches = gradeStatusFilter === "all" || 
      (gradeStatusFilter === "graded" && submission.graded) ||
      (gradeStatusFilter === "pending" && !submission.graded);
    const emailMatches = submissionEmailSearch === "" || 
      submission.user?.email?.toLowerCase().includes(submissionEmailSearch.toLowerCase());
    
    return subjectMatches && gradeStatusMatches && emailMatches;
  });
  
  // Format time distance
  const formatTime = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  // Handle grade submission from SubmissionCard
  const handleGradeSubmit = (
    submissionId: number, 
    score: number, 
    feedback: string,
    autogradeId?: number,
    approveAutograde?: boolean
  ) => {
    gradeMutation.mutate({
      submissionId,
      score,
      feedback,
      autogradeId,
      approveAutograde
    });
  };
  
  // Handle search for student grades
  const handleStudentGradeSearch = () => {
    if (studentEmailRef.current && studentEmailRef.current.value.trim()) {
      const email = studentEmailRef.current.value.trim();
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast({
          title: "Invalid Email Format",
          description: "Please enter a valid email address (e.g., student@example.com)",
          variant: "destructive",
        });
        return;
      }
      setUserEmailSearch(email);
    } else {
      toast({
        title: "Email Required",
        description: "Please enter a student email address to search for grades.",
        variant: "destructive",
      });
    }
  };

  // Handle clearing search
  const handleClearSearch = () => {
    setUserEmailSearch("");
    if (studentEmailRef.current) {
      studentEmailRef.current.value = "";
    }
  };

  // Handle Enter key press for search
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleStudentGradeSearch();
    }
  };

  // Manual refresh all data
  const handleManualRefresh = () => {
    refetchSubmissions();
    refetchLogs();
    refetchStudentCount();
    if (userEmailSearch) {
      refetchGrades();
    }
    toast({
      title: "Data refreshed",
      description: "All statistics have been updated",
    });
  };

  // Check if any data is currently being fetched
  const isRefreshing = isFetchingSubmissions || isFetchingLogs || isFetchingStudentCount || isFetchingGrades;

  // Get current timestamp for last updated indicator
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Update timestamp when data changes
  useEffect(() => {
    setLastUpdated(new Date());
  }, [submissions, logs, studentCountData, studentGrades]);
  
  // Memoize statistics calculations to prevent infinite re-renders
  const statistics = useMemo(() => {
    const totalSubmissions = submissions.length;
    const totalLogs = logs.length;
    
    // Use accurate student count from dedicated endpoint with fallback
    let uniqueStudents = 0;
    
    if (studentCountData?.activeStudents !== undefined) {
      // Use data from the dedicated endpoint when available
      uniqueStudents = studentCountData.activeStudents;
    } else {
      // Fallback to calculating from submissions when endpoint fails or is loading
      const uniqueStudentIds = Array.from(new Set(
        submissions
          .filter(s => s.user && s.user.role === 'student')
          .map(s => s.userId)
      ));
      uniqueStudents = uniqueStudentIds.length;
    }
    
    const tabSwitchLogs = logs.filter(log => log.type === 'tab-switch').length;
    const screenshotLogs = logs.filter(log => log.type === 'screenshot').length;
    const screenShareLogs = logs.filter(log => log.type === 'screen-share').length;
    
    // Calculate security events (tab switches + screenshots + screen shares)
    const securityEvents = tabSwitchLogs + screenshotLogs + screenShareLogs;
    
    // Calculate actual graded work count
    const gradedSubmissions = submissions.filter(submission => submission.graded).length;
    
    return {
      totalSubmissions,
      totalLogs,
      uniqueStudents,
      tabSwitchLogs,
      screenshotLogs,
      screenShareLogs,
      securityEvents,
      gradedSubmissions
    };
  }, [submissions, logs, studentCountData]);
  
  // Destructure statistics for easier access
  const { 
    totalSubmissions, 
    totalLogs, 
    uniqueStudents, 
    tabSwitchLogs, 
    screenshotLogs, 
    screenShareLogs, 
    securityEvents, 
    gradedSubmissions 
  } = statistics;
  
  // Get score badge color
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green/20 text-green border-green/30";
    if (score >= 80) return "bg-blue/20 text-blue border-blue/30";
    if (score >= 70) return "bg-yellow/20 text-yellow border-yellow/30";
    if (score >= 60) return "bg-orange/20 text-orange border-orange/30";
    return "bg-red/20 text-red border-red/30";
  };

  // Get grade letter
  const getGradeLetter = (score: number) => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  };


  
  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Simplified Header */}
      <header className="bg-card-elevated/80 backdrop-blur-xl border-b border-border-accent/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="bg-gradient-pink-purple p-3 rounded-2xl shadow-glow-pink">
                  <Terminal className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neon-pink">CodeLab Pro</h1>
                <p className="text-sm text-muted-foreground">Administrator Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Real-time Status Indicator */}
              <div className="flex items-center space-x-3 bg-background-secondary/60 backdrop-blur-sm px-4 py-3 rounded-2xl border border-border-accent">
                <div className={`flex items-center space-x-2 ${isRefreshing ? 'text-blue' : 'text-green'}`}>
                  <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-blue animate-pulse' : 'bg-green'}`}></div>
                  <span className="text-xs font-medium">
                    {isRefreshing ? 'Updating...' : 'Live'}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="h-8 w-8 p-0 hover:bg-blue/20 transition-all duration-300"
                >
                  <Activity className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <div className="hidden sm:flex items-center space-x-3 bg-background-secondary/60 backdrop-blur-sm px-4 py-3 rounded-2xl border border-border-accent">
                <div className="w-8 h-8 bg-gradient-purple-blue rounded-full flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{user?.email}</div>
                  <div className="text-xs text-purple">Administrator</div>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="bg-red/10 hover:bg-red/20 text-red border-red/30 backdrop-blur-sm transition-all duration-300"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-12 px-6 lg:px-8">
        
        {/* Key Metrics - Enhanced and Ultra Aesthetic */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-gradient-pink-purple px-6 py-3 rounded-full text-white font-bold shadow-glow-pink mb-4">
              <Sparkles className="h-5 w-5 mr-2" />
              Dashboard Overview
                  </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-pink via-purple to-blue bg-clip-text text-transparent mb-3">
              Command Center
            </h2>
            <p className="text-muted-foreground text-lg">Monitor your coding lab activity and student progress</p>
                  </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="relative overflow-hidden card-elevated hover-glow border-border-accent group cursor-pointer transition-all duration-700 hover:scale-110 hover:rotate-1">
              <div className="absolute inset-0 bg-gradient-to-br from-pink/20 via-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-pink/20 to-transparent blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <CardContent className="relative p-8 z-10">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="bg-gradient-pink-purple p-5 rounded-3xl shadow-glow-pink mx-auto w-fit group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
                      <FileText className="h-10 w-10 text-white" />
                  </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow to-orange rounded-full animate-pulse shadow-glow-yellow"></div>
                  </div>
                  <div className="text-5xl font-black bg-gradient-to-r from-pink to-purple bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                    {totalSubmissions}
                  </div>
                  <div className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-2">Total Submissions</div>
                  <div className="text-xs text-pink/70 bg-pink/10 px-3 py-1 rounded-full border border-pink/20">
                    {submissions.length} total submissions
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden card-elevated hover-glow border-border-accent group cursor-pointer transition-all duration-700 hover:scale-110 hover:rotate-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue/20 via-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-blue/20 to-transparent blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <CardContent className="relative p-8 z-10">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="bg-gradient-blue-purple p-5 rounded-3xl shadow-glow-blue mx-auto w-fit group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
                      <Users className="h-10 w-10 text-white" />
                  </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green to-cyan rounded-full animate-pulse shadow-glow-green"></div>
                  </div>
                  <div className="text-5xl font-black bg-gradient-to-r from-blue to-cyan bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                    {uniqueStudents}
                  </div>
                  <div className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-2">Active Students</div>
                  <div className="text-xs text-blue/70 bg-blue/10 px-3 py-1 rounded-full border border-blue/20">
                    Currently enrolled
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden card-elevated hover-glow border-border-accent group cursor-pointer transition-all duration-700 hover:scale-110 hover:rotate-1">
              <div className="absolute inset-0 bg-gradient-to-br from-green/20 via-emerald/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-green/20 to-transparent blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <CardContent className="relative p-8 z-10">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="bg-gradient-to-r from-green to-cyan p-5 rounded-3xl shadow-glow-green mx-auto w-fit group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
                      <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple to-pink rounded-full animate-pulse shadow-glow-purple"></div>
                  </div>
                  <div className="text-5xl font-black bg-gradient-to-r from-green to-emerald bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                    {gradedSubmissions}
                </div>
                  <div className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-2">Graded Work</div>
                  <div className="text-xs text-green/70 bg-green/10 px-3 py-1 rounded-full border border-green/20">
                    {gradedSubmissions} of {totalSubmissions} graded
          </div>
                  </div>
                </CardContent>
              </Card>
          
            <Card className="relative overflow-hidden card-elevated hover-glow border-border-accent group cursor-pointer transition-all duration-700 hover:scale-110 hover:rotate-1">
              <div className="absolute inset-0 bg-gradient-to-br from-orange/20 via-red/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-orange/20 to-transparent blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <CardContent className="relative p-8 z-10">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="bg-gradient-to-r from-orange to-red p-5 rounded-3xl shadow-glow-red mx-auto w-fit group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
                      <Shield className="h-10 w-10 text-white" />
                          </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow to-orange rounded-full animate-pulse shadow-glow-yellow"></div>
                          </div>
                  <div className="text-5xl font-black bg-gradient-to-r from-orange to-red bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                    {securityEvents}
                          </div>
                  <div className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-2">Security Events</div>
                  <div className="text-xs text-orange/70 bg-orange/10 px-3 py-1 rounded-full border border-orange/20">
                    {tabSwitchLogs} tabs, {screenshotLogs} screenshots
                  </div>
                          </div>
                      </CardContent>
                    </Card>
        </div>

          {/* Last Updated Indicator */}
          <div className="flex justify-center mt-8">
            <div className="flex items-center space-x-4 bg-background-secondary/40 backdrop-blur-sm px-6 py-3 rounded-full border border-border-accent">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Last updated:</span>
                <span className="text-sm font-medium text-foreground">
                  {formatTime(lastUpdated)}
                </span>
                          </div>
              {isRefreshing && (
                <div className="flex items-center space-x-2">
                  <div className="w-1 h-1 bg-blue rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue">Syncing...</span>
                </div>
              )}
                  </div>
                                          </div>
        </div>
        
        {/* Ultra Cool Navigation Tabs */}
        <Tabs defaultValue="submissions" className="space-y-12">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink via-purple to-blue opacity-20 blur-xl rounded-3xl"></div>
              <TabsList className="relative grid grid-cols-3 md:grid-cols-6 gap-3 bg-background-secondary/30 backdrop-blur-xl p-3 rounded-3xl border border-border-accent shadow-2xl">
                  <TabsTrigger 
                    value="submissions" 
                  className="relative data-[state=active]:bg-gradient-pink-purple data-[state=active]:text-white data-[state=active]:shadow-glow-pink transition-all duration-500 rounded-2xl px-6 py-4 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-pink/20 to-purple/20 opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-500"></div>
                  <FileText className="h-4 w-4 mr-2 relative z-10 group-data-[state=active]:animate-pulse" />
                  <span className="relative z-10 font-bold">Submissions</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="grades"
                  className="relative data-[state=active]:bg-gradient-blue-purple data-[state=active]:text-white data-[state=active]:shadow-glow-blue transition-all duration-500 rounded-2xl px-6 py-4 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue/20 to-purple/20 opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-500"></div>
                  <Trophy className="h-4 w-4 mr-2 relative z-10 group-data-[state=active]:animate-pulse" />
                  <span className="relative z-10 font-bold">Grades</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="event-logs"
                  className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-green data-[state=active]:to-cyan data-[state=active]:text-white data-[state=active]:shadow-glow-green transition-all duration-500 rounded-2xl px-6 py-4 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green/20 to-cyan/20 opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-500"></div>
                  <Activity className="h-4 w-4 mr-2 relative z-10 group-data-[state=active]:animate-pulse" />
                  <span className="relative z-10 font-bold">Event Logs</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="monitoring"
                  className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange data-[state=active]:to-red data-[state=active]:text-white data-[state=active]:shadow-glow-orange transition-all duration-500 rounded-2xl px-6 py-4 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange/20 to-red/20 opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-500"></div>
                  <Eye className="h-4 w-4 mr-2 relative z-10 group-data-[state=active]:animate-pulse" />
                  <span className="relative z-10 font-bold">Monitor</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="screenshots"
                  className="relative data-[state=active]:bg-gradient-pink-purple data-[state=active]:text-white data-[state=active]:shadow-glow-pink transition-all duration-500 rounded-2xl px-6 py-4 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-pink/20 to-purple/20 opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-500"></div>
                  <Camera className="h-4 w-4 mr-2 relative z-10 group-data-[state=active]:animate-pulse" />
                  <span className="relative z-10 font-bold">Screenshots</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                  value="questions"
                  className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple data-[state=active]:to-pink data-[state=active]:text-white data-[state=active]:shadow-glow-purple transition-all duration-500 rounded-2xl px-6 py-4 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple/20 to-pink/20 opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-500"></div>
                  <BookOpen className="h-4 w-4 mr-2 relative z-10 group-data-[state=active]:animate-pulse" />
                  <span className="relative z-10 font-bold">Questions</span>
                  </TabsTrigger>
                </TabsList>
            </div>
          </div>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-8">

            {/* Main Submissions Card */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 border-2 border-gradient-to-r from-purple-500/30 via-pink-500/30 to-blue-500/30 backdrop-blur-sm shadow-2xl shadow-purple-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-blue-500/10 pointer-events-none" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
              
              <CardHeader className="border-b border-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 relative z-10 bg-gradient-to-r from-slate-900/80 via-gray-900/80 to-slate-900/80 backdrop-blur-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                  <div className="flex items-center space-x-4">
                                        <div className="w-14 h-14 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/50 ring-8 ring-pink-400/80 border-8 border-pink-500/90 backdrop-blur-sm relative">
                      <FileText className="h-7 w-7 text-white relative z-10" style={{filter: 'drop-shadow(0 0 8px rgba(236,72,153,0.8))'}} />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-white drop-shadow-lg">
                        Code Submissions
                      </CardTitle>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400" />
                        <Input 
                          placeholder="Search by student email..." 
                          value={submissionEmailSearch}
                          onChange={(e) => setSubmissionEmailSearch(e.target.value)}
                          className="pl-10 pr-10 w-64 bg-gradient-to-r from-slate-800/80 to-gray-800/80 border-purple-500/30 text-white placeholder-purple-300/70 focus:ring-purple-500/50 focus:border-purple-400/50 shadow-lg shadow-purple-500/10"
                        />
                        {submissionEmailSearch && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSubmissionEmailSearch('')}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-purple-500/20 rounded-full"
                          >
                            <XCircle className="h-4 w-4 text-purple-300 hover:text-white" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                        <SelectTrigger className="w-40 bg-gradient-to-r from-slate-800/80 to-gray-800/80 border-pink-500/30 text-white shadow-lg shadow-pink-500/10 focus:ring-pink-500/50">
                          <SelectValue placeholder="All Subjects" />
                        </SelectTrigger>
                        <SelectContent className="bg-gradient-to-br from-slate-800 to-gray-800 border-pink-500/30 shadow-xl shadow-pink-500/20">
                          <SelectItem value="all" className="text-white hover:bg-pink-500/20">All Subjects</SelectItem>
                          <SelectItem value="javascript" className="text-white hover:bg-pink-500/20">JavaScript</SelectItem>
                          <SelectItem value="python" className="text-white hover:bg-pink-500/20">Python</SelectItem>
                          <SelectItem value="java" className="text-white hover:bg-pink-500/20">Java</SelectItem>
                          <SelectItem value="cpp" className="text-white hover:bg-pink-500/20">C++</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={gradeStatusFilter} onValueChange={setGradeStatusFilter}>
                        <SelectTrigger className="w-40 bg-gradient-to-r from-slate-800/80 to-gray-800/80 border-blue-500/30 text-white shadow-lg shadow-blue-500/10 focus:ring-blue-500/50">
                          <SelectValue placeholder="All Submissions" />
                        </SelectTrigger>
                        <SelectContent className="bg-gradient-to-br from-slate-800 to-gray-800 border-blue-500/30 shadow-xl shadow-blue-500/20">
                          <SelectItem value="all" className="text-white hover:bg-blue-500/20">All Submissions</SelectItem>
                          <SelectItem value="pending" className="text-white hover:bg-blue-500/20">Pending Review</SelectItem>
                          <SelectItem value="graded" className="text-white hover:bg-blue-500/20">Already Graded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
                
              <CardContent className="p-8 relative z-10">
                  {isLoadingSubmissions ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Loading Submissions</h3>
                    <p className="text-gray-400">Fetching the latest student submissions...</p>
                    </div>
                  ) : filteredSubmissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-20 h-20 bg-gradient-to-r from-gray-500/20 to-slate-500/20 rounded-2xl flex items-center justify-center mb-6">
                      <FileText className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">No Submissions Found</h3>
                    <p className="text-gray-400 text-center max-w-md">
                      {subjectFilter !== 'all' || gradeStatusFilter !== 'all' || submissionEmailSearch !== ''
                        ? 'No submissions match your current filters. Try adjusting your search criteria.'
                        : 'Students haven\'t submitted any code yet. New submissions will appear here automatically.'
                      }
                    </p>
                    {(subjectFilter !== 'all' || gradeStatusFilter !== 'all' || submissionEmailSearch !== '') && (
                      <Button 
                        onClick={() => {
                          setSubjectFilter('all');
                          setGradeStatusFilter('all');
                          setSubmissionEmailSearch('');
                        }}
                        variant="outline"
                        className="mt-6 border-white/20 text-white hover:bg-white/10"
                      >
                        Clear Filters
                      </Button>
                    )}
                    </div>
                  ) : (
                  <div className="space-y-6">
                    {/* Results Summary */}
                    <div className="flex items-center justify-between p-4 bg-[#1a1a2e]/30 rounded-xl border border-white/5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{filteredSubmissions.length}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {filteredSubmissions.length} {filteredSubmissions.length === 1 ? 'submission' : 'submissions'} found
                          </p>
                          <p className="text-gray-400 text-sm">
                            {submissionEmailSearch !== '' && `"${submissionEmailSearch}" • `}
                            {subjectFilter !== 'all' && `${subjectFilter.toUpperCase()} • `}
                            {gradeStatusFilter !== 'all' && `${gradeStatusFilter === 'pending' ? 'Pending Review' : 'Already Graded'} • `}
                            Last updated {new Date().toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleManualRefresh}
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Refresh
                        </Button>
                      </div>
                    </div>

                    {/* Submissions Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
                      {filteredSubmissions.map((submission) => (
                        <div key={submission.id} className="group">
                        <SubmissionCard
                          submission={submission}
                          onGradeSubmit={handleGradeSubmit}
                          isGrading={gradeMutation.isPending}
                        />
                        </div>
                      ))}
                    </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
          {/* Grades Tab */}
            <TabsContent value="grades">
            <Card className="card-elevated border-border-accent hover:border-2 hover:border-yellow-500/70 hover:ring-4 hover:ring-amber-500/50 hover:shadow-lg hover:shadow-yellow-500/30 transition-all duration-300">
              <CardHeader className="border-b border-border-accent">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-blue-purple p-2 rounded-xl">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">Student Grades</CardTitle>
                    <p className="text-sm text-muted-foreground">Search and view individual student performance</p>
                  </div>
                </div>
                </CardHeader>
                
                <CardContent className="p-6 space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        ref={studentEmailRef}
                      placeholder="Enter student email to search grades" 
                      className="pl-10 pr-10 bg-background-secondary border-border"
                        onKeyPress={handleSearchKeyPress}
                      />
                      {userEmailSearch && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleClearSearch}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-background-secondary rounded-full"
                        >
                          <XCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      )}
                    </div>
                      <Button 
                        onClick={handleStudentGradeSearch}
                    className="bg-gradient-pink-purple hover:shadow-glow-pink text-white px-6"
                        disabled={isLoadingStudentGrades}
                      >
                        {isLoadingStudentGrades ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 mr-2" />
                        )}
                        Search
                      </Button>
                  </div>
                  
                  {userEmailSearch && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-foreground">Results for:</h3>
                        <Badge variant="outline" className="bg-purple/20 text-purple border-purple/30">
                          {userEmailSearch}
                        </Badge>
                        {!isLoadingStudentGrades && studentGrades.length > 0 && (
                          <Badge variant="outline" className="bg-green/20 text-green border-green/30">
                            {studentGrades.length} grade{studentGrades.length !== 1 ? 's' : ''} found
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearSearch}
                        className="border-border-accent text-muted-foreground hover:text-foreground"
                      >
                        Clear Search
                      </Button>
                    </div>
                      
                      {isLoadingStudentGrades ? (
                        <div className="flex justify-center items-center py-12">
                        <div className="spinner-gradient w-8 h-8"></div>
                        </div>
                      ) : gradesError ? (
                        <Card className="border-dashed border-red/20 bg-red/5">
                          <CardContent className="text-center py-12">
                            <AlertCircle className="h-12 w-12 text-red mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Grades</h3>
                            <p className="text-muted-foreground mb-4">
                              {gradesError.message.includes('404') 
                                ? `Student "${userEmailSearch}" not found in the system.`
                                : 'Unable to load grades. Please try again.'}
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => refetchGrades()}
                              className="border-red text-red hover:bg-red/10"
                            >
                              <Search className="h-4 w-4 mr-2" />
                              Try Again
                            </Button>
                          </CardContent>
                        </Card>
                      ) : studentGrades.length === 0 ? (
                      <Card className="border-dashed border-border-accent">
                        <CardContent className="text-center py-12">
                          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-foreground mb-2">No Grades Found</h3>
                          <p className="text-muted-foreground">This student hasn't received any grades yet.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                            {studentGrades.map((grade) => (
                          <Card key={grade.id} className="card-elevated border-border-accent hover:border-2 hover:border-emerald-500/70 hover:ring-4 hover:ring-green-500/50 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="bg-gradient-pink-purple p-2 rounded-xl">
                                    <Code2 className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-foreground capitalize">{grade.subject}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(grade.timestamp).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-3">
                                  <Badge variant="outline" className={`font-bold border ${getScoreColor(grade.score)}`}>
                                      {getGradeLetter(grade.score)}
                                    </Badge>
                                  <span className="text-2xl font-bold text-foreground">{grade.score}%</span>
                                  </div>
                              </div>
                              
                              {grade.feedback && (
                                <div className="mt-4 p-3 bg-background-secondary rounded-lg border border-border">
                                  <p className="text-sm text-foreground">
                                    <strong>Feedback:</strong> {grade.feedback}
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
          {/* Event Logs Tab */}
          <TabsContent value="event-logs" className="space-y-8">
            <EventLogsViewer className="w-full" />
          </TabsContent>
            
          {/* Monitoring Tab */}
          <TabsContent value="monitoring">
            <Card className="card-elevated border-border-accent">
              <CardHeader className="border-b border-border-accent">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-pink-purple p-2 rounded-xl">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">Live Student Monitoring</CardTitle>
                    <p className="text-sm text-muted-foreground">Real-time activity tracking and anti-cheat monitoring</p>
                  </div>
                </div>
                </CardHeader>
                
              <CardContent className="p-6 space-y-6">
                {/* Activity Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="card-elevated border-blue/20">
                <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="bg-gradient-to-r from-blue to-cyan p-3 rounded-2xl mr-4">
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-blue">{screenshotLogs}</h3>
                          <p className="text-sm text-muted-foreground font-medium">Screenshots Captured</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm text-muted-foreground">
                        Periodic screen captures for activity monitoring
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="card-elevated border-orange/20">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="bg-gradient-to-r from-orange to-red p-3 rounded-2xl mr-4">
                          <Monitor className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-orange">{tabSwitchLogs}</h3>
                          <p className="text-sm text-muted-foreground font-medium">Tab Switches</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm text-muted-foreground">
                        Detected attempts to leave the exam window
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="card-elevated border-green/20">
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="bg-gradient-to-r from-green to-cyan p-3 rounded-2xl mr-4">
                          <Share2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-green">{screenShareLogs}</h3>
                          <p className="text-sm text-muted-foreground font-medium">Screen Shares</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm text-muted-foreground">
                        Active screen sharing sessions
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Live Sessions */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <Zap className="h-5 w-5 text-purple mr-2" />
                    Active Sessions
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <Card className="card-elevated border-green/20">
                      <CardHeader className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-pink-purple flex items-center justify-center text-white text-sm font-medium">
                              S
                            </div>
                            <span className="text-sm font-medium text-foreground">student@lab.com</span>
                          </div>
                          <Badge variant="outline" className="bg-green/20 text-green border-green/30 text-xs">
                            <span className="h-2 w-2 rounded-full bg-green mr-1.5"></span>
                            Active
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="relative border border-border rounded-xl overflow-hidden h-32 bg-background-secondary flex items-center justify-center">
                          <p className="text-muted-foreground text-sm">Latest screenshot preview</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">Subject:</span>
                            <span className="ml-1 text-purple font-medium">JavaScript</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Time:</span>
                            <span className="ml-1 font-mono text-foreground">01:25:30</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Violations:</span>
                            <span className="ml-1 text-green font-medium">0</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Progress:</span>
                            <span className="ml-1 text-blue font-medium">78%</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between pt-2">
                          <Button variant="outline" size="sm" className="text-xs border-border">
                            Message
                          </Button>
                          <Button size="sm" className="text-xs bg-gradient-blue-purple hover:shadow-glow-blue text-white">
                            Full Monitor
                          </Button>
                          </div>
                      </CardContent>
                    </Card>
                          </div>
                        </div>
                      </CardContent>
            </Card>
          </TabsContent>

          {/* Screenshots Tab */}
          <TabsContent value="screenshots">
            <ScreenshotViewer />
            </TabsContent>
            
          {/* Event Logs Tab */}
          <TabsContent value="event-logs">
            <EventLogsViewer />
          </TabsContent>
            
          {/* Screenshots Tab */}
          <TabsContent value="screenshots">
            <ScreenshotViewer />
          </TabsContent>

          {/* Debug Tab */}
            <TabsContent value="debug">
            <Card className="card-elevated border-border-accent">
              <CardHeader className="border-b border-border-accent">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-blue-purple p-2 rounded-xl">
                    <Bug className="h-5 w-5 text-white" />
                        </div>
                        <div>
                    <CardTitle className="text-xl font-bold text-foreground">Debug Tools</CardTitle>
                    <p className="text-sm text-muted-foreground">Screenshot capture testing and system diagnostics</p>
                        </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="bg-background-secondary rounded-xl p-6 border border-border">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center">
                    <Bug className="h-5 w-5 text-blue mr-2" />
                    System Diagnostics
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Debug tools and system monitoring utilities.
                  </p>
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">System monitoring tools will be available here.</p>
                        </div>
                                        </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions">
            <QuestionManager />
          </TabsContent>
        </Tabs>

        {/* Grade Submission Modal */}
        {selectedSubmission && (
          <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto" aria-describedby="submission-review-description">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Review Submission from {selectedSubmission.user?.email || `User ${selectedSubmission.userId}`}
                </DialogTitle>
                <p id="submission-review-description" className="text-sm text-muted-foreground">
                  Review and grade this student's code submission
                </p>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Subject:</span> <Badge variant="outline" className="ml-2">{selectedSubmission.subject}</Badge></div>
                  <div><span className="font-medium">Submitted:</span> {formatTime(selectedSubmission.timestamp)}</div>
                  <div><span className="font-medium">User ID:</span> {selectedSubmission.userId}</div>
                  <div><span className="font-medium">Code Length:</span> {selectedSubmission.code.length} characters</div>
                                    </div>
                
                <div>
                  <Label className="text-base font-semibold text-foreground mb-3 block">Student Code:</Label>
                  <div className="bg-background-secondary rounded-xl p-4 border border-border max-h-96 overflow-auto">
                    <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                      {selectedSubmission.code}
                    </pre>
                      </div>
                    </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="grade-score" className="text-sm font-medium text-foreground">Score (0-100)</Label>
                    <Input
                      id="grade-score"
                      type="number"
                      value={gradeScore}
                      onChange={(e) => setGradeScore(e.target.value)}
                      className="mt-1 bg-background-secondary border-border"
                      min="0"
                      max="100"
                    />
                                    </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground">Grade Letter</Label>
                    <div className="mt-1 flex items-center">
                      <Badge variant="outline" className={`text-lg font-bold px-3 py-1 ${getScoreColor(parseInt(gradeScore))}`}>
                        {getGradeLetter(parseInt(gradeScore))}
                      </Badge>
                                    </div>
                                  </div>
                    </div>

                <div>
                  <Label htmlFor="grade-feedback" className="text-sm font-medium text-foreground">Feedback</Label>
                  <Textarea
                    id="grade-feedback"
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                    className="mt-1 bg-background-secondary border-border"
                    rows={4}
                    placeholder="Provide detailed feedback for the student..."
                  />
                                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedSubmission(null)}
                    className="border-border"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleGradeSubmit(selectedSubmission.id, parseInt(gradeScore), gradeFeedback)}
                    disabled={gradeMutation.isPending}
                    className="bg-gradient-pink-purple hover:shadow-glow-pink text-white"
                  >
                    {gradeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Trophy className="h-4 w-4 mr-2" />
                        Submit Grade
                      </>
                    )}
                  </Button>
                    </div>
                      </div>
            </DialogContent>
          </Dialog>
        )}


      </div>
    </div>
  );
}