import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  FileCode, 
  Download, 
  Eye, 
  Code2, 
  Info,
  Clock,
  User,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface FileViewerProps {
  submissionId: number;
  filename?: string;
  onClose?: () => void;
}

interface FileData {
  filename: string;
  content: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export default function FileViewer({ submissionId, filename, onClose }: FileViewerProps) {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFileData();
  }, [submissionId]);

  const loadFileData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/view-file/${submissionId}`);
      
      if (response.ok) {
        const data = await response.json();
        setFileData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to load file");
      }
    } catch (err) {
      console.error('Error loading file:', err);
      setError("Failed to communicate with server");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = async () => {
    try {
      const response = await fetch(`/api/admin/download-submission/${submissionId}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        const downloadFilename = filenameMatch ? filenameMatch[1] : filename || 'submission.txt';
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const getLanguageFromFilename = (filename: string) => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const languageMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.dart': 'dart',
      '.scala': 'scala',
      '.hs': 'haskell',
      '.pl': 'perl',
      '.sh': 'bash',
      '.html': 'html',
      '.css': 'css',
      '.sql': 'sql',
    };
    return languageMap[ext] || 'text';
  };

  const getFileStats = () => {
    if (!fileData) return null;
    
    const lines = fileData.content.split('\n').length;
    const words = fileData.content.split(/\s+/).filter(word => word.length > 0).length;
    const chars = fileData.content.length;
    
    return { lines, words, chars };
  };

  const stats = getFileStats();

  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading file content...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-elevated border-red/20">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load File</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadFileData} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!fileData) return null;

  const language = getLanguageFromFilename(fileData.filename);

  return (
    <div className="space-y-6">
      {/* File Header */}
      <Card className="card-elevated border-border-accent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-blue-purple p-2 rounded-xl shadow-glow-blue">
                <FileCode className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-foreground">{fileData.filename}</CardTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(fileData.uploadedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Info className="h-3 w-3" />
                    <span>{(fileData.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-blue border-blue/30">
                {language.toUpperCase()}
              </Badge>
              <Button
                onClick={downloadFile}
                size="sm"
                className="bg-gradient-green-blue hover:shadow-glow-green text-white"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* File Content and Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* File Statistics */}
        <div className="xl:col-span-1">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-sm flex items-center text-foreground">
                <Info className="h-4 w-4 mr-2 text-blue" />
                File Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Lines:</span>
                    <span className="text-sm font-medium text-foreground">{stats.lines}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Words:</span>
                    <span className="text-sm font-medium text-foreground">{stats.words}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Characters:</span>
                    <span className="text-sm font-medium text-foreground">{stats.chars}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Language:</span>
                    <Badge variant="outline" className="text-xs">
                      {language}
                    </Badge>
                  </div>
                </div>
              )}
              
              <div className="pt-3 border-t border-border">
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green" />
                  <span className="text-green font-medium">Ready for Review</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* File Content */}
        <div className="xl:col-span-3">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-sm flex items-center text-foreground">
                <Code2 className="h-4 w-4 mr-2 text-purple" />
                Source Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 bg-background-secondary rounded-lg text-sm font-mono overflow-auto max-h-96 border border-border whitespace-pre-wrap">
                  <code className={`language-${language}`}>
                    {fileData.content}
                  </code>
                </pre>
                
                {/* Copy button overlay */}
                <Button
                  onClick={() => navigator.clipboard.writeText(fileData.content)}
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity"
                >
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 