import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, FileCode, CheckCircle, XCircle, Clock, Zap, RotateCcw, Brain, Star, AlertTriangle, Lightbulb, User, Calendar, Code2, Eye, Award, TrendingUp, HardDrive, Sparkles, Target, BookOpen, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface User {
  id: number;
  email: string;
  role: string;
}

interface Grade {
  id: number;
  score: number;
  feedback: string;
  autogradeId?: number;
}

interface Autograde {
  id: number;
  suggestedScore: number;
  aiAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  codeQuality: number;
  readability: number;
  efficiency: number;
  status: string;
  gradedAt: string;
}

interface Submission {
  id: number;
  userId: number;
  subject: string;
  code: string;
  timestamp: string;
  hasFile: boolean;
  filename?: string;
  fileSize?: number;
  user?: User;
  graded?: boolean;
  grade?: Grade;
  hasAutograde?: boolean;
  autograde?: Autograde;
}

interface SubmissionCardProps {
  submission: Submission;
  onGradeSubmit: (submissionId: number, score: number, feedback: string, autogradeId?: number, approveAutograde?: boolean) => void;
  isGrading: boolean;
}

export default function SubmissionCard({ submission, onGradeSubmit, isGrading }: SubmissionCardProps) {
  const [selectedScore, setSelectedScore] = useState("90");
  const [feedback, setFeedback] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [useAutogradeScore, setUseAutogradeScore] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Set autograde score as default if available
  useEffect(() => {
    if (submission.autograde && !submission.graded) {
      const actualScore = getActualAIScore(submission.autograde);
      setSelectedScore(actualScore.toString());
      setUseAutogradeScore(true);
      setFeedback(generateAutogradeFeedback(submission.autograde));
    }
  }, [submission.autograde, submission.graded]);
  
  // Format time distance
  const formatTime = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  // Generate feedback based on AI autograde results
  const generateAutogradeFeedback = (autograde: Autograde): string => {
    let feedback = `🚀 PURE AI Analysis Results - NO FALLBACKS:\n\n`;
    
    const actualScore = getActualAIScore(autograde);
    feedback += `📊 Overall AI Score: ${actualScore}/100\n\n`;
    
    feedback += `📈 Detailed AI Metrics:\n`;
    feedback += `• Code Quality: ${autograde.codeQuality}/100\n`;
    feedback += `• Readability: ${autograde.readability}/100\n`;
    feedback += `• Efficiency: ${autograde.efficiency}/100\n\n`;
    
    if (autograde.strengths && autograde.strengths.length > 0) {
      feedback += `✅ AI-Detected Strengths:\n`;
      autograde.strengths.forEach(strength => {
        feedback += `• ${strength}\n`;
      });
      feedback += `\n`;
    }
    
    if (autograde.weaknesses && autograde.weaknesses.length > 0) {
      feedback += `⚠️ AI-Detected Issues:\n`;
      autograde.weaknesses.forEach(weakness => {
        feedback += `• ${weakness}\n`;
      });
      feedback += `\n`;
    }
    
    if (autograde.improvements && autograde.improvements.length > 0) {
      feedback += `💡 AI Suggestions:\n`;
      autograde.improvements.forEach(improvement => {
        feedback += `• ${improvement}\n`;
      });
      feedback += `\n`;
    }
    
    feedback += `\n🤖 Detailed AI Analysis:\n${autograde.aiAnalysis}`;
    
    return feedback;
  };
  
  // Extract the actual AI score from analysis text to ensure consistency
  const getActualAIScore = (autograde: Autograde): number => {
    const analysisText = autograde.aiAnalysis;
    const gradeMatch = analysisText.match(/OVERALL GRADE:.*?(\d+)\/100/i) || 
                     analysisText.match(/Grade:.*?(\d+)\/100/i) ||
                     analysisText.match(/Score:.*?(\d+)\/100/i);
    
    if (gradeMatch && gradeMatch[1]) {
      return parseInt(gradeMatch[1]);
    }
    // Fallback to stored score if no match found in analysis
    return autograde.suggestedScore;
  };

  // Parse AI analysis text to extract structured data
  // Define interface for error detection
  interface AIError {
    type: string;
    line: number;
    severity: string;
    deduction: number;
    description: string;
  }

  const parseAIAnalysis = (aiAnalysis: string) => {
    const sections = {
      gradeLevel: '',
      correctness: { score: 0, passedCases: 0, totalCases: 0 },
      errorDetection: [],
      readability: { score: 0, comments: '' },
      efficiency: { 
        observedTime: '', 
        observedSpace: '', 
        expectedTime: '', 
        expectedSpace: '', 
        deduction: 0, 
        remarks: '' 
      },
      detailedErrors: [] as AIError[],
      overallRemarks: ''
    };

    try {
      console.log("🔍 Parsing AI Analysis:", aiAnalysis.substring(0, 500) + "...");

      // Extract AI Scoring Breakdown section scores
      const overallScoreMatch = aiAnalysis.match(/•\s*Overall Score:\s*(\d+)\/100/);
      if (overallScoreMatch) {
        sections.gradeLevel = `Overall Score: ${overallScoreMatch[1]}/100`;
      }

      const correctnessScoreMatch = aiAnalysis.match(/•\s*Code Correctness:\s*(\d+)\/100/);
      if (correctnessScoreMatch) {
        sections.correctness.score = parseInt(correctnessScoreMatch[1]) || 0;
      }

      const readabilityScoreMatch = aiAnalysis.match(/•\s*Readability:\s*(\d+)\/100/);
      if (readabilityScoreMatch) {
        sections.readability.score = Math.round((parseInt(readabilityScoreMatch[1]) || 0) / 10); // Convert to 0-10 scale
      }

      // Extract complexity analysis
      const timeComplexityMatch = aiAnalysis.match(/TIME COMPLEXITY:\s*\n\s*([^-\n]+)/);
      if (timeComplexityMatch) {
        sections.efficiency.observedTime = timeComplexityMatch[1].trim();
      }

      const spaceComplexityMatch = aiAnalysis.match(/SPACE COMPLEXITY:\s*\n\s*([^-\n]+)/);
      if (spaceComplexityMatch) {
        sections.efficiency.observedSpace = spaceComplexityMatch[1].trim();
      }

      // Extract detailed analysis as readability comments
      const detailedAnalysisMatch = aiAnalysis.match(/DETAILED ANALYSIS:\s*\n\s*([\s\S]*?)(?:\n\n|🎯|$)/);
      if (detailedAnalysisMatch) {
        sections.readability.comments = detailedAnalysisMatch[1].trim();
        sections.overallRemarks = detailedAnalysisMatch[1].trim();
      }

      // Calculate efficiency deduction based on efficiency score
      const efficiencyScoreMatch = aiAnalysis.match(/•\s*Efficiency:\s*(\d+)\/100/);
      if (efficiencyScoreMatch) {
        const efficiencyScore = parseInt(efficiencyScoreMatch[1]) || 0;
        sections.efficiency.deduction = Math.max(0, 20 - Math.round(efficiencyScore / 5)); // Convert to deduction
      }

             // Extract basic error information from detailed analysis
       if (sections.readability.comments) {
         const errorKeywords = [
           { keyword: 'logical errors', type: 'Logical Error', severity: 'High' },
           { keyword: 'not defined', type: 'Variable Not Defined', severity: 'Critical' },
           { keyword: 'edge cases', type: 'Missing Edge Cases', severity: 'Medium' },
           { keyword: 'optimized', type: 'Optimization Needed', severity: 'Low' },
           { keyword: 'readability', type: 'Readability Issue', severity: 'Low' },
           { keyword: 'maintainability', type: 'Maintainability Issue', severity: 'Medium' }
         ];

         errorKeywords.forEach((errorInfo, index) => {
           if (sections.readability.comments.toLowerCase().includes(errorInfo.keyword)) {
             sections.detailedErrors.push({
               type: errorInfo.type,
               line: index + 1, // Placeholder line number
               severity: errorInfo.severity,
               deduction: errorInfo.severity === 'Critical' ? 15 : 
                         errorInfo.severity === 'High' ? 10 :
                         errorInfo.severity === 'Medium' ? 5 : 2,
               description: `AI detected issue related to ${errorInfo.keyword}`
             });
           }
         });
       }

       // Note about test cases for user understanding  
       sections.correctness.passedCases = 0; // Static analysis doesn't run actual test cases
       sections.correctness.totalCases = 0;  // This would be set if we had actual test case execution

       console.log("✅ Parsed sections:", sections);

    } catch (error) {
      console.error("Error parsing AI analysis:", error);
    }

    return sections;
  };

  // Handle re-analysis request
  const handleReAnalyze = async () => {
    try {
      toast({
        title: "Re-analyzing Code",
        description: "AI is re-analyzing the submission with fresh analysis...",
      });

      const response = await fetch(`/api/admin/autograde/${submission.id}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to re-analyze submission');
      }

      const result = await response.json();
      console.log("Re-analysis result:", result);

      toast({
        title: "Re-analysis Complete", 
        description: "Fresh AI analysis has been generated! Refresh to see updated results.",
        variant: "default",
      });

      // Refresh the page to show new results
      window.location.reload();

    } catch (error) {
      console.error('Re-analysis error:', error);
      toast({
        title: "Re-analysis Failed",
        description: "Failed to re-analyze submission. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Bright and visible language badge styling with glowy orange effect
  const getSubjectBadge = (subject: string) => {
    const styles: Record<string, string> = {
      javascript: "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/30 backdrop-blur-sm bg-opacity-90",
      python: "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/30 backdrop-blur-sm bg-opacity-90",
      java: "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/30 backdrop-blur-sm bg-opacity-90",
      cpp: "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/30 backdrop-blur-sm bg-opacity-90",
      c: "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/30 backdrop-blur-sm bg-opacity-90",
      typescript: "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/30 backdrop-blur-sm bg-opacity-90",
      go: "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/30 backdrop-blur-sm bg-opacity-90",
      rust: "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/30 backdrop-blur-sm bg-opacity-90",
      default: "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/50 ring-2 ring-orange-400/30 backdrop-blur-sm bg-opacity-90"
    };
    return styles[subject.toLowerCase()] || styles.default;
  };
  
  const getGradeColor = (score: number) => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 80) return "text-blue-400";
    if (score >= 70) return "text-yellow-400";
    if (score >= 60) return "text-orange-400";
    return "text-red-400";
  };
  
  const getGradeLetter = (score: number) => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  };
  
  const handleGradeSubmit = () => {
    const autogradeId = useAutogradeScore && submission.autograde ? submission.autograde.id : undefined;
    const approveAutograde = useAutogradeScore;
    onGradeSubmit(submission.id, parseInt(selectedScore), feedback, autogradeId, approveAutograde);
    setIsOpen(false);
  };

  const handleLoadFileContent = async () => {
    if (!submission.hasFile) return;
    
    setIsLoadingFile(true);
    try {
      const response = await fetch(`/api/admin/view-file/${submission.id}`);
      if (response.ok) {
        const fileData = await response.json();
        setFileContent(fileData.content);
      } else {
        console.error('Failed to load file content, status:', response.status);
        toast({
          title: "Error",
          description: "Failed to load file content",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading file content:', error);
      toast({
        title: "Error",
        description: "Failed to load file content",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Get status badge for the submission
  const getStatusBadge = () => {
    if (submission.graded) {
      return (
        <div className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 px-3 py-1.5 rounded-full border border-emerald-400/30 shadow-lg shadow-emerald-400/20 hover:shadow-emerald-400/40 transition-all duration-300">
          <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full animate-pulse shadow-sm shadow-emerald-400/50"></div>
          <span className="text-sm font-medium text-emerald-300">Graded</span>
        </div>
      );
    } else if (submission.hasAutograde) {
      return (
        <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-3 py-1.5 rounded-full border border-blue-400/30 shadow-lg shadow-blue-400/20 hover:shadow-blue-400/40 transition-all duration-300">
          <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse shadow-sm shadow-blue-400/50"></div>
          <span className="text-sm font-medium text-blue-300">AI Ready</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1.5 rounded-full border border-amber-400/30 shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40 transition-all duration-300">
          <div className="w-2 h-2 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full animate-pulse shadow-sm shadow-amber-400/50"></div>
          <span className="text-sm font-medium text-amber-300">Pending</span>
        </div>
      );
    }
  };

  // Score Card Component for AI metrics
  const ScoreCard = ({ label, value, maxValue = 100, icon: Icon, color }: { label: string; value: number; maxValue?: number; icon: any; color: string }) => (
    <div className="bg-[#0a0a15]/50 backdrop-blur-sm border border-white/5 rounded-xl p-4 group hover:bg-[#0a0a15]/70 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        <span className={`text-lg font-bold ${color}`}>{value}</span>
      </div>
      <div className="w-full bg-black/50 rounded-full h-2">
        <div 
          className={`h-2 rounded-full bg-gradient-to-r ${
            color.includes('emerald') ? 'from-emerald-500 to-green-400' :
            color.includes('blue') ? 'from-blue-500 to-cyan-400' :
            color.includes('purple') ? 'from-purple-500 to-pink-400' :
            'from-gray-500 to-slate-400'
          }`}
          style={{ width: `${(value / maxValue) * 100}%` }}
        />
      </div>
    </div>
  );
  
  return (
    <div className="group relative">
      {/* Enhanced Hover Glow Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 scale-110 group-hover:animate-pulse" />
      
      <Card className="relative overflow-hidden bg-gradient-to-br from-[#0a0a15] via-[#0f1015] to-[#080812] border-2 border-white/10 rounded-3xl shadow-2xl hover:shadow-purple-500/40 transition-all duration-500 text-white font-['Inter',sans-serif] w-full max-w-md backdrop-blur-xl hover:scale-[1.02] hover:border-purple-500/70 hover:ring-4 hover:ring-pink-500/50 hover:shadow-2xl hover:shadow-purple-500/30">
        {/* Gradient overlay with glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-pink-500/4 to-blue-500/8 pointer-events-none" />
        
        {/* Decorative glowing dots */}
        <div className="absolute top-4 right-4 w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-60 animate-pulse" />
        <div className="absolute top-6 right-8 w-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-40" />
        <div className="absolute bottom-4 left-4 w-1 h-1 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full opacity-50" />
        
        {/* Enhanced Glowing border effect */}
        <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-br from-purple-500/50 via-pink-500/40 to-blue-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="h-full w-full rounded-3xl bg-gradient-to-br from-[#0a0a15] via-[#0f1015] to-[#080812]" />
        </div>
        
        {/* Header - Simplified and Clean */}
        <CardHeader className="relative pb-4 z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {/* Clean avatar with subtle glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-md opacity-0 group-hover:opacity-60 transition-all duration-300 scale-110" />
                
                <div className="relative w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all duration-300">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  {submission.user?.email || `Student ${submission.userId}`}
                </h3>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${getSubjectBadge(submission.subject)}`}>
                  {submission.subject.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge()}
            </div>
          </div>
          
          <div className="flex items-center text-xs text-gray-300 bg-black/30 rounded-full px-3 py-1.5 backdrop-blur-sm border border-white/5">
            <Calendar className="h-3 w-3 mr-2" />
            {formatTime(submission.timestamp)}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 px-6 z-10 relative">
          {/* Code Block with enhanced glow */}
          <div className="relative group/code">
            {/* Glowing background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-2xl blur-xl opacity-0 group-hover/code:opacity-100 transition-opacity duration-500" />
            
            <div className="relative bg-gradient-to-br from-[#050508] via-[#0a0a0f] to-[#050508] border border-white/10 rounded-2xl p-4 font-['Fira_Code',monospace] text-sm mt-3 shadow-inner backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-red-500 rounded-full shadow-sm shadow-red-500/50"></div>
                  <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full shadow-sm shadow-yellow-500/50"></div>
                  <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full shadow-sm shadow-green-500/50"></div>
                </div>
                <Code2 className="h-4 w-4 text-gray-400" />
              </div>
              
              <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/30">
                {submission.hasFile && isLoadingFile ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-lg animate-pulse" />
                      <Loader2 className="relative h-4 w-4 animate-spin text-purple-400 mr-2" />
                    </div>
                    <span className="text-purple-400 text-xs">Loading...</span>
                  </div>
                ) : (
                  <pre className="text-gray-200 text-xs leading-relaxed whitespace-pre-wrap">
                    {submission.hasFile && fileContent 
                      ? fileContent 
                      : submission.code && submission.code.trim() 
                        ? submission.code 
                        : "// No code content available"
                    }
                  </pre>
                )}
              </div>
            </div>
          </div>
          

          
          {/* Final Grade Display - Enhanced */}
          {submission.graded && submission.grade && (
            <div className="relative mt-4 group/grade">
              {/* Glowing background */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 to-green-500/15 rounded-2xl blur-xl opacity-60 group-hover/grade:opacity-90 transition-opacity duration-500" />
              
              <div className="relative p-5 bg-gradient-to-br from-emerald-900/50 via-green-900/40 to-teal-900/50 backdrop-blur-sm border border-emerald-500/40 rounded-2xl shadow-lg shadow-emerald-500/20 group-hover/grade:shadow-emerald-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full blur-md opacity-70 group-hover/grade:opacity-90 transition-opacity duration-300" />
                      <div className="relative w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
                        <Award className="h-4.5 w-4.5 text-white" />
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-emerald-200 font-semibold tracking-wide">FINAL GRADE</span>
                      <div className="text-xs text-emerald-300/70 mt-0.5">
                        Grade {getGradeLetter(submission.grade.score)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-green-300 bg-clip-text text-transparent group-hover/grade:scale-110 transition-transform duration-300">
                      {submission.grade.score}%
                    </div>
                    <div className="text-xs text-emerald-400/70 mt-1">
                      {submission.grade.score >= 90 ? "Excellent" : 
                       submission.grade.score >= 80 ? "Good" : 
                       submission.grade.score >= 70 ? "Average" : 
                       submission.grade.score >= 60 ? "Needs Work" : "Poor"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-0 px-6 pb-6 z-10 relative">
          <div className="flex justify-between items-center w-full gap-4">
            {/* Status Indicator (Non-Interactive) */}
            {submission.graded ? (
              <div className="flex items-center space-x-2 bg-gradient-to-r from-[#10b981]/20 to-[#059669]/20 text-emerald-300 rounded-full px-4 py-2.5 text-sm font-medium border border-emerald-500/30 backdrop-blur-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Graded</span>
              </div>
            ) : submission.hasAutograde ? (
              <div className="flex items-center space-x-2 bg-gradient-to-r from-[#8b5cf6]/20 to-[#3b82f6]/20 text-purple-300 rounded-full px-4 py-2.5 text-sm font-medium border border-purple-500/30 backdrop-blur-sm">
                <Brain className="h-4 w-4" />
                <span>AI Analyzed</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-gradient-to-r from-[#f59e0b]/20 to-[#ea580c]/20 text-amber-300 rounded-full px-4 py-2.5 text-sm font-medium border border-amber-500/30 backdrop-blur-sm animate-pulse">
                <Clock className="h-4 w-4" />
                <span>Pending Review</span>
              </div>
                          )}

            {/* Action Button - Properly Aligned */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] hover:from-[#f472b6] hover:to-[#a78bfa] text-white border-0 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex-shrink-0"
                  onClick={() => {
                    if (submission.hasFile && !fileContent) {
                      handleLoadFileContent();
                    }
                  }}
                >
                  <div className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    <span>
                      {submission.graded ? "Review Details" : "Grade"}
                    </span>
                  </div>
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-[#050508] via-[#0a0a0f] to-[#050508] border border-white/10 text-white backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" />
                
                <DialogHeader className="border-b border-white/10 pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-60"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/40">
                          <User className="h-6 w-6 text-white" />
                      </div>
                    </div>
                      <div>
                        <DialogTitle className="text-2xl font-bold text-white">
                          {submission.user?.email || `Student ${submission.userId}`}
                  </DialogTitle>
                        <div className="flex items-center space-x-3 mt-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getSubjectBadge(submission.subject)}`}>
                            {submission.subject.toUpperCase()}
                          </span>
                          {getStatusBadge()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-300 mb-2">Submitted</div>
                      <div className="text-lg font-semibold text-white">{formatTime(submission.timestamp)}</div>
                    </div>
                  </div>
                </DialogHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                  <TabsList className="grid w-full grid-cols-3 bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-1">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500/30 data-[state=active]:text-white rounded-lg transition-all duration-300">
                      <Target className="h-4 w-4 mr-2" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="ai-analysis" className="data-[state=active]:bg-purple-500/30 data-[state=active]:text-white rounded-lg transition-all duration-300">
                      <Brain className="h-4 w-4 mr-2" />
                      AI Analysis
                    </TabsTrigger>
                    <TabsTrigger value="grading" className="data-[state=active]:bg-purple-500/30 data-[state=active]:text-white rounded-lg transition-all duration-300">
                      <Award className="h-4 w-4 mr-2" />
                      Grading
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="mt-8 space-y-6">
                    {/* Code Display */}
                    <div className="relative group/code">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-2xl blur-xl opacity-0 group-hover/code:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative bg-gradient-to-br from-[#050508] via-[#0a0a0f] to-[#050508] border border-white/10 rounded-2xl p-6 shadow-inner backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-white flex items-center">
                            <Code2 className="h-5 w-5 mr-2" />
                            Code Submission
                          </h3>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-red-500 rounded-full shadow-sm shadow-red-500/50"></div>
                            <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full shadow-sm shadow-yellow-500/50"></div>
                            <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full shadow-sm shadow-green-500/50"></div>
                        </div>
                      </div>
                        
                        <div className="bg-black/50 rounded-xl p-4 font-mono text-sm max-h-96 overflow-y-auto">
                          {submission.hasFile && fileContent ? (
                            <pre className="text-gray-200 whitespace-pre-wrap">{fileContent}</pre>
                          ) : submission.code ? (
                            <pre className="text-gray-200 whitespace-pre-wrap">{submission.code}</pre>
                          ) : (
                            <div className="text-gray-400 text-center py-8">
                              No code content available
                        </div>
                          )}
                    </div>

                        {submission.hasFile && (
                          <div className="mt-4 p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <FileCode className="h-4 w-4 text-purple-400" />
                                <span className="text-sm font-medium text-purple-300">
                                  {submission.filename || 'Uploaded File'}
                                </span>
                                {submission.fileSize && (
                                  <span className="text-xs text-purple-400/70">
                                    ({(submission.fileSize / 1024).toFixed(1)} KB)
                                  </span>
                                )}
                        </div>
                        <Button
                                onClick={handleLoadFileContent}
                                disabled={isLoadingFile}
                                size="sm"
                                className="bg-purple-500 hover:bg-purple-600 text-white"
                              >
                                {isLoadingFile ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                    Loading...
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3 mr-2" />
                                    View File
                                  </>
                                )}
                        </Button>
                      </div>
                            </div>
                        )}
                            </div>
                          </div>
                          
                  </TabsContent>

                  <TabsContent value="ai-analysis" className="mt-8">
                    {submission.hasAutograde && submission.autograde ? (
                      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
                        {/* Background decorative elements */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.15)_1px,_transparent_0)] [background-size:16px_16px] opacity-20"></div>
                        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
                        
                        <div className="relative z-10 p-8">
                          {/* AI Analysis Header */}
                          <div className="text-center mb-12">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-6 shadow-2xl shadow-purple-500/30">
                              <Brain className="h-10 w-10 text-white" />
                            </div>
                            <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                              AI Analysis Complete
                            </h1>
                            <div className="text-6xl font-bold text-white mb-2">
                              {getActualAIScore(submission.autograde)}<span className="text-purple-400">%</span>
                            </div>
                            <p className="text-purple-300 text-xl">Overall AI Score</p>
                            <Button
                              onClick={handleReAnalyze}
                              className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 rounded-full px-8 py-3 shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/40"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Re-analyze Code
                            </Button>
                          </div>

                          {/* Beautiful AI Analysis Display */}
                          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl border border-slate-700/30 rounded-3xl p-8 shadow-2xl">
                            <div className="flex items-center mb-8">
                              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-purple-500/25">
                                <Brain className="h-7 w-7 text-white" />
                              </div>
                              <div>
                                <h3 className="text-3xl font-bold text-white mb-1">AI Analysis Report</h3>
                                <p className="text-slate-400 text-lg">Comprehensive Code Review</p>
                              </div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/60 rounded-2xl p-8 backdrop-blur-sm border border-slate-600/30">
                              <div className="space-y-4">
                                {submission.autograde.aiAnalysis.split('\n').map((line, index) => {
                                  const trimmedLine = line.trim();
                                  
                                  // Skip empty lines with smaller spacing
                                  if (!trimmedLine) return <div key={index} className="h-2"></div>;
                                  
                                  // Just display all lines with consistent, beautiful formatting
                                  // No interpretation or categorization - pure AI response
                                  return (
                                    <div key={index} className="bg-gradient-to-r from-slate-800/40 to-slate-700/40 rounded-xl p-4 border border-slate-600/30 hover:border-slate-500/40 transition-all duration-200">
                                      <span className="text-slate-100 text-lg leading-relaxed font-medium block">
                                        {trimmedLine}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="bg-[#0a0a15]/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-2xl font-bold text-white mb-2">No AI Analysis Available</h3>
                          <p className="text-gray-400 mb-6">
                            This submission hasn't been analyzed by AI yet.
                          </p>
                          <Button
                            onClick={async () => {
                              try {
                                toast({
                                  title: "AI Analysis Started",
                                  description: "AI analysis started! This may take a few seconds.",
                                });
                                const response = await fetch(`/api/admin/autograde/${submission.id}`, {
                                  method: 'POST',
                                });
                                if (!response.ok) {
                                  throw new Error('Failed to start AI analysis');
                                }
                                // Refresh the page or update the state
                                window.location.reload();
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to start AI analysis",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="bg-purple-500 hover:bg-purple-600 text-white"
                          >
                            <Brain className="h-4 w-4 mr-2" />
                            Start AI Analysis
                          </Button>
                      </div>
                    </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="grading" className="mt-8 space-y-6">
                    {/* AI Recommendation */}
                    {submission.hasAutograde && submission.autograde && (
                      <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-blue-500/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                              <Brain className="h-7 w-7 text-white" />
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-white">AI Recommendation</h4>
                              <p className="text-gray-300">
                                AI suggests <span className="font-bold text-purple-400">{getActualAIScore(submission.autograde)}%</span> based on comprehensive analysis
                              </p>
                            </div>
                          </div>
                                                    <Button
                            onClick={() => {
                              if (submission.autograde) {
                                const actualScore = getActualAIScore(submission.autograde);
                                setSelectedScore(actualScore.toString());
                                setUseAutogradeScore(true);
                                setFeedback(generateAutogradeFeedback(submission.autograde));
                              }
                            }}
                            className="bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] hover:from-[#f472b6] hover:to-[#a78bfa] text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                          >
                              <div className="flex items-center">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <span>Use AI Suggestion</span>
                              </div>
                            </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Grading Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-[#0a0a15]/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
                        <Label htmlFor="score" className="text-sm font-medium text-gray-300 mb-3 block">
                          Score (%)
                        </Label>
                        <Select 
                          value={selectedScore} 
                          onValueChange={(value) => {
                            setSelectedScore(value);
                            setUseAutogradeScore(false);
                          }}
                        >
                          <SelectTrigger className="w-full bg-[#050508] border-white/10 text-white">
                            <SelectValue placeholder="Select a score" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#050508] border-white/10">
                            <SelectItem value="100">100% - Perfect</SelectItem>
                            <SelectItem value="95">95% - Excellent</SelectItem>
                            <SelectItem value="90">90% - Very Good</SelectItem>
                            <SelectItem value="85">85% - Good</SelectItem>
                            <SelectItem value="80">80% - Above Average</SelectItem>
                            <SelectItem value="75">75% - Average</SelectItem>
                            <SelectItem value="70">70% - Below Average</SelectItem>
                            <SelectItem value="65">65% - Poor</SelectItem>
                            <SelectItem value="60">60% - Very Poor</SelectItem>
                            <SelectItem value="50">50% - Needs Major Improvement</SelectItem>
                            <SelectItem value="40">40% - Unsatisfactory</SelectItem>
                            <SelectItem value="30">30% - Very Unsatisfactory</SelectItem>
                            <SelectItem value="20">20% - Minimal Effort</SelectItem>
                            <SelectItem value="10">10% - Little to No Effort</SelectItem>
                            <SelectItem value="0">0% - Not Submitted/Plagiarized</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-blue-500/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                            {selectedScore}%
                          </div>
                          <div className="text-sm text-purple-400 font-medium mb-1">
                            Selected Grade
                          </div>
                          <div className="text-sm text-gray-400">
                            Grade {getGradeLetter(parseInt(selectedScore))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-[#0a0a15]/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
                      <Label htmlFor="feedback" className="text-sm font-medium text-gray-300 mb-3 block">
                        Feedback
                      </Label>
                      <Textarea 
                        id="feedback" 
                        placeholder="Provide detailed feedback to help the student improve their code..."
                        className="min-h-[150px] bg-[#050508] border-white/10 text-white placeholder-gray-500 resize-none"
                        value={feedback}
                        onChange={(e) => {
                          setFeedback(e.target.value);
                          setUseAutogradeScore(false);
                        }}
                      />
                    </div>
                    
                    <div className="flex justify-end">
                                            <Button
                        onClick={handleGradeSubmit}
                        disabled={isGrading}
                        className="bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] hover:from-[#f472b6] hover:to-[#a78bfa] text-white px-8 py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
                      >
                          {isGrading ? (
                            <div className="flex items-center justify-center">
                              <Loader2 className="h-5 w-5 animate-spin mr-2" />
                              <span>Saving Grade...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              {useAutogradeScore ? (
                                <>
                                  <CheckCircle className="h-5 w-5 mr-2" />
                                  <span>Approve AI Grade</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="h-5 w-5 mr-2" />
                                  <span>Submit Grade</span>
                                </>
                              )}
                            </div>
                          )}
                        </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}