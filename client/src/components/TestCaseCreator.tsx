import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export interface TestCase {
  id: string;
  input: string;
  expected: string;
  description: string;
}

interface TestCaseCreatorProps {
  subject: string;
  onSave: (testCases: TestCase[]) => void;
  initialTestCases?: TestCase[];
  isSaving?: boolean;
}

export default function TestCaseCreator({ subject, onSave, initialTestCases = [], isSaving = false }: TestCaseCreatorProps) {
  const { toast } = useToast();
  const [testCases, setTestCases] = useState<TestCase[]>(initialTestCases);
  const [inputType, setInputType] = useState<"number" | "string">("number");
  const [outputType, setOutputType] = useState<"boolean" | "string">("boolean");
  
  // New test case form state
  const [newInput, setNewInput] = useState("");
  const [newExpected, setNewExpected] = useState("");
  const [newDescription, setNewDescription] = useState("");
  
  const addTestCase = () => {
    // Validate inputs
    if (!newInput || !newExpected) {
      toast({
        title: "Validation error",
        description: "Input and expected output are required",
        variant: "destructive",
      });
      return;
    }
    
    // Format values based on selected types
    const formattedInput = inputType === "number" ? Number(newInput) : newInput;
    let formattedExpected: any = outputType === "boolean" 
      ? newExpected === "true" 
      : newExpected;
      
    // Create new test case
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      input: formattedInput.toString(),
      expected: formattedExpected.toString(),
      description: newDescription || `Test for input: ${formattedInput}`,
    };
    
    // Add to list and reset form
    setTestCases([...testCases, newTestCase]);
    setNewInput("");
    setNewExpected("");
    setNewDescription("");
    
    toast({
      title: "Test case added",
      description: `Added test case with input: ${formattedInput}`,
    });
  };
  
  const removeTestCase = (id: string) => {
    setTestCases(testCases.filter(tc => tc.id !== id));
    
    toast({
      title: "Test case removed",
      description: "The test case has been removed",
    });
  };
  
  const saveTestCases = () => {
    onSave(testCases);
  };
  
  return (
    <Card className="bg-white shadow-sm rounded-2xl border-[#E5E7EB]">
      <CardHeader className="border-b border-[#E5E7EB]">
        <CardTitle className="text-xl font-serif text-[#1F2937]">
          Create Test Cases for {subject.charAt(0).toUpperCase() + subject.slice(1)}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Input type selection */}
          <div>
            <Label htmlFor="inputType" className="text-[#1F2937]">Input Type</Label>
            <Select 
              value={inputType} 
              onValueChange={(value) => setInputType(value as "number" | "string")}
            >
              <SelectTrigger className="mt-1 w-full border-[#E5E7EB] rounded-lg">
                <SelectValue placeholder="Select input type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="string">String</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Input value */}
          <div>
            <Label htmlFor="input" className="text-[#1F2937]">Input Value</Label>
            <Input 
              id="input" 
              placeholder={inputType === "number" ? "e.g., 7" : "e.g., hello"} 
              className="mt-1 border-[#E5E7EB] rounded-lg"
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
              type={inputType === "number" ? "number" : "text"}
            />
          </div>
          
          {/* Output type selection */}
          <div>
            <Label htmlFor="outputType" className="text-[#1F2937]">Output Type</Label>
            <Select 
              value={outputType} 
              onValueChange={(value) => setOutputType(value as "boolean" | "string")}
            >
              <SelectTrigger className="mt-1 w-full border-[#E5E7EB] rounded-lg">
                <SelectValue placeholder="Select output type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="string">String</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Expected output */}
          <div>
            <Label htmlFor="expected" className="text-[#1F2937]">Expected Output</Label>
            {outputType === "boolean" ? (
              <Select 
                value={newExpected} 
                onValueChange={setNewExpected}
              >
                <SelectTrigger className="mt-1 w-full border-[#E5E7EB] rounded-lg">
                  <SelectValue placeholder="Select expected result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input 
                id="expected" 
                placeholder="Expected output" 
                className="mt-1 border-[#E5E7EB] rounded-lg"
                value={newExpected}
                onChange={(e) => setNewExpected(e.target.value)}
              />
            )}
          </div>
        </div>
        
        {/* Description */}
        <div>
          <Label htmlFor="description" className="text-[#1F2937]">Description (Optional)</Label>
          <Input 
            id="description" 
            placeholder="E.g., Test if 7 is prime" 
            className="mt-1 border-[#E5E7EB] rounded-lg"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
        </div>
        
        {/* Add button */}
        <div className="flex justify-end">
          <Button 
            onClick={addTestCase}
            className="bg-[#8C977A] hover:bg-[#6E775E] text-white rounded-lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Test Case
          </Button>
        </div>
        
        {/* Test cases table */}
        {testCases.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-[#1F2937] mb-3">Current Test Cases</h3>
            <Table>
              <TableCaption>Test cases for the {subject} challenge</TableCaption>
              <TableHeader>
                <TableRow className="bg-[#F9F8F6]">
                  <TableHead className="text-[#1F2937]">Input</TableHead>
                  <TableHead className="text-[#1F2937]">Expected</TableHead>
                  <TableHead className="text-[#1F2937]">Description</TableHead>
                  <TableHead className="text-[#1F2937] w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testCases.map((testCase) => (
                  <TableRow key={testCase.id} className="border-b border-[#E5E7EB]">
                    <TableCell className="font-mono">{testCase.input}</TableCell>
                    <TableCell className="font-mono">{testCase.expected}</TableCell>
                    <TableCell>{testCase.description}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeTestCase(testCase.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="border-t border-[#E5E7EB] p-6 flex justify-end">
        <Button 
          onClick={saveTestCases}
          disabled={testCases.length === 0 || isSaving}
          className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Test Cases"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}