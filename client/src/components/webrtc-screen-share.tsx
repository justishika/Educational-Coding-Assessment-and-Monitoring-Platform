import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Monitor, 
  MonitorOff, 
  Users, 
  Wifi, 
  WifiOff, 
  Camera, 
  CameraOff,
  Mic,
  MicOff,
  Settings,
  Activity,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface WebRTCScreenShareProps {
  userId?: number;
  roomId?: string;
  onConnectionChange?: (connected: boolean) => void;
  onViewerCountChange?: (count: number) => void;
}

interface Peer {
  id: string;
  connection: RTCPeerConnection;
  isConnected: boolean;
  lastSeen: number;
}

export default function WebRTCScreenShare({ 
  userId, 
  roomId = "default-room",
  onConnectionChange,
  onViewerCountChange 
}: WebRTCScreenShareProps) {
  const { toast } = useToast();
  
  // State management
  const [isSharing, setIsSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const [shareAudio, setShareAudio] = useState(false);
  const [shareSystemAudio, setShareSystemAudio] = useState(false);
  const [bandwidthUsage, setBandwidthUsage] = useState({ upload: 0, download: 0 });
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // WebRTC Configuration
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // Add TURN servers for production
      // { 
      //   urls: 'turn:your-turn-server.com:3478',
      //   username: 'your-username',
      //   credential: 'your-password'
      // }
    ],
    iceCandidatePoolSize: 10
  };

  // Initialize WebSocket connection
  const initializeWebSocket = () => {
    const wsUrl = `ws://localhost:3001/ws/screen-share/${roomId}?userId=${userId}`;
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('🔗 WebSocket connected');
      setIsConnected(true);
      onConnectionChange?.(true);
    };
    
    wsRef.current.onclose = () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
      setConnectionQuality('disconnected');
      onConnectionChange?.(false);
      
      // Attempt reconnection after 3 seconds
      setTimeout(() => {
        if (!isConnected) {
          initializeWebSocket();
        }
      }, 3000);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to sharing server. Retrying...",
        variant: "destructive",
      });
    };
    
    wsRef.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      await handleWebSocketMessage(message);
    };
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = async (message: any) => {
    const { type, from, data } = message;
    
    switch (type) {
      case 'viewer-joined':
        await handleViewerJoined(from);
        break;
      case 'viewer-left':
        handleViewerLeft(from);
        break;
      case 'ice-candidate':
        await handleIceCandidate(from, data);
        break;
      case 'answer':
        await handleAnswer(from, data);
        break;
      case 'viewer-count':
        setViewerCount(data.count);
        onViewerCountChange?.(data.count);
        break;
      default:
        console.log('Unknown message type:', type);
    }
  };

  // Handle new viewer joining
  const handleViewerJoined = async (viewerId: string) => {
    console.log(`👁️ Viewer ${viewerId} joined`);
    
    if (!mediaStreamRef.current) return;
    
    const peerConnection = new RTCPeerConnection(rtcConfig);
    
    // Add local stream to peer connection
    mediaStreamRef.current.getTracks().forEach(track => {
      peerConnection.addTrack(track, mediaStreamRef.current!);
    });
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          to: viewerId,
          data: event.candidate
        }));
      }
    };
    
    // Monitor connection state
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${viewerId}:`, peerConnection.connectionState);
      updateConnectionQuality();
    };
    
    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    // Send offer to viewer
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'offer',
        to: viewerId,
        data: offer
      }));
    }
    
    // Store peer connection
    peersRef.current.set(viewerId, {
      id: viewerId,
      connection: peerConnection,
      isConnected: false,
      lastSeen: Date.now()
    });
    
    setViewerCount(prev => prev + 1);
  };

  // Handle viewer leaving
  const handleViewerLeft = (viewerId: string) => {
    console.log(`👋 Viewer ${viewerId} left`);
    
    const peer = peersRef.current.get(viewerId);
    if (peer) {
      peer.connection.close();
      peersRef.current.delete(viewerId);
      setViewerCount(prev => Math.max(0, prev - 1));
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (viewerId: string, candidate: RTCIceCandidate) => {
    const peer = peersRef.current.get(viewerId);
    if (peer) {
      await peer.connection.addIceCandidate(candidate);
    }
  };

  // Handle answer from viewer
  const handleAnswer = async (viewerId: string, answer: RTCSessionDescriptionInit) => {
    const peer = peersRef.current.get(viewerId);
    if (peer) {
      await peer.connection.setRemoteDescription(answer);
      peer.isConnected = true;
      updateConnectionQuality();
    }
  };

  // Update connection quality based on peer states
  const updateConnectionQuality = () => {
    const connectedPeers = Array.from(peersRef.current.values()).filter(p => p.isConnected);
    const totalPeers = peersRef.current.size;
    
    if (totalPeers === 0) {
      setConnectionQuality('disconnected');
    } else if (connectedPeers.length === totalPeers) {
      setConnectionQuality('excellent');
    } else if (connectedPeers.length / totalPeers > 0.7) {
      setConnectionQuality('good');
    } else {
      setConnectionQuality('poor');
    }
  };

  // Start screen sharing
  const startScreenShare = async () => {
    try {
      console.log('🚀 Starting screen share...');
      
      // Request screen sharing with audio options
      const constraints: any = {
        video: {
          displaySurface: 'monitor',
          cursor: 'always',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: shareSystemAudio ? {
          suppressLocalAudioPlayback: false,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } : false
      };
      
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      // Add microphone audio if requested
      if (shareAudio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          });
          
          audioStream.getAudioTracks().forEach(track => {
            stream.addTrack(track);
          });
        } catch (audioError) {
          console.warn('Failed to capture microphone audio:', audioError);
          toast({
            title: "Microphone Access Denied",
            description: "Screen sharing will continue without microphone audio.",
            variant: "default",
          });
        }
      }
      
      mediaStreamRef.current = stream;
      
      // Display local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Handle stream ending
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('📺 Screen sharing ended by user');
        stopScreenShare();
      });
      
      setIsSharing(true);
      
      // Initialize WebSocket connection
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        initializeWebSocket();
      }
      
      // Start bandwidth monitoring
      startBandwidthMonitoring();
      
      toast({
        title: "🔴 Screen Sharing Started",
        description: `Broadcasting your screen in high quality. Audio: ${shareAudio ? 'Microphone' : shareSystemAudio ? 'System' : 'None'}`,
      });
      
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      
      let errorMessage = "Failed to start screen sharing.";
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Screen sharing permission denied. Please allow access and try again.";
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Screen sharing is not supported in this browser.";
        }
      }
      
      toast({
        title: "Screen Sharing Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Stop screen sharing
  const stopScreenShare = () => {
    console.log('⏹️ Stopping screen share...');
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Close all peer connections
    peersRef.current.forEach(peer => {
      peer.connection.close();
    });
    peersRef.current.clear();
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Clear local video
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    // Stop monitoring
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    
    // Reset state
    setIsSharing(false);
    setIsConnected(false);
    setViewerCount(0);
    setConnectionQuality('disconnected');
    setBandwidthUsage({ upload: 0, download: 0 });
    
    toast({
      title: "Screen Sharing Stopped",
      description: "Your screen is no longer being shared.",
    });
  };

  // Start bandwidth monitoring
  const startBandwidthMonitoring = () => {
    statsIntervalRef.current = setInterval(async () => {
      let totalBytesSent = 0;
      let totalBytesReceived = 0;
      
      for (const peer of peersRef.current.values()) {
        try {
          const stats = await peer.connection.getStats();
          stats.forEach(report => {
            if (report.type === 'outbound-rtp') {
              totalBytesSent += report.bytesSent || 0;
            }
            if (report.type === 'inbound-rtp') {
              totalBytesReceived += report.bytesReceived || 0;
            }
          });
        } catch (error) {
          console.warn('Failed to get stats for peer:', peer.id);
        }
      }
      
      setBandwidthUsage({
        upload: Math.round(totalBytesSent / 1024), // KB
        download: Math.round(totalBytesReceived / 1024) // KB
      });
    }, 2000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScreenShare();
    };
  }, []);

  // Connection quality indicator
  const getQualityIcon = () => {
    switch (connectionQuality) {
      case 'excellent': return <CheckCircle2 className="h-4 w-4 text-green" />;
      case 'good': return <Wifi className="h-4 w-4 text-blue" />;
      case 'poor': return <AlertCircle className="h-4 w-4 text-yellow" />;
      default: return <WifiOff className="h-4 w-4 text-red" />;
    }
  };

  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'border-green/20 bg-green/5';
      case 'good': return 'border-blue/20 bg-blue/5';
      case 'poor': return 'border-yellow/20 bg-yellow/5';
      default: return 'border-red/20 bg-red/5';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Control Card */}
      <Card className={`border-2 transition-all duration-300 ${getQualityColor()}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Monitor className="h-5 w-5" />
              <span>WebRTC Screen Share</span>
              {isSharing && (
                <Badge variant="destructive" className="animate-pulse">
                  LIVE
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {getQualityIcon()}
              <span className="text-sm font-medium capitalize">{connectionQuality}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Audio Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="share-audio"
                checked={shareAudio}
                onChange={(e) => setShareAudio(e.target.checked)}
                disabled={isSharing}
                className="rounded"
              />
              <label htmlFor="share-audio" className="text-sm flex items-center">
                <Mic className="h-4 w-4 mr-1" />
                Microphone
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="share-system-audio"
                checked={shareSystemAudio}
                onChange={(e) => setShareSystemAudio(e.target.checked)}
                disabled={isSharing}
                className="rounded"
              />
              <label htmlFor="share-system-audio" className="text-sm flex items-center">
                <Camera className="h-4 w-4 mr-1" />
                System Audio
              </label>
            </div>
          </div>
          
          {/* Control Buttons */}
          <div className="flex space-x-3">
            {!isSharing ? (
              <Button
                onClick={startScreenShare}
                className="flex-1 bg-gradient-to-r from-green to-cyan hover:opacity-90 text-white font-medium"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Start Sharing
              </Button>
            ) : (
              <Button
                onClick={stopScreenShare}
                variant="destructive"
                className="flex-1"
              >
                <MonitorOff className="h-4 w-4 mr-2" />
                Stop Sharing
              </Button>
            )}
          </div>
          
          {/* Status Information */}
          {isSharing && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <Users className="h-4 w-4 text-blue" />
                  <span className="text-2xl font-bold text-blue">{viewerCount}</span>
                </div>
                <p className="text-xs text-muted-foreground">Active Viewers</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <Activity className="h-4 w-4 text-green" />
                  <span className="text-2xl font-bold text-green">{bandwidthUsage.upload}</span>
                  <span className="text-xs text-muted-foreground">KB/s</span>
                </div>
                <p className="text-xs text-muted-foreground">Upload Rate</p>
              </div>
            </div>
          )}
          
          {/* Connection Status */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Room: {roomId}</span>
            <span>User: {userId}</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Local Preview */}
      {isSharing && (
        <Card className="border-blue/20 bg-blue/5">
          <CardHeader>
            <CardTitle className="text-sm flex items-center">
              <Camera className="h-4 w-4 mr-2" />
              Local Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full max-w-md rounded-lg border border-border shadow-lg"
              style={{ maxHeight: '200px', objectFit: 'contain' }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
