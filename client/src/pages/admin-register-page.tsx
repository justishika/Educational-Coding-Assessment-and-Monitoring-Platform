import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

const adminRegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  secretCode: z.string().min(1, "Secret code is required"),
});

type AdminRegisterData = z.infer<typeof adminRegisterSchema>;

export default function AdminRegisterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const form = useForm<AdminRegisterData>({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      secretCode: "",
    },
  });
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        setLocation("/admin/dashboard");
      } else {
        setLocation("/student/dashboard");
      }
    }
  }, [user, setLocation]);
  
  const registerMutation = useMutation({
    mutationFn: async (data: AdminRegisterData) => {
      const res = await apiRequest("POST", "/api/admin/register", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Admin registration successful!",
        description: "You can now log in with your admin credentials",
      });
      setLocation("/login");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: AdminRegisterData) {
    registerMutation.mutate(values);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-[#F9F8F6]">
      <Card className="max-w-md w-full bg-white shadow-sm rounded-2xl">
        <CardContent className="p-8 space-y-6">
          <div>
            <h2 className="mt-2 text-center text-3xl font-serif font-medium text-[#1F2937]">
              Admin Registration
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Create an administrator account for the coding lab
            </p>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#1F2937]">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter admin email" 
                        autoComplete="email" 
                        className="border-[#E5E7EB] focus:border-[#C9B88C] rounded-lg"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#1F2937]">Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter admin password" 
                        autoComplete="new-password" 
                        className="border-[#E5E7EB] focus:border-[#C9B88C] rounded-lg"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="secretCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#1F2937]">Admin Secret Code</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter the admin secret code" 
                        className="border-[#E5E7EB] focus:border-[#C9B88C] rounded-lg"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-600 mt-1">
                      💡 Demo secret code: <span className="font-mono text-[#0F172A]">admin123</span>
                    </p>
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg py-2 font-medium mt-6" 
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating admin account...
                  </>
                ) : (
                  "Register as Admin"
                )}
              </Button>
              
              <div className="text-center text-sm mt-4">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#0F172A] hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}