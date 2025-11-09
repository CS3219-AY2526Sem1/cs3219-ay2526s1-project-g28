import React, { useEffect, useRef, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

interface FloatingCallPopupProps {
  sessionId: string | undefined;
  socketRef: React.MutableRefObject<any>;
  onCallEnd: () => void;
  collabServiceUrl: string;
}

const FloatingCallPopup: React.FC<FloatingCallPopupProps> = ({
  sessionId,
  socketRef,
  onCallEnd,
  collabServiceUrl,
}) => {
  const dragControls = useDragControls();
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
    <div className="fixed inset-0 pointer-events-none z-50">
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ x: 100, y: 100 }}
        className="absolute bg-white rounded-xl shadow-xl border w-[600px] h-[400px] resize both overflow-hidden pointer-events-auto flex flex-col"
      >
        {/* Draggable Header */}
        <div
          className="cursor-move bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-t-xl select-none flex items-center justify-between"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <span>📹 Live Video Call</span>
        </div>

        {/* Daily Call Container */}
        <div
          ref={containerRef}
          id="daily-modal-container"
          className="flex-1 relative rounded-b-xl overflow-hidden bg-gray-100"
        >
          {!inCall && (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Connecting...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FloatingCallPopup;
