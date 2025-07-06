import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileCode, Check, AlertCircle, X } from "lucide-react";

interface FileUploadProps {
  onUploadSuccess?: () => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const allowedExtensions = ['.js', '.py', '.java', '.cpp', '.c', '.ts'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid File Type",
        description: `Please select a valid code file (${allowedExtensions.join(', ')})`,
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    toast({
      title: "File Selected",
      description: `${file.name} is ready for submission`,
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !subject) {
      toast({
        title: "Missing Information",
        description: "Please select both a file and programming language",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('codeFile', selectedFile);
    formData.append('subject', subject);

    try {
      const response = await fetch('/api/submit-file', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Upload Successful",
          description: "Your code has been submitted for grading",
        });
        
        setSelectedFile(null);
        setSubject("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        
        onUploadSuccess?.();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Submit Your Code</h2>
        <p className="text-muted-foreground">Upload your solution for grading</p>
      </div>

      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
                     <div className="space-y-2">
             <Label htmlFor="language-select">Programming Language</Label>
                         <Select value={subject} onValueChange={setSubject}>
               <SelectTrigger id="language-select">
                 <SelectValue placeholder="Select language" />
               </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="c">C</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Code File</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Input
                ref={fileInputRef}
                type="file"
                accept={allowedExtensions.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {!selectedFile ? (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-gray-400" />
                  <div>
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Select File
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Supported: {allowedExtensions.join(', ')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Check className="h-8 w-8 mx-auto text-green-500" />
                  <div className="flex items-center justify-center gap-2">
                    <FileCode className="h-4 w-4" />
                    <span className="text-sm">{selectedFile.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !subject || isUploading}
            className="w-full"
          >
            {isUploading ? "Uploading..." : "Submit for Grading"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 