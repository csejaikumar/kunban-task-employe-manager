import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Monitor, MonitorOff, Copy, Check, Users, ArrowLeft } from 'lucide-react';
import { goeyToast } from 'goey-toast';
import './MeetingRoom.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function useSpeakingDetection(stream: MediaStream | null | undefined, isMicOn: boolean, mutePlayback = true) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!stream || !isMicOn) {
      setIsSpeaking(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let audioContext: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let animationFrameId: number | null = null;

    const resumeAudio = () => {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(err => console.warn('Failed to resume AudioContext:', err));
      }
    };

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      // Bypass dynamic DOM autoplay blocks by routing audio output directly via Web Audio API for remote streams
      if (!mutePlayback) {
        analyser.connect(audioContext.destination);
      }

      // Add user gesture event listeners to instantly unlock playback on first interaction
      window.addEventListener('click', resumeAudio);
      window.addEventListener('touchstart', resumeAudio);
      resumeAudio(); // Attempt immediate play

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkAudio = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        setIsSpeaking(average > 12);
        animationFrameId = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (err) {
      console.error('Speaking detection failed:', err);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('touchstart', resumeAudio);
      if (source) source.disconnect();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [stream, isMicOn, mutePlayback]);

  return isSpeaking;
}

interface RemotePeer {
  socketId: string;
  userId: string | null;
  userName: string;
  stream?: MediaStream;
  isMicOn: boolean;
  isCamOn: boolean;
}

export default function MeetingRoom() {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { endHuddle } = useData();
  // Meeting states: 'lobby' | 'meeting' | 'ended'
  const [step, setStep] = useState<'lobby' | 'meeting' | 'ended'>('lobby');
  const [guestName, setGuestName] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const isLocalSpeaking = useSpeakingDetection(localStream, isMicOn);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenSharerSocketId, setScreenSharerSocketId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(null);

  // WebRTC & Peer mesh states
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const screenStreamRef = useRef<MediaStream | null>(null);

  // On mount, look up what project this meeting code belongs to
  useEffect(() => {
    const fetchLinkedProject = async () => {
      try {
        const res = await fetch(`${API_URL}/api/meetings/lookup/${meetingCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.projectId) setLinkedProjectId(data.projectId);
        }
      } catch (err) {
        console.error('Could not look up meeting project:', err);
      }
    };
    if (meetingCode) fetchLinkedProject();
  }, [meetingCode]);

  // Initialize camera and mic for lobby preview with progressive device fallbacks
  useEffect(() => {
    const initLobbyStream = async () => {
      try {
        // Step 1: Try both video and audio
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsCamOn(true);
        setIsMicOn(true);
        return;
      } catch (err) {
        console.warn('Failed to access both video and audio, trying audio-only...', err);
      }

      try {
        // Step 2: Try audio-only (e.g. no webcam, or webcam blocked)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsCamOn(false);
        setIsMicOn(true);
        goeyToast.info('Audio-Only Activated', {
          description: 'No camera detected or permission denied. Camera is disabled.'
        });
        return;
      } catch (err) {
        console.warn('Failed to access audio, trying video-only...', err);
      }

      try {
        // Step 3: Try video-only (e.g. no microphone, or microphone blocked)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsCamOn(true);
        setIsMicOn(false);
        goeyToast.info('Video-Only Activated', {
          description: 'No microphone detected or permission denied. Microphone is disabled.'
        });
        return;
      } catch (err) {
        console.error('All media device access attempts failed:', err);
        
        // Step 4: Fallback to silent/blind viewer mode (no stream)
        localStreamRef.current = null;
        setLocalStream(null);
        setIsCamOn(false);
        setIsMicOn(false);
        goeyToast.warning('Joining as Viewer', {
          description: 'No working camera or microphone found. You will join the call to view others.'
        });
      }
    };

    if (step === 'lobby') {
      initLobbyStream();
    }

    // Only clean up the stream when unmounting entirely, NOT when step changes
    // The stream is reused by the meeting phase
  }, [step]);

  // Keep local video element srcObject synchronized with localStream or screenShare stream whenever it mounts/remounts
  useEffect(() => {
    if (localVideoRef.current) {
      if (isScreenSharing && screenStreamRef.current) {
        if (localVideoRef.current.srcObject !== screenStreamRef.current) {
          localVideoRef.current.srcObject = screenStreamRef.current;
        }
      } else if (localStream) {
        if (localVideoRef.current.srcObject !== localStream) {
          localVideoRef.current.srcObject = localStream;
        }
      }
    }
  }, [localStream, step, isCamOn, isScreenSharing]);

  // Handle local microphone toggle
  const toggleMic = () => {
    const stream = localStreamRef.current || localStream;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
        
        // Notify other peers in room if connected
        if (socketRef.current) {
          socketRef.current.emit('webrtc-toggle-media', {
            roomCode: meetingCode,
            type: 'audio',
            enabled: audioTrack.enabled
          });
        }
      }
    }
  };

  // Handle local camera toggle
  const toggleCam = () => {
    const stream = localStreamRef.current || localStream;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOn(videoTrack.enabled);
        
        // Notify other peers in room if connected
        if (socketRef.current) {
          socketRef.current.emit('webrtc-toggle-media', {
            roomCode: meetingCode,
            type: 'video',
            enabled: videoTrack.enabled
          });
        }
      }
    }
  };

  // Handle screen sharing toggle
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace video tracks in all active peer connections or add them if not present
      Object.values(pcsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        } else {
          pc.addTrack(screenTrack, screenStream);
        }
      });

      // Update screen sharing stream reference
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      setScreenSharerSocketId('local');
      
      // Notify other peers in room
      if (socketRef.current) {
        socketRef.current.emit('toggle-screen-share', {
          roomCode: meetingCode,
          isSharing: true
        });
      }
      
      // Force camera visual mode true so the local video grid displays the screen share preview
      setIsCamOn(true);

      // Explicitly trigger render preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
        localVideoRef.current.play().catch(err => console.warn('Preview play deferred:', err));
      }

      // Handle user clicking native browser "Stop Sharing" button
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Error starting screen share:', err);
      goeyToast.error('Screen Share Failed', {
        description: 'Permissions were denied or operation aborted.'
      });
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Notify other peers in room
    if (socketRef.current) {
      socketRef.current.emit('toggle-screen-share', {
        roomCode: meetingCode,
        isSharing: false
      });
    }
    setScreenSharerSocketId(null);

    // Restore local camera track in all peer connections
    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(pcsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(cameraTrack);
        }
      });

      // Restore isCamOn state from the camera track's actual enabled state
      setIsCamOn(cameraTrack ? cameraTrack.enabled : false);

      if (localVideoRef.current && cameraTrack && cameraTrack.enabled) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(err => console.warn('Camera preview restore deferred:', err));
      }
    } else {
      setIsCamOn(false);
    }

    setIsScreenSharing(false);
  };

  // Establish WebRTC room connection
  const joinHuddle = () => {
    const activeName = currentUser ? currentUser.name : guestName.trim();
    if (!activeName) {
      goeyToast.info('Name Required', {
        description: 'Please input a name before entering the call.'
      });
      return;
    }

    setStep('meeting');

    // Connect to Signaling Socket Server
    const socket = io(API_URL, {
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', {
        roomCode: meetingCode,
        userId: currentUser ? currentUser.id : null,
        userName: activeName
      });
    });

    // List of existing clients in the room - initiate P2P deals with each
    socket.on('room-users', (users: Omit<RemotePeer, 'stream'>[]) => {
      const peers = users.map(u => ({ ...u, isMicOn: true, isCamOn: true }));
      setRemotePeers(peers);

      peers.forEach(peer => {
        createPeerConnection(peer.socketId, peer.userId, peer.userName, true);
      });
    });

    // A new client joined - wait to receive their offer
    socket.on('peer-joined', ({ socketId, userId, userName }: Omit<RemotePeer, 'stream'>) => {
      setRemotePeers(prev => {
        if (prev.some(p => p.socketId === socketId)) return prev;
        return [...prev, { socketId, userId, userName, isMicOn: true, isCamOn: true }];
      });
      // Set up the local P2P endpoint for this user
      createPeerConnection(socketId, userId, userName, false);
    });

    // Handle peer left
    socket.on('peer-left', ({ socketId }: { socketId: string }) => {
      setScreenSharerSocketId(prev => prev === socketId ? null : prev);
      cleanPeerConnection(socketId);
    });

    // WebRTC connection signaling relays
    socket.on('webrtc-offer', async ({ senderSocketId, offer }: { senderSocketId: string, offer: any }) => {
      const pc = pcsRef.current[senderSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc-answer', {
            targetSocketId: senderSocketId,
            answer
          });
        } catch (err) {
          console.error('Error negotiating WebRTC offer:', err);
        }
      }
    });

    socket.on('webrtc-answer', async ({ senderSocketId, answer }: { senderSocketId: string, answer: any }) => {
      const pc = pcsRef.current[senderSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Error negotiating WebRTC answer:', err);
        }
      }
    });

    socket.on('webrtc-candidate', async ({ senderSocketId, candidate }: { senderSocketId: string, candidate: any }) => {
      const pc = pcsRef.current[senderSocketId];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    // Handle remote peer mute updates
    socket.on('webrtc-toggle-media', ({ senderSocketId, type, enabled }: { senderSocketId: string, type: 'audio' | 'video', enabled: boolean }) => {
      setRemotePeers(prev => prev.map(peer => {
        if (peer.socketId === senderSocketId) {
          return {
            ...peer,
            isMicOn: type === 'audio' ? enabled : peer.isMicOn,
            isCamOn: type === 'video' ? enabled : peer.isCamOn
          };
        }
        return peer;
      }));
    });

    socket.on('peer-screen-share', ({ senderSocketId, isSharing }: { senderSocketId: string, isSharing: boolean }) => {
      setScreenSharerSocketId(isSharing ? senderSocketId : null);
      if (isSharing) {
        setRemotePeers(prev => prev.map(peer => {
          if (peer.socketId === senderSocketId) {
            return { ...peer, isCamOn: true };
          }
          return peer;
        }));
      }
    });

    socket.on('huddle-terminated', () => {
      goeyToast.warning('Call Ended by Host', {
        description: 'The host has ended this meeting for all participants.'
      });
      leaveHuddle();
    });
  };

  // Helper: Create custom WebRTC connection
  const createPeerConnection = (peerSocketId: string, _peerUserId: string | null, _peerUserName: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    pcsRef.current[peerSocketId] = pc;

    // Attach local camera / audio tracks to connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Exchange connection candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc-candidate', {
          targetSocketId: peerSocketId,
          candidate: event.candidate
        });
      }
    };

    // Capture incoming remote camera track
    pc.ontrack = (event) => {
      setRemotePeers(prev => prev.map(peer => {
        if (peer.socketId === peerSocketId) {
          const existingStream = peer.stream || new MediaStream();
          if (!existingStream.getTracks().some(t => t.id === event.track.id)) {
            existingStream.addTrack(event.track);
          }
          // Clone the stream to force React state dependency triggers
          return { ...peer, stream: new MediaStream(existingStream.getTracks()) };
        }
        return peer;
      }));
    };

    // If initiator, negotiate an offer to the peer
    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (socketRef.current) {
            socketRef.current.emit('webrtc-offer', {
              targetSocketId: peerSocketId,
              offer
            });
          }
        } catch (err) {
          console.error('Negotiation offer creation failed:', err);
        }
      };
    }

    return pc;
  };

  const cleanPeerConnection = (socketId: string) => {
    if (pcsRef.current[socketId]) {
      pcsRef.current[socketId].close();
      delete pcsRef.current[socketId];
    }
    setRemotePeers(prev => prev.filter(p => p.socketId !== socketId));
  };

  const leaveHuddle = () => {
    // End active screen sharing
    if (isScreenSharing) {
      stopScreenShare();
    }

    // Shut down local camera/mic stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Disconnect sockets
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Close all P2P connections
    Object.keys(pcsRef.current).forEach(socketId => {
      pcsRef.current[socketId].close();
    });
    pcsRef.current = {};

    setStep('ended');
  };

  // Completely wipe server status if Admin host cancels the meeting
  const handleEndEntireHuddle = async () => {
    if (window.confirm('Are you sure you want to end this call for everyone?')) {
      if (linkedProjectId) {
        try {
          if (socketRef.current) {
            socketRef.current.emit('end-meeting', { roomCode: meetingCode });
          }
          await endHuddle(linkedProjectId);
        } catch (err) {
          console.error(err);
        }
      }
      leaveHuddle();
    }
  };

  const copyLinkToClipboard = () => {
    const inviteLink = `${window.location.origin}/meeting/${meetingCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    goeyToast.success('Invitation Link Copied!', {
      description: 'Send this code or URL to clients or team members to join.'
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Render video preview element for remote stream
  const RemoteVideo = ({ stream, isMicOn, isCamOn, name, isScreenSharing }: { stream?: MediaStream, isMicOn: boolean, isCamOn: boolean, name: string, isScreenSharing?: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const isSpeaking = useSpeakingDetection(stream, isMicOn, false);

    useEffect(() => {
      if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.warn('Video play deferred:', err));
      }
    }, [stream]);

    useEffect(() => {
      if (audioRef.current && stream && audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(err => console.warn('Audio play deferred:', err));
      }
    }, [stream]);

    // Keep dynamic track additions bound
    useEffect(() => {
      if (!stream) return;
      const handleTrackAdded = () => {
        if (videoRef.current && videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        if (audioRef.current && audioRef.current.srcObject !== stream) {
          audioRef.current.srcObject = stream;
        }
      };
      stream.addEventListener('addtrack', handleTrackAdded);
      stream.addEventListener('removetrack', handleTrackAdded);
      return () => {
        stream.removeEventListener('addtrack', handleTrackAdded);
        stream.removeEventListener('removetrack', handleTrackAdded);
      };
    }, [stream]);

    return (
      <div className={`video-card glass-panel animate-fade-in ${isSpeaking ? 'speaking-glow' : ''}`}>
        {/* Dedicated unmuted hidden audio element for absolute audio delivery - absolute layout prevents browser throttling */}
        <audio 
          ref={audioRef} 
          autoPlay 
          playsInline 
          style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', zIndex: -1 }} 
        />

        {/* Muted video element so browser autoplay security policies do not block it, completely independent of layout display mode */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className="peer-video" 
          style={{ display: isCamOn && stream && !isScreenSharing ? 'block' : 'none' }}
        />
        
        {(!isCamOn || !stream || isScreenSharing) && (
          <div className="avatar-placeholder animate-pulse">
            <span className="avatar-letters">{name.slice(0, 2).toUpperCase()}</span>
            {isScreenSharing && (
              <span className="sharing-screen-avatar-label">Sharing Screen...</span>
            )}
          </div>
        )}
        
        <div className="peer-badge">
          <span>{name}</span>
          {!isMicOn && <MicOff size={14} className="badge-muted-icon" />}
        </div>
      </div>
    );
  };

  if (step === 'lobby') {
    return (
      <div className="huddle-lobby animate-fade-in">
        <div className="lobby-header">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back
          </button>
          <div className="logo-group">
            <span className="logo-icon">✨</span>
            <span className="logo-text">Nexus Meetings</span>
          </div>
        </div>

        <div className="lobby-content glass-panel">
          <div className="media-preview-pane">
            <div className="video-container glass-panel">
              {isCamOn && localStream ? (
                <video ref={localVideoRef} autoPlay muted playsInline className="lobby-video" />
              ) : (
                <div className="camera-off-avatar">
                  <span>{currentUser ? currentUser.name.slice(0, 2).toUpperCase() : '?'}</span>
                </div>
              )}
              
              <div className="lobby-media-controls">
                <button className={`control-btn ${isMicOn ? 'active' : 'muted'}`} onClick={toggleMic}>
                  {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                <button className={`control-btn ${isCamOn ? 'active' : 'muted'}`} onClick={toggleCam}>
                  {isCamOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                </button>
              </div>
            </div>
          </div>

          <div className="lobby-form-pane">
            <h2>Ready to Join Huddle?</h2>
            <p className="room-sub">Room Code: <span className="highlight-code">{meetingCode}</span></p>

            {currentUser ? (
              <div className="authenticated-form">
                <div className="user-profile-row">
                  <img src={currentUser.avatar} alt={currentUser.name} className="lobby-avatar" />
                  <div className="user-profile-info">
                    <h4>{currentUser.name}</h4>
                    <span className="user-role-badge">{currentUser.role}</span>
                  </div>
                </div>
                <button className="btn btn-primary btn-block btn-join animate-glow" onClick={joinHuddle}>
                  Join Meeting
                </button>
              </div>
            ) : (
              <div className="guest-form">
                <div className="form-group">
                  <label htmlFor="guest-name">Enter your Name to Join as a Guest</label>
                  <input
                    type="text"
                    id="guest-name"
                    placeholder="e.g. Client - Arthur"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary btn-block btn-join animate-glow" onClick={joinHuddle}>
                  Join Meeting as Guest
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'ended') {
    return (
      <div className="huddle-ended animate-fade-in">
        <div className="ended-card glass-panel text-center">
          <div className="ended-icon">✨</div>
          <h2>Huddle Ended</h2>
          <p>You have left the meeting room. Thank you for using Nexus Meetings.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Active Meeting View
  const gridClass = `call-grid count-${remotePeers.length + 1}`;

  return (
    <div className="huddle-call-room animate-fade-in">
      <header className="call-header glass-panel">
        <div className="call-header-left">
          <span className="logo-mini">✨</span>
          <h3>{linkedProjectId ? "Project Huddle" : "Nexus Call"}</h3>
          <span className="room-code-tag">{meetingCode}</span>
        </div>

        <div className="call-header-right">
          <button className="btn btn-secondary btn-icon-text" onClick={copyLinkToClipboard}>
            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            <span>Invite Client</span>
          </button>

          <div className="participant-badge glass-panel">
            <Users size={16} />
            <span>{remotePeers.length + 1}</span>
          </div>
        </div>
      </header>

      <main className={`call-viewport ${screenSharerSocketId ? 'has-spotlight' : ''}`}>
        {screenSharerSocketId && (
          <div className="spotlight-container glass-panel animate-fade-in">
            {screenSharerSocketId === 'local' ? (
              <video 
                ref={el => { 
                  if (el && screenStreamRef.current) {
                    if (el.srcObject !== screenStreamRef.current) {
                      el.srcObject = screenStreamRef.current;
                    }
                    el.play().catch(err => console.warn('Spotlight play deferred:', err));
                  } 
                }}
                autoPlay 
                playsInline 
                muted
                className="spotlight-video" 
              />
            ) : (
              <video 
                ref={el => { 
                  const sharer = remotePeers.find(p => p.socketId === screenSharerSocketId);
                  if (el && sharer && sharer.stream) {
                    if (el.srcObject !== sharer.stream) {
                      el.srcObject = sharer.stream;
                    }
                    el.play().catch(err => console.warn('Remote spotlight play deferred:', err));
                  } 
                }}
                autoPlay 
                playsInline 
                muted
                className="spotlight-video" 
              />
            )}
            <div className="spotlight-badge">
              <Monitor size={16} />
              <span>
                {screenSharerSocketId === 'local' 
                  ? 'You are presenting' 
                  : `${remotePeers.find(p => p.socketId === screenSharerSocketId)?.userName || 'Participant'} is presenting`}
              </span>
            </div>
          </div>
        )}

        <div className={screenSharerSocketId ? "sidebar-grid" : gridClass}>
          {/* Local participant card */}
          <div className={`video-card glass-panel local-card ${isLocalSpeaking ? 'speaking-glow' : ''}`}>
            {isCamOn && localStream && screenSharerSocketId !== 'local' ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="peer-video local-video" />
            ) : (
              <div className="avatar-placeholder animate-pulse">
                <span className="avatar-letters">
                  {currentUser ? currentUser.name.slice(0, 2).toUpperCase() : guestName.slice(0, 2).toUpperCase()}
                </span>
                {screenSharerSocketId === 'local' && (
                  <span className="sharing-screen-avatar-label">Sharing Screen...</span>
                )}
              </div>
            )}
            <div className="peer-badge">
              <span>{currentUser ? `${currentUser.name} (You)` : `${guestName} (You)`}</span>
              {!isMicOn && <MicOff size={14} className="badge-muted-icon" />}
            </div>
          </div>

          {/* Remote participant cards */}
          {remotePeers.map(peer => (
            <RemoteVideo 
              key={peer.socketId} 
              stream={peer.stream} 
              isMicOn={peer.isMicOn}
              isCamOn={peer.isCamOn} 
              name={peer.userName}
              isScreenSharing={screenSharerSocketId === peer.socketId}
            />
          ))}
        </div>
      </main>

      <footer className="call-footer">
        <div className="floating-call-controls glass-panel">
          <button className={`control-btn ${isMicOn ? 'active' : 'muted'}`} onClick={toggleMic} title={isMicOn ? "Mute Mic" : "Unmute Mic"}>
            {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
          </button>
          
          <button className={`control-btn ${isCamOn ? 'active' : 'muted'}`} onClick={toggleCam} title={isCamOn ? "Disable Cam" : "Enable Cam"}>
            {isCamOn ? <VideoIcon size={22} /> : <VideoOff size={22} />}
          </button>

          <button className={`control-btn ${isScreenSharing ? 'active' : ''}`} onClick={toggleScreenShare} title={isScreenSharing ? "Stop Sharing" : "Share Screen"}>
            {isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
          </button>

          <button className="control-btn hangup-btn" onClick={leaveHuddle} title="Leave Huddle">
            <PhoneOff size={22} />
          </button>

          {currentUser?.role === 'Admin' && linkedProjectId && (
            <button className="btn btn-danger btn-sm end-all-btn" onClick={handleEndEntireHuddle}>
              End Call for All
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
