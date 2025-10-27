import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { User } from "../../types/types";
import {
  startMatchApi,
  respondMatchApi,
  cancelMatchApi,
} from "../../lib/services/matchingService";
import { NOTIFICATION_SERVICE_URL, DEFAULT_COUNTDOWN } from "./constants";

export function useSocket(user?: User) {
  const [pendingMatch, setPendingMatch] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [isQueueing, setIsQueueing] = useState(false);
  const [countdown, setCountdown] = useState(DEFAULT_COUNTDOWN);
  const [showButtons, setShowButtons] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const displayName = user?.username;
  const isQueueingRef = useRef(isQueueing);
  useEffect(() => {
    isQueueingRef.current = isQueueing;
  }, [isQueueing]);

  useEffect(() => {
    const socket: Socket = io(NOTIFICATION_SERVICE_URL);

    socket.on("connect", () => {
      console.log("Connected to notification service!");
      if (displayName !== "User") {
        socket.emit("register", { userId: displayName });
      }
    });

    const showFinalMessage = (message: string) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setModalMessage(message);
      setShowButtons(false);
      setIsQueueing(false);
      setTimeout(() => {
        setPendingMatch(null);
        setIsWaiting(false);
        setShowButtons(true);
        setCountdown(DEFAULT_COUNTDOWN);
      }, 3000);
    };

    socket.on("pending_match_created", (data) => {
      console.log("Pending match created:", data);
      setIsQueueing(false);
      setPendingMatch(data);
      setModalMessage("Ready to collaborate?");
      setIsWaiting(false);
      setShowButtons(true);
      setCountdown(DEFAULT_COUNTDOWN);
    });

    socket.on("match_confirmed", (data) => {
      console.log("Match confirmed!", data);
      showFinalMessage("Match Confirmed! Moving to room...");
    });

    socket.on("match_requeued", (data) => {
      console.log("Match rejected, you are back in the queue", data);
      showFinalMessage(data.message);
      setIsWaiting(false);
      setIsQueueing(true);
    });

    socket.on("match_rejected", (data) => {
      console.log("Match was rejected.", data);
      showFinalMessage(data.message || "Match was rejected.");
    });

    return () => {
      console.log("Disconnecting socket...");
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (displayName) {
        cancelMatchApi(displayName);
      }
      socket.disconnect();
    };
  }, [displayName]);

  useEffect(() => {
    if (pendingMatch) {
      intervalRef.current = setInterval(() => {
        setCountdown((prevCount) => {
          if (prevCount <= 1) {
            clearInterval(intervalRef.current as NodeJS.Timeout);
            handleMatchResponse("reject");
            setPendingMatch(null);
            setIsWaiting(false);
            setShowButtons(true);
            return 10;
          }
          return prevCount - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pendingMatch]);

  const handleStartMatch = async (difficulty: string, topics: string[]) => {
    if (!displayName || !difficulty || !topics) return;
    setIsQueueing(true); // Start loading state
    const matchRequest = {
      userId: displayName,
      difficulty: difficulty,
      topics: topics,
    };

    try {
      const { response, data } = await startMatchApi(matchRequest);
      if (response.status === 200 && data.data) {
        console.log("Match found immediately!", data);
        setPendingMatch(data.data);
        setModalMessage("Ready to collaborate?");
        setIsQueueing(false); // Match found, no longer queueing
        setIsWaiting(false);
        setShowButtons(true);
        setCountdown(DEFAULT_COUNTDOWN);
      } else if (response.status === 202) {
        console.log("In queue, waiting for a match...");
        // isQueueing is already true, so we just wait
      } else {
        // Handle other error statuses
        console.error("Failed to start match:", data);
        setIsQueueing(false); // Stop loading on failure
      }
    } catch (error) {
      console.error("Error starting match:", error);
      setIsQueueing(false); // Stop loading on error
    }
  };

  const handleMatchResponse = async (action: "accept" | "reject") => {
    if (!pendingMatch || isWaiting || !displayName) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    setIsWaiting(true);
    setShowButtons(false);
    setModalMessage("Processing your response...");

    const requestBody = {
      action: action,
      userId: displayName,
      matchId: (pendingMatch as any).matchId,
    };

    try {
      const response = await respondMatchApi(requestBody);
      const data = await response.json();
      console.log(`Match ${action} response:`, data);

      if (data.status === "pending") {
        setModalMessage("Waiting for the other user to respond...");
      } else {
        if (data.status == "requeued") {
          setIsQueueing(true);
        } else {
          setIsQueueing(false);
        }
        setModalMessage(data.message);
        setTimeout(() => {
          setPendingMatch(null);
          setIsWaiting(false);
          setShowButtons(true);
          setCountdown(DEFAULT_COUNTDOWN);
        }, 3000);
      }
    } catch (err) {
      console.error(`Error ${action}ing match:`, err);
      setModalMessage("An error occurred. Please try again.");
      setIsWaiting(false);
    }
  };

  return {
    pendingMatch,
    countdown,
    modalMessage,
    showButtons,
    isQueueing,
    setIsQueueing,
    handleStartMatch,
    handleMatchResponse,
  };
}
