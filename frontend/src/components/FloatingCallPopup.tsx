import React, { useEffect, useRef, useState } from "react";
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
  const [inCall, setInCall] = useState(false);

  useEffect(() => {
    let mounted = true;
    let callCreated = false;

    const roomName = sessionId?.includes(":")
      ? sessionId.split(":").pop()
      : sessionId;

    if (!roomName) {
      console.error("No session id available for Daily call");
      onCallEnd();
      return;
    }

    const startCall = async () => {
      if (!mounted || callCreated) return;
      callCreated = true;

      try {
        const res = await fetch(
          `${collabServiceUrl}/collaboration/create-daily-room/${roomName}`,
          { method: "POST" }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || "Failed to create room");
        }

        if (!data || !("url" in data)) {
          throw new Error("No room URL returned from server");
        }

        const container = containerRef.current;
        if (!container) throw new Error("Daily container not found");

        if (container.querySelector("iframe")) {
          console.warn(
            "Daily iframe already exists — skipping duplicate creation."
          );
          return;
        }

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

        await newCall.join({ url: (data as { url: string }).url });
        if (!mounted) {
          newCall.destroy();
          return;
        }

        callFrameRef.current = newCall;
        setInCall(true);

        const handleLeftMeeting = async () => {
          try {
            await fetch(
              `${collabServiceUrl}/collaboration/close-daily-room/${roomName}`,
              { method: "DELETE" }
            );
          } catch (err) {
            console.error("Failed to close room:", err);
          }

          socketRef.current?.emit("end-call", {
            sessionId: roomName,
          });

          callFrameRef.current?.destroy();
          callFrameRef.current = null;
          setInCall(false);
          onCallEnd();
        };

        newCall.on("left-meeting", handleLeftMeeting);
        newCall.on("error", (event) => {
          console.error("Daily call error", event);
        });
      } catch (err) {
        console.error("Daily error:", err);
        alert("Could not start video call.");
        onCallEnd();
      }
    };

    startCall();

    return () => {
      mounted = false;
      callCreated = true;
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
      setInCall(false);
    };
  }, [sessionId, collabServiceUrl, onCallEnd, socketRef]);

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
