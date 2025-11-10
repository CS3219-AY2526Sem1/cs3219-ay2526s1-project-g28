import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import {
  LiveKitRoom,
  VideoConference,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";

interface FloatingCallPopupProps {
  sessionId: string | undefined;
  username: string;
  onCallEnd: () => void;
  videoServiceUrl: string;
}

function HangUpButton({ onLeave }: { onLeave: () => void }) {
  const room = useRoomContext();

  return (
    <button
      onClick={async () => {
        try {
          await room?.disconnect();
        } finally {
          onLeave();
        }
      }}
      className="ml-4 inline-flex items-center rounded-md bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-600 focus:outline-none"
    >
      Leave
    </button>
  );
}

const FloatingCallPopup: React.FC<FloatingCallPopupProps> = ({
  sessionId,
  username,
  onCallEnd,
  videoServiceUrl,
}) => {
  const dragControls = useDragControls();
  const displayName = username?.trim() ? username : "Guest";
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasEndedRef = useRef(false);

  const roomId = useMemo(() => {
    if (!sessionId) return undefined;
    return sessionId.includes(":") ? sessionId.split(":")[1] : sessionId;
  }, [sessionId]);

  useEffect(() => {
    hasEndedRef.current = false;
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      setError("Missing session information for the video call.");
      return;
    }

    let isMounted = true;
    const fetchToken = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const tokenEndpoint = new URL("/token", videoServiceUrl).toString();
        const params = new URLSearchParams({
          room: roomId,
          identity: displayName,
        });

        const response = await fetch(`${tokenEndpoint}?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch video token: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data?.token || !data?.url) {
          throw new Error("Video service returned an invalid token payload.");
        }

        if (isMounted) {
          setToken(data.token);
          setServerUrl(data.url);
        }
      } catch (err) {
        console.error("Error fetching LiveKit token", err);
        if (isMounted) {
          setError(
            "Unable to start the call. Please verify the LiveKit credentials on the video service."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchToken();

    return () => {
      isMounted = false;
    };
  }, [displayName, roomId, videoServiceUrl]);

  const handleCallEnd = () => {
    if (!hasEndedRef.current) {
      hasEndedRef.current = true;
      onCallEnd();
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ x: 100, y: 100 }}
        className="absolute bg-white rounded-xl shadow-xl border w-[720px] h-[500px] overflow-hidden pointer-events-auto flex flex-col"
      >
        <div
          className="cursor-move bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-t-xl select-none flex items-center justify-between"
          onPointerDown={(event) => dragControls.start(event)}
        >
          <span>📹 LiveKit Video Call</span>
          <div className="flex items-center gap-2">
            {isLoading && (
              <span className="text-xs text-gray-200">Connecting…</span>
            )}
            <HangUpButton onLeave={handleCallEnd} />
          </div>
        </div>

        <div className="flex-1 bg-gray-100">
          {error ? (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-red-600">
              {error}
            </div>
          ) : token && serverUrl ? (
            <LiveKitRoom
              data-lk-theme="default"
              audio
              video
              connect
              serverUrl={serverUrl}
              token={token}
              onDisconnected={handleCallEnd}
            >
              <div className="flex h-full flex-col">
                <VideoConference />
              </div>
            </LiveKitRoom>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
              Preparing your call…
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FloatingCallPopup;
