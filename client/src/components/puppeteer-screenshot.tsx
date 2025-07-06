import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface PuppeteerScreenshotProps {
  userId?: number;
  codespaceUrl?: string;
  subject?: string;
  interval?: number; // in milliseconds
  isCodespaceActive?: boolean; // Only capture when codespace is active
}

export default function PuppeteerScreenshot({ 
  userId, 
  codespaceUrl,
  subject = "JavaScript",
  interval = 30000, // 30 seconds for automatic captures
  isCodespaceActive = false 
}: PuppeteerScreenshotProps) {
  
  // TEMPORARY: Test mode for backend fixes
  const isTestMode = false; // Set to false after testing
  const testUrl = "https://vscode.dev"; // Test URL for screenshot capture
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [lastCaptureTime, setLastCaptureTime] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  useEffect(() => {
    console.log('📸 PuppeteerScreenshot useEffect triggered with:', {
      userId,
      isCodespaceActive,
      codespaceUrl: !!codespaceUrl,
      subject,
      interval
    });
    
    if (!userId || (!isTestMode && (!isCodespaceActive || !codespaceUrl))) {
      // Stop capturing if codespace is not active (unless in test mode)
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('📸 PuppeteerScreenshot: Stopped interval due to missing requirements');
      }
      console.log('📸 PuppeteerScreenshot: Not active - userId:', userId, 'isCodespaceActive:', isCodespaceActive, 'codespaceUrl:', !!codespaceUrl, 'testMode:', isTestMode);
      
      // In test mode, continue if we have userId
      if (!isTestMode || !userId) {
        return;
      }
    }
    
    console.log(`📸 PuppeteerScreenshot: Starting automatic Puppeteer capture for user ${userId} every ${interval}ms`);
    console.log(`📸 PuppeteerScreenshot: Codespace URL: ${isTestMode ? testUrl : codespaceUrl}`);
    
    // Function to capture screenshot via Puppeteer
    const captureScreenshot = async () => {
      if (isCapturing) {
        console.log('📸 PuppeteerScreenshot: Already capturing, skipping...');
        return;
      }

      try {
        setIsCapturing(true);
        const targetUrl = isTestMode ? testUrl : codespaceUrl;
        console.log(`📸 PuppeteerScreenshot: Starting automatic capture attempt ${captureCount + 1} for user ${userId}`);
        console.log(`📸 PuppeteerScreenshot: Target URL: ${targetUrl}`);
        
        const response = await fetch("/api/capture-screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject,
            containerUrl: targetUrl,
            captureNote: `Auto-capture ${captureCount + 1} for user ${userId}`,
            timestamp: new Date().toISOString()
          })
        });

        const result = await response.json();

        if (result.success) {
          setCaptureCount(prev => prev + 1);
          setLastCaptureTime(new Date().toISOString());
          console.log(`📸 PuppeteerScreenshot: Automatic capture ${captureCount + 1} successful - ${result.imageSize}KB`);
        } else {
          console.error('📸 PuppeteerScreenshot: Automatic capture failed:', result.error);
          
          // Log the error to the server
          try {
            await apiRequest("POST", "/api/log/screenshot-error", {
              userId,
              error: result.error || 'Unknown Puppeteer error',
              timestamp: new Date().toISOString(),
              captureAttempt: captureCount + 1,
              captureMethod: 'puppeteer-automatic'
            });
          } catch (logError) {
            console.error("Failed to log Puppeteer screenshot error:", logError);
          }
        }
      } catch (error) {
        console.error("📸 PuppeteerScreenshot: Automatic capture error:", error);
        
        try {
          await apiRequest("POST", "/api/log/screenshot-error", {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            captureAttempt: captureCount + 1,
            captureMethod: 'puppeteer-automatic'
          });
        } catch (logError) {
          console.error("Failed to log Puppeteer screenshot error:", logError);
        }
      } finally {
        setIsCapturing(false);
      }
    };
    
    // Set up periodic Puppeteer screenshot capture
    intervalRef.current = setInterval(captureScreenshot, interval);
    
    // Initial capture after a short delay to let the codespace fully load
    setTimeout(captureScreenshot, 5000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId, codespaceUrl, subject, interval, isCodespaceActive, captureCount, isCapturing]);

  // Show capture status
  return isCodespaceActive || isTestMode ? (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-blue-500 text-white text-xs px-3 py-2 rounded-lg mb-2 opacity-90 shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
          <span className="font-medium">Puppeteer Auto-Capture</span>
        </div>
        <div className="text-xs opacity-75 mt-1">
          📸 {captureCount} captures
          {lastCaptureTime && (
            <div className="text-xs opacity-60">
              Last: {new Date(lastCaptureTime).toLocaleTimeString()}
            </div>
          )}
        </div>
        <div className="text-xs opacity-60 mt-1">
          URL: {isTestMode ? testUrl : codespaceUrl || 'None'} 
        </div>
        <div className="text-xs opacity-60">
          Mode: {isTestMode ? '🧪 Test' : '🚀 Live'} | User: {userId || 'None'}
        </div>
      </div>
      {isCapturing && (
        <div className="bg-green-500 text-white text-xs px-3 py-2 rounded-lg opacity-90 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-white animate-spin"></div>
            <span>Capturing...</span>
          </div>
        </div>
      )}
    </div>
  ) : null;
}
