import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

type ProtectedRouteProps = {
  path: string;
  role: "student" | "admin";
  component: React.ComponentType;
};

export function ProtectedRoute({
  path,
  role,
  component: Component,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/login" />;
        }

        if (user.role !== role) {
          return <Redirect to={user.role === "admin" ? "/admin/dashboard" : "/student/dashboard"} />;
        }

        return <Component />;
      }}
    </Route>
  );
}
