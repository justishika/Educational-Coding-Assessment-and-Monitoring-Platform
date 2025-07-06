import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, User, Lock, Mail, Terminal, Sparkles, Code2, UserPlus, Key } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function RegisterPage() {
  const { registerMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [registerData, setRegisterData] = useState({
      email: "",
      password: "",
    confirmPassword: "",
    role: "student",
    secretCode: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (registerData.role === "admin") {
      // Use the admin registration endpoint for admin users
      registerMutation.mutate({
        email: registerData.email,
        password: registerData.password,
        role: registerData.role as "student" | "admin",
        secretCode: registerData.secretCode,
      });
    } else {
      // Use the regular registration endpoint for students
      registerMutation.mutate({
        email: registerData.email,
        password: registerData.password,
        role: registerData.role as "student" | "admin",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="floating-shape absolute top-20 left-10 w-32 h-32 bg-gradient-pink-purple rounded-full opacity-10 animate-float"></div>
        <div className="floating-shape absolute top-40 right-20 w-24 h-24 bg-gradient-blue-purple rounded-full opacity-10 animate-float-delayed"></div>
        <div className="floating-shape absolute bottom-20 left-1/4 w-20 h-20 bg-gradient-to-r from-purple to-pink rounded-full opacity-10 animate-float"></div>
        <div className="floating-shape absolute bottom-40 right-1/3 w-16 h-16 bg-gradient-to-r from-blue to-cyan rounded-full opacity-10 animate-float-delayed"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Main Registration Card */}
        <Card className="card-elevated border-border-accent shadow-elevated backdrop-blur-glass">
          <CardHeader className="text-center space-y-4">
            {/* Logo and Branding */}
            <div className="flex justify-center">
              <div className="bg-gradient-pink-purple p-4 rounded-2xl shadow-glow-pink">
                <Terminal className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold bg-gradient-pink-purple bg-clip-text text-transparent">
                Join CodeLab Pro
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Create your account to start coding challenges
              </CardDescription>
          </div>
          
            {/* Feature Highlights */}
            <div className="flex justify-center space-x-4">
              <Badge variant="outline" className="bg-blue/10 text-blue border-blue/30 text-xs">
                <Code2 className="h-3 w-3 mr-1" />
                Live Coding
              </Badge>
              <Badge variant="outline" className="bg-purple/10 text-purple border-purple/30 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Powered
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs defaultValue="student" value={registerData.role} onValueChange={(value) => setRegisterData({...registerData, role: value})}>
              <TabsList className="grid w-full grid-cols-2 bg-background-secondary border border-border">
                <TabsTrigger 
                  value="student" 
                  className="data-[state=active]:bg-gradient-pink-purple data-[state=active]:text-white data-[state=active]:shadow-glow-pink transition-all duration-300"
                >
                  <User className="h-4 w-4 mr-2" />
                  Student
                </TabsTrigger>
                <TabsTrigger 
                  value="admin"
                  className="data-[state=active]:bg-gradient-blue-purple data-[state=active]:text-white data-[state=active]:shadow-glow-blue transition-all duration-300"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Admin
                </TabsTrigger>
              </TabsList>

              <TabsContent value="student" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                      id="email"
                      type="email"
                      placeholder="student@university.edu"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                      className="pl-10 bg-background-secondary border-border focus:border-pink focus:ring-1 focus:ring-pink/20 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      className="pl-10 pr-10 bg-background-secondary border-border focus:border-pink focus:ring-1 focus:ring-pink/20 transition-all duration-300"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                      className="pl-10 pr-10 bg-background-secondary border-border focus:border-pink focus:ring-1 focus:ring-pink/20 transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmit}
                  disabled={registerMutation.isPending}
                  className="w-full bg-gradient-pink-purple hover:shadow-glow-pink text-white font-semibold py-3 transition-all duration-300 hover:scale-105"
                >
                  {registerMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="spinner-gradient w-4 h-4 mr-2"></div>
                      Creating Account...
                    </div>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Student Account
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="admin" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="admin-email" className="text-foreground font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@institution.edu"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                      className="pl-10 bg-background-secondary border-border focus:border-blue focus:ring-1 focus:ring-blue/20 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-foreground font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      className="pl-10 pr-10 bg-background-secondary border-border focus:border-blue focus:ring-1 focus:ring-blue/20 transition-all duration-300"
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

                <div className="space-y-2">
                  <Label htmlFor="admin-confirmPassword" className="text-foreground font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                      className="pl-10 pr-10 bg-background-secondary border-border focus:border-blue focus:ring-1 focus:ring-blue/20 transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-secretCode" className="text-foreground font-medium">Secret Code</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-secretCode"
                      type={showSecretCode ? "text" : "password"}
                      placeholder="Enter the secret code"
                      value={registerData.secretCode}
                      onChange={(e) => setRegisterData({...registerData, secretCode: e.target.value})}
                      className="pl-10 pr-10 bg-background-secondary border-border focus:border-blue focus:ring-1 focus:ring-blue/20 transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretCode(!showSecretCode)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSecretCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Demo secret code: <span className="font-mono text-blue">admin123</span>
                  </p>
                </div>
              
              <Button 
                  onClick={handleSubmit}
                disabled={registerMutation.isPending}
                  className="w-full bg-gradient-blue-purple hover:shadow-glow-blue text-white font-semibold py-3 transition-all duration-300 hover:scale-105"
              >
                {registerMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="spinner-gradient w-4 h-4 mr-2"></div>
                      Creating Account...
                    </div>
                  ) : (
                  <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Admin Account
                  </>
                )}
              </Button>
              </TabsContent>
            </Tabs>

            {/* Additional Information */}
            <div className="pt-4 border-t border-border">
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link 
                  href="/login" 
                  className="text-neon-pink hover:text-pink font-medium transition-colors"
                >
                  Sign in here
                  </Link>
              </div>
            </div>

            {/* Features */}
            <div className="bg-background-secondary rounded-xl p-4 border border-border">
              <div className="text-center">
                <h3 className="text-sm font-semibold text-foreground mb-3">What you'll get:</h3>
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gradient-pink-purple rounded-full"></div>
                    <span>Real-time coding</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gradient-blue-purple rounded-full"></div>
                    <span>Auto grading</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gradient-pink-purple rounded-full"></div>
                    <span>Progress tracking</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gradient-blue-purple rounded-full"></div>
                    <span>Secure environment</span>
                  </div>
                </div>
              </div>
            </div>
        </CardContent>
      </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          <p>By creating an account, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
}