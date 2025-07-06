import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { 
  Eye, 
  Monitor, 
  Camera, 
  AlertTriangle, 
  Clock, 
  User,
  Filter,
  Search,
  RefreshCw,
  Shield,
  Activity,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  Image as ImageIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TabSwitchEvent {
  id: string;
  userId: number;
  type: 'tab-switch' | 'TAB_SWITCH';
  timestamp: Date;
  data?: string;
}

interface ScreenshotEvent {
  _id: string;
  userId: number;
  type: 'screenshot';
  image: string;
  metadata: {
    timestamp: string;
    captureMethod: string;
    subject?: string;
    filename?: string;
    captureEvent?: string;
    containerUrl?: string;
    screenResolution: { width: number; height: number };
    fileSize?: number;
    isCodespaceCapture?: boolean;
    captureQuality?: string;
  };
  createdAt: Date;
}

interface UnifiedEvent {
  id: string;
  userId: number;
  eventType: 'tab-switch' | 'screenshot';
  displayTime: Date;
  userEmail: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: any;
  image?: string;
}

interface EventLogsViewerProps {
  className?: string;
}

export default function EventLogsViewer({ className }: EventLogsViewerProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"timestamp" | "userId" | "severity">("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedImage, setSelectedImage] = useState<ScreenshotEvent | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  
  // User mapping to get real email addresses
  const [userMapping, setUserMapping] = useState<Map<number, string>>(new Map());

  // Fetch tab switch events (logs)
  const { data: logs = [], isLoading: isLoadingLogs, error: logsError } = useQuery<any[]>({
    queryKey: ["/api/logs"],
    refetchInterval: 5000,
    retry: 3,
  });

  // Fetch screenshot events from MongoDB
  const { data: screenshotEvents = [], isLoading: isLoadingScreenshots, error: screenshotError } = useQuery<ScreenshotEvent[]>({
    queryKey: ["/api/mongodb/screenshots"],
    refetchInterval: 10000,
    retry: 3,
  });

  // Fetch submissions to get user information
  const { data: submissions = [] } = useQuery<any[]>({
    queryKey: ["/api/submissions"],
    refetchInterval: 10000,
    retry: 3,
  });

  // Update user mapping when submissions change
  useEffect(() => {
    const newMapping = new Map<number, string>();
    submissions.forEach((submission: any) => {
      if (submission.user && submission.user.email) {
        newMapping.set(submission.userId, submission.user.email);
      }
    });
    setUserMapping(newMapping);
  }, [submissions]);

  // Filter tab switch events from logs
  const tabSwitchEvents = logs.filter(log => 
    log.type === 'tab-switch' || 
    log.type === 'TAB_SWITCH' || 
    (log.data && typeof log.data === 'string' && log.data.toLowerCase().includes('tab'))
  );

  // Helper function to get user email
  const getUserEmail = (userId: number): string => {
    return userMapping.get(userId) || `User ${userId}`;
  };

  // Process and combine events
  const allEvents: UnifiedEvent[] = [
    ...tabSwitchEvents.map(event => ({
      id: event.id || `tab-${event.userId}-${event.timestamp}`,
      userId: event.userId,
      eventType: 'tab-switch' as const,
      displayTime: new Date(event.timestamp),
      userEmail: getUserEmail(event.userId),
      severity: 'high' as const, // Tab switches are more serious
      description: 'Tab switch detected - Student left the exam window',
      metadata: {
        data: event.data,
        type: event.type
      }
    })),
    ...screenshotEvents.map(event => ({
      id: event._id,
      userId: event.userId,
      eventType: 'screenshot' as const,
      displayTime: new Date(event.metadata.timestamp || event.createdAt),
      userEmail: getUserEmail(event.userId),
      severity: event.metadata.captureMethod === 'puppeteer-server-side' ? 'low' : 'medium' as const,
      description: `Screenshot captured via ${event.metadata.captureMethod}`,
      metadata: event.metadata,
      image: event.image
    }))
  ];

  // Filter events
  const filteredEvents = allEvents.filter(event => {
    const matchesUser = selectedUserId === "all" || event.userId.toString() === selectedUserId;
    const matchesType = eventTypeFilter === "all" || event.eventType === eventTypeFilter;
    const matchesSeverity = severityFilter === "all" || event.severity === severityFilter;
    const matchesSearch = searchTerm === "" || 
      event.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesUser && matchesType && matchesSeverity && matchesSearch;
  });

  // Sort events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "timestamp":
        comparison = a.displayTime.getTime() - b.displayTime.getTime();
        break;
      case "userId":
        comparison = a.userId - b.userId;
        break;
      case "severity":
        const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
        comparison = severityOrder[a.severity] - severityOrder[b.severity];
        break;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Get unique user IDs
  const userIds = [...new Set(allEvents.map(event => event.userId))].sort();

  const formatTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue/20 text-blue border-blue/30';
      case 'medium': return 'bg-yellow/20 text-yellow border-yellow/30';
      case 'high': return 'bg-orange/20 text-orange border-orange/30';
      case 'critical': return 'bg-red/20 text-red border-red/30';
      default: return 'bg-gray/20 text-gray border-gray/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <Shield className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'tab-switch': return <Monitor className="h-4 w-4" />;
      case 'screenshot': return <Camera className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const downloadScreenshot = (event: UnifiedEvent) => {
    if (event.image) {
      try {
        const link = document.createElement('a');
        link.href = event.image;
        link.download = `screenshot-user-${event.userId}-${event.displayTime.toISOString()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Failed to download screenshot:', error);
      }
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="card-elevated border-border-accent">
        <CardHeader className="border-b border-border-accent">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-r from-green to-cyan p-2 rounded-xl">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-foreground">Event Logs Monitor</CardTitle>
              <p className="text-sm text-muted-foreground">Real-time monitoring of student activities and security events</p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-background-secondary/60 backdrop-blur-sm p-4 rounded-xl border border-border">
              <div className="flex items-center space-x-3">
                <Monitor className="h-5 w-5 text-orange" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{tabSwitchEvents.length}</div>
                  <div className="text-xs text-muted-foreground">Tab Switches</div>
                </div>
              </div>
            </div>
            <div className="bg-background-secondary/60 backdrop-blur-sm p-4 rounded-xl border border-border">
              <div className="flex items-center space-x-3">
                <Camera className="h-5 w-5 text-blue" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{screenshotEvents.length}</div>
                  <div className="text-xs text-muted-foreground">Screenshots</div>
                </div>
              </div>
            </div>
            <div className="bg-background-secondary/60 backdrop-blur-sm p-4 rounded-xl border border-border">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-green" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{userIds.length}</div>
                  <div className="text-xs text-muted-foreground">Active Users</div>
                </div>
              </div>
            </div>
            <div className="bg-background-secondary/60 backdrop-blur-sm p-4 rounded-xl border border-border">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {allEvents.filter(e => e.severity === 'high' || e.severity === 'critical').length}
                  </div>
                  <div className="text-xs text-muted-foreground">High Priority</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 bg-background-secondary border-border"
              />
            </div>
            
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-48 bg-background-secondary border-border">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {userIds.map(userId => (
                  <SelectItem key={userId} value={userId.toString()}>
                    {getUserEmail(userId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-44 bg-background-secondary border-border">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="tab-switch">Tab Switches</SelectItem>
                <SelectItem value="screenshot">Screenshots</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-44 bg-background-secondary border-border">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">🔴 High (Tab Switches)</SelectItem>
                <SelectItem value="medium">🟡 Medium (Manual Screenshots)</SelectItem>
                <SelectItem value="low">🟢 Low (Auto Screenshots)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="w-40 bg-background-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timestamp">📅 Time</SelectItem>
                <SelectItem value="userId">👤 User</SelectItem>
                <SelectItem value="severity">⚠️ Priority</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="bg-background-secondary border-border hover:bg-background-tertiary"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoadingLogs || isLoadingScreenshots ? (
            <div className="text-center py-12">
              <div className="spinner-gradient w-8 h-8 mx-auto mb-4"></div>
              <p className="text-foreground">Loading event logs...</p>
            </div>
          ) : logsError || screenshotError ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red mx-auto mb-4" />
              <p className="text-red">Error loading event logs</p>
            </div>
          ) : sortedEvents.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground">No events found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Showing {sortedEvents.length} events
              </div>
              
              {sortedEvents.map((event) => (
                <Card key={event.id} className="card-elevated border-border hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Event Type Icon */}
                        <div className={`p-2 rounded-lg ${
                          event.eventType === 'tab-switch' 
                            ? 'bg-orange/20 text-orange' 
                            : 'bg-blue/20 text-blue'
                        }`}>
                          {getEventTypeIcon(event.eventType)}
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-foreground">
                              {event.eventType === 'tab-switch' ? 'Tab Switch Event' : 'Screenshot Captured'}
                            </h3>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getSeverityColor(event.severity)}`}
                            >
                              {getSeverityIcon(event.severity)}
                              <span className="ml-1">{event.severity.toUpperCase()}</span>
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-background-secondary">
                              {event.userEmail}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {event.description}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(event.displayTime)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{event.displayTime.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {expandedEvents.has(event.id) && (
                            <div className="mt-4 p-4 bg-background-secondary/50 rounded-lg border border-border">
                              {event.eventType === 'tab-switch' && (
                                <div className="space-y-2 text-sm">
                                  <div><strong>User ID:</strong> {event.userId}</div>
                                  <div><strong>Event Type:</strong> Tab Switch</div>
                                  <div><strong>Details:</strong> Student switched away from the exam window</div>
                                  <div><strong>Timestamp:</strong> {event.displayTime.toLocaleString()}</div>
                                  {event.metadata?.data && (
                                    <div><strong>Raw Data:</strong> {event.metadata.data}</div>
                                  )}
                                </div>
                              )}
                              
                              {event.eventType === 'screenshot' && event.metadata && (
                                <div className="space-y-2 text-sm">
                                  <div><strong>Capture Method:</strong> {event.metadata.captureMethod}</div>
                                  {event.metadata.subject && <div><strong>Subject:</strong> {event.metadata.subject}</div>}
                                  {event.metadata.filename && <div><strong>Filename:</strong> {event.metadata.filename}</div>}
                                  <div><strong>Resolution:</strong> {event.metadata.screenResolution?.width}x{event.metadata.screenResolution?.height}</div>
                                  {event.metadata.fileSize && <div><strong>Size:</strong> {Math.round(event.metadata.fileSize / 1024)}KB</div>}
                                  <div className="flex items-center space-x-2 mt-3">
                                    {event.image && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setSelectedImage({
                                            _id: event.id,
                                            userId: event.userId,
                                            type: 'screenshot',
                                            image: event.image!,
                                            metadata: event.metadata,
                                            createdAt: event.displayTime
                                          })}
                                          className="text-xs"
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          View Image
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => downloadScreenshot(event)}
                                          className="text-xs"
                                        >
                                          <Download className="h-3 w-3 mr-1" />
                                          Download
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        {event.eventType === 'screenshot' && event.image && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedImage({
                              _id: event.id,
                              userId: event.userId,
                              type: 'screenshot',
                              image: event.image!,
                              metadata: event.metadata,
                              createdAt: event.displayTime
                            })}
                            className="text-blue hover:bg-blue/20"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleEventExpansion(event.id)}
                          className="hover:bg-background-secondary"
                        >
                          {expandedEvents.has(event.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screenshot Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border border-border max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Screenshot Details</h3>
                  <p className="text-sm text-muted-foreground">
                    User {selectedImage.userId} • {formatTime(new Date(selectedImage.metadata.timestamp || selectedImage.createdAt))}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedImage(null)}
                  className="hover:bg-background-secondary"
                >
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6">
              <img
                src={selectedImage.image}
                alt="Screenshot"
                className="w-full h-auto rounded-lg border border-border"
                style={{ maxHeight: '60vh' }}
              />
              <div className="mt-4 text-sm text-muted-foreground">
                <div>Resolution: {selectedImage.metadata.screenResolution?.width}x{selectedImage.metadata.screenResolution?.height}</div>
                <div>Capture Method: {selectedImage.metadata.captureMethod}</div>
                {selectedImage.metadata.filename && <div>Filename: {selectedImage.metadata.filename}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 