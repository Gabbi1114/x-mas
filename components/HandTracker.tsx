import React, { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  GestureRecognizer,
  Landmark,
} from "@mediapipe/tasks-vision";
import { useStore } from "../store";
import { GestureType } from "../types";

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // Index
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12], // Middle
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16], // Ring
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // Pinky & Palm
];

const HandTracker: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gestureRecognizer, setGestureRecognizer] =
    useState<GestureRecognizer | null>(null);
  const requestRef = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);

  // State setters
  const setGesture = useStore((state) => state.setGesture);
  const setMode = useStore((state) => state.setMode);
  const setHandPosition = useStore((state) => state.setHandPosition);

  // Gesture Stability State
  const gestureRetention = useRef<{ name: string; count: number }>({
    name: "",
    count: 0,
  });

  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        setGestureRecognizer(recognizer);
      } catch (err) {
        console.error("MediaPipe initialization failed:", err);
        setFailed(true);
      }
    };

    initMediaPipe();
  }, []);

  useEffect(() => {
    const enableCam = async () => {
      if (!gestureRecognizer || failed) return;

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn("Camera API not available in this browser.");
          setFailed(true);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", predictWebcam);
        }
      } catch (err) {
        console.error("Camera access denied or error:", err);
        setFailed(true);
      }
    };

    if (gestureRecognizer) {
      enableCam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestureRecognizer]);

  // Helper to check if a finger is extended (Tip above PIP in camera coordinates)
  // MediaPipe: y is 0 at top, 1 at bottom. So tip.y < pip.y means UP.
  const isFingerUp = (
    landmarks: Landmark[],
    tipIdx: number,
    pipIdx: number
  ) => {
    return landmarks[tipIdx].y < landmarks[pipIdx].y;
  };

  const predictWebcam = () => {
    if (failed) return;
    if (!videoRef.current || !gestureRecognizer) return;

    // Safety check for valid video dimensions
    if (
      videoRef.current.videoWidth === 0 ||
      videoRef.current.videoHeight === 0
    ) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    const nowInMs = Date.now();
    let results: any = null;
    try {
      results = gestureRecognizer.recognizeForVideo(videoRef.current, nowInMs);
    } catch (err) {
      console.error("Gesture recognition failed:", err);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      setFailed(true);
      return;
    }

    let detectedGesture: GestureType = "NONE";
    let rawCategory = "None";
    let score = 0;

    // 1. Analyze Gestures (Model + Manual Heuristics)
    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];

      // Get base classification
      if (results.gestures.length > 0) {
        rawCategory = results.gestures[0][0].categoryName;
        score = results.gestures[0][0].score;
      }

      // Manual Finger Counting
      const indexUp = isFingerUp(landmarks, 8, 6);
      const middleUp = isFingerUp(landmarks, 12, 10);
      const ringUp = isFingerUp(landmarks, 16, 14);
      const pinkyUp = isFingerUp(landmarks, 20, 18);

      // Heuristic Override
      // Case: Three Fingers (Index, Middle, Ring UP, Pinky DOWN)
      if (indexUp && middleUp && ringUp && !pinkyUp) {
        detectedGesture = "THREE_FINGERS";
      }
      // Case: Victory (Index, Middle UP, Ring, Pinky DOWN) - matches model usually
      else if (indexUp && middleUp && !ringUp && !pinkyUp) {
        detectedGesture = "VICTORY";
      }
      // Case: Open Palm (All 4 fingers up)
      else if (indexUp && middleUp && ringUp && pinkyUp) {
        detectedGesture = "OPEN_PALM";
      }
      // Case: Fist (All down)
      else if (!indexUp && !middleUp && !ringUp && !pinkyUp) {
        detectedGesture = "CLOSED_FIST";
      }
      // Fallback to model if ambiguous
      else if (score > 0.5) {
        if (rawCategory === "Victory") detectedGesture = "VICTORY";
        else if (rawCategory === "Open_Palm") detectedGesture = "OPEN_PALM";
        else if (rawCategory === "Closed_Fist") detectedGesture = "CLOSED_FIST";
      }
    }

    // 2. Stability / Debounce
    if (detectedGesture !== "NONE") {
      if (detectedGesture === gestureRetention.current.name) {
        gestureRetention.current.count++;
      } else {
        gestureRetention.current.name = detectedGesture;
        gestureRetention.current.count = 1;
      }

      const STABILITY_THRESHOLD = 5; // Lower threshold for faster interaction response

      if (gestureRetention.current.count > STABILITY_THRESHOLD) {
        // Logic handled in store/components, just set current stable gesture
        setGesture(detectedGesture);

        // Global Mode Switching (Open/Fist only)
        if (detectedGesture === "CLOSED_FIST") {
          setMode("TREE");
        }
        if (detectedGesture === "OPEN_PALM" && rawCategory === "Open_Palm") {
          // Only switch to GALAXY if it's a clear open palm,
          // might be handled by InstaxGallery logic if in view mode
          setMode("GALAXY");
        }
      }
    } else {
      setGesture("NONE");
      gestureRetention.current.count = 0;
    }

    // 3. Handle Hand Position for Orbital Movement
    if (results.landmarks && results.landmarks.length > 0) {
      const hand = results.landmarks[0];
      // Landmark 9 (Middle Finger MCP) is a good stable center point
      const point = hand[9];

      // Normalize to -1 to 1
      const x = -(point.x - 0.5) * 2;
      const y = (point.y - 0.5) * 2;

      setHandPosition({ x, y });
    } else {
      setHandPosition({ x: 0, y: 0 });
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      // Stop camera if active
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
      if (gestureRecognizer && (gestureRecognizer as any).close) {
        try {
          (gestureRecognizer as any).close();
        } catch (e) {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) return null;

  return (
    <div className="fixed top-0 left-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden">
      {/* Video must stay in DOM for MediaPipe to work, but hidden from user */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        muted
        playsInline
      />
    </div>
  );
};

export default HandTracker;
