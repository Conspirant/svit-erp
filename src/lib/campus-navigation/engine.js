/**
 * SVIT Campus Navigation & Mapping Engine
 * Multi-floor graph pathfinding (A*), turn-by-turn instruction generator,
 * AR compass bearing calculation, and interactive mapper state.
 */

export const FLOORS = [
  { id: "outdoors", label: "Campus Grounds", short: "Outdoors", level: 0 },
  { id: "ground", label: "Ground Floor", short: "Floor 0", level: 0 },
  { id: "floor1", label: "1st Floor", short: "Floor 1", level: 1 },
  { id: "floor2", label: "2nd Floor", short: "Floor 2", level: 2 },
];

export const CATEGORIES = [
  { id: "all", label: "All Locations" },
  { id: "classroom", label: "Classrooms" },
  { id: "lab", label: "Labs & Workshops" },
  { id: "office", label: "Offices & Admin" },
  { id: "amenity", label: "Food & Amenities" },
  { id: "stairs", label: "Stairs & Elevators" },
  { id: "gate", label: "Gates & Outdoors" },
];

// Pre-configured SVIT Campus Knowledge Graph
export const DEFAULT_CAMPUS_DATA = {
  version: "1.0",
  lastUpdated: new Date().toISOString(),
  nodes: [
    // --- OUTDOOR / CAMPUS GROUNDS ---
    { id: "gate_main", name: "SVIT Main Arch Gate", code: "GATE-1", floor: "outdoors", block: "Entrance", type: "gate", category: "gate", x: 500, y: 920, description: "Main Security entrance & drop-off zone", tags: ["entry", "exit", "security", "auto"] },
    { id: "out_p1", name: "Main Avenue Junction", code: "JUNC-1", floor: "outdoors", block: "Walkway", type: "corridor", category: "gate", x: 500, y: 780, description: "Main tree-lined driveway walkway", tags: ["walkway"] },
    { id: "parking_bike", name: "Student Two-Wheeler Parking", code: "PRK-2W", floor: "outdoors", block: "Parking", type: "facility", category: "amenity", x: 220, y: 880, description: "Designated bike and scooter parking", tags: ["bike", "scooter", "parking", "vehicle"] },
    { id: "parking_car", name: "Faculty & Staff Car Parking", code: "PRK-4W", floor: "outdoors", block: "Parking", type: "facility", category: "amenity", x: 780, y: 880, description: "Staff four-wheeler parking shed", tags: ["car", "staff", "parking"] },
    { id: "out_quad", name: "Central Quadrangle / Circle", code: "QUAD-1", floor: "outdoors", block: "Central", type: "corridor", category: "gate", x: 500, y: 550, description: "Open central campus garden & flagpole", tags: ["garden", "flag", "fountain", "circle"] },
    { id: "sports_ground", name: "Cricket & Sports Ground", code: "SPT-1", floor: "outdoors", block: "Sports", type: "facility", category: "amenity", x: 860, y: 380, description: "Full sports ground with cricket pitch & track", tags: ["cricket", "football", "sports", "ground", "gymkhana"] },
    { id: "canteen_central", name: "Central Canteen & Cafeteria", code: "CAN-1", floor: "outdoors", block: "Canteen Block", type: "facility", category: "amenity", x: 180, y: 420, description: "Breakfast, snacks, fresh juices, and lunch meals", tags: ["food", "canteen", "cafe", "coffee", "lunch", "snacks", "juice"] },
    { id: "auditorium_main", name: "Sir MV Memorial Auditorium", code: "AUD-1", floor: "outdoors", block: "Auditorium Block", type: "room", category: "amenity", x: 200, y: 640, description: "800-seat air-conditioned auditorium & cultural events", tags: ["seminar", "events", "audi", "fest", "cultural"] },
    
    // Links to Ground Floor Buildings
    { id: "admin_porch", name: "Admin Block Front Porch", code: "ADM-P", floor: "outdoors", block: "Admin Block", type: "corridor", category: "gate", x: 500, y: 440, description: "Main entrance staircase to Admin Building", tags: ["admin", "entry"] },
    { id: "cse_porch", name: "CSE/ISE Academic Block Porch", code: "CSE-P", floor: "outdoors", block: "CSE Block", type: "corridor", category: "gate", x: 720, y: 550, description: "East academic block entrance porch", tags: ["cse", "ise", "tech", "entrance"] },
    { id: "mech_porch", name: "Mechanical & Civil Block Porch", code: "MCH-P", floor: "outdoors", block: "Mech Block", type: "corridor", category: "gate", x: 280, y: 550, description: "West engineering block entrance", tags: ["mech", "civil", "workshop", "entrance"] },

    // --- GROUND FLOOR: ADMIN & CENTRAL BLOCK ---
    { id: "gf_admin_entry", name: "Admin Block Main Foyer", code: "ADM-001", floor: "ground", block: "Admin Block", type: "corridor", category: "office", x: 500, y: 700, description: "Grand reception foyer & inquiry desk", tags: ["reception", "inquiry", "help"] },
    { id: "gf_principal_office", name: "Principal's Office & Chamber", code: "ADM-002", floor: "ground", block: "Admin Block", type: "office", category: "office", x: 420, y: 620, description: "Principal & Secretary administrative chambers", tags: ["principal", "director", "head", "administration"] },
    { id: "gf_accounts_office", name: "Accounts & Fee Counter", code: "ADM-003", floor: "ground", block: "Admin Block", type: "office", category: "office", x: 580, y: 620, description: "Fee payments, receipts, bus passes, and scholarships", tags: ["fee", "accounts", "cashier", "bus", "scholarship", "finance"] },
    { id: "gf_exam_section", name: "VTU Examination Control Room", code: "ADM-004", floor: "ground", block: "Admin Block", type: "office", category: "office", x: 400, y: 500, description: "Exam applications, hall tickets & result marks verification", tags: ["exam", "vtu", "hall ticket", "marks", "coe"] },
    { id: "gf_board_room", name: "Senate & Board Room", code: "ADM-005", floor: "ground", block: "Admin Block", type: "room", category: "office", x: 600, y: 500, description: "Governing body and executive meeting hall", tags: ["meeting", "board", "conference"] },
    { id: "gf_stairs_admin", name: "Admin Central Staircase", code: "STR-ADM-G", floor: "ground", block: "Admin Block", type: "stairs", category: "stairs", x: 500, y: 480, description: "Stairs leading up to 1st Floor Central Library", tags: ["stairs", "up", "library"] },

    // --- GROUND FLOOR: CSE & ISE BLOCK ---
    { id: "gf_cse_foyer", name: "CSE Block Entrance Lobby", code: "CSE-001", floor: "ground", block: "CSE Block", type: "corridor", category: "classroom", x: 740, y: 700, description: "Notice boards and department display boards", tags: ["cse", "lobby"] },
    { id: "gf_cse_lab1", name: "Turing Computer Lab (Lab 1)", code: "CSE-002", floor: "ground", block: "CSE Block", type: "lab", category: "lab", x: 840, y: 680, description: "60 High-end Ubuntu/Windows AI & Data Structures workstations", tags: ["lab", "coding", "linux", "programming", "python", "java"] },
    { id: "gf_cse_lab2", name: "Ada Lovelace Lab (Lab 2)", code: "CSE-003", floor: "ground", block: "CSE Block", type: "lab", category: "lab", x: 840, y: 560, description: "Database Management & Web Development Lab", tags: ["lab", "dbms", "sql", "web"] },
    { id: "gf_cse_stairs", name: "CSE North Staircase", code: "STR-CSE-G", floor: "ground", block: "CSE Block", type: "stairs", category: "stairs", x: 740, y: 480, description: "Stairs to 1st Floor Classrooms & HOD CSE Office", tags: ["stairs", "cse", "up"] },
    { id: "gf_washroom_east", name: "Ground Floor Restrooms (East)", code: "REST-GE", floor: "ground", block: "CSE Block", type: "facility", category: "amenity", x: 870, y: 480, description: "Men's and Women's Restrooms + RO Water Dispenser", tags: ["washroom", "toilet", "water", "restroom"] },

    // --- GROUND FLOOR: MECH & WORKSHOP BLOCK ---
    { id: "gf_mech_foyer", name: "Mechanical Block Foyer", code: "MCH-001", floor: "ground", block: "Mech Block", type: "corridor", category: "classroom", x: 260, y: 700, description: "Mechanical department lobby & display models", tags: ["mech", "lobby"] },
    { id: "gf_workshop", name: "Central Machine Shop & Foundry", code: "MCH-002", floor: "ground", block: "Mech Block", type: "lab", category: "lab", x: 160, y: 680, description: "Lathes, milling machines, welding and fitting bays", tags: ["workshop", "welding", "lathe", "foundry", "smith"] },
    { id: "gf_cad_lab", name: "CAD/CAM Simulation Center", code: "MCH-003", floor: "ground", block: "Mech Block", type: "lab", category: "lab", x: 160, y: 560, description: "SolidWorks, ANSYS and AutoCAD design suite", tags: ["cad", "cam", "ansys", "solidworks", "design"] },
    { id: "gf_mech_stairs", name: "Mechanical West Staircase", code: "STR-MCH-G", floor: "ground", block: "Mech Block", type: "stairs", category: "stairs", x: 260, y: 480, description: "Stairs to 1st Floor Mechanical Lecture Halls", tags: ["stairs", "mech", "up"] },

    // --- FIRST FLOOR (LEVEL 1) ---
    // Admin Block 1st Floor
    { id: "f1_admin_corr", name: "1st Floor Central Gallery", code: "ADM-101", floor: "floor1", block: "Admin Block", type: "corridor", category: "office", x: 500, y: 520, description: "Central corridor overlooking campus quadrangle", tags: ["gallery", "corridor"] },
    { id: "f1_stairs_admin", name: "Admin Staircase (Level 1)", code: "STR-ADM-1", floor: "floor1", block: "Admin Block", type: "stairs", category: "stairs", x: 500, y: 480, description: "Connects Ground Floor and 2nd Floor Library Stack", tags: ["stairs", "admin"] },
    { id: "f1_central_library", name: "Central Reference Library & Journals", code: "LIB-101", floor: "floor1", block: "Admin Block", type: "room", category: "amenity", x: 420, y: 380, description: "Over 50,000 engineering volumes, IEEE digital access & quiet study", tags: ["library", "books", "ieee", "reading", "study", "journals"] },
    { id: "f1_digital_library", name: "Digital Library & E-Learning Lab", code: "LIB-102", floor: "floor1", block: "Admin Block", type: "lab", category: "lab", x: 580, y: 380, description: "NPTEL, VTU Consortium high-speed research terminals", tags: ["nptel", "digital", "internet", "research", "library"] },

    // CSE Block 1st Floor
    { id: "f1_cse_corr", name: "CSE 1st Floor Main Hallway", code: "CSE-101", floor: "floor1", block: "CSE Block", type: "corridor", category: "classroom", x: 740, y: 550, description: "Access hallway for 2nd & 3rd year CSE classrooms", tags: ["cse", "corridor"] },
    { id: "f1_cse_stairs", name: "CSE North Staircase (Level 1)", code: "STR-CSE-1", floor: "floor1", block: "CSE Block", type: "stairs", category: "stairs", x: 740, y: 480, description: "Connects Ground, 1st, and 2nd floor CSE labs", tags: ["stairs", "cse"] },
    { id: "f1_hod_cse", name: "HOD Computer Science Chamber", code: "CSE-HOD", floor: "floor1", block: "CSE Block", type: "office", category: "office", x: 840, y: 420, description: "Head of CSE Department & Senior Professor Cabins", tags: ["hod", "cse", "head", "faculty", "professor"] },
    { id: "f1_room_101", name: "Lecture Hall LH-101 (3rd Sem CSE)", code: "LH-101", floor: "floor1", block: "CSE Block", type: "room", category: "classroom", x: 840, y: 580, description: "Smart classroom with laser projector & audio system", tags: ["classroom", "lecture", "cse", "3rd sem", "class"] },
    { id: "f1_room_102", name: "Lecture Hall LH-102 (5th Sem CSE)", code: "LH-102", floor: "floor1", block: "CSE Block", type: "room", category: "classroom", x: 840, y: 700, description: "Smart classroom for 5th semester computer science", tags: ["classroom", "lecture", "cse", "5th sem", "class"] },
    { id: "f1_faculty_cse", name: "CSE Faculty Staff Lounge", code: "CSE-FAC", floor: "floor1", block: "CSE Block", type: "office", category: "office", x: 670, y: 620, description: "Faculty cubicles, mentors & student counselors", tags: ["faculty", "staff", "mentor", "teachers"] },

    // Mech Block 1st Floor
    { id: "f1_mech_corr", name: "Mech 1st Floor Hallway", code: "MCH-101", floor: "floor1", block: "Mech Block", type: "corridor", category: "classroom", x: 260, y: 550, description: "Hallway for Mechanical & Robotics classes", tags: ["mech", "corridor"] },
    { id: "f1_mech_stairs", name: "Mech West Staircase (Level 1)", code: "STR-MCH-1", floor: "floor1", block: "Mech Block", type: "stairs", category: "stairs", x: 260, y: 480, description: "Connects Ground and 2nd Floor Mechanical", tags: ["stairs", "mech"] },
    { id: "f1_hod_mech", name: "HOD Mechanical Engineering Chamber", code: "MCH-HOD", floor: "floor1", block: "Mech Block", type: "office", category: "office", x: 160, y: 420, description: "Head of Mechanical Department & Research Center", tags: ["hod", "mech", "head", "faculty"] },
    { id: "f1_room_103", name: "Lecture Hall LH-103 (Mech)", code: "LH-103", floor: "floor1", block: "Mech Block", type: "room", category: "classroom", x: 160, y: 580, description: "Acoustic classroom for Thermodynamics & Dynamics", tags: ["classroom", "lecture", "mech"] },

    // --- SECOND FLOOR (LEVEL 2) ---
    // CSE Block 2nd Floor
    { id: "f2_cse_corr", name: "CSE 2nd Floor High-Tech Wing", code: "CSE-201", floor: "floor2", block: "CSE Block", type: "corridor", category: "classroom", x: 740, y: 550, description: "Top floor dedicated to AI/ML & Cloud computing centers", tags: ["ai", "ml", "cloud", "corridor"] },
    { id: "f2_cse_stairs", name: "CSE North Staircase (Level 2)", code: "STR-CSE-2", floor: "floor2", block: "CSE Block", type: "stairs", category: "stairs", x: 740, y: 480, description: "Top landing of the CSE Staircase", tags: ["stairs", "cse"] },
    { id: "f2_ai_lab", name: "Center for AI, ML & Robotics Lab", code: "CSE-202", floor: "floor2", block: "CSE Block", type: "lab", category: "lab", x: 840, y: 420, description: "NVIDIA GPU clusters for deep learning research", tags: ["ai", "ml", "gpu", "nvidia", "robotics", "lab"] },
    { id: "f2_room_201", name: "Lecture Hall LH-201 (7th Sem CSE)", code: "LH-201", floor: "floor2", block: "CSE Block", type: "room", category: "classroom", x: 840, y: 580, description: "Final year lecture hall & capstone project room", tags: ["classroom", "final year", "7th sem", "projects"] },
    { id: "f2_seminar_hall", name: "CSE Department Seminar Hall", code: "CSE-SEM", floor: "floor2", block: "CSE Block", type: "room", category: "amenity", x: 840, y: 700, description: "180-seat tiered presentation & guest lecture hall", tags: ["seminar", "presentation", "conference", "guest"] },
    { id: "f2_placement_cell", name: "Training & Placement Cell (T&P)", code: "TNP-201", floor: "floor2", block: "Admin Block", type: "office", category: "office", x: 500, y: 350, description: "Campus placement drives, interview cabins & GD rooms", tags: ["placement", "job", "career", "interview", "training", "hr"] },
  ],

  // WALKABLE EDGES (Graph Connections)
  edges: [
    // Outdoors Paths
    { from: "gate_main", to: "out_p1", dist: 50, type: "walkway" },
    { from: "out_p1", to: "parking_bike", dist: 45, type: "walkway" },
    { from: "out_p1", to: "parking_car", dist: 45, type: "walkway" },
    { from: "out_p1", to: "auditorium_main", dist: 65, type: "walkway" },
    { from: "out_p1", to: "out_quad", dist: 70, type: "walkway" },
    { from: "out_quad", to: "canteen_central", dist: 55, type: "walkway" },
    { from: "out_quad", to: "sports_ground", dist: 85, type: "walkway" },
    { from: "out_quad", to: "admin_porch", dist: 35, type: "walkway" },
    { from: "out_quad", to: "cse_porch", dist: 45, type: "walkway" },
    { from: "out_quad", to: "mech_porch", dist: 45, type: "walkway" },

    // Ground Floor Connections (Building Entries from Porches)
    { from: "admin_porch", to: "gf_admin_entry", dist: 15, type: "walkway" },
    { from: "cse_porch", to: "gf_cse_foyer", dist: 15, type: "walkway" },
    { from: "mech_porch", to: "gf_mech_foyer", dist: 15, type: "walkway" },

    // Admin Ground Floor
    { from: "gf_admin_entry", to: "gf_principal_office", dist: 20, type: "walkway" },
    { from: "gf_admin_entry", to: "gf_accounts_office", dist: 20, type: "walkway" },
    { from: "gf_principal_office", to: "gf_exam_section", dist: 25, type: "walkway" },
    { from: "gf_accounts_office", to: "gf_board_room", dist: 25, type: "walkway" },
    { from: "gf_exam_section", to: "gf_stairs_admin", dist: 20, type: "walkway" },
    { from: "gf_board_room", to: "gf_stairs_admin", dist: 20, type: "walkway" },

    // CSE Ground Floor
    { from: "gf_cse_foyer", to: "gf_cse_lab1", dist: 25, type: "walkway" },
    { from: "gf_cse_lab1", to: "gf_cse_lab2", dist: 25, type: "walkway" },
    { from: "gf_cse_foyer", to: "gf_cse_stairs", dist: 30, type: "walkway" },
    { from: "gf_cse_lab2", to: "gf_washroom_east", dist: 20, type: "walkway" },
    { from: "gf_cse_stairs", to: "gf_washroom_east", dist: 20, type: "walkway" },

    // Mech Ground Floor
    { from: "gf_mech_foyer", to: "gf_workshop", dist: 25, type: "walkway" },
    { from: "gf_workshop", to: "gf_cad_lab", dist: 25, type: "walkway" },
    { from: "gf_mech_foyer", to: "gf_mech_stairs", dist: 30, type: "walkway" },
    { from: "gf_cad_lab", to: "gf_mech_stairs", dist: 20, type: "walkway" },

    // *** VERTICAL STAIRCASE BRIDGES (MULTI-FLOOR TRANSITIONS) ***
    // Admin Staircase: Ground <-> Floor 1
    { from: "gf_stairs_admin", to: "f1_stairs_admin", dist: 15, type: "stairs", vertical: true },
    
    // CSE Staircase: Ground <-> Floor 1 <-> Floor 2
    { from: "gf_cse_stairs", to: "f1_cse_stairs", dist: 15, type: "stairs", vertical: true },
    { from: "f1_cse_stairs", to: "f2_cse_stairs", dist: 15, type: "stairs", vertical: true },

    // Mech Staircase: Ground <-> Floor 1
    { from: "gf_mech_stairs", to: "f1_mech_stairs", dist: 15, type: "stairs", vertical: true },

    // Floor 1 Admin
    { from: "f1_stairs_admin", to: "f1_admin_corr", dist: 10, type: "walkway" },
    { from: "f1_admin_corr", to: "f1_central_library", dist: 25, type: "walkway" },
    { from: "f1_admin_corr", to: "f1_digital_library", dist: 25, type: "walkway" },

    // Floor 1 CSE
    { from: "f1_cse_stairs", to: "f1_cse_corr", dist: 15, type: "walkway" },
    { from: "f1_cse_corr", to: "f1_hod_cse", dist: 20, type: "walkway" },
    { from: "f1_cse_corr", to: "f1_room_101", dist: 20, type: "walkway" },
    { from: "f1_room_101", to: "f1_room_102", dist: 25, type: "walkway" },
    { from: "f1_cse_corr", to: "f1_faculty_cse", dist: 20, type: "walkway" },

    // Floor 1 Mech
    { from: "f1_mech_stairs", to: "f1_mech_corr", dist: 15, type: "walkway" },
    { from: "f1_mech_corr", to: "f1_hod_mech", dist: 20, type: "walkway" },
    { from: "f1_mech_corr", to: "f1_room_103", dist: 20, type: "walkway" },

    // Floor 2 CSE & Placement
    { from: "f2_cse_stairs", to: "f2_cse_corr", dist: 15, type: "walkway" },
    { from: "f2_cse_corr", to: "f2_ai_lab", dist: 20, type: "walkway" },
    { from: "f2_cse_corr", to: "f2_room_201", dist: 20, type: "walkway" },
    { from: "f2_room_201", to: "f2_seminar_hall", dist: 25, type: "walkway" },
    { from: "f2_cse_corr", to: "f2_placement_cell", dist: 45, type: "walkway" },
  ]
};

/**
 * A* / Dijkstra Shortest Path Algorithm
 * Returns the sequence of node objects, total distance (in meters),
 * and floor change notifications.
 */
export function findShortestPath(startId, targetId, nodes = DEFAULT_CAMPUS_DATA.nodes, edges = DEFAULT_CAMPUS_DATA.edges) {
  if (!startId || !targetId) return null;
  if (startId === targetId) {
    const node = nodes.find(n => n.id === startId);
    return {
      pathNodeIds: [startId],
      pathNodes: node ? [node] : [],
      totalDistanceMeters: 0,
      floorTransitions: [],
      estimatedTimeSecs: 0,
    };
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const startNode = nodeMap.get(startId);
  const targetNode = nodeMap.get(targetId);

  if (!startNode || !targetNode) return null;

  // Build Adjacency List
  const adj = new Map();
  nodes.forEach(n => adj.set(n.id, []));

  edges.forEach(e => {
    const fromList = adj.get(e.from) || [];
    fromList.push({ to: e.to, dist: e.dist, type: e.type, vertical: e.vertical });
    adj.set(e.from, fromList);

    // Default to bidirectional unless specified
    const toList = adj.get(e.to) || [];
    toList.push({ to: e.from, dist: e.dist, type: e.type, vertical: e.vertical });
    adj.set(e.to, toList);
  });

  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set(nodes.map(n => n.id));

  nodes.forEach(n => distances.set(n.id, Infinity));
  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let currentId = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      const d = distances.get(nodeId);
      if (d < minDistance) {
        minDistance = d;
        currentId = nodeId;
      }
    }

    if (currentId === null || minDistance === Infinity) break;
    if (currentId === targetId) break;

    unvisited.delete(currentId);

    const neighbors = adj.get(currentId) || [];
    for (const edge of neighbors) {
      if (!unvisited.has(edge.to)) continue;

      // Add a slight penalty for vertical stairs to prefer staying on same floor if possible
      const stairPenalty = edge.vertical ? 12 : 0;
      const alt = distances.get(currentId) + edge.dist + stairPenalty;

      if (alt < distances.get(edge.to)) {
        distances.set(edge.to, alt);
        previous.set(edge.to, currentId);
      }
    }
  }

  // Reconstruct path
  const pathIds = [];
  let curr = targetId;
  const visitedGuard = new Set();

  while (curr !== undefined) {
    if (visitedGuard.has(curr)) break;
    visitedGuard.add(curr);
    pathIds.unshift(curr);
    curr = previous.get(curr);
    if (curr === startId) {
      pathIds.unshift(startId);
      break;
    }
  }

  if (pathIds.length === 0 || pathIds[0] !== startId) {
    return null; // No route found
  }

  const pathNodes = pathIds.map(id => nodeMap.get(id)).filter(Boolean);
  
  // Calculate true physical distance
  let totalDistanceMeters = 0;
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const a = pathNodes[i];
    const b = pathNodes[i + 1];
    const directEdge = edges.find(
      e => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id)
    );
    if (directEdge) {
      totalDistanceMeters += directEdge.dist;
    } else {
      // Euclidean fallback scaled
      const dx = (a.x - b.x);
      const dy = (a.y - b.y);
      totalDistanceMeters += Math.round(Math.sqrt(dx * dx + dy * dy) * 0.2);
    }
  }

  // Detect floor transitions
  const floorTransitions = [];
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const fromFloor = pathNodes[i].floor;
    const toFloor = pathNodes[i + 1].floor;
    if (fromFloor !== toFloor) {
      floorTransitions.push({
        atNode: pathNodes[i],
        fromFloor,
        toFloor,
        isUp: getFloorLevel(toFloor) > getFloorLevel(fromFloor)
      });
    }
  }

  // Average walking speed ~ 1.25 m/s (~75 meters/minute)
  const estimatedTimeSecs = Math.max(30, Math.round(totalDistanceMeters / 1.25));

  return {
    pathNodeIds: pathIds,
    pathNodes,
    totalDistanceMeters: Math.round(totalDistanceMeters),
    floorTransitions,
    estimatedTimeSecs,
  };
}

export function getFloorLevel(floorId) {
  const f = FLOORS.find(x => x.id === floorId);
  return f ? f.level : 0;
}

export function getFloorLabel(floorId) {
  const f = FLOORS.find(x => x.id === floorId);
  return f ? f.label : floorId;
}

/**
 * Generate human-readable step-by-step turn directions
 */
export function generateTurnDirections(pathNodes) {
  if (!pathNodes || pathNodes.length < 2) return [];

  const directions = [];
  directions.push({
    step: 1,
    title: `Start at ${pathNodes[0].name}`,
    instruction: `Facing the corridor, begin walking from ${pathNodes[0].block || "your current point"}.`,
    floor: pathNodes[0].floor,
    icon: "start",
  });

  let stepNumber = 2;
  for (let i = 1; i < pathNodes.length - 1; i++) {
    const prev = pathNodes[i - 1];
    const curr = pathNodes[i];
    const next = pathNodes[i + 1];

    if (prev.floor !== curr.floor) {
      const isUp = getFloorLevel(curr.floor) > getFloorLevel(prev.floor);
      directions.push({
        step: stepNumber++,
        title: `${isUp ? "Go Up" : "Go Down"} to ${getFloorLabel(curr.floor)}`,
        instruction: `Use ${curr.name} to change levels from ${getFloorLabel(prev.floor)} to ${getFloorLabel(curr.floor)}.`,
        floor: curr.floor,
        icon: isUp ? "stairs-up" : "stairs-down",
      });
    } else if (curr.type === "stairs" && next.floor !== curr.floor) {
      // about to take stairs
      directions.push({
        step: stepNumber++,
        title: `Approach ${curr.name}`,
        instruction: `Head straight into ${curr.name}.`,
        floor: curr.floor,
        icon: "stairs",
      });
    } else if (curr.type === "corridor" || curr.type === "gate") {
      directions.push({
        step: stepNumber++,
        title: `Continue through ${curr.name}`,
        instruction: `Walk past ${curr.block || "the corridor"} towards ${next.name}.`,
        floor: curr.floor,
        icon: "straight",
      });
    } else {
      directions.push({
        step: stepNumber++,
        title: `Pass by ${curr.name}`,
        instruction: `Proceed along the hallway past ${curr.name} (${curr.code}).`,
        floor: curr.floor,
        icon: "waypoint",
      });
    }
  }

  const destination = pathNodes[pathNodes.length - 1];
  directions.push({
    step: stepNumber,
    title: `Arrive at ${destination.name}`,
    instruction: `Destination reached! Located at ${destination.block} (${getFloorLabel(destination.floor)}).`,
    floor: destination.floor,
    icon: "finish",
  });

  return directions;
}

/**
 * Calculate Angle / Compass Bearing from Node A to Node B (0 - 360 degrees)
 */
export function calculateBearing(nodeA, nodeB) {
  if (!nodeA || !nodeB) return 0;
  const dx = nodeB.x - nodeA.x;
  // Canvas Y is inverted (0 is top, 1000 is bottom)
  const dy = -(nodeB.y - nodeA.y);
  let theta = Math.atan2(dx, dy); // radians from North
  let deg = (theta * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return Math.round(deg);
}

/**
 * Storage Helpers
 */
export const STORAGE_KEY = "svit_custom_campus_data";

export function loadCampusData() {
  if (typeof window === "undefined") return DEFAULT_CAMPUS_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CAMPUS_DATA;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return parsed;
    }
  } catch (err) {
    console.error("Failed to load custom campus data", err);
  }
  return DEFAULT_CAMPUS_DATA;
}

export function saveCampusData(data) {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...data,
      lastUpdated: new Date().toISOString()
    }));
    return true;
  } catch (err) {
    console.error("Failed to save custom campus data", err);
    return false;
  }
}

export function resetCampusData() {
  if (typeof window === "undefined") return DEFAULT_CAMPUS_DATA;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return DEFAULT_CAMPUS_DATA;
}
