import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { motion, useDragControls } from "framer-motion";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface RemoteStream {
  peerId: string;
  stream: MediaStream;
  username?: string;
}

interface FloatingCallPopupProps {
  sessionId: string | undefined;
  username: string;
  onCallEnd: () => void;
  videoServiceUrl: string;
}

const FloatingCallPopup: React.FC<FloatingCallPopupProps> = ({
  sessionId,
  username,
  onCallEnd,
  videoServiceUrl,
}) => {
  const dragControls = useDragControls();
  const displayName = username?.trim() ? username : "Guest";
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const roomId = useMemo(() => {
    if (!sessionId) return undefined;
    return sessionId.includes(":") ? sessionId.split(":")[1] : sessionId;
  }, [sessionId]);

  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
    }
    peerConnectionsRef.current.delete(peerId);
    setRemoteStreams((prev) => prev.filter((entry) => entry.peerId !== peerId));
  }, []);

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, []);

  const handleLeave = useCallback(() => {
    socketRef.current?.emit("leave-room");
    socketRef.current?.disconnect();
    peerConnectionsRef.current.forEach((_, peerId) => cleanupPeer(peerId));
    peerConnectionsRef.current.clear();
    stopLocalStream();
    onCallEnd();
  }, [cleanupPeer, onCallEnd, stopLocalStream]);

  useEffect(() => {
    if (!roomId) {
      setConnectionError("Missing session information for the video call.");
      return;
    }

    let isMounted = true;
    const socket = io(videoServiceUrl, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    const initialiseLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        socket.emit("join-room", { sessionId: roomId, username: displayName });
      } catch (error) {
        console.error("Failed to get media stream", error);
        setConnectionError(
          "Unable to access camera or microphone. Please check your permissions."
        );
        setIsConnecting(false);
      }
    };

    const ensurePeerConnection = (peerId: string) => {
      let connection = peerConnectionsRef.current.get(peerId);
      if (connection) {
        return connection;
      }

      const newConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      newConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            target: peerId,
            candidate: event.candidate,
          });
        }
      };

      newConnection.ontrack = (event) => {
        setRemoteStreams((prev) => {
          const existing = prev.find((entry) => entry.peerId === peerId);
          if (existing) {
            existing.stream = event.streams[0];
            return [...prev];
          }
          return [
            ...prev,
            {
              peerId,
              stream: event.streams[0],
            },
          ];
        });
      };

      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => {
          newConnection.addTrack(track, stream);
        });
      }

      peerConnectionsRef.current.set(peerId, newConnection);
      return newConnection;
    };

    const createOfferForPeer = async (peerId: string) => {
      const connection = ensurePeerConnection(peerId);
      try {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        socket.emit("offer", {
          target: peerId,
          description: connection.localDescription,
        });
      } catch (error) {
        console.error("Failed to create offer", error);
      }
    };

    socket.on("connect_error", (err) => {
      console.error("Video socket connection failed", err);
      setConnectionError("Unable to connect to video service.");
      setIsConnecting(false);
    });

    socket.on("participants", ({ peers }: { peers: string[] }) => {
      peers.forEach((peerId) => {
        createOfferForPeer(peerId);
      });
      setIsConnecting(false);
    });

    socket.on(
      "user-joined",
      ({ socketId }: { socketId: string; username?: string }) => {
        createOfferForPeer(socketId);
      }
    );

    socket.on(
      "offer",
      async ({ from, description }: { from: string; description: RTCSessionDescriptionInit }) => {
        try {
          const connection = ensurePeerConnection(from);
          await connection.setRemoteDescription(description);
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          socket.emit("answer", {
            target: from,
            description: connection.localDescription,
          });
        } catch (error) {
          console.error("Error handling offer", error);
        }
      }
    );

    socket.on(
      "answer",
      async ({ from, description }: { from: string; description: RTCSessionDescriptionInit }) => {
        const connection = peerConnectionsRef.current.get(from);
        if (!connection) return;
        try {
          await connection.setRemoteDescription(description);
        } catch (error) {
          console.error("Error applying remote answer", error);
        }
      }
    );

    socket.on(
      "ice-candidate",
      async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
        const connection = ensurePeerConnection(from);
        try {
          await connection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding received ICE candidate", error);
        }
      }
    );

    socket.on(
      "user-left",
      ({ socketId }: { socketId: string }) => {
        cleanupPeer(socketId);
      }
    );

    initialiseLocalStream();

    return () => {
      isMounted = false;
      socket.removeAllListeners();
      socket.disconnect();
      peerConnectionsRef.current.forEach((_, peerId) => cleanupPeer(peerId));
      peerConnectionsRef.current.clear();
      stopLocalStream();
    };
  }, [cleanupPeer, displayName, roomId, stopLocalStream, videoServiceUrl]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ x: 100, y: 100 }}
        className="absolute bg-white rounded-xl shadow-xl border w-[640px] h-[440px] overflow-hidden pointer-events-auto flex flex-col"
      >
        <div
          className="cursor-move bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-t-xl select-none flex items-center justify-between"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <span>📹 Live Video Call</span>
          <button
            onClick={handleLeave}
            className="ml-4 inline-flex items-center rounded-md bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-600 focus:outline-none"
          >
            Leave
          </button>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-2 bg-gray-900 p-2">
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={localVideoRef}
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
              You ({displayName})
            </div>
          </div>

          <div className="relative rounded-lg overflow-hidden bg-black">
            {remoteStreams.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                {connectionError
                  ? connectionError
                  : isConnecting
                  ? "Waiting for another participant..."
                  : "No other participants yet."}
              </div>
            ) : (
              remoteStreams.map((entry) => (
                <video
                  key={entry.peerId}
                  className="h-full w-full object-cover"
                  autoPlay
                  playsInline
                  ref={(element) => {
                    if (element && entry.stream) {
                      element.srcObject = entry.stream;
                    }
                  }}
                />
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FloatingCallPopup;
