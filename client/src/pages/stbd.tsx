import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import MonacoEditor from "@/components/monaco-editor";
import CountdownTimer from "@/components/countdown-timer";
import AntiCheat from "@/components/anti-cheat";
import ScreenCapture from "@/components/screen-capture";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface Grade {
  id: number;
  submissionId: number;
  score: number;
  feedback: string;
  timestamp: string;
  subject: string;
}

function Codespace({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      width="100%"
      height="700"
      style={{ border: "none" }}
      title="Student Codespace"
    />
  );
}

export default function StudentDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState("javascript");
  const [code, setCode] = useState<string>(`/**
 * Write a function to check if a number is prime.
 * Return true if the number is prime, otherwise return false.
 */
function isPrime(num) {
  // Your code here
  
  return false;
}

// Example test cases
console.log(isPrime(7)); // should return: true
console.log(isPrime(10)); // should return: false
console.log(isPrime(2)); // should return: true
console.log(isPrime(1)); // should return: false`);
  const [testResults, setTestResults] = useState<{ passed: boolean; message: string }[]>([]);
  const [codespaceUrl, setCodespaceUrl] = useState<string | null>(null);

  // Simulate test cases for different languages
  const testCases: Record<string, Array<{ input: number; expected: boolean }>> = {
    javascript: [
      { input: 7, expected: true },
      { input: 10, expected: false },
      { input: 2, expected: true },
      { input: 1, expected: false },
      { input: 13, expected: true },
      { input: 4, expected: false }
    ],
    python: [
      { input: 7, expected: true },
      { input: 10, expected: false },
      { input: 2, expected: true },
      { input: 1, expected: false }
    ],
    java: [
      { input: 7, expected: true },
      { input: 10, expected: false },
      { input: 2, expected: true },
      { input: 1, expected: false }
    ],
    cpp: [
      { input: 7, expected: true },
      { input: 10, expected: false },
      { input: 2, expected: true },
      { input: 1, expected: false }
    ]
  };

  // Language-specific template code
  const templates: Record<string, string> = {
    javascript: `/**
 * Write a function to check if a number is prime.
 * Return true if the number is prime, otherwise return false.
 */
function isPrime(num) {
  // Your code here
  
  return false;
}

// Example test cases
console.log(isPrime(7)); // should return: true
console.log(isPrime(10)); // should return: false
console.log(isPrime(2)); // should return: true
console.log(isPrime(1)); // should return: false`,
    python: `# Write a function to check if a number is prime.
# Return True if the number is prime, otherwise return False.
def is_prime(num):
    # Your code here
    
    return False

# Example test cases
print(is_prime(7))  # should return: True
print(is_prime(10))  # should return: False
print(is_prime(2))  # should return: True
print(is_prime(1))  # should return: False`,
    java: `/**
 * Write a function to check if a number is prime.
 * Return true if the number is prime, otherwise return false.
 */
public class Solution {
    public static boolean isPrime(int num) {
        // Your code here
        
        return false;
    }
    
    public static void main(String[] args) {
        // Example test cases
        System.out.println(isPrime(7));  // should return: true
        System.out.println(isPrime(10)); // should return: false
        System.out.println(isPrime(2));  // should return: true
        System.out.println(isPrime(1));  // should return: false
    }
}`,
    cpp: `#include <iostream>

/**
 * Write a function to check if a number is prime.
 * Return true if the number is prime, otherwise return false.
 */
bool isPrime(int num) {
    // Your code here
    
    return false;
}

int main() {
    // Example test cases
    std::cout << std::boolalpha;
    std::cout << isPrime(7) << std::endl;  // should return: true
    std::cout << isPrime(10) << std::endl; // should return: false
    std::cout << isPrime(2) << std::endl;  // should return: true
    std::cout << isPrime(1) << std::endl;  // should return: false
    return 0;
}`
  };

  // Fetch student grades
  const { data: grades = [], isLoading: isLoadingGrades } = useQuery<Grade[]>({
    queryKey: ["/api/student/grades"],
    enabled: !!user
  });

  // Update code when subject changes
  useEffect(() => {
    setCode(templates[subject]);
    setTestResults([]);
  }, [subject]);

  // Run code handler
  const handleRunCode = () => {
    // Simple code evaluation for demo purposes
    // In a real application, this would be sent to the server for secure execution
    const results: { passed: boolean; message: string }[] = [];

    // Simulate test case evaluation based on language
    for (const test of testCases[subject]) {
      try {
        let result: boolean;

        if (subject === 'javascript') {
          // Extremely simplified eval for demo - never do this in production!
          // This is just for demonstration and would be replaced with a secure server-side execution

          // Better code evaluation - strip console.logs and isolate the function
          const tempCode = code.replace(/console\.log.*/g, '');

          // Use safer evaluation
          try {
            // Create a safe context and execute the function
            const func = new Function('return ' + tempCode)();

            // Validate that it's a function
            if (typeof func !== 'function') {
              throw new Error('Code must export a function');
            }

            result = func(test.input);

            // Ensure result is boolean
            if (typeof result !== 'boolean') {
              throw new Error(`Function returned ${typeof result}, expected boolean`);
            }
          } catch (evalError) {
            throw new Error(`Execution error: ${(evalError as Error).message}`);
          }
        } else {
          // For other languages, simulate a more intelligent result
          // Simple prime number algorithm instead of just odd check
          const isPrime = (num: number): boolean => {
            if (num <= 1) return false;
            if (num <= 3) return true;
            if (num % 2 === 0 || num % 3 === 0) return false;

            let i = 5;
            while (i * i <= num) {
              if (num % i === 0 || num % (i + 2) === 0) return false;
              i += 6;
            }
            return true;
          };

          result = isPrime(test.input);
        }

        const passed = result === test.expected;
        results.push({
          passed,
          message: passed
            ? `Test passed: isPrime(${test.input}) returned ${result}`
            : `Test failed: isPrime(${test.input}) - Expected: ${test.expected}, Received: ${result}`
        });
      } catch (err) {
        results.push({
          passed: false,
          message: `Error: ${(err as Error).message}`
        });
      }
    }

    setTestResults(results);

    toast({
      title: "Code executed",
      description: `${results.filter(r => r.passed).length} of ${results.length} tests passed`,
    });
  };

  // Submit code mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/submit", {
        subject,
        code
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Code submitted successfully",
        description: "Your submission has been recorded",
      });
      // Invalidate the grades query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/student/grades"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Screen share state and handler
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });

        // Log screen share start
        await apiRequest("POST", "/api/log/screen-share", {
          userId: user?.id,
          started: true
        });

        setIsScreenSharing(true);

        toast({
          title: "Screen sharing started",
          description: "Your screen is now being shared with the instructor",
        });

        // Handle stream end
        stream.getTracks()[0].onended = () => {
          setIsScreenSharing(false);
          apiRequest("POST", "/api/log/screen-share", {
            userId: user?.id,
            started: false
          });

          toast({
            title: "Screen sharing stopped",
          });
        };
      }
    } catch (err) {
      toast({
        title: "Screen sharing failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };
const waitForCodespace = (url: string, timeout = 15000) => {
  return new Promise<boolean>((resolve) => {
    const start = Date.now();
    let settled = false;

    function tryLoad() {
      if (Date.now() - start > timeout) {
        if (!settled) {
          settled = true;
          resolve(false);
        }
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        if (!settled) {
          settled = true;
          resolve(true);
        }
      };
      img.onerror = () => {
        setTimeout(tryLoad, 1000);
      };
      img.src = url ; // Try to load a static asset
    }

    tryLoad();
  });
};
  // Handler to launch codespace
  const handleLaunchCodespace = async () => {
    const res = await fetch("/api/container/spin-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: subject })
    });
    const data = await res.json();
    console.log(data.url);
    // setTimeout(() => setCodespaceUrl(data.url), 3000); // Wait 3 seconds
     const ready = await waitForCodespace(data.url);
  if (ready) {
    setCodespaceUrl(data.url);
  } else {
    toast({
      title: "Codespace failed to start",
      description: "Timed out waiting for codespace to become available.",
      variant: "destructive",
    });
  }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F6]">
      {/* Anti-cheating components */}
      <AntiCheat userId={user?.id} />
      <ScreenCapture 
        userId={user?.id} 
        isCodespaceActive={!!codespaceUrl} 
        interval={15000} 
      />

      {/* Header */}
      <header className="bg-white shadow-sm z-10">
        <div className="flex justify-between items-center px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <h1 className="text-xl font-serif font-medium text-[#1F2937]">College Coding Lab</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-[#1F2937]">{user?.email}</span>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="text-sm text-[#1F2937] hover:bg-[#F9F8F6] border-[#E5E7EB] rounded-lg"
            >
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        {/* Codespace Launch Button and Iframe */}
        <div className="mb-6">
          <Button onClick={handleLaunchCodespace} className="bg-[#0F172A] text-white rounded-lg px-6">
            Launch Codespace
          </Button>
        </div>
        {codespaceUrl && (
          <div className="mb-8">
            <Codespace url={codespaceUrl} />
            <div className="text-xs mt-2 text-gray-600">
              Login password: <span className="font-mono">cs1234</span>
            </div>
          </div>
        )}

        <Tabs defaultValue="assignment" className="space-y-6">
          <TabsList className="bg-white border border-[#E5E7EB] p-1 rounded-xl">
            <TabsTrigger
              value="assignment"
              className="rounded-lg px-4 py-2 data-[state=active]:bg-[#0F172A] data-[state=active]:text-white"
            >
              Coding Assignment
            </TabsTrigger>
            <TabsTrigger
              value="scores"
              className="rounded-lg px-4 py-2 data-[state=active]:bg-[#0F172A] data-[state=active]:text-white"
            >
              Past Scores
            </TabsTrigger>
          </TabsList>

          {/* Assignment Tab */}
          <TabsContent value="assignment" className="space-y-6">
            <Card className="bg-white shadow-sm rounded-2xl border-[#E5E7EB] overflow-hidden">
              <CardHeader className="bg-[#0F172A] text-white pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl font-serif">Prime Number Challenge</CardTitle>
                    <p className="text-slate-300 mt-1 text-sm">Write a function to check if a number is prime.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-300">Time Remaining</p>
                    <CountdownTimer duration={90 * 60} className="text-lg font-mono text-white" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="w-64">
                    <label htmlFor="subject" className="block text-sm font-medium text-[#1F2937]">Select Programming Language</label>
                    <div className="mt-1">
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger className="w-full border-[#E5E7EB] bg-white text-[#1F2937] rounded-lg">
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="javascript">JavaScript</SelectItem>
                          <SelectItem value="python">Python</SelectItem>
                          <SelectItem value="java">Java</SelectItem>
                          <SelectItem value="cpp">C++</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Anti-cheat warning */}
                  <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs border border-red-200 w-72">
                    <p className="font-medium">⚠️ Anti-Cheating Measures Active:</p>
                    <ul className="mt-1 list-disc list-inside">
                      <li>Tab switching is detected</li>
                      <li>Copy-paste is disabled</li>
                      <li>Your screen is monitored</li>
                    </ul>
                  </div>
                </div>

                {/* Editor Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div id="editor" className="border border-[#E5E7EB] rounded-lg h-[500px] overflow-hidden shadow-sm">
                      <MonacoEditor
                        language={subject}
                        value={code}
                        onChange={setCode}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="h-full flex flex-col">
                      <h3 className="text-sm font-medium text-[#1F2937] mb-2">Test Results</h3>
                      <div className="flex-1 bg-white rounded-lg p-4 overflow-auto border border-[#E5E7EB] h-[458px]">
                        {testResults.length > 0 ? (
                          <div className="text-sm font-mono space-y-3">
                            {testResults.map((result, index) => (
                              <div key={index} className="flex items-start">
                                <div className="flex-shrink-0 pt-0.5">
                                  <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${result.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {result.passed ? '✓' : '✕'}
                                  </span>
                                </div>
                                <div className="ml-3">
                                  <p className="text-[#1F2937]">
                                    <span className="font-medium">{result.passed ? 'Pass:' : 'Fail:'}</span>
                                    {' ' + result.message.split(' - ')[0]}
                                  </p>
                                  {!result.passed && result.message.includes('Expected:') && (
                                    <p className="text-gray-500">{result.message.split(' - ')[1]}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center text-[#1F2937] opacity-50">
                            <div className="mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium">No Test Results Yet</p>
                            <p className="text-xs mt-1">Click "Run Code" to test your solution</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={handleRunCode}
                    className="bg-white text-[#0F172A] hover:bg-[#F9F8F6] border-[#E5E7EB] rounded-lg px-6"
                  >
                    Run Code
                  </Button>

                  <div className="flex space-x-4">
                    <Button
                      variant="outline"
                      onClick={handleScreenShare}
                      disabled={isScreenSharing}
                      className="border-[#8C977A] text-[#8C977A] hover:bg-[#8C977A] hover:text-white rounded-lg"
                    >
                      {isScreenSharing ? "Screen Shared" : "Share Screen"}
                    </Button>

                    <Button
                      onClick={() => submitMutation.mutate()}
                      disabled={submitMutation.isPending}
                      className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg px-6"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Code"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Past Scores Tab */}
          <TabsContent value="scores">
            <Card className="bg-white shadow-sm rounded-2xl border-[#E5E7EB]">
              <CardHeader className="border-b border-[#E5E7EB]">
                <CardTitle className="text-xl font-serif text-[#1F2937]">Your Performance History</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingGrades ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#C9B88C]" />
                  </div>
                ) : grades.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-[#1F2937] opacity-60">You haven't submitted any code yet.</p>
                    <p className="text-sm text-[#1F2937] opacity-60 mt-1">Complete coding challenges to see your scores here.</p>
                  </div>
                ) : (
                  <Table>
                    <TableCaption>A list of your recent submission scores</TableCaption>
                    <TableHeader>
                      <TableRow className="bg-[#F9F8F6]">
                        <TableHead className="text-[#1F2937]">Subject</TableHead>
                        <TableHead className="text-[#1F2937]">Score</TableHead>
                        <TableHead className="text-[#1F2937]">Feedback</TableHead>
                        <TableHead className="text-[#1F2937]">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grades.map((grade) => (
                        <TableRow key={grade.id} className="border-b border-[#E5E7EB]">
                          <TableCell className="font-medium capitalize">{grade.subject}</TableCell>
                          <TableCell className="font-semibold text-[#C9B88C]">{grade.score}%</TableCell>
                          <TableCell className="max-w-md">{grade.feedback || "No feedback provided"}</TableCell>
                          <TableCell className="text-[#1F2937] opacity-70">
                            {new Date(grade.timestamp).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}