import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Clock, 
  Code2, 
  FileText, 
  Calendar,
  Sparkles,
  ChevronRight,
  Timer
} from "lucide-react";

interface Question {
  id: number;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  timeLimit: number;
  createdAt: string;
}

interface QuestionListProps {
  onStartQuestion: (questionId: number, timeLimit: number) => Promise<void>;
}

export function QuestionList({ onStartQuestion }: QuestionListProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingQuestion, setStartingQuestion] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchQuestions = async (isInitialLoad = true) => {
      try {
        if (!isInitialLoad) {
          setIsRefreshing(true);
        }
        const response = await fetch("/api/questions");
        if (!response.ok) {
          throw new Error("Failed to fetch questions");
        }
        const data = await response.json();
        setQuestions(data);
      } catch (error) {
        console.error("Error fetching questions:", error);
        if (isInitialLoad) {
          toast({
            title: "Error",
            description: "Failed to load questions",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchQuestions(true);
    
    // Set up interval to refresh questions every 5 seconds for real-time updates
    const interval = setInterval(() => fetchQuestions(false), 5000);
    
    return () => clearInterval(interval);
  }, [toast]);

  const handleStartQuestion = async (questionId: number, timeLimit: number) => {
    try {
      setStartingQuestion(questionId);
      await onStartQuestion(questionId, timeLimit);
      toast({
        title: "Question Session Started",
        description: `${timeLimit} minute timer started. Redirecting to workspace...`,
      });
    } catch (error) {
      console.error("Error starting question:", error);
      toast({
        title: "Error",
        description: "Failed to start question",
        variant: "destructive",
      });
    } finally {
      setStartingQuestion(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "expert": return "bg-red/20 text-red border-red/30";
      case "hard": return "bg-orange/20 text-orange border-orange/30";
      case "medium": return "bg-blue/20 text-blue border-blue/30";
      case "easy": return "bg-green/20 text-green border-green/30";
      default: return "bg-gray/20 text-gray border-gray/30";
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "expert": return "🔥";
      case "hard": return "💀";
      case "medium": return "⚡";
      case "easy": return "🌟";
      default: return "❓";
    }
  };

  const getLanguageIcon = (language: string) => {
    switch (language.toLowerCase()) {
      case "javascript": return "🟨";
      case "python": return "🐍";
      case "java": return "☕";
      case "c++": return "⚙️";
      case "c": return "🔧";
      case "typescript": return "🔷";
      case "go": return "🐹";
      case "rust": return "🦀";
      case "php": return "🐘";
      case "ruby": return "💎";
      default: return "💻";
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="card-elevated animate-pulse">
            <CardHeader className="space-y-3">
              <div className="h-4 bg-background-secondary rounded"></div>
              <div className="h-3 bg-background-secondary rounded w-2/3"></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-3 bg-background-secondary rounded"></div>
              <div className="h-3 bg-background-secondary rounded w-3/4"></div>
              <div className="h-8 bg-background-secondary rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="card-elevated">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="bg-background-secondary p-6 rounded-full mb-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Questions Available</h3>
          <p className="text-muted-foreground text-center max-w-md">
            There are currently no coding challenges available. Please check back later or contact your instructor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time sync indicator */}
      {isRefreshing && (
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center space-x-2 bg-gradient-pink-purple/10 backdrop-blur-sm px-4 py-2 rounded-full border border-pink/20">
            <div className="w-2 h-2 bg-pink rounded-full animate-pulse"></div>
            <span className="text-xs text-pink font-medium">Syncing questions...</span>
          </div>
        </div>
      )}
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {questions.map((question) => (
        <Card 
          key={question.id} 
          className="card-elevated hover-glow border-border-accent transition-all duration-300 group hover:border-pink/30"
        >
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-medium border ${getDifficultyColor(question.difficulty)}`}
                  >
                    {getDifficultyIcon(question.difficulty)} {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs font-medium border border-blue/30 bg-blue/10 text-blue"
                  >
                    {getLanguageIcon(question.language)} {question.language}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-semibold text-foreground group-hover:text-neon-pink transition-colors">
                  {question.title}
                </CardTitle>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(question.createdAt)}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {question.description}
            </p>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span className="font-medium">{question.timeLimit} min</span>
              </div>
              
              <Button 
                onClick={() => handleStartQuestion(question.id, question.timeLimit)}
                disabled={startingQuestion === question.id}
                className="bg-gradient-pink-purple hover:shadow-glow-pink text-white font-semibold transition-all duration-300 hover:scale-105 group-hover:shadow-glow-pink"
              >
                {startingQuestion === question.id ? (
                  <div className="flex items-center">
                    <div className="spinner-gradient w-4 h-4 mr-2"></div>
                    Starting...
                  </div>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
          
          {/* Gradient border effect on hover */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-pink-purple opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
        </Card>
      ))}
      
      {/* Add Question Placeholder for Future */}
      <Card className="card-elevated border-dashed border-border-accent hover:border-purple/50 transition-all duration-300">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-gradient-blue-purple p-3 rounded-2xl mb-4 opacity-60">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">More Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            New coding challenges are being prepared
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
} 