import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PuppeteerScreenshotLog {
  _id: string;
  userId: number;
  type: 'screenshot';
  image: string;
  metadata: {
    timestamp: string;
    captureMethod: string;
    containerUrl: string;
    subject: string;
    filename: string;
    captureEvent: string;
    screenResolution: { width: number; height: number };
    fileSize: number;
    isCodespaceCapture: boolean;
    captureQuality: string;
    pageTitle?: string;
    userAgent?: string;
    sessionId?: string;
  };
  createdAt?: string;
}

// Legacy client-side screenshot format for backward compatibility
interface LegacyScreenshotLog {
  _id: string;
  userId: number;
  type: 'screenshot';
  image: string;
  metadata: {
    timestamp: string;
    captureNumber?: number;
    screenResolution: { width: number; height: number };
    viewportSize?: { width: number; height: number };
    userAgent?: string;
    url?: string;
    sessionId?: string;
    codespaceActive?: boolean;
    captureMethod?: string;
  };
  createdAt: string;
}

// Unified screenshot type
interface Screenshot {
  id: string;
  userId: number;
  timestamp: string;
  image: string;
  metadata: {
    captureMethod: string;
    subject?: string;
    filename?: string;
    captureEvent?: string;
    containerUrl?: string;
    screenResolution: { width: number; height: number };
    fileSize?: number;
    isCodespaceCapture: boolean;
    captureQuality?: string;
    captureNumber?: number;
    viewportSize?: { width: number; height: number };
    url?: string;
  };
}

interface ScreenshotViewerProps {
  className?: string;
}

export default function ScreenshotViewer({ className }: ScreenshotViewerProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [captureMethodFilter, setCaptureMethodFilter] = useState<string>("all");


  // Fetch screenshots from MongoDB
  const { data: screenshots = [], isLoading, error } = useQuery<(PuppeteerScreenshotLog | LegacyScreenshotLog)[]>({
    queryKey: ["/api/mongodb/screenshots"],
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 3,
    retryDelay: 1000,
  });

  // Handle successful data fetch
  useEffect(() => {
    if (screenshots.length > 0) {
      console.log('📸 Screenshots API Success:', { 
        count: screenshots.length, 
        firstItem: screenshots[0] ? {
          id: screenshots[0]._id,
          userId: screenshots[0].userId,
          hasImage: !!screenshots[0].image,
          imageLength: screenshots[0].image?.length,
          method: screenshots[0].metadata?.captureMethod
        } : null
      });
    }
  }, [screenshots]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('📸 Screenshots API Error:', error);
    }
  }, [error]);

  // Process both Puppeteer and legacy screenshots
  const processedScreenshots: Screenshot[] = Array.isArray(screenshots) ? screenshots
    .map((screenshot: PuppeteerScreenshotLog | LegacyScreenshotLog) => {
      // Detect if it's a Puppeteer screenshot or legacy screenshot
      const isPuppeteer = screenshot.metadata.captureMethod === 'puppeteer-server-side' || 
                         (screenshot.metadata as any).containerUrl !== undefined;
      
      if (isPuppeteer) {
        const puppeteerScreenshot = screenshot as PuppeteerScreenshotLog;
        return {
          id: puppeteerScreenshot._id,
          userId: puppeteerScreenshot.userId,
          timestamp: puppeteerScreenshot.metadata.timestamp || puppeteerScreenshot.createdAt || new Date().toISOString(),
          image: puppeteerScreenshot.image,
          metadata: {
            captureMethod: puppeteerScreenshot.metadata.captureMethod,
            subject: puppeteerScreenshot.metadata.subject,
            filename: puppeteerScreenshot.metadata.filename,
            captureEvent: puppeteerScreenshot.metadata.captureEvent,
            containerUrl: puppeteerScreenshot.metadata.containerUrl,
            screenResolution: puppeteerScreenshot.metadata.screenResolution,
            fileSize: puppeteerScreenshot.metadata.fileSize,
            isCodespaceCapture: puppeteerScreenshot.metadata.isCodespaceCapture,
            captureQuality: puppeteerScreenshot.metadata.captureQuality,
            url: puppeteerScreenshot.metadata.containerUrl
          }
        };
      } else {
        // Legacy screenshot
        const legacyScreenshot = screenshot as LegacyScreenshotLog;
        return {
          id: legacyScreenshot._id,
          userId: legacyScreenshot.userId,
          timestamp: legacyScreenshot.createdAt,
          image: legacyScreenshot.image,
          metadata: {
            captureMethod: legacyScreenshot.metadata.captureMethod || 'client-side-legacy',
            screenResolution: legacyScreenshot.metadata.screenResolution,
            isCodespaceCapture: legacyScreenshot.metadata.codespaceActive || false,
            captureNumber: legacyScreenshot.metadata.captureNumber,
            viewportSize: legacyScreenshot.metadata.viewportSize,
            url: legacyScreenshot.metadata.url
          }
        };
      }
    })
    .sort((a: Screenshot, b: Screenshot) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [];

  // Filter by user
  let filteredScreenshots = selectedUserId === "all" 
    ? processedScreenshots 
    : processedScreenshots.filter(s => s.userId.toString() === selectedUserId);

  // Filter by capture method
  if (captureMethodFilter !== "all") {
    filteredScreenshots = filteredScreenshots.filter(s => 
      s.metadata.captureMethod === captureMethodFilter ||
      (captureMethodFilter === "puppeteer" && s.metadata.captureMethod === "puppeteer-server-side") ||
      (captureMethodFilter === "client" && s.metadata.captureMethod !== "puppeteer-server-side")
    );
  }

  // Get unique user IDs
  const userIds = [...new Set(processedScreenshots.map(s => s.userId))].sort();

  // Get capture method stats
  const captureMethodStats = processedScreenshots.reduce((acc, s) => {
    const method = s.metadata.captureMethod === 'puppeteer-server-side' ? 'Puppeteer' : 'Client-side';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const getCaptureMethodBadge = (method: string) => {
    if (method === 'puppeteer-server-side') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          🚀 Puppeteer
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          📱 Client
        </span>
      );
    }
  };



  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="card-elevated border-border-accent">
        <CardHeader className="border-b border-border-accent">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-blue-purple p-2 rounded-xl">
              <span className="text-white text-lg">📸</span>
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-foreground">Student Screenshots</CardTitle>
              <p className="text-sm text-muted-foreground">Monitor captured screenshots and activities</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
              <Select value={captureMethodFilter} onValueChange={setCaptureMethodFilter}>
                <SelectTrigger className="w-40 bg-background-secondary border-border">
                  <SelectValue placeholder="Filter by method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="puppeteer">Puppeteer Only</SelectItem>
                  <SelectItem value="client">Client-side Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-48 bg-background-secondary border-border">
                  <SelectValue placeholder="Filter by student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {userIds.map(userId => (
                    <SelectItem key={userId} value={userId.toString()}>
                      Student {userId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="text-foreground font-medium">{filteredScreenshots.length} screenshots</span>
                {error && <span className="text-red">• API Error</span>}
                {isLoading && <span className="text-blue">• Loading...</span>}
                {!isLoading && !error && Array.isArray(screenshots) && screenshots.length === 0 && (
                  <span className="text-yellow">• No Data</span>
                )}
              </div>
            </div>
          {Object.keys(captureMethodStats).length > 0 && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
              {Object.entries(captureMethodStats).map(([method, count]) => (
                  <span key={method} className="text-foreground">
                    {method}: <strong className="text-blue">{count}</strong>
                </span>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="spinner-gradient w-8 h-8 mx-auto mb-4"></div>
              <p className="text-foreground">Loading screenshots from MongoDB...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Card className="border-red/20 bg-red/10">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">❌</div>
                  <h3 className="text-lg font-semibold text-red mb-2">Error loading screenshots</h3>
                  <p className="text-sm text-red mb-2">{error.message}</p>
                  <p className="text-xs text-muted-foreground mb-4">This usually means MongoDB connection issues or authentication problems</p>
              <Button 
                onClick={() => window.location.reload()} 
                    className="bg-gradient-blue-purple hover:shadow-glow-blue text-white"
                size="sm" 
              >
                🔄 Retry
              </Button>
                </CardContent>
              </Card>
            </div>
          ) : filteredScreenshots.length === 0 ? (
            <div className="text-center py-12">
              {!Array.isArray(screenshots) || screenshots.length === 0 ? (
                <Card className="border-dashed border-border-accent">
                  <CardContent className="p-8">
                  <div className="text-6xl mb-4">📸</div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No screenshots available yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Screenshots will appear here when:</p>
                    <ul className="text-sm text-muted-foreground text-left inline-block space-y-1 mb-4">
                    <li>• Students submit code (automatic Puppeteer capture)</li>
                    <li>• Students use manual screenshot capture</li>
                    <li>• Students access their VS Code workspace</li>
                  </ul>
                    <div className="p-3 bg-blue/20 border border-blue/30 rounded-lg text-sm">
                      <span className="text-blue font-semibold">💡 Note:</span>
                      <span className="text-foreground ml-1">Screenshots are automatically captured when students submit code or use manual capture features</span>
                  </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed border-border-accent">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">No screenshots match filters</h3>
                    <p className="text-sm text-muted-foreground">Try changing the filter settings above</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredScreenshots.map((screenshot) => (
                <Card
                  key={screenshot.id}
                  className="card-elevated hover-glow border-border-accent transition-all duration-300 cursor-pointer group"
                  onClick={() => setSelectedScreenshot(screenshot)}
                >
                  <div className="aspect-video bg-background-secondary relative overflow-hidden rounded-t-lg border-b border-border">
                    <img
                      src={screenshot.image}
                      alt={`Screenshot from Student ${screenshot.userId}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        console.error(`Failed to load screenshot for user ${screenshot.userId}:`, {
                          imageLength: screenshot.image?.length,
                          imagePrefix: screenshot.image?.substring(0, 30),
                          hasValidPrefix: screenshot.image?.startsWith('data:image/')
                        });
                        // Replace with error placeholder
                        e.currentTarget.style.display = 'none';
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'w-full h-full flex items-center justify-center bg-red-50 border border-red-200';
                        errorDiv.innerHTML = `
                          <div class="text-center text-red-600 p-4">
                            <div class="text-2xl mb-2">❌</div>
                            <div class="text-xs">Screenshot Failed</div>
                            <div class="text-xs opacity-60">Invalid image data</div>
                          </div>
                        `;
                        e.currentTarget.parentNode?.appendChild(errorDiv);
                      }}
                      onLoad={() => {
                        console.log(`✅ Screenshot loaded for user ${screenshot.userId}`);
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm border border-border text-foreground text-xs px-2 py-1 rounded-lg">
                      Student {screenshot.userId}
                    </div>
                    <div className="absolute top-2 right-2">
                      {getCaptureMethodBadge(screenshot.metadata.captureMethod)}
                    </div>
                    {screenshot.metadata.isCodespaceCapture && (
                      <div className="absolute bottom-2 right-2 bg-green/20 border border-green/30 text-green text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
                        Codespace
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-foreground">
                      {formatTimeAgo(screenshot.timestamp)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimestamp(screenshot.timestamp)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-1">
                      {screenshot.metadata.subject && (
                        <span className="bg-purple/20 text-purple border border-purple/30 px-2 py-0.5 rounded text-xs">
                          {screenshot.metadata.subject}
                        </span>
                      )}
                      {screenshot.metadata.captureEvent && (
                        <span className="bg-blue/20 text-blue border border-blue/30 px-2 py-0.5 rounded text-xs">
                          {screenshot.metadata.captureEvent}
                        </span>
                      )}
                      {screenshot.metadata.captureNumber && (
                        <span className="text-muted-foreground">
                          #{screenshot.metadata.captureNumber}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border-accent rounded-xl max-w-6xl max-h-[90vh] overflow-auto shadow-2xl">
            <div className="p-6 border-b border-border-accent">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Student {selectedScreenshot.userId} Screenshot
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatTimestamp(selectedScreenshot.timestamp)}
                  </p>
                  <div className="mt-3">
                    {getCaptureMethodBadge(selectedScreenshot.metadata.captureMethod)}
                  </div>
                </div>
                <Button
                  onClick={() => setSelectedScreenshot(null)}
                  className="bg-gradient-pink-purple hover:shadow-glow-pink text-white"
                >
                  ✕ Close
                </Button>
              </div>
              
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {selectedScreenshot.metadata.subject && (
                  <div className="text-foreground">
                    <span className="text-muted-foreground">Subject:</span> 
                    <span className="ml-1 font-medium">{selectedScreenshot.metadata.subject}</span>
                  </div>
                )}
                {selectedScreenshot.metadata.captureEvent && (
                  <div className="text-foreground">
                    <span className="text-muted-foreground">Event:</span> 
                    <span className="ml-1 font-medium">{selectedScreenshot.metadata.captureEvent}</span>
                  </div>
                )}
                <div className="text-foreground">
                  <span className="text-muted-foreground">Resolution:</span> 
                  <span className="ml-1 font-medium">{selectedScreenshot.metadata.screenResolution.width}×{selectedScreenshot.metadata.screenResolution.height}</span>
                </div>
                {selectedScreenshot.metadata.fileSize && (
                  <div className="text-foreground">
                    <span className="text-muted-foreground">Size:</span> 
                    <span className="ml-1 font-medium">{selectedScreenshot.metadata.fileSize}KB</span>
                  </div>
                )}
                {selectedScreenshot.metadata.captureQuality && (
                  <div className="text-foreground">
                    <span className="text-muted-foreground">Quality:</span> 
                    <span className="ml-1 font-medium">{selectedScreenshot.metadata.captureQuality}</span>
                  </div>
                )}
                {selectedScreenshot.metadata.isCodespaceCapture && (
                  <div className="text-foreground">
                    <span className="text-muted-foreground">Codespace:</span> 
                    <span className="ml-1 font-medium text-green">Active</span>
                  </div>
                )}
                {selectedScreenshot.metadata.captureNumber && (
                  <div className="text-foreground">
                    <span className="text-muted-foreground">Capture #:</span> 
                    <span className="ml-1 font-medium">{selectedScreenshot.metadata.captureNumber}</span>
                  </div>
                )}
                {selectedScreenshot.metadata.filename && (
                  <div className="col-span-2 text-foreground">
                    <span className="text-muted-foreground">Filename:</span> 
                    <span className="font-mono text-xs ml-1 text-blue">{selectedScreenshot.metadata.filename}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6">
              {/* 🔎 FINAL DEBUG CHECKLIST - Add debugging tools for modal */}
              <div style={{ marginBottom: '10px' }}>
                <details>
                  <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#666' }}>
                    🔧 Debug Tools (Click to expand)
                  </summary>
                  <div style={{ padding: '10px', background: '#f5f5f5', margin: '5px 0', borderRadius: '4px' }}>
                    <button 
                      onClick={() => {
                        console.log('🔎 FINAL DEBUG CHECKLIST - Screenshot Viewer Modal');
                        console.log("Screenshot image string:", selectedScreenshot.image);
                        console.log("Image string length:", selectedScreenshot.image?.length);
                        console.log("First 100 chars:", selectedScreenshot.image?.substring(0, 100));
                        console.log("Last 50 chars:", selectedScreenshot.image?.substring(selectedScreenshot.image.length - 50));
                        
                        // Check for issues
                        const hasEscapeChars = selectedScreenshot.image?.includes('\\"') || selectedScreenshot.image?.includes('\\n');
                        const hasExtraQuotes = selectedScreenshot.image?.startsWith('"') && selectedScreenshot.image?.endsWith('"');
                        const hasValidPrefix = selectedScreenshot.image?.startsWith('data:image/');
                        
                        console.log('Has escape chars:', hasEscapeChars);
                        console.log('Has extra quotes:', hasExtraQuotes);
                        console.log('Has valid prefix:', hasValidPrefix);
                      }}
                      style={{ 
                        padding: '5px 10px', 
                        margin: '2px', 
                        fontSize: '11px',
                        background: '#007cba',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      📊 Analyze Image Data
                    </button>
                    <button 
                      onClick={() => {
                        console.log('🧪 Testing manual image load (Screenshot Viewer)...');
                        const testImg = new Image();
                        testImg.onload = () => {
                          console.log('✅ Manual load test: SUCCESS - Image loads correctly (Screenshot Viewer)');
                        };
                        testImg.onerror = (e) => {
                          console.error('❌ Manual load test: FAILED - Image cannot be loaded (Screenshot Viewer)', e);
                        };
                        testImg.src = selectedScreenshot.image;
                      }}
                      style={{ 
                        padding: '5px 10px', 
                        margin: '2px', 
                        fontSize: '11px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      🧪 Test Manual Load
                    </button>
                    <button 
                      onClick={() => {
                        const knownGoodImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4/8/AzAEKgPBBgggAAAABJRU5ErkJggg==";
                        const testImg = new Image();
                        testImg.onload = () => console.log('✅ Known-good image test: SUCCESS (Screenshot Viewer)');
                        testImg.onerror = () => console.error('❌ Known-good image test: FAILED (Screenshot Viewer)');
                        testImg.src = knownGoodImage;
                        document.body.appendChild(testImg);
                      }}
                      style={{ 
                        padding: '5px 10px', 
                        margin: '2px', 
                        fontSize: '11px',
                        background: '#ffc107',
                        color: 'black',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      🔎 Test Known-Good Image
                    </button>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                      <div>Valid prefix: {selectedScreenshot.image?.startsWith('data:image/') ? '✅' : '❌'}</div>
                      <div>Has escape chars: {(selectedScreenshot.image?.includes('\\"') || selectedScreenshot.image?.includes('\\n')) ? '⚠️' : '✅'}</div>
                      <div>Has extra quotes: {(selectedScreenshot.image?.startsWith('"') && selectedScreenshot.image?.endsWith('"')) ? '⚠️' : '✅'}</div>
                      <div>Image length: {selectedScreenshot.image?.length || 0} chars</div>
                    </div>
                  </div>
                </details>
              </div>
              
              {/* Screenshot Image Display */}
              <div className="bg-background-secondary rounded-xl border border-border p-4">
              {selectedScreenshot.image?.startsWith("data:image") ? (
                <img
                  src={selectedScreenshot.image}
                  alt={`Screenshot from Student ${selectedScreenshot.userId}`}
                    className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">❌</div>
                    <h3 className="text-lg font-semibold text-red mb-2">Screenshot Failed to Load</h3>
                    <p className="text-sm text-muted-foreground">Invalid image data format</p>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 