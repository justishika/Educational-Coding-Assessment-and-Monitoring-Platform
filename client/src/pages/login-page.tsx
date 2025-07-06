import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, User, Lock, Mail, Terminal, Sparkles, Code2 } from "lucide-react";
import { Link } from "wouter";

export default function LoginPage() {
  const { loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const fillDemoCredentials = (role: 'student' | 'admin') => {
    const credentials = role === 'admin' 
      ? { email: "admin@lab.com", password: "admin123" }
      : { email: "student@lab.com", password: "student123" };
    
    setLoginData(credentials);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-2000"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,94,199,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,94,199,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

      <div className="w-full max-w-md z-10 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-pink-purple p-3 rounded-2xl shadow-glow-pink">
              <Terminal className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-neon-pink mb-2">CodeLab Pro</h1>
          <p className="text-muted-foreground text-lg">
            Advanced Coding Assessment Platform
          </p>
        </div>

        {/* Auth Card */}
        <Card className="card-elevated backdrop-blur-glass border-border-accent shadow-2xl">
          <CardHeader className="text-center space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-foreground">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-background-secondary border border-border">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-gradient-pink-purple data-[state=active]:text-white data-[state=active]:shadow-glow-pink transition-all duration-300"
                >
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="data-[state=active]:bg-gradient-blue-purple data-[state=active]:text-white data-[state=active]:shadow-glow-blue transition-all duration-300"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="pl-10 bg-background-secondary border-border focus:border-pink focus:ring-pink/30 transition-all duration-300"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="pl-10 pr-10 bg-background-secondary border-border focus:border-pink focus:ring-pink/30 transition-all duration-300"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full bg-gradient-pink-purple hover:shadow-glow-pink text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:scale-105"
                  >
                    {loginMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="spinner-gradient w-4 h-4 mr-2"></div>
                        Signing In...
                      </div>
                    ) : (
                      <>
                        <Terminal className="h-4 w-4 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>

                {/* Demo Credentials */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center font-medium">
                    Quick Access Demo Accounts
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fillDemoCredentials('student')}
                      className="bg-background-secondary hover:bg-blue/20 hover:border-blue text-blue border-border transition-all duration-300"
                    >
                      <User className="h-3 w-3 mr-1" />
                      Student
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fillDemoCredentials('admin')}
                      className="bg-background-secondary hover:bg-purple/20 hover:border-purple text-purple border-border transition-all duration-300"
                    >
                      <Code2 className="h-3 w-3 mr-1" />
                      Admin
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="register" className="space-y-6 mt-6">
                <div className="text-center space-y-4">
                  <div className="bg-gradient-blue-purple p-4 rounded-2xl shadow-glow-blue mx-auto w-fit">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      Create Your Account
                    </h3>
                    <p className="text-muted-foreground">
                      Join CodeLab Pro as a student or admin
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Link href="/register">
                      <Button className="w-full bg-gradient-blue-purple hover:shadow-glow-blue text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:scale-105">
                        <User className="h-4 w-4 mr-2" />
                        Create New Account
                      </Button>
                    </Link>
                    
                    <p className="text-xs text-muted-foreground">
                      Choose between student and admin accounts on the registration page
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Secure • Real-time Monitoring • Anti-cheat Protection
          </p>
        </div>
      </div>
    </div>
  );
}
