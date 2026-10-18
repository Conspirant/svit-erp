"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  IconCompass as Compass,
  IconZoomIn as ZoomIn,
  IconZoomOut as ZoomOut,
  IconMaximize as Maximize2,
  IconNavigation as Navigation,
  IconMapPin as MapPin,
  IconLayers as Layers,
  IconPlus as Plus,
  IconTrash as Trash2,
  IconLink as LinkIcon,
  IconQrCode as QrCode,
  IconCheck as Check,
  IconX as X,
  IconFootprints as Footprints,
  IconBookOpen as BookOpen,
  IconLaptop as Laptop,
  IconGraduationCap as GraduationCap,
  IconUtensils as Utensils,
  IconCoffee as Coffee,
  IconDownload as Download,
  IconUpload as Upload,
} from "@/components/navigation/NavIcons";
import {
  FLOORS,
  CATEGORIES,
  SVIT_BUILDING_OUTLINE,
  getFloorLabel,
  exportCampusDataJson,
  importCampusDataJson,
} from "@/lib/campus-navigation/engine";

export default function CampusMapCanvas({
  campusData,
  currentFloor,
  onChangeFloor,
  startNodeId,
  targetNodeId,
  activeRoute,
  onSelectNode,
  onUpdateCampusData,
  isEditorOpen,
  setIsEditorOpen,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Pan and Zoom transform state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Map Studio (Editor) State
  const [editTool, setEditTool] = useState("select"); // 'select' | 'add_room' | 'add_node' | 'connect' | 'delete'
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [connectStartNodeId, setConnectStartNodeId] = useState(null);

  // Forms and Modals
  const [newNodeForm, setNewNodeForm] = useState(null);
  const [newRoomForm, setNewRoomForm] = useState(null);
  const [editRoomForm, setEditRoomForm] = useState(null);
  const [qrModalNode, setQrModalNode] = useState(null);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");

  // Rooms on current floor
  const floorRooms = useMemo(() => {
    if (!campusData.rooms) return [];
    return campusData.rooms.filter((r) => r.floor === currentFloor);
  }, [campusData.rooms, currentFloor]);

  // Nodes & edges for current floor
  const floorNodes = useMemo(() => {
    return campusData.nodes.filter(
      (n) => n.floor === currentFloor || (currentFloor === "outdoors" && n.floor === "outdoors")
    );
  }, [campusData.nodes, currentFloor]);

  const floorNodeIds = useMemo(() => new Set(floorNodes.map((n) => n.id)), [floorNodes]);

  const floorEdges = useMemo(() => {
    return campusData.edges.filter((e) => {
      return floorNodeIds.has(e.from) && floorNodeIds.has(e.to);
    });
  }, [campusData.edges, floorNodeIds]);

  // Route segments on current floor
  const routePointsOnFloor = useMemo(() => {
    if (!activeRoute || !activeRoute.pathNodes) return [];
    return activeRoute.pathNodes.filter((n) => n.floor === currentFloor);
  }, [activeRoute, currentFloor]);

  // Build SVG path data for route if consecutive nodes are on current floor
  const routeSvgSegments = useMemo(() => {
    if (!activeRoute || !activeRoute.pathNodes || activeRoute.pathNodes.length < 2) return [];

    const segments = [];
    const pNodes = activeRoute.pathNodes;

    for (let i = 0; i < pNodes.length - 1; i++) {
      const a = pNodes[i];
      const b = pNodes[i + 1];
      if (a.floor === currentFloor && b.floor === currentFloor) {
        segments.push(`M ${a.x} ${a.y} L ${b.x} ${b.y}`);
      }
    }
    return segments;
  }, [activeRoute, currentFloor]);

  // Pan / Drag handlers
  const handlePointerDown = (e) => {
    if (e.target.closest(".canvas-interactive-item") && editTool !== "select") return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (factor) => {
    setTransform((prev) => {
      const nextScale = Math.min(3.5, Math.max(0.5, prev.scale * factor));
      return { ...prev, scale: nextScale };
    });
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // Auto-center when route changes or floor changes
  useEffect(() => {
    if (routePointsOnFloor.length > 0 && containerRef.current) {
      const avgX = routePointsOnFloor.reduce((acc, n) => acc + n.x, 0) / routePointsOnFloor.length;
      const avgY = routePointsOnFloor.reduce((acc, n) => acc + n.y, 0) / routePointsOnFloor.length;
      const { clientWidth, clientHeight } = containerRef.current;
      const targetX = clientWidth / 2 - avgX * transform.scale;
      const targetY = clientHeight / 2 - avgY * transform.scale;
      setTransform((prev) => ({ ...prev, x: targetX, y: targetY }));
    }
  }, [currentFloor, activeRoute]);

  // Canvas Click (for Studio Room & Node Placement)
  const handleSvgClick = (e) => {
    if (!isEditorOpen) return;
    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM().inverse();
    const svgPoint = pt.matrixTransform(ctm);

    const x = Math.round(svgPoint.x);
    const y = Math.round(svgPoint.y);

    if (editTool === "add_room") {
      setNewRoomForm({
        id: `rm_${Date.now()}`,
        name: "",
        code: `RM-${Math.floor(100 + Math.random() * 900)}`,
        floor: currentFloor,
        wing: x < 550 ? "west_wing" : "east_wing",
        category: "classroom",
        x: x - 40,
        y: y - 30,
        width: 85,
        height: 60,
        description: "",
      });
    } else if (editTool === "add_node") {
      setNewNodeForm({
        id: `node_${Date.now()}`,
        name: "",
        code: `PT-${Math.floor(10 + Math.random() * 90)}`,
        floor: currentFloor,
        block: currentFloor === "outdoors" ? "Campus Grounds" : "Academic Block",
        type: "corridor",
        category: "classroom",
        x,
        y,
        description: "",
        tags: [],
      });
    }
  };

  // Room Saving
  const handleSaveNewRoom = () => {
    if (!newRoomForm || !newRoomForm.name.trim()) return;

    // Create a companion waypoint node inside the room for pathfinding
    const waypointNodeId = `node_${newRoomForm.id}`;
    const companionNode = {
      id: waypointNodeId,
      name: newRoomForm.name,
      code: newRoomForm.code,
      floor: newRoomForm.floor,
      block: newRoomForm.wing === "west_wing" ? "West Wing" : newRoomForm.wing === "east_wing" ? "East Wing" : "Central Hub",
      type: "room",
      category: newRoomForm.category,
      x: Math.round(newRoomForm.x + newRoomForm.width / 2),
      y: Math.round(newRoomForm.y + newRoomForm.height / 2),
      description: newRoomForm.description || newRoomForm.name,
      tags: [newRoomForm.category, newRoomForm.code.toLowerCase()],
    };

    const roomWithNode = {
      ...newRoomForm,
      nodeId: waypointNodeId,
    };

    // Auto-link companion node to nearest corridor node on this floor
    const sameFloorNodes = campusData.nodes.filter((n) => n.floor === newRoomForm.floor);
    let nearestNode = null;
    let minD = Infinity;
    sameFloorNodes.forEach((n) => {
      const d = Math.hypot(n.x - companionNode.x, n.y - companionNode.y);
      if (d < minD) {
        minD = d;
        nearestNode = n;
      }
    });

    const updatedEdges = [...campusData.edges];
    if (nearestNode) {
      updatedEdges.push({
        from: companionNode.id,
        to: nearestNode.id,
        dist: Math.max(5, Math.round(minD * 0.2)),
        type: "walkway",
      });
    }

    const updated = {
      ...campusData,
      rooms: [...(campusData.rooms || []), roomWithNode],
      nodes: [...campusData.nodes, companionNode],
      edges: updatedEdges,
    };

    onUpdateCampusData(updated);
    setSelectedRoomId(roomWithNode.id);
    setNewRoomForm(null);
  };

  // Node Saving
  const handleSaveNewNode = () => {
    if (!newNodeForm || !newNodeForm.name.trim()) return;
    const updated = {
      ...campusData,
      nodes: [...campusData.nodes, newNodeForm],
    };
    onUpdateCampusData(updated);
    setSelectedNodeId(newNodeForm.id);
    setNewNodeForm(null);
  };

  // Handle Room Click
  const handleRoomClick = (room, e) => {
    e.stopPropagation();

    if (isEditorOpen) {
      if (editTool === "delete") {
        const updated = {
          ...campusData,
          rooms: (campusData.rooms || []).filter((r) => r.id !== room.id),
          nodes: campusData.nodes.filter((n) => n.id !== room.nodeId),
          edges: campusData.edges.filter((e) => e.from !== room.nodeId && e.to !== room.nodeId),
        };
        onUpdateCampusData(updated);
        setSelectedRoomId(null);
        return;
      }

      if (editTool === "select") {
        setEditRoomForm({ ...room });
        setSelectedRoomId(room.id);
        return;
      }
    }

    // Default student interaction: select the room and navigate to its waypoint node
    setSelectedRoomId(room.id);
    const targetNode = campusData.nodes.find((n) => n.id === room.nodeId);
    if (targetNode && onSelectNode) {
      onSelectNode(targetNode);
    } else if (onSelectNode) {
      // Fallback virtual node
      onSelectNode({
        id: room.id,
        name: room.name,
        code: room.code,
        floor: room.floor,
        block: room.wing,
        category: room.category,
        x: room.x + room.width / 2,
        y: room.y + room.height / 2,
        description: room.description,
      });
    }
  };

  // Handle Node Click
  const handleNodeClick = (node, e) => {
    e.stopPropagation();

    if (isEditorOpen) {
      if (editTool === "delete") {
        const updated = {
          ...campusData,
          nodes: campusData.nodes.filter((n) => n.id !== node.id),
          edges: campusData.edges.filter((e) => e.from !== node.id && e.to !== node.id),
        };
        onUpdateCampusData(updated);
        setSelectedNodeId(null);
        return;
      }

      if (editTool === "connect") {
        if (!connectStartNodeId) {
          setConnectStartNodeId(node.id);
        } else if (connectStartNodeId !== node.id) {
          const startN = campusData.nodes.find((n) => n.id === connectStartNodeId);
          const dx = startN.x - node.x;
          const dy = startN.y - node.y;
          const dist = Math.max(5, Math.round(Math.sqrt(dx * dx + dy * dy) * 0.2));

          const newEdge = {
            from: connectStartNodeId,
            to: node.id,
            dist,
            type: startN.type === "stairs" && node.type === "stairs" ? "stairs" : "walkway",
            vertical: startN.floor !== node.floor,
          };

          const updated = {
            ...campusData,
            edges: [...campusData.edges, newEdge],
          };
          onUpdateCampusData(updated);
          setConnectStartNodeId(null);
        }
        return;
      }
    }

    setSelectedNodeId(node.id);
    if (onSelectNode) onSelectNode(node);
  };

  // Category Colors
  const getCategoryColor = (category) => {
    switch (category) {
      case "classroom":
        return "#3b82f6";
      case "lab":
        return "#06b6d4";
      case "office":
        return "#a855f7";
      case "amenity":
        return "#f59e0b";
      case "stairs":
        return "#10b981";
      case "gate":
        return "#ec4899";
      default:
        return "#38bdf8";
    }
  };

  const selectedNodeObj = useMemo(() => {
    return campusData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [campusData.nodes, selectedNodeId]);

  return (
    <div
      ref={containerRef}
      className="campus-canvas-wrapper"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: "relative",
        width: "100%",
        height: "600px",
        background: "radial-gradient(ellipse at 50% 50%, #0d1527 0%, #060913 100%)",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* Background Grid Pattern */}
      <div
        className="canvas-bg-grid"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
        }}
      />

      {/* TOP FLOATING CONTROLS: Floor Switcher */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          right: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 30,
          pointerEvents: "none",
        }}
      >
        {/* Floor Pills */}
        <div
          style={{
            display: "flex",
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(12px)",
            padding: "4px",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            pointerEvents: "auto",
            gap: "2px",
          }}
        >
          {FLOORS.map((f) => {
            const isActive = currentFloor === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onChangeFloor(f.id)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: isActive
                    ? "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)"
                    : "transparent",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  fontSize: "0.78rem",
                  fontWeight: isActive ? 800 : 600,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  boxShadow: isActive ? "0 2px 10px rgba(6, 182, 212, 0.4)" : "none",
                }}
              >
                {f.short}
              </button>
            );
          })}
        </div>

        {/* OSM Real Campus Indicator & Editor Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", pointerEvents: "auto" }}>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: "10px",
              background: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#38bdf8",
              fontSize: "0.72rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            SVIT OSM Way 1273840020
          </div>

          {setIsEditorOpen && (
            <button
              type="button"
              onClick={() => setIsEditorOpen(!isEditorOpen)}
              style={{
                padding: "6px 12px",
                borderRadius: "10px",
                background: isEditorOpen
                  ? "#10b981"
                  : "rgba(15, 23, 42, 0.8)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Layers size={13} />
              {isEditorOpen ? "Studio Open" : "Map Studio"}
            </button>
          )}
        </div>
      </div>

      {/* MAP STUDIO TOOLBAR (When Editor is Active) */}
      {isEditorOpen && (
        <div
          style={{
            position: "absolute",
            top: 64,
            left: 14,
            zIndex: 35,
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(12px)",
            borderRadius: "12px",
            padding: "8px",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              onClick={() => setEditTool("select")}
              title="Select / Edit Room"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: editTool === "select" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <Compass size={14} />
            </button>
            <button
              type="button"
              onClick={() => setEditTool("add_room")}
              title="Draw / Add Room Box"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: editTool === "add_room" ? "#10b981" : "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditTool("connect");
                setConnectStartNodeId(null);
              }}
              title="Link Hallway Route"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: editTool === "connect" ? "#10b981" : "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <LinkIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditTool("delete");
                setConnectStartNodeId(null);
              }}
              title="Delete Room or Point"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: editTool === "delete" ? "#ef4444" : "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <Trash2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setJsonText(exportCampusDataJson(campusData));
                setIsJsonModalOpen(true);
              }}
              title="Export / Import Campus JSON"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(255,255,255,0.08)",
                color: "#cbd5e1",
                cursor: "pointer",
              }}
            >
              <Download size={14} />
            </button>
          </div>
          {editTool === "add_room" && (
            <span style={{ fontSize: "0.68rem", color: "#34d399", padding: "2px 4px" }}>
              Click anywhere inside the L-shape to place a new room!
            </span>
          )}
          {editTool === "connect" && (
            <span style={{ fontSize: "0.68rem", color: "#38bdf8", padding: "2px 4px" }}>
              {connectStartNodeId ? "Now click 2nd point to link" : "Click 1st point"}
            </span>
          )}
          {editTool === "delete" && (
            <span style={{ fontSize: "0.68rem", color: "#f87171", padding: "2px 4px" }}>
              Click any room or waypoint to delete it
            </span>
          )}
        </div>
      )}

      {/* FLOATING ZOOM & RE-CENTER (Bottom Right) */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          right: 14,
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={() => handleZoom(1.25)}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0.8)}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
          title="Recenter"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* SVG INTERACTIVE GRAPH CANVAS */}
      <svg
        ref={svgRef}
        viewBox="0 0 1000 1000"
        onClick={handleSvgClick}
        style={{
          width: "100%",
          height: "100%",
          cursor: isDragging ? "grabbing" : editTool === "add_room" ? "crosshair" : "grab",
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 120ms ease-out",
        }}
      >
        <defs>
          <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          <linearGradient id="svitWallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(30, 41, 59, 0.8)" />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.95)" />
          </linearGradient>

          <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* 1. OUTDOOR CAMPUS LANDMARKS */}
        <g className="outdoors-schematic">
          {/* Main Avenue / Driveway from Arch Gate */}
          <path
            d="M 260,880 Q 300,800 340,720 T 420,530"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="32"
            strokeLinecap="round"
          />
          <path
            d="M 260,880 Q 300,800 340,720 T 420,530"
            fill="none"
            stroke="rgba(56, 189, 248, 0.15)"
            strokeWidth="2"
            strokeDasharray="8 8"
          />

          {/* SVIT Cricket & Sports Ground (Top-East) */}
          <ellipse
            cx="820"
            cy="280"
            rx="120"
            ry="90"
            fill="rgba(34, 197, 94, 0.08)"
            stroke="rgba(34, 197, 94, 0.35)"
            strokeWidth="2"
          />
          <rect x="805" y="260" width="30" height="40" rx="3" fill="rgba(234, 179, 8, 0.2)" stroke="rgba(234, 179, 8, 0.4)" strokeWidth="1" />
          <text x="820" y="278" fill="#4ade80" fontSize="12" textAnchor="middle" fontWeight="800">
            SVIT GROUND
          </text>
          <text x="820" y="294" fill="#86efac" fontSize="9" textAnchor="middle">
            Cricket & Athletics Field
          </text>

          {/* Central Quadrangle Courtyard Garden */}
          <circle
            cx="620"
            cy="450"
            r="65"
            fill="rgba(16, 185, 129, 0.08)"
            stroke="rgba(16, 185, 129, 0.3)"
            strokeWidth="2"
          />
          <circle cx="620" cy="450" r="14" fill="rgba(16, 185, 129, 0.25)" />
          <text x="620" y="454" fill="#34d399" fontSize="10" textAnchor="middle" fontWeight="700">
            QUADRANGLE
          </text>

          {/* Canteen & Cafeteria */}
          <rect
            x="220"
            y="410"
            width="120"
            height="80"
            rx="14"
            fill="rgba(245, 158, 11, 0.08)"
            stroke="rgba(245, 158, 11, 0.35)"
            strokeWidth="2"
          />
          <text x="280" y="445" fill="#fbbf24" fontSize="11" textAnchor="middle" fontWeight="800">
            CAMPUS CANTEEN
          </text>
          <text x="280" y="460" fill="#fde68a" fontSize="9" textAnchor="middle">
            Cafeteria & Snacks
          </text>

          {/* Student Parking */}
          <rect
            x="140"
            y="730"
            width="100"
            height="70"
            rx="10"
            fill="rgba(148, 163, 184, 0.06)"
            stroke="rgba(148, 163, 184, 0.25)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />
          <text x="190" y="765" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="700">
            BIKE PARKING
          </text>

          {/* Staff Car Parking */}
          <rect
            x="180"
            y="590"
            width="90"
            height="70"
            rx="10"
            fill="rgba(148, 163, 184, 0.06)"
            stroke="rgba(148, 163, 184, 0.25)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />
          <text x="225" y="625" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="700">
            CAR PARKING
          </text>
        </g>

        {/* 2. THE AUTHENTIC SVIT L-SHAPED BUILDING FOOTPRINT (OSM Way 1273840020) */}
        <g className="svit-building-geometry">
          {/* Outer Building Shadow & Glow */}
          <path
            d={SVIT_BUILDING_OUTLINE.polygonPath}
            fill="url(#svitWallGrad)"
            stroke="rgba(56, 189, 248, 0.5)"
            strokeWidth="3.5"
            filter="drop-shadow(0 12px 24px rgba(0,0,0,0.6))"
          />
          {/* Hatch texture for architectural floor feel */}
          <path
            d={SVIT_BUILDING_OUTLINE.polygonPath}
            fill="url(#diagonalHatch)"
            pointerEvents="none"
          />

          {/* Wing Division Indicators (Subtle Dotted Lines) */}
          <line x1="450" y1="480" x2="545" y2="490" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="560" y1="715" x2="575" y2="560" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Architectural Spine Corridors */}
          {/* West Wing Spine */}
          <line x1="500" y1="230" x2="500" y2="480" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="20" strokeLinecap="round" />
          {/* Central Hub Connector */}
          <line x1="500" y1="480" x2="500" y2="670" stroke="rgba(168, 85, 247, 0.18)" strokeWidth="20" strokeLinecap="round" />
          {/* East Wing Spine */}
          <line x1="500" y1="670" x2="680" y2="650" stroke="rgba(6, 182, 212, 0.18)" strokeWidth="20" strokeLinecap="round" />

          {/* Wing Badges */}
          <g opacity="0.6">
            <text x="500" y="210" fill="#93c5fd" fontSize="9" textAnchor="middle" fontWeight="800" letterSpacing="0.05em">
              WEST WING (MECH/CIVIL)
            </text>
            <text x="440" y="695" fill="#d8b4fe" fontSize="9" textAnchor="middle" fontWeight="800" letterSpacing="0.05em">
              CENTRAL HUB (ADMIN)
            </text>
            <text x="650" y="735" fill="#67e8f9" fontSize="9" textAnchor="middle" fontWeight="800" letterSpacing="0.05em">
              EAST WING (CSE/ISE)
            </text>
          </g>
        </g>

        {/* 3. INTERACTIVE ROOM OUTLINES & BOXES FOR ACTIVE FLOOR */}
        {currentFloor !== "outdoors" && (
          <g className="canvas-rooms">
            {floorRooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              const isHovered = hoveredRoom?.id === room.id;
              const catColor = getCategoryColor(room.category);

              return (
                <g
                  key={room.id}
                  className="canvas-interactive-item canvas-interactive-room"
                  onClick={(e) => handleRoomClick(room, e)}
                  onMouseEnter={() => setHoveredRoom(room)}
                  onMouseLeave={() => setHoveredRoom(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Room Box Rectangle */}
                  <rect
                    x={room.x}
                    y={room.y}
                    width={room.width}
                    height={room.height}
                    rx="8"
                    fill={isSelected ? `${catColor}33` : isHovered ? `${catColor}24` : `${catColor}14`}
                    stroke={isSelected ? "#ffffff" : isHovered ? catColor : `${catColor}77`}
                    strokeWidth={isSelected ? "2.5" : isHovered ? "2" : "1.2"}
                    filter={isSelected ? "url(#routeGlow)" : "none"}
                    style={{
                      transition: "all 120ms ease",
                    }}
                  />

                  {/* Room Code Badge */}
                  <rect
                    x={room.x + 4}
                    y={room.y + 4}
                    width={Math.min(room.width - 8, 48)}
                    height="14"
                    rx="3"
                    fill={isSelected ? catColor : "rgba(15, 23, 42, 0.7)"}
                    stroke={catColor}
                    strokeWidth="0.8"
                  />
                  <text
                    x={room.x + 6}
                    y={room.y + 14}
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {room.code}
                  </text>

                  {/* Room Title */}
                  <text
                    x={room.x + room.width / 2}
                    y={room.y + room.height / 2 + 6}
                    fill={isSelected ? "#ffffff" : "#e2e8f0"}
                    fontSize={room.width > 90 ? "9" : "8"}
                    fontWeight={isSelected ? "800" : "600"}
                    textAnchor="middle"
                    style={{ pointerEvents: "none" }}
                  >
                    {room.name.length > 20 ? `${room.name.slice(0, 18)}...` : room.name}
                  </text>

                  {/* Door / Entrance Notch */}
                  <circle
                    cx={room.x + room.width / 2}
                    cy={room.y + room.height}
                    r="2.5"
                    fill={catColor}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* 4. WALKABLE GRAPH EDGES (HALLWAY CONNECTIONS) */}
        <g className="canvas-edges" opacity={isEditorOpen ? 0.8 : 0.3}>
          {floorEdges.map((e, idx) => {
            const nodeA = campusData.nodes.find((n) => n.id === e.from);
            const nodeB = campusData.nodes.find((n) => n.id === e.to);
            if (!nodeA || !nodeB) return null;

            return (
              <line
                key={`edge_${idx}`}
                x1={nodeA.x}
                y1={nodeA.y}
                x2={nodeB.x}
                y2={nodeB.y}
                stroke={e.type === "stairs" ? "#a855f7" : "rgba(255, 255, 255, 0.25)"}
                strokeWidth={e.type === "stairs" ? "2.5" : "1.5"}
                strokeDasharray={e.type === "stairs" ? "4 4" : "none"}
              />
            );
          })}
        </g>

        {/* 5. ACTIVE NAVIGATION ROUTE (GLOWING ANIMATED PATH) */}
        {routeSvgSegments.length > 0 && (
          <g className="canvas-active-route" filter="url(#routeGlow)">
            {routeSvgSegments.map((d, idx) => (
              <path
                key={`route_glow_${idx}`}
                d={d}
                fill="none"
                stroke="rgba(6, 182, 212, 0.4)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {routeSvgSegments.map((d, idx) => (
              <path
                key={`route_line_${idx}`}
                d={d}
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 6"
              />
            ))}
          </g>
        )}

        {/* 6. WAYPOINT NODES & PINS */}
        <g className="canvas-nodes">
          {floorNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isStart = startNodeId === node.id;
            const isTarget = targetNodeId === node.id;
            const isConnectCandidate = connectStartNodeId === node.id;

            let nodeColor = getCategoryColor(node.category);
            if (isStart) nodeColor = "#10b981";
            if (isTarget) nodeColor = "#ef4444";

            return (
              <g
                key={node.id}
                className="canvas-interactive-item canvas-interactive-node"
                transform={`translate(${node.x}, ${node.y})`}
                onClick={(e) => handleNodeClick(node, e)}
                style={{ cursor: "pointer" }}
              >
                {/* Pulsar ring for start/destination */}
                {(isStart || isTarget) && (
                  <circle
                    r="20"
                    fill="none"
                    stroke={nodeColor}
                    strokeWidth="2"
                    opacity="0.6"
                    className="animated-pulsar"
                  />
                )}

                <circle
                  r={isStart || isTarget ? 10 : isSelected ? 8 : 5}
                  fill={nodeColor}
                  stroke="#ffffff"
                  strokeWidth={isSelected || isStart || isTarget ? 2.5 : 1}
                />

                {/* Node Label on Outdoors or in Editor */}
                {(currentFloor === "outdoors" || isEditorOpen || isStart || isTarget) && (
                  <text
                    y={isStart || isTarget ? -14 : -10}
                    fill={isStart ? "#34d399" : isTarget ? "#f87171" : "#e2e8f0"}
                    fontSize="9.5"
                    fontWeight="800"
                    textAnchor="middle"
                    style={{
                      textShadow: "0 2px 6px rgba(0,0,0,0.9)",
                      pointerEvents: "none",
                    }}
                  >
                    {isStart ? "🟢 Start" : isTarget ? "📍 Target" : node.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* HOVER TOOLTIP FOR ROOMS */}
      {hoveredRoom && !isEditorOpen && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 14,
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(12px)",
            padding: "10px 14px",
            borderRadius: "12px",
            border: `1px solid ${getCategoryColor(hoveredRoom.category)}55`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            maxWidth: "280px",
            zIndex: 40,
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "0.68rem",
                padding: "2px 6px",
                borderRadius: "4px",
                background: getCategoryColor(hoveredRoom.category),
                color: "#fff",
                fontWeight: 800,
              }}
            >
              {hoveredRoom.code}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              {getFloorLabel(hoveredRoom.floor)}
            </span>
          </div>
          <h4 style={{ margin: "0 0 4px 0", color: "#fff", fontSize: "0.9rem", fontWeight: 800 }}>
            {hoveredRoom.name}
          </h4>
          {hoveredRoom.description && (
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.3 }}>
              {hoveredRoom.description}
            </p>
          )}
          <span style={{ display: "block", marginTop: "6px", fontSize: "0.7rem", color: "#38bdf8", fontWeight: 700 }}>
            Click to Navigate Here →
          </span>
        </div>
      )}

      {/* SELECTED NODE ACTION CARD */}
      {selectedNodeObj && !isEditorOpen && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 14,
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(16px)",
            padding: "14px 18px",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.7)",
            maxWidth: "320px",
            zIndex: 45,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
            <div>
              <span style={{ fontSize: "0.7rem", fontWeight: 800, color: getCategoryColor(selectedNodeObj.category) }}>
                {selectedNodeObj.code || "CAMPUS POINT"} · {getFloorLabel(selectedNodeObj.floor)}
              </span>
              <h4 style={{ margin: "2px 0 0 0", color: "#ffffff", fontSize: "1rem", fontWeight: 800 }}>
                {selectedNodeObj.name}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                padding: "2px",
              }}
            >
              <X size={15} />
            </button>
          </div>

          {selectedNodeObj.description && (
            <p style={{ margin: "6px 0 10px 0", fontSize: "0.76rem", color: "#cbd5e1", lineHeight: 1.4 }}>
              {selectedNodeObj.description}
            </p>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                if (onSelectNode) onSelectNode(selectedNodeObj, "start");
              }}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.18)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                color: "#10b981",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Set as Start
            </button>
            <button
              type="button"
              onClick={() => {
                if (onSelectNode) onSelectNode(selectedNodeObj, "destination");
              }}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                border: "none",
                color: "#ffffff",
                fontSize: "0.74rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.4)",
              }}
            >
              Navigate Here
            </button>
            <button
              type="button"
              onClick={() => setQrModalNode(selectedNodeObj)}
              title="Print QR Checkpoint for this Room"
              style={{
                padding: "7px 10px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                cursor: "pointer",
              }}
            >
              <QrCode size={15} />
            </button>
          </div>
        </div>
      )}

      {/* NEW ROOM CREATION MODAL (MAP STUDIO) */}
      {newRoomForm && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(15, 23, 42, 0.98)",
            backdropFilter: "blur(20px)",
            padding: "20px",
            borderRadius: "18px",
            border: "1px solid rgba(16, 185, 129, 0.5)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.85)",
            zIndex: 60,
            width: "340px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, color: "#fff", fontSize: "1rem", fontWeight: 800 }}>
              Draw SVIT Room Box
            </h3>
            <button
              type="button"
              onClick={() => setNewRoomForm(null)}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
              Room Title:
              <input
                type="text"
                value={newRoomForm.name}
                onChange={(e) => setNewRoomForm({ ...newRoomForm, name: e.target.value })}
                placeholder="e.g. AI Research Lab / LH-104"
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: "0.85rem",
                }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <label style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                Room Code:
                <input
                  type="text"
                  value={newRoomForm.code}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, code: e.target.value })}
                  style={{
                    width: "100%",
                    marginTop: "4px",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontSize: "0.82rem",
                  }}
                />
              </label>

              <label style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                Category:
                <select
                  value={newRoomForm.category}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, category: e.target.value })}
                  style={{
                    width: "100%",
                    marginTop: "4px",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontSize: "0.82rem",
                  }}
                >
                  <option value="classroom">Classroom</option>
                  <option value="lab">Lab / Workshop</option>
                  <option value="office">Office / Admin</option>
                  <option value="amenity">Amenity / Library</option>
                  <option value="stairs">Staircase / Lift</option>
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <label style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                Width (px):
                <input
                  type="number"
                  value={newRoomForm.width}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, width: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    marginTop: "4px",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontSize: "0.82rem",
                  }}
                />
              </label>

              <label style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                Height (px):
                <input
                  type="number"
                  value={newRoomForm.height}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, height: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    marginTop: "4px",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontSize: "0.82rem",
                  }}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={handleSaveNewRoom}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: "10px",
                  background: "#10b981",
                  border: "none",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Save Room
              </button>
              <button
                type="button"
                onClick={() => setNewRoomForm(null)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#cbd5e1",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ROOM MODAL */}
      {editRoomForm && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(15, 23, 42, 0.98)",
            backdropFilter: "blur(20px)",
            padding: "20px",
            borderRadius: "18px",
            border: "1px solid rgba(59, 130, 246, 0.5)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.85)",
            zIndex: 60,
            width: "340px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, color: "#fff", fontSize: "1rem", fontWeight: 800 }}>
              Edit Room Details
            </h3>
            <button
              type="button"
              onClick={() => setEditRoomForm(null)}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
              Room Title:
              <input
                type="text"
                value={editRoomForm.name}
                onChange={(e) => setEditRoomForm({ ...editRoomForm, name: e.target.value })}
                style={{
                  width: "100%",
                  marginTop: "4px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: "0.85rem",
                }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <label style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                Room Code:
                <input
                  type="text"
                  value={editRoomForm.code}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, code: e.target.value })}
                  style={{
                    width: "100%",
                    marginTop: "4px",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontSize: "0.82rem",
                  }}
                />
              </label>

              <label style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                Category:
                <select
                  value={editRoomForm.category}
                  onChange={(e) => setEditRoomForm({ ...editRoomForm, category: e.target.value })}
                  style={{
                    width: "100%",
                    marginTop: "4px",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontSize: "0.82rem",
                  }}
                >
                  <option value="classroom">Classroom</option>
                  <option value="lab">Lab / Workshop</option>
                  <option value="office">Office / Admin</option>
                  <option value="amenity">Amenity / Library</option>
                  <option value="stairs">Staircase / Lift</option>
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => {
                  const updatedRooms = (campusData.rooms || []).map((r) =>
                    r.id === editRoomForm.id ? editRoomForm : r
                  );
                  onUpdateCampusData({ ...campusData, rooms: updatedRooms });
                  setEditRoomForm(null);
                }}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: "10px",
                  background: "#3b82f6",
                  border: "none",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Update Room
              </button>
              <button
                type="button"
                onClick={() => {
                  const updatedRooms = (campusData.rooms || []).filter((r) => r.id !== editRoomForm.id);
                  onUpdateCampusData({ ...campusData, rooms: updatedRooms });
                  setEditRoomForm(null);
                }}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ef4444",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON EXPORT & IMPORT MODAL */}
      {isJsonModalOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            display: "grid",
            placeItems: "center",
            zIndex: 70,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#0f172a",
              color: "#fff",
              padding: "20px",
              borderRadius: "18px",
              border: "1px solid rgba(255,255,255,0.2)",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
                SVIT Campus Map JSON Config
              </h3>
              <button
                type="button"
                onClick={() => setIsJsonModalOpen(false)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ margin: "0 0 10px 0", fontSize: "0.78rem", color: "#94a3b8" }}>
              Copy this JSON to backup your custom rooms & paths, or paste custom GeoJSON/map data to import:
            </p>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={12}
              style={{
                width: "100%",
                background: "#060913",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "10px",
                color: "#34d399",
                fontFamily: "monospace",
                fontSize: "0.72rem",
                padding: "10px",
                resize: "vertical",
              }}
            />

            {jsonError && (
              <p style={{ color: "#ef4444", fontSize: "0.75rem", margin: "6px 0 0 0" }}>
                {jsonError}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(jsonText);
                  alert("Copied to clipboard!");
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Copy to Clipboard
              </button>
              <button
                type="button"
                onClick={() => {
                  const imported = importCampusDataJson(jsonText);
                  if (imported) {
                    onUpdateCampusData(imported);
                    setIsJsonModalOpen(false);
                    setJsonError("");
                  } else {
                    setJsonError("Invalid JSON structure! Must contain nodes and edges arrays.");
                  }
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "#10b981",
                  border: "none",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Apply & Save JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR CHECKPOINT PRINT MODAL */}
      {qrModalNode && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            display: "grid",
            placeItems: "center",
            zIndex: 70,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              color: "#0f172a",
              padding: "24px",
              borderRadius: "20px",
              textAlign: "center",
              maxWidth: "320px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#2563eb", letterSpacing: "0.08em" }}>
              SVIT INDOOR GPS CHECKPOINT
            </span>
            <h3 style={{ margin: "4px 0 2px 0", fontSize: "1.1rem", fontWeight: 900 }}>
              {qrModalNode.name}
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "0.8rem", color: "#64748b" }}>
              Code: {qrModalNode.code} · {getFloorLabel(qrModalNode.floor)}
            </p>

            <div
              style={{
                width: "180px",
                height: "180px",
                margin: "0 auto 16px auto",
                background: "#000",
                padding: "10px",
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              >
                <QrCode size={110} color="#000000" />
                <span style={{ fontSize: "0.62rem", fontFamily: "monospace", fontWeight: 900, marginTop: "4px" }}>
                  SVIT:{qrModalNode.id}
                </span>
              </div>
            </div>

            <p style={{ fontSize: "0.74rem", color: "#475569", margin: "0 0 14px 0" }}>
              Print and stick this QR badge outside the room or at the pillar. Students can scan it with their camera to instantly calibrate indoor navigation!
            </p>

            <button
              type="button"
              onClick={() => setQrModalNode(null)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                background: "#0f172a",
                color: "#ffffff",
                border: "none",
                fontWeight: 800,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
