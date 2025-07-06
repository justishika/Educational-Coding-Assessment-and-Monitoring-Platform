import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  TrendingUp, 
  Calendar, 
  Clock,
  Award,
  Target,
  BarChart3,
  Sparkles
} from "lucide-react";

interface Grade {
  id: string;
  subject: string;
  score: number;
  maxScore: number;
  submittedAt: string;
  feedback?: string;
  status: "graded" | "pending" | "late";
  aiAnalysis?: string;
  codeQuality?: number;
  readability?: number;
  efficiency?: number;
  hasAutograde?: boolean;
}

interface GradeCardProps {
  title: string;
  subtitle?: string;
  grades: Grade[];
  isLoading: boolean;
}

export default function GradeCard({ title, subtitle, grades, isLoading }: GradeCardProps) {
  // Ensure grades is always an array to prevent reduce errors
  const safeGrades = Array.isArray(grades) ? grades : [];
  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green";
    if (percentage >= 80) return "text-blue";
    if (percentage >= 70) return "text-yellow";
    if (percentage >= 60) return "text-orange";
    return "text-red";
  };

  const getScoreBadgeColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green/20 text-green border-green/30";
    if (percentage >= 80) return "bg-blue/20 text-blue border-blue/30";
    if (percentage >= 70) return "bg-yellow/20 text-yellow border-yellow/30";
    if (percentage >= 60) return "bg-orange/20 text-orange border-orange/30";
    return "bg-red/20 text-red border-red/30";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "graded": return "bg-green/20 text-green border-green/30";
      case "pending": return "bg-blue/20 text-blue border-blue/30";
      case "late": return "bg-red/20 text-red border-red/30";
      default: return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  const calculateOverallGrade = () => {
    if (safeGrades.length === 0) return 0;
    
    const total = safeGrades.reduce((sum, grade) => {
      const percentage = (grade.score / grade.maxScore) * 100;
      return sum + percentage;
    }, 0);
    return Math.round(total / safeGrades.length);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card className="card-elevated hover:border-2 hover:border-gray-500/70 hover:ring-4 hover:ring-slate-500/50 hover:shadow-lg hover:shadow-gray-500/30 transition-all duration-300">
        <CardHeader className="space-y-4">
          <div className="h-6 bg-background-secondary rounded w-1/3"></div>
          <div className="h-4 bg-background-secondary rounded w-2/3"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 animate-pulse">
              <div className="h-4 bg-background-secondary rounded"></div>
              <div className="h-2 bg-background-secondary rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const overallGrade = calculateOverallGrade();

  return (
    <div className="space-y-6">
      {/* Overall Performance Card */}
      <Card className="card-elevated border-border-accent hover:border-2 hover:border-purple-500/70 hover:ring-4 hover:ring-pink-500/50 hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center text-foreground">
                <Trophy className="h-5 w-5 mr-2 text-yellow" />
                {title}
              </CardTitle>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${getScoreColor(overallGrade)}`}>
                {overallGrade}%
              </div>
              <p className="text-xs text-muted-foreground">Overall Average</p>
            </div>
          </div>
      </CardHeader>
      
        <CardContent className="space-y-6">
          {/* Progress Visualization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Performance Progress</span>
              <span className={`font-medium ${getScoreColor(overallGrade)}`}>
                {overallGrade}% Complete
              </span>
            </div>
            <Progress 
              value={overallGrade} 
              className="h-2 bg-background-secondary"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-background-secondary border border-border">
              <div className="flex items-center justify-center mb-2">
                <Award className="h-4 w-4 text-blue" />
              </div>
              <div className="text-lg font-semibold text-foreground">{safeGrades.length}</div>
              <div className="text-xs text-muted-foreground">Submissions</div>
            </div>
            
            <div className="text-center p-3 rounded-xl bg-background-secondary border border-border">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-4 w-4 text-green" />
              </div>
              <div className="text-lg font-semibold text-foreground">
                {safeGrades.filter(g => (g.score / g.maxScore) * 100 >= 80).length}
              </div>
              <div className="text-xs text-muted-foreground">High Scores</div>
            </div>
            
            <div className="text-center p-3 rounded-xl bg-background-secondary border border-border">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-4 w-4 text-purple" />
              </div>
              <div className="text-lg font-semibold text-foreground">
                {safeGrades.filter(g => g.status === "graded").length}
              </div>
              <div className="text-xs text-muted-foreground">Graded</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Grades */}
      <Card className="card-elevated hover:border-2 hover:border-blue-500/70 hover:ring-4 hover:ring-cyan-500/50 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <BarChart3 className="h-5 w-5 mr-2 text-blue" />
            Individual Results
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {safeGrades.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-background-secondary p-6 rounded-full mx-auto w-fit mb-4">
                <Sparkles className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Grades Yet</h3>
              <p className="text-muted-foreground">
                Complete some coding challenges to see your grades here.
              </p>
          </div>
        ) : (
            <div className="space-y-4">
              {safeGrades.map((grade) => {
                const percentage = Math.round((grade.score / grade.maxScore) * 100);
                
                return (
                  <div 
                    key={grade.id} 
                    className="p-4 rounded-xl border border-border-accent bg-background-secondary hover:bg-card-elevated transition-all duration-300 hover:border-pink/30"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground">{grade.subject}</h4>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(grade.submittedAt)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-medium border ${getStatusColor(grade.status)}`}
                        >
                          {grade.status}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-sm font-bold border ${getScoreBadgeColor(percentage)}`}
                        >
                          {percentage}%
                      </Badge>
                      </div>
                    </div>
                    
                    {/* Score Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {grade.score} / {grade.maxScore} points
                        </span>
                        <span className={`font-medium ${getScoreColor(percentage)}`}>
                          {percentage}%
                        </span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-1.5 bg-background"
                      />
                    </div>
                    
                    {/* AI Analysis Metrics */}
                    {grade.hasAutograde && (grade.codeQuality || grade.readability || grade.efficiency) && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/30">
                        <div className="flex items-center mb-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                          <span className="text-sm font-medium text-purple-300">AI Analysis</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {grade.codeQuality && (
                            <div className="text-center p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
                              <div className="text-emerald-300 font-bold">{grade.codeQuality}</div>
                              <div className="text-emerald-200/80">Quality</div>
                            </div>
                          )}
                          {grade.readability && (
                            <div className="text-center p-2 bg-blue-500/10 rounded border border-blue-500/20">
                              <div className="text-blue-300 font-bold">{grade.readability}</div>
                              <div className="text-blue-200/80">Readability</div>
                            </div>
                          )}
                          {grade.efficiency && (
                            <div className="text-center p-2 bg-purple-500/10 rounded border border-purple-500/20">
                              <div className="text-purple-300 font-bold">{grade.efficiency}</div>
                              <div className="text-purple-200/80">Efficiency</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Feedback */}
                    {grade.feedback && (
                      <div className="mt-3 p-3 bg-background rounded-lg border border-border">
                        <p className="text-sm text-muted-foreground">
                          <strong className="text-foreground">
                            {grade.hasAutograde ? "AI Analysis & Feedback:" : "Feedback:"}
                          </strong>
                        </p>
                        <div className="mt-2 text-sm text-muted-foreground max-h-32 overflow-y-auto">
                          {grade.feedback.split('\n').map((line, index) => (
                            <div key={index} className={`
                              ${line.includes('🚀') ? 'text-purple-400 font-semibold' : ''}
                              ${line.includes('📊') ? 'text-blue-400 font-medium' : ''}
                              ${line.includes('✅') ? 'text-green-400' : ''}
                              ${line.includes('⚠️') ? 'text-orange-400' : ''}
                              ${line.includes('💡') ? 'text-blue-400' : ''}
                              ${line.includes('🤖') ? 'text-purple-400 font-medium' : ''}
                            `}>
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}