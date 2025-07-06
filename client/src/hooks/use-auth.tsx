import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, LoginData } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type RegisterData = {
  email: string;
  password: string;
  role: "student" | "admin";
  secretCode?: string;
};

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  token: string | null;
  error: Error | null;
  loginMutation: UseMutationResult<{ user: SelectUser; token: string }, Error, LoginData>;
  registerMutation: UseMutationResult<{ user: SelectUser; token: string }, Error, RegisterData>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

type AuthResponse = {
  user: SelectUser;
  token: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Get token from localStorage
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // Query current user
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    enabled: !!storedToken,
    retry: false,
  });

  const loginMutation = useMutation<AuthResponse, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: ({ user, token }) => {
      localStorage.setItem("token", token);
      queryClient.setQueryData(["/api/user"], user);
      
      // Redirect based on user role
      if (user.role === "admin") {
        setLocation("/admin/dashboard");
      } else {
        setLocation("/student/dashboard");
      }
      
      toast({
        title: "Logged in successfully",
        description: `Welcome, ${user.email}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<AuthResponse, Error, RegisterData>({
    mutationFn: async (userData: RegisterData) => {
      // Use different endpoints for admin and student registration
      if (userData.role === "admin") {
        const res = await apiRequest("POST", "/api/admin/register", {
          email: userData.email,
          password: userData.password,
          secretCode: userData.secretCode,
        });
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/register", {
          email: userData.email,
          password: userData.password,
          role: userData.role,
        });
        return await res.json();
      }
    },
    onSuccess: ({ user, token }) => {
      localStorage.setItem("token", token);
      queryClient.setQueryData(["/api/user"], user);
      
      // Redirect based on user role
      if (user.role === "admin") {
        setLocation("/admin/dashboard");
      } else {
        setLocation("/student/dashboard");
      }
      
      toast({
        title: "Account created successfully",
        description: `Welcome, ${user.email}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      localStorage.removeItem("token");
      queryClient.setQueryData(["/api/user"], null);
      setLocation("/login");
      
      toast({
        title: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Refetch user data when token changes
  useEffect(() => {
    if (storedToken) {
      refetch();
    }
  }, [storedToken, refetch]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        token: storedToken,
        error,
        loginMutation,
        registerMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
