"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  IconQrCode as QrCode,
  IconX as X,
  IconSparkles as Sparkles,
  IconRotateCw as RotateCw,
  IconCheckCircle as CheckCircle2,
} from "@/components/navigation/NavIcons";
import { calculateBearing, getFloorLabel } from "@/lib/campus-navigation/engine";

export default function ARCameraOverlay({
  onClose,
  activeRoute,
  currentNode,
  targetNode,
  onScanCheckpoint,
  allNodes,
}) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [compassHeading, setCompassHeading] = useState(0); // 0 - 360 deg
  const [hasOrientationSensor, setHasOrientationSensor] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [simulatedHeading, setSimulatedHeading] = useState(0);

  // Initialize camera stream
  useEffect(() => {
    let activeStream = null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Camera access not supported by your browser");
          return;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn("Camera permission denied or unavailable:", err);
        setCameraError("Camera access was denied or not available. Using simulated AR mode.");
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Listen to Device Compass Orientation
  useEffect(() => {
    const handleOrientation = (e) => {
      let heading = null;

      // iOS Safari provides webkitCompassHeading directly
      if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
        heading = e.webkitCompassHeading;
      } else if (e.alpha !== null && e.alpha !== undefined) {
        // Android / standard: alpha is 0 when pointing North (or roughly)
        heading = 360 - e.alpha;
      }

      if (heading !== null) {
        setHasOrientationSensor(true);
        setCompassHeading(Math.round(heading) % 360);
      }
    };

    // Request iOS orientation permission if required
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      DeviceOrientationEvent.requestPermission()
        .then((res) => {
          if (res === "granted") {
            window.addEventListener("deviceorientation", handleOrientation, true);
          }
        })
        .catch(() => {});
    } else {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  // Compute Next Waypoint in Route
  const nextWaypoint = React.useMemo(() => {
    if (!activeRoute || !activeRoute.pathNodes || activeRoute.pathNodes.length === 0) {
      return targetNode;
    }
    const nodes = activeRoute.pathNodes;
    if (!currentNode) return nodes[1] || nodes[0];
    const currentIndex = nodes.findIndex((n) => n.id === currentNode.id);
    if (currentIndex >= 0 && currentIndex < nodes.length - 1) {
      return nodes[currentIndex + 1];
    }
    return targetNode || nodes[nodes.length - 1];
  }, [activeRoute, currentNode, targetNode]);

  // Bearing from current node to next waypoint
  const targetBearing = React.useMemo(() => {
    if (!currentNode || !nextWaypoint) return 0;
    return calculateBearing(currentNode, nextWaypoint);
  }, [currentNode, nextWaypoint]);

  // Active heading used: sensor if available, else simulated slider
  const effectiveHeading = hasOrientationSensor ? compassHeading : simulatedHeading;

  // Relative angle to rotate the AR arrow (-180 to +180 deg)
  const relativeAngle = React.useMemo(() => {
    let diff = targetBearing - effectiveHeading;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
  }, [targetBearing, effectiveHeading]);

  // Approximate distance to next point
  const distanceToTarget = React.useMemo(() => {
    if (!currentNode || !nextWaypoint) return 20;
    const dx = nextWaypoint.x - currentNode.x;
    const dy = nextWaypoint.y - currentNode.y;
    return Math.max(5, Math.round(Math.sqrt(dx * dx + dy * dy) * 0.2));
  }, [currentNode, nextWaypoint]);

  return (
    <div
      className="ar-camera-overlay-root"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000000",
        color: "#ffffff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 1. Live Camera Stream Background */}
      {!cameraError ? (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.9,
          }}
        />
      ) : (
        /* Fallback Simulation Background */
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)",
            display: "grid",
            placeItems: "center",
          }}
        >
          {/* Virtual hallway perspective lines */}
          <svg style={{ width: "100%", height: "100%", position: "absolute", inset: 0, opacity: 0.25 }}>
            <line x1="0" y1="0" x2="50%" y2="50%" stroke="#38bdf8" strokeWidth="2" />
            <line x1="100%" y1="0" x2="50%" y2="50%" stroke="#38bdf8" strokeWidth="2" />
            <line x1="0" y1="100%" x2="50%" y2="50%" stroke="#38bdf8" strokeWidth="2" />
            <line x1="100%" y1="100%" x2="50%" y2="50%" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="50%" cy="50%" r="60" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
        </div>
      )}

      {/* 2. Top HUD Bar */}
      <div
        style={{
          position: "relative",
          zIndex: 20,
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 12px #10b981",
            }}
          />
          <div>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#38bdf8", letterSpacing: "0.08em" }}>
              AR WAYPOINT VISION
            </span>
            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800 }}>
              {targetNode ? targetNode.name : "Exploring Campus"}
            </h4>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            style={{
              padding: "8px 12px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              fontSize: "0.78rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <QrCode size={15} />
            <span>Check In</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(0, 0, 0, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 3. Center AR Floating Directional Arrow & Sonar HUD */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {/* Dynamic AR Waypoint Reticle */}
        <div
          style={{
            position: "relative",
            width: "240px",
            height: "240px",
            display: "grid",
            placeItems: "center",
          }}
        >
          {/* Outer Compass Dial */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "2px dashed rgba(56, 189, 248, 0.4)",
              transform: `rotate(${-effectiveHeading}deg)`,
              transition: "transform 150ms ease-out",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "4px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "0.7rem",
                fontWeight: 900,
                color: "#ef4444",
              }}
            >
              N
            </span>
          </div>

          {/* Target Waypoint Indicator Floating Ring */}
          <div
            style={{
              position: "absolute",
              inset: "20px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0) 70%)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
            }}
          />

          {/* THE 3D ROTATING DIRECTIONAL ARROW */}
          <div
            style={{
              transform: `rotate(${relativeAngle}deg)`,
              transition: "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Glowing Arrow Head */}
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "26px solid transparent",
                borderRight: "26px solid transparent",
                borderBottom: "60px solid #06b6d4",
                filter: "drop-shadow(0 0 16px rgba(6, 182, 212, 0.9))",
              }}
            />
            {/* Arrow Shaft */}
            <div
              style={{
                width: "12px",
                height: "40px",
                background: "linear-gradient(180deg, #06b6d4 0%, #3b82f6 100%)",
                borderRadius: "0 0 6px 6px",
              }}
            />
          </div>

          {/* Central Target Badge */}
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              background: "rgba(10, 16, 31, 0.85)",
              backdropFilter: "blur(10px)",
              padding: "4px 12px",
              borderRadius: "20px",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Sparkles size={12} color="#38bdf8" />
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#ffffff" }}>
              {distanceToTarget}m ahead
            </span>
          </div>
        </div>

        {/* Guidance Prompt */}
        <div
          style={{
            marginTop: "20px",
            background: "rgba(10, 15, 30, 0.8)",
            backdropFilter: "blur(12px)",
            padding: "10px 18px",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.15)",
            textAlign: "center",
            maxWidth: "320px",
          }}
        >
          <span style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            NEXT STEP
          </span>
          <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>
            {Math.abs(relativeAngle) < 25
              ? `Keep walking straight towards ${nextWaypoint ? nextWaypoint.name : "destination"}`
              : relativeAngle > 0
              ? `Turn right (${Math.round(relativeAngle)}°) towards ${nextWaypoint ? nextWaypoint.name : "corridor"}`
              : `Turn left (${Math.abs(Math.round(relativeAngle))}°) towards ${nextWaypoint ? nextWaypoint.name : "corridor"}`}
          </p>
        </div>
      </div>

      {/* 4. Bottom Controls: Manual Heading Slider (if device orientation sensor unavailable) */}
      {!hasOrientationSensor && (
        <div
          style={{
            position: "relative",
            zIndex: 20,
            padding: "10px 20px",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <RotateCw size={16} color="#38bdf8" />
          <span style={{ fontSize: "0.74rem", color: "#cbd5e1", whiteSpace: "nowrap" }}>
            Look Around (Heading):
          </span>
          <input
            type="range"
            min="0"
            max="360"
            value={simulatedHeading}
            onChange={(e) => setSimulatedHeading(Number(e.target.value))}
            style={{ flex: 1, accentColor: "#06b6d4", cursor: "pointer" }}
          />
          <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "#38bdf8", width: "36px" }}>
            {simulatedHeading}°
          </span>
        </div>
      )}

      {/* 5. Bottom Navigation Summary Card */}
      <div
        style={{
          position: "relative",
          zIndex: 20,
          padding: "16px 20px 24px 20px",
          background: "linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 100%)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
            Current Checkpoint: <strong style={{ color: "#ffffff" }}>{currentNode ? currentNode.name : "Starting point"}</strong>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#38bdf8" }}>
              {targetNode ? getFloorLabel(targetNode.floor) : ""}
            </span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>·</span>
            <span style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
              {targetNode ? targetNode.block : ""}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "10px 18px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            color: "#ffffff",
            border: "none",
            fontWeight: 800,
            fontSize: "0.82rem",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)",
          }}
        >
          View 2D Map
        </button>
      </div>

      {/* 6. Quick Checkpoint Scanner Modal */}
      {scannerOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.92)",
            backdropFilter: "blur(14px)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "360px",
              background: "#0f172a",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.15)",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <QrCode size={18} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>
                  Indoor Location Checkpoint
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0 0 16px 0", lineHeight: 1.4 }}>
              Select or tap a nearby room/pillar to snap your position indoors:
            </p>

            {/* Quick checkpoint picker list */}
            <div
              style={{
                maxHeight: "240px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                textAlign: "left",
              }}
            >
              {allNodes &&
                allNodes
                  .filter((n) => n.type !== "corridor")
                  .map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => {
                        if (onScanCheckpoint) onScanCheckpoint(node);
                        setScannerOpen(false);
                      }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "0.85rem", display: "block" }}>{node.name}</strong>
                        <span style={{ fontSize: "0.7rem", color: "#38bdf8" }}>
                          {node.block} · {getFloorLabel(node.floor)}
                        </span>
                      </div>
                      <CheckCircle2 size={16} color="#10b981" />
                    </button>
                  ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
