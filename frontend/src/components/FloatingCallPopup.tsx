import React, { useEffect, useMemo, useRef, useState } from "react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

interface FloatingCallPopupProps {
  sessionId: string | undefined;
  socketRef: React.MutableRefObject<any>;
  onCallEnd: () => void;
  collabServiceUrl: string;
  className?: string;
}

const FloatingCallPopup: React.FC<FloatingCallPopupProps> = ({
  sessionId,
  socketRef,
  onCallEnd,
  collabServiceUrl,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<DailyCall | null>(null);
  const onCallEndRef = useRef(onCallEnd);
  const activeRoomNameRef = useRef<string | undefined>();
  const creationInFlight = useRef(false);
  const [inCall, setInCall] = useState(false);

  useEffect(() => {
    onCallEndRef.current = onCallEnd;
  }, [onCallEnd]);

  const roomSlug = useMemo(() => {
    if (!sessionId) return undefined;
    return sessionId.includes(":") ? sessionId.split(":").pop() : sessionId;
  }, [sessionId]);

  useEffect(() => {
    let mounted = true;
    let cleanupHandlers: {
      left?: () => void;
      error?: (event: unknown) => void;
    } = {};

    if (!roomSlug) {
      console.error("No session id available for Daily call");
      onCallEndRef.current?.();
      return;
    }

    const startCall = async () => {
      if (!mounted) return;
      if (callFrameRef.current || creationInFlight.current) {
        return;
      }

      try {
        creationInFlight.current = true;
        const res = await fetch(
          `${collabServiceUrl}/collaboration/create-daily-room/${roomSlug}`,
          { method: "POST" }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || "Failed to create room");
        }

        if (!data || !("url" in data)) {
          throw new Error("No room URL returned from server");
        }

        const resolvedRoomName =
          (data as { roomName?: string }).roomName ?? roomSlug;
        activeRoomNameRef.current = resolvedRoomName;

        const container = containerRef.current;
        if (!container) throw new Error("Daily container not found");

        const newCall = DailyIframe.createFrame(container, {
          showLeaveButton: true,
          iframeStyle: {
            position: "absolute",
            width: "100%",
            height: "100%",
            top: "0",
            left: "0",
            border: "0",
            borderRadius: "0.75rem",
          },
        });

        const handleLeftMeeting = async () => {
          try {
            const targetRoomName = activeRoomNameRef.current ?? roomSlug;
            await fetch(
              `${collabServiceUrl}/collaboration/close-daily-room/${targetRoomName}`,
              { method: "DELETE" }
            );
          } catch (err) {
            console.error("Failed to close room:", err);
          }

          if (sessionId) {
            socketRef.current?.emit("end-call", {
              sessionId,
            });
          }

          callFrameRef.current?.destroy();
          callFrameRef.current = null;
          setInCall(false);
          onCallEndRef.current?.();
        };

        const handleError = (event: unknown) => {
          console.error("Daily call error", event);
        };

        cleanupHandlers.left = handleLeftMeeting;
        cleanupHandlers.error = handleError;

        newCall.on("left-meeting", handleLeftMeeting);
        newCall.on("error", handleError);

        try {
          await newCall.join({ url: (data as { url: string }).url });
        } catch (joinErr) {
          newCall.off("left-meeting", handleLeftMeeting);
          newCall.off("error", handleError);
          newCall.destroy();
          throw joinErr;
        }

        if (!mounted) {
          newCall.off("left-meeting", handleLeftMeeting);
          newCall.off("error", handleError);
          newCall.destroy();
          return;
        }

        callFrameRef.current = newCall;
        setInCall(true);

      } catch (err) {
        console.error("Daily error:", err);
        activeRoomNameRef.current = undefined;
        if (sessionId) {
          socketRef.current?.emit("end-call", { sessionId });
        }
        alert("Could not start video call.");
        onCallEndRef.current?.();
      } finally {
        creationInFlight.current = false;
      }
    };

    startCall();

    return () => {
      mounted = false;
      const existingCall = callFrameRef.current;
      if (existingCall) {
        if (cleanupHandlers.left) {
          existingCall.off("left-meeting", cleanupHandlers.left);
        }
        if (cleanupHandlers.error) {
          existingCall.off("error", cleanupHandlers.error);
        }
        existingCall.destroy();
        callFrameRef.current = null;
      }
      activeRoomNameRef.current = undefined;
      creationInFlight.current = false;
      setInCall(false);
    };
  }, [roomSlug, collabServiceUrl, socketRef, sessionId]);

  return (
    <div
      className={`flex flex-col h-full w-full overflow-hidden rounded-xl border shadow-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 ${className}`}
    >
      <div className="bg-gray-800 text-white text-sm font-medium px-4 py-2 flex items-center justify-between">
        <span>📹 Live Video Call</span>
      </div>
      <div
        ref={containerRef}
        id="daily-modal-container"
        className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-zinc-950"
      >
        {!inCall && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Connecting...
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingCallPopup;
