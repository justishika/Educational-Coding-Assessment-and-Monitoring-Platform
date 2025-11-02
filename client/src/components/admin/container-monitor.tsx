import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Monitor, User, Clock, Eye, EyeOff, RefreshCw, Maximize2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface StudentContainer {
  id: number;
  userId: number;
  containerId: string;
  port: number;
  createdAt: string;
  userEmail: string;
  url: string;
}

interface ContainerMonitorProps {
  className?: string;
}

export default function ContainerMonitor({ className }: ContainerMonitorProps) {
  const [selectedContainer, setSelectedContainer] = useState<StudentContainer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch active containers with real-time updates
  const { data: containers = [], isLoading, isFetching, refetch } = useQuery<StudentContainer[]>({
    queryKey: ["/api/admin/student-containers"],
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchIntervalInBackground: true,
    staleTime: 2000,
  });

  const handleViewContainer = (container: StudentContainer) => {
    setSelectedContainer(container);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedContainer(null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="card-elevated border-border-accent">
        <CardHeader className="border-b border-border-accent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-blue-purple p-2 rounded-xl">
                <Monitor className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-foreground">
                  Active Student Containers
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monitor student VS Code environments in real-time
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge 
                variant="outline" 
                className={`${isFetching ? 'bg-blue/20 text-blue border-blue/30' : 'bg-green/20 text-green border-green/30'}`}
              >
                {isFetching ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green mr-2"></div>
                    Live
                  </>
                )}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="border-border-accent hover:bg-background-secondary"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-blue mx-auto" />
                <p className="text-muted-foreground">Loading containers...</p>
              </div>
            </div>
          ) : containers.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Monitor className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <div>
                <p className="text-lg font-medium text-foreground">No Active Containers</p>
                <p className="text-sm text-muted-foreground">
                  Student containers will appear here when they launch their workspaces
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {containers.length} active container{containers.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {containers.map((container) => (
                  <Card 
                    key={container.containerId}
                    className="border-border-accent hover:border-blue/50 transition-all duration-200 hover:shadow-lg"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green animate-pulse"></div>
                          <Badge variant="outline" className="bg-green/20 text-green border-green/30 text-xs">
                            Active
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewContainer(container)}
                          className="h-8 w-8 p-0 hover:bg-blue/10 hover:text-blue"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground truncate">
                            {container.userEmail}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-mono">
                            Port: {container.port}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Started {formatDistanceToNow(new Date(container.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewContainer(container)}
                        className="w-full border-blue/30 hover:bg-blue/10 hover:text-blue"
                      >
                        <Maximize2 className="h-3 w-3 mr-2" />
                        View Workspace
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Container Viewer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
          <DialogHeader className="p-6 border-b border-border-accent">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-blue-purple p-2 rounded-xl">
                  <Monitor className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    Student Workspace Monitor
                  </DialogTitle>
                  {selectedContainer && (
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {selectedContainer.userEmail}
                      </span>
                      <Badge variant="outline" className="bg-green/20 text-green border-green/30 text-xs">
                        <div className="w-2 h-2 rounded-full bg-green mr-1 animate-pulse"></div>
                        Live
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        Port: {selectedContainer.port}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseDialog}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {selectedContainer && (
            <div className="relative w-full h-[calc(95vh-120px)]">
              <div className="absolute top-0 left-0 right-0 h-10 flex items-center px-4 bg-background-secondary border-b border-border-accent z-10">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow"></div>
                  <div className="w-3 h-3 rounded-full bg-green"></div>
                </div>
                <div className="flex-1 text-center">
                  <span className="text-sm text-muted-foreground font-medium">
                    VS Code - {selectedContainer.userEmail} (Read-Only View)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="pulse-glow w-3 h-3 rounded-full bg-green"></div>
                </div>
              </div>

              <iframe
                src={selectedContainer.url}
                className="w-full h-full border-none"
                style={{ 
                  marginTop: "40px",
                  height: "calc(100% - 40px)"
                }}
                title={`Student Workspace - ${selectedContainer.userEmail}`}
                sandbox="allow-same-origin allow-scripts allow-forms"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

