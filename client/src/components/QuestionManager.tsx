import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Trash2, 
  Clock, 
  BookOpen, 
  Calendar,
  Timer,
  AlertTriangle,
  Sparkles,
  Code2,
  FileText
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

export function QuestionManager() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch questions with real-time updates
  const { data: questions = [], isLoading: isLoadingQuestions, refetch: refetchQuestions } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchIntervalInBackground: true,
    staleTime: 2000,
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to delete question");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({
        title: "Question Deleted",
        description: "The question has been successfully deleted from the system",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Delete Question",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log("Submitting question:", { title, description, language, difficulty, timeLimit });
      
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          language,
          difficulty,
          timeLimit: parseInt(timeLimit),
        }),
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.details || "Failed to create question");
      }

      const data = await response.json();
      console.log("Question created:", data);

      toast({
        title: "Success",
        description: "Question created successfully",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setLanguage("");
      setDifficulty("");
      setTimeLimit("");
      
      // Refetch questions to update the list
      refetchQuestions();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create question",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = (questionId: number) => {
    deleteQuestionMutation.mutate(questionId);
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

  return (
    <div className="space-y-8">
      {/* Create New Question Section */}
      <Card className="card-elevated border-border-accent">
        <CardHeader className="border-b border-border-accent">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-pink-purple p-2 rounded-xl shadow-glow-pink">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-foreground">Create New Question</CardTitle>
              <p className="text-sm text-muted-foreground">Design challenging coding problems for students</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-semibold text-foreground">
                  Question Title
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a captivating question title"
                  required
                  className="bg-background-secondary border-border-accent"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="timeLimit" className="text-sm font-semibold text-foreground">
                  Time Limit (minutes)
                </label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  placeholder="e.g., 60"
                  required
                  min="1"
                  className="bg-background-secondary border-border-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="language" className="text-sm font-semibold text-foreground">
                  Programming Language
                </label>
                <Select value={language} onValueChange={setLanguage} required>
                  <SelectTrigger className="bg-background-secondary border-border-accent">
                    <SelectValue placeholder="Select programming language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JavaScript">JavaScript</SelectItem>
                    <SelectItem value="Python">Python</SelectItem>
                    <SelectItem value="Java">Java</SelectItem>
                    <SelectItem value="C++">C++</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="TypeScript">TypeScript</SelectItem>
                    <SelectItem value="Go">Go</SelectItem>
                    <SelectItem value="Rust">Rust</SelectItem>
                    <SelectItem value="PHP">PHP</SelectItem>
                    <SelectItem value="Ruby">Ruby</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="difficulty" className="text-sm font-semibold text-foreground">
                  Difficulty Level
                </label>
                <Select value={difficulty} onValueChange={setDifficulty} required>
                  <SelectTrigger className="bg-background-secondary border-border-accent">
                    <SelectValue placeholder="Select difficulty level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-semibold text-foreground">
                Question Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed instructions, requirements, and examples for the coding challenge..."
                required
                rows={6}
                className="bg-background-secondary border-border-accent"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-gradient-pink-purple hover:shadow-glow-pink text-white font-semibold transition-all duration-300 hover:scale-105"
            >
              {isSubmitting ? (
                <>
                  <div className="spinner-gradient w-4 h-4 mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Question
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Questions List Section */}
      <Card className="card-elevated border-border-accent">
        <CardHeader className="border-b border-border-accent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-blue-purple p-2 rounded-xl shadow-glow-blue">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-foreground">All Questions</CardTitle>
                <p className="text-sm text-muted-foreground">Manage existing coding challenges</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-pink/20 to-purple/20 px-4 py-2 rounded-full border border-pink/30">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-pink" />
                  <span className="text-sm font-bold text-foreground">{questions.length} Questions</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {isLoadingQuestions ? (
            <div className="flex justify-center items-center py-12">
              <div className="spinner-gradient w-8 h-8"></div>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-background-secondary p-6 rounded-full mx-auto w-fit mb-4">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Questions Available</h3>
              <p className="text-muted-foreground">Create your first coding challenge using the form above.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {questions.map((question) => (
                <Card 
                  key={question.id} 
                  className="card-elevated hover-glow border-border-accent transition-all duration-300 group hover:border-pink/30 hover:scale-[1.02]"
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
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-neon-pink transition-colors line-clamp-2">
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
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline"
                            size="sm"
                            className="bg-red/10 hover:bg-red/20 text-red border-red/30 transition-all duration-300 hover:scale-105"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border-accent">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground flex items-center">
                              <AlertTriangle className="h-5 w-5 text-red mr-2" />
                              Delete Question
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              Are you sure you want to delete "{question.title}"? This action cannot be undone and will remove the question from all student dashboards.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteQuestion(question.id)}
                              className="bg-red hover:bg-red/90 text-white"
                              disabled={deleteQuestionMutation.isPending}
                            >
                              {deleteQuestionMutation.isPending ? (
                                <>
                                  <div className="spinner-gradient w-4 h-4 mr-2"></div>
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Question
                                </>
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
