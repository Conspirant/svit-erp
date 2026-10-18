/**
 * SVIT Campus Navigation & Mapping Engine
 * OpenStreetMap Way: 1273840020 (Sai Vidya Institute of Technology, Rajanukunte, Bangalore)
 * Multi-floor graph pathfinding (A*), turn-by-turn instruction generator,
 * AR compass bearing calculation, interactive floor plans, and room layout studio.
 */

export const FLOORS = [
  { id: "outdoors", label: "Campus Grounds", short: "Outdoors", level: 0 },
  { id: "ground", label: "Ground Floor", short: "Floor 0", level: 0 },
  { id: "floor1", label: "1st Floor", short: "Floor 1", level: 1 },
  { id: "floor2", label: "2nd Floor", short: "Floor 2", level: 2 },
];

export const CATEGORIES = [
  { id: "all", label: "All Locations", color: "#38bdf8" },
  { id: "classroom", label: "Classrooms & Halls", color: "#3b82f6" },
  { id: "lab", label: "Labs & Workshops", color: "#06b6d4" },
  { id: "office", label: "Offices & Admin", color: "#a855f7" },
  { id: "amenity", label: "Library & Canteen", color: "#f59e0b" },
  { id: "stairs", label: "Stairs & Elevators", color: "#10b981" },
  { id: "gate", label: "Gates & Grounds", color: "#ec4899" },
];

// OpenStreetMap Way 1273840020 boundary polygon projected to 1000x1000 SVG coordinates
export const SVIT_BUILDING_OUTLINE = {
  osmWayId: "1273840020",
  centerLat: 13.167572,
  centerLon: 77.558415,
  // SVG points forming the authentic SVIT L-shaped building outline from OSM
  polygonPoints: "470,210 565,225 545,490 575,560 715,600 700,750 560,715 440,675",
  polygonPath: "M 470,210 L 565,225 L 545,490 L 575,560 L 715,600 L 700,750 L 560,715 L 440,675 Z",
  // Wing definitions for easy room zoning
  wings: [
    {
      id: "west_wing",
      name: "West Wing (Mechanical & Civil)",
      description: "North-South vertical academic block",
      path: "M 470,210 L 565,225 L 545,490 L 450,480 Z",
      color: "rgba(59, 130, 246, 0.15)",
      stroke: "#3b82f6",
    },
    {
      id: "central_hub",
      name: "Central Hub (Admin, Library & Foyer)",
      description: "Central bend connecting both academic wings",
      path: "M 450,480 L 545,490 L 575,560 L 560,715 L 440,675 Z",
      color: "rgba(168, 85, 247, 0.15)",
      stroke: "#a855f7",
    },
    {
      id: "east_wing",
      name: "East Wing (CSE, ISE & Tech Labs)",
      description: "Eastward wing towards SVIT Sports Ground",
      path: "M 575,560 L 715,600 L 700,750 L 560,715 Z",
      color: "rgba(6, 182, 212, 0.15)",
      stroke: "#06b6d4",
    },
  ],
};

// Default Pre-Configured SVIT Campus Rooms matching the L-Shape layout
export const DEFAULT_ROOMS = [
  // --- GROUND FLOOR ROOMS ---
  {
    id: "rm_mech_workshop",
    name: "Central Machine Shop & Workshop",
    code: "MCH-01",
    floor: "ground",
    wing: "west_wing",
    category: "lab",
    x: 462,
    y: 228,
    width: 90,
    height: 75,
    nodeId: "gf_workshop",
    description: "Lathes, shaping, milling bays and central smithy",
  },
  {
    id: "rm_cad_lab",
    name: "CAD/CAM & Simulation Center",
    code: "MCH-02",
    floor: "ground",
    wing: "west_wing",
    category: "lab",
    x: 458,
    y: 312,
    width: 90,
    height: 65,
    nodeId: "gf_cad_lab",
    description: "SolidWorks, ANSYS and 3D modeling computer suite",
  },
  {
    id: "rm_basic_sci",
    name: "Physics & Chemistry Research Labs",
    code: "SCI-01",
    floor: "ground",
    wing: "west_wing",
    category: "lab",
    x: 455,
    y: 388,
    width: 90,
    height: 65,
    nodeId: "gf_basic_sci",
    description: "Optics, mechanics and material science testing bays",
  },
  {
    id: "rm_west_stairs_g",
    name: "West Wing Staircase & Lift",
    code: "STR-W-G",
    floor: "ground",
    wing: "west_wing",
    category: "stairs",
    x: 452,
    y: 462,
    width: 88,
    height: 40,
    nodeId: "gf_mech_stairs",
    description: "Vertical access to 1st & 2nd floor lecture halls",
  },
  {
    id: "rm_admin_foyer",
    name: "Admin Block Reception & Inquiry",
    code: "ADM-01",
    floor: "ground",
    wing: "central_hub",
    category: "office",
    x: 450,
    y: 512,
    width: 100,
    height: 60,
    nodeId: "gf_admin_entry",
    description: "Main campus helpdesk, visitor register & entry foyer",
  },
  {
    id: "rm_principal_office",
    name: "Principal's Office & Senate Chamber",
    code: "ADM-02",
    floor: "ground",
    wing: "central_hub",
    category: "office",
    x: 445,
    y: 582,
    width: 100,
    height: 52,
    nodeId: "gf_principal_office",
    description: "Principal & Academic Dean chambers",
  },
  {
    id: "rm_accounts_exam",
    name: "Accounts & VTU Exam Section",
    code: "ADM-03",
    floor: "ground",
    wing: "central_hub",
    category: "office",
    x: 442,
    y: 642,
    width: 102,
    height: 50,
    nodeId: "gf_accounts_office",
    description: "Fee payments, scholarship counter & VTU exam portal",
  },
  {
    id: "rm_central_stairs_g",
    name: "Central Hub Grand Staircase",
    code: "STR-C-G",
    floor: "ground",
    wing: "central_hub",
    category: "stairs",
    x: 525,
    y: 540,
    width: 45,
    height: 45,
    nodeId: "gf_stairs_admin",
    description: "Main marble stairs to Central Library on 1st Floor",
  },
  {
    id: "rm_turing_lab",
    name: "Alan Turing Computer Lab (Lab 1)",
    code: "CSE-01",
    floor: "ground",
    wing: "east_wing",
    category: "lab",
    x: 580,
    y: 580,
    width: 110,
    height: 65,
    nodeId: "gf_cse_lab1",
    description: "60 High-end Ubuntu/Windows AI & Data Structures workstations",
  },
  {
    id: "rm_lovelace_lab",
    name: "Ada Lovelace Web & DB Lab (Lab 2)",
    code: "CSE-02",
    floor: "ground",
    wing: "east_wing",
    category: "lab",
    x: 575,
    y: 655,
    width: 105,
    height: 60,
    nodeId: "gf_cse_lab2",
    description: "Cloud computing, DBMS and full-stack software development",
  },
  {
    id: "rm_restrooms_g",
    name: "East Wing Restrooms & RO Water",
    code: "REST-G",
    floor: "ground",
    wing: "east_wing",
    category: "amenity",
    x: 686,
    y: 645,
    width: 32,
    height: 55,
    nodeId: "gf_washroom_east",
    description: "Men's/Women's facilities & purified drinking water",
  },

  // --- 1ST FLOOR ROOMS ---
  {
    id: "rm_lh101",
    name: "Lecture Hall LH-101 (3rd Sem CSE)",
    code: "LH-101",
    floor: "floor1",
    wing: "west_wing",
    category: "classroom",
    x: 462,
    y: 228,
    width: 90,
    height: 75,
    nodeId: "f1_room_101",
    description: "Smart tier-classroom with 4K laser projector & surround audio",
  },
  {
    id: "rm_lh102",
    name: "Lecture Hall LH-102 (5th Sem CSE)",
    code: "LH-102",
    floor: "floor1",
    wing: "west_wing",
    category: "classroom",
    x: 458,
    y: 312,
    width: 90,
    height: 65,
    nodeId: "f1_room_102",
    description: "Lecture room for Operating Systems, Algorithms & Microprocessors",
  },
  {
    id: "rm_faculty_lounge",
    name: "CSE Faculty Staff Lounge & Mentors",
    code: "FAC-101",
    floor: "floor1",
    wing: "west_wing",
    category: "office",
    x: 455,
    y: 388,
    width: 90,
    height: 65,
    nodeId: "f1_faculty_cse",
    description: "Faculty counseling cubicles & proctor meeting zone",
  },
  {
    id: "rm_west_stairs_1",
    name: "West Wing Staircase (Level 1)",
    code: "STR-W-1",
    floor: "floor1",
    wing: "west_wing",
    category: "stairs",
    x: 452,
    y: 462,
    width: 88,
    height: 40,
    nodeId: "f1_mech_stairs",
    description: "Stairs to ground workshops & 2nd floor classrooms",
  },
  {
    id: "rm_central_library",
    name: "Central Reference Library & Journals",
    code: "LIB-101",
    floor: "floor1",
    wing: "central_hub",
    category: "amenity",
    x: 448,
    y: 512,
    width: 105,
    height: 85,
    nodeId: "f1_central_library",
    description: "50,000+ technical volumes, quiet study hall & IEEE journal access",
  },
  {
    id: "rm_digital_library",
    name: "Digital Library & E-Learning Lab",
    code: "LIB-102",
    floor: "floor1",
    wing: "central_hub",
    category: "lab",
    x: 444,
    y: 605,
    width: 102,
    height: 60,
    nodeId: "f1_digital_library",
    description: "40 High-speed research terminals, NPTEL and VTU Consortium",
  },
  {
    id: "rm_central_stairs_1",
    name: "Central Hub Staircase (Level 1)",
    code: "STR-C-1",
    floor: "floor1",
    wing: "central_hub",
    category: "stairs",
    x: 525,
    y: 540,
    width: 45,
    height: 45,
    nodeId: "f1_stairs_admin",
    description: "Main stairs connecting Ground to 2nd Floor Placement Cell",
  },
  {
    id: "rm_hod_cse",
    name: "HOD Computer Science & Engineering",
    code: "HOD-CSE",
    floor: "floor1",
    wing: "east_wing",
    category: "office",
    x: 580,
    y: 580,
    width: 110,
    height: 65,
    nodeId: "f1_hod_cse",
    description: "HOD office, conference room & department records",
  },
  {
    id: "rm_lh103",
    name: "Smart Lecture Hall LH-103",
    code: "LH-103",
    floor: "floor1",
    wing: "east_wing",
    category: "classroom",
    x: 575,
    y: 655,
    width: 105,
    height: 60,
    nodeId: "f1_room_103",
    description: "Computer networks, software engineering lecture hall",
  },

  // --- 2ND FLOOR ROOMS ---
  {
    id: "rm_lh201",
    name: "Lecture Hall LH-201 (7th Sem CSE)",
    code: "LH-201",
    floor: "floor2",
    wing: "west_wing",
    category: "classroom",
    x: 462,
    y: 228,
    width: 90,
    height: 75,
    nodeId: "f2_room_201",
    description: "Final year lecture hall & capstone project review room",
  },
  {
    id: "rm_ai_ml_center",
    name: "Center for AI, ML & Robotics Lab",
    code: "AI-201",
    floor: "floor2",
    wing: "west_wing",
    category: "lab",
    x: 458,
    y: 312,
    width: 90,
    height: 75,
    nodeId: "f2_ai_lab",
    description: "NVIDIA GPU workstations for deep learning & computer vision",
  },
  {
    id: "rm_west_stairs_2",
    name: "West Wing Staircase (Level 2)",
    code: "STR-W-2",
    floor: "floor2",
    wing: "west_wing",
    category: "stairs",
    x: 452,
    y: 462,
    width: 88,
    height: 40,
    nodeId: "f2_cse_stairs",
    description: "Top landing of the West Wing Staircase",
  },
  {
    id: "rm_placement_cell",
    name: "Training & Placement Cell (T&P)",
    code: "TNP-01",
    floor: "floor2",
    wing: "central_hub",
    category: "office",
    x: 448,
    y: 520,
    width: 110,
    height: 80,
    nodeId: "f2_placement_cell",
    description: "Corporate recruitment drives, GD suites & interview cabins",
  },
  {
    id: "rm_seminar_hall",
    name: "SVIT Department Seminar Hall",
    code: "SEM-01",
    floor: "floor2",
    wing: "east_wing",
    category: "amenity",
    x: 580,
    y: 600,
    width: 115,
    height: 85,
    nodeId: "f2_seminar_hall",
    description: "200-seat tiered presentation hall with acoustic system",
  },
];

// Pre-configured SVIT Campus Graph Nodes & Edges (aligned with real L-shape)
export const DEFAULT_CAMPUS_DATA = {
  version: "2.0-osm",
  lastUpdated: new Date().toISOString(),
  rooms: DEFAULT_ROOMS,
  nodes: [
    // --- OUTDOORS ---
    { id: "gate_main", name: "SVIT Main Arch Gate", code: "GATE-1", floor: "outdoors", block: "Entrance", type: "gate", category: "gate", x: 260, y: 880, description: "Main Security entrance & drop-off zone", tags: ["entry", "exit", "security"] },
    { id: "out_p1", name: "Main Avenue Walkway", code: "JUNC-1", floor: "outdoors", block: "Walkway", type: "corridor", category: "gate", x: 340, y: 720, description: "Main tree-lined driveway walkway", tags: ["walkway"] },
    { id: "parking_bike", name: "Student Two-Wheeler Parking", code: "PRK-2W", floor: "outdoors", block: "Parking", type: "facility", category: "amenity", x: 180, y: 760, description: "Designated bike and scooter parking", tags: ["bike", "parking"] },
    { id: "parking_car", name: "Faculty & Staff Car Parking", code: "PRK-4W", floor: "outdoors", block: "Parking", type: "facility", category: "amenity", x: 220, y: 620, description: "Staff four-wheeler parking shed", tags: ["car", "staff"] },
    { id: "canteen_central", name: "Central Canteen & Cafeteria", code: "CAN-1", floor: "outdoors", block: "Canteen Block", type: "facility", category: "amenity", x: 280, y: 440, description: "Breakfast, snacks, fresh juices, and lunch meals", tags: ["food", "canteen", "cafe"] },
    { id: "sports_ground", name: "Cricket & Sports Ground", code: "SPT-1", floor: "outdoors", block: "Sports Ground", type: "facility", category: "amenity", x: 820, y: 280, description: "Full sports ground with cricket pitch & track", tags: ["cricket", "sports", "ground"] },
    { id: "out_quad", name: "Central Quadrangle Garden", code: "QUAD-1", floor: "outdoors", block: "Central", type: "corridor", category: "gate", x: 620, y: 450, description: "Open central campus garden & flagpole", tags: ["garden", "flag"] },

    // Porches into the building
    { id: "admin_porch", name: "Admin Foyer Porch Entrance", code: "ADM-P", floor: "outdoors", block: "Admin Block", type: "corridor", category: "gate", x: 420, y: 530, description: "Main entry steps into Admin Central Hub", tags: ["admin", "entry"] },
    { id: "cse_porch", name: "CSE East Wing Porch", code: "CSE-P", floor: "outdoors", block: "CSE Block", type: "corridor", category: "gate", x: 640, y: 740, description: "East academic block entrance porch", tags: ["cse", "entrance"] },
    { id: "mech_porch", name: "West Wing Mechanical Porch", code: "MCH-P", floor: "outdoors", block: "Mech Block", type: "corridor", category: "gate", x: 440, y: 240, description: "West engineering block entrance", tags: ["mech", "entrance"] },

    // --- GROUND FLOOR ---
    { id: "gf_workshop", name: "Machine Shop & Workshop", code: "MCH-01", floor: "ground", block: "West Wing", type: "lab", category: "lab", x: 505, y: 265, description: "Mechanical lathes & foundry bay", tags: ["workshop", "mech"] },
    { id: "gf_cad_lab", name: "CAD/CAM Simulation Center", code: "MCH-02", floor: "ground", block: "West Wing", type: "lab", category: "lab", x: 503, y: 345, description: "SolidWorks & ANSYS center", tags: ["cad", "design"] },
    { id: "gf_basic_sci", name: "Physics & Chemistry Labs", code: "SCI-01", floor: "ground", block: "West Wing", type: "lab", category: "lab", x: 500, y: 420, description: "Basic sciences laboratory", tags: ["physics", "lab"] },
    { id: "gf_mech_stairs", name: "West Wing Staircase (Ground)", code: "STR-W-G", floor: "ground", block: "West Wing", type: "stairs", category: "stairs", x: 495, y: 480, description: "Stairs to 1st Floor Classrooms", tags: ["stairs", "up"] },

    { id: "gf_admin_entry", name: "Admin Block Main Foyer", code: "ADM-01", floor: "ground", block: "Central Hub", type: "corridor", category: "office", x: 500, y: 540, description: "Grand reception foyer & inquiry desk", tags: ["reception", "inquiry"] },
    { id: "gf_principal_office", name: "Principal's Office & Senate", code: "ADM-02", floor: "ground", block: "Central Hub", type: "office", category: "office", x: 495, y: 605, description: "Principal & Secretary chambers", tags: ["principal", "director"] },
    { id: "gf_accounts_office", name: "Accounts & Fee Counter", code: "ADM-03", floor: "ground", block: "Central Hub", type: "office", category: "office", x: 493, y: 665, description: "Fee payments, bus passes & scholarships", tags: ["fee", "accounts"] },
    { id: "gf_stairs_admin", name: "Central Hub Main Staircase", code: "STR-C-G", floor: "ground", block: "Central Hub", type: "stairs", category: "stairs", x: 547, y: 562, description: "Stairs leading up to 1st Floor Central Library", tags: ["stairs", "library"] },

    { id: "gf_cse_lab1", name: "Alan Turing Computer Lab (Lab 1)", code: "CSE-01", floor: "ground", block: "East Wing", type: "lab", category: "lab", x: 635, y: 612, description: "60 High-end Ubuntu/Windows workstations", tags: ["lab", "coding", "linux"] },
    { id: "gf_cse_lab2", name: "Ada Lovelace Web Lab (Lab 2)", code: "CSE-02", floor: "ground", block: "East Wing", type: "lab", category: "lab", x: 627, y: 685, description: "Web Development & DBMS Lab", tags: ["lab", "dbms"] },
    { id: "gf_washroom_east", name: "East Wing Restrooms", code: "REST-G", floor: "ground", block: "East Wing", type: "facility", category: "amenity", x: 702, y: 672, description: "Restrooms + RO Water Dispenser", tags: ["washroom", "water"] },

    // --- 1ST FLOOR ---
    { id: "f1_room_101", name: "Lecture Hall LH-101 (3rd Sem)", code: "LH-101", floor: "floor1", block: "West Wing", type: "room", category: "classroom", x: 505, y: 265, description: "Smart classroom with projector", tags: ["classroom", "cse"] },
    { id: "f1_room_102", name: "Lecture Hall LH-102 (5th Sem)", code: "LH-102", floor: "floor1", block: "West Wing", type: "room", category: "classroom", x: 503, y: 345, description: "Lecture Hall for 5th Sem CSE", tags: ["classroom"] },
    { id: "f1_faculty_cse", name: "CSE Faculty Staff Lounge", code: "FAC-101", floor: "floor1", block: "West Wing", type: "office", category: "office", x: 500, y: 420, description: "Faculty cubicles and proctors", tags: ["faculty", "staff"] },
    { id: "f1_mech_stairs", name: "West Wing Staircase (Level 1)", code: "STR-W-1", floor: "floor1", block: "West Wing", type: "stairs", category: "stairs", x: 495, y: 480, description: "West Wing Stairs Level 1", tags: ["stairs"] },

    { id: "f1_central_library", name: "Central Reference Library", code: "LIB-101", floor: "floor1", block: "Central Hub", type: "room", category: "amenity", x: 500, y: 554, description: "50,000+ volumes, reading hall & IEEE access", tags: ["library", "books", "study"] },
    { id: "f1_digital_library", name: "Digital Library & E-Learning", code: "LIB-102", floor: "floor1", block: "Central Hub", type: "lab", category: "lab", x: 495, y: 635, description: "NPTEL & research terminals", tags: ["digital", "library"] },
    { id: "f1_stairs_admin", name: "Central Hub Staircase (Level 1)", code: "STR-C-1", floor: "floor1", block: "Central Hub", type: "stairs", category: "stairs", x: 547, y: 562, description: "Stairs connecting Ground, 1st, and 2nd Floor", tags: ["stairs"] },

    { id: "f1_hod_cse", name: "HOD Computer Science Chamber", code: "HOD-CSE", floor: "floor1", block: "East Wing", type: "office", category: "office", x: 635, y: 612, description: "Head of CSE Department & Senior Cabins", tags: ["hod", "cse"] },
    { id: "f1_room_103", name: "Smart Lecture Hall LH-103", code: "LH-103", floor: "floor1", block: "East Wing", type: "room", category: "classroom", x: 627, y: 685, description: "Smart classroom for networks & algorithms", tags: ["classroom"] },

    // --- 2ND FLOOR ---
    { id: "f2_room_201", name: "Lecture Hall LH-201 (7th Sem)", code: "LH-201", floor: "floor2", block: "West Wing", type: "room", category: "classroom", x: 505, y: 265, description: "Final year lecture hall & projects", tags: ["classroom", "7th sem"] },
    { id: "f2_ai_lab", name: "Center for AI, ML & Robotics", code: "AI-201", floor: "floor2", block: "West Wing", type: "lab", category: "lab", x: 503, y: 350, description: "NVIDIA GPU deep learning cluster", tags: ["ai", "ml", "gpu"] },
    { id: "f2_cse_stairs", name: "West Wing Staircase (Level 2)", code: "STR-W-2", floor: "floor2", block: "West Wing", type: "stairs", category: "stairs", x: 495, y: 480, description: "Top landing of West Wing Staircase", tags: ["stairs"] },

    { id: "f2_placement_cell", name: "Training & Placement Cell (T&P)", code: "TNP-01", floor: "floor2", block: "Central Hub", type: "office", category: "office", x: 500, y: 560, description: "Campus placement drives & interview cabins", tags: ["placement", "job", "career"] },
    { id: "f2_seminar_hall", name: "Department Seminar Hall", code: "SEM-01", floor: "floor2", block: "East Wing", type: "room", category: "amenity", x: 637, y: 642, description: "200-seat tiered presentation hall", tags: ["seminar", "presentation"] },
  ],

  edges: [
    // Outdoors
    { from: "gate_main", to: "out_p1", dist: 40, type: "walkway" },
    { from: "out_p1", to: "parking_bike", dist: 30, type: "walkway" },
    { from: "out_p1", to: "parking_car", dist: 35, type: "walkway" },
    { from: "out_p1", to: "canteen_central", dist: 50, type: "walkway" },
    { from: "out_p1", to: "admin_porch", dist: 40, type: "walkway" },
    { from: "admin_porch", to: "mech_porch", dist: 60, type: "walkway" },
    { from: "admin_porch", to: "cse_porch", dist: 55, type: "walkway" },
    { from: "cse_porch", to: "out_quad", dist: 45, type: "walkway" },
    { from: "out_quad", to: "sports_ground", dist: 65, type: "walkway" },

    // Porch Entries to Ground Floor
    { from: "admin_porch", to: "gf_admin_entry", dist: 15, type: "walkway" },
    { from: "mech_porch", to: "gf_workshop", dist: 15, type: "walkway" },
    { from: "cse_porch", to: "gf_cse_lab2", dist: 15, type: "walkway" },

    // Ground Floor West Wing Spine
    { from: "gf_workshop", to: "gf_cad_lab", dist: 20, type: "walkway" },
    { from: "gf_cad_lab", to: "gf_basic_sci", dist: 20, type: "walkway" },
    { from: "gf_basic_sci", to: "gf_mech_stairs", dist: 18, type: "walkway" },
    { from: "gf_mech_stairs", to: "gf_admin_entry", dist: 18, type: "walkway" },

    // Ground Floor Central Hub Spine
    { from: "gf_admin_entry", to: "gf_principal_office", dist: 18, type: "walkway" },
    { from: "gf_principal_office", to: "gf_accounts_office", dist: 18, type: "walkway" },
    { from: "gf_admin_entry", to: "gf_stairs_admin", dist: 15, type: "walkway" },

    // Ground Floor East Wing Spine
    { from: "gf_admin_entry", to: "gf_cse_lab1", dist: 25, type: "walkway" },
    { from: "gf_cse_lab1", to: "gf_cse_lab2", dist: 22, type: "walkway" },
    { from: "gf_cse_lab1", to: "gf_washroom_east", dist: 20, type: "walkway" },

    // Vertical Staircases
    { from: "gf_mech_stairs", to: "f1_mech_stairs", dist: 15, type: "stairs", vertical: true },
    { from: "f1_mech_stairs", to: "f2_cse_stairs", dist: 15, type: "stairs", vertical: true },
    { from: "gf_stairs_admin", to: "f1_stairs_admin", dist: 15, type: "stairs", vertical: true },

    // 1st Floor West Wing
    { from: "f1_room_101", to: "f1_room_102", dist: 20, type: "walkway" },
    { from: "f1_room_102", to: "f1_faculty_cse", dist: 20, type: "walkway" },
    { from: "f1_faculty_cse", to: "f1_mech_stairs", dist: 18, type: "walkway" },
    { from: "f1_mech_stairs", to: "f1_central_library", dist: 22, type: "walkway" },

    // 1st Floor Central & East
    { from: "f1_central_library", to: "f1_digital_library", dist: 20, type: "walkway" },
    { from: "f1_central_library", to: "f1_stairs_admin", dist: 15, type: "walkway" },
    { from: "f1_stairs_admin", to: "f1_hod_cse", dist: 22, type: "walkway" },
    { from: "f1_hod_cse", to: "f1_room_103", dist: 20, type: "walkway" },

    // 2nd Floor
    { from: "f2_room_201", to: "f2_ai_lab", dist: 22, type: "walkway" },
    { from: "f2_ai_lab", to: "f2_cse_stairs", dist: 25, type: "walkway" },
    { from: "f2_cse_stairs", to: "f2_placement_cell", dist: 25, type: "walkway" },
    { from: "f2_placement_cell", to: "f2_seminar_hall", dist: 30, type: "walkway" },
  ],
};

/**
 * A* / Dijkstra Shortest Path Algorithm
 */
export function findShortestPath(startId, targetId, nodes = DEFAULT_CAMPUS_DATA.nodes, edges = DEFAULT_CAMPUS_DATA.edges) {
  if (!startId || !targetId) return null;
  if (startId === targetId) {
    const node = nodes.find((n) => n.id === startId);
    return {
      pathNodeIds: [startId],
      pathNodes: node ? [node] : [],
      totalDistanceMeters: 0,
      floorTransitions: [],
      estimatedTimeSecs: 0,
    };
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const startNode = nodeMap.get(startId);
  const targetNode = nodeMap.get(targetId);

  if (!startNode || !targetNode) return null;

  const adj = new Map();
  nodes.forEach((n) => adj.set(n.id, []));

  edges.forEach((e) => {
    const fromList = adj.get(e.from) || [];
    fromList.push({ to: e.to, dist: e.dist, type: e.type, vertical: e.vertical });
    adj.set(e.from, fromList);

    const toList = adj.get(e.to) || [];
    toList.push({ to: e.from, dist: e.dist, type: e.type, vertical: e.vertical });
    adj.set(e.to, toList);
  });

  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set(nodes.map((n) => n.id));

  nodes.forEach((n) => distances.set(n.id, Infinity));
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

      const stairPenalty = edge.vertical ? 12 : 0;
      const alt = distances.get(currentId) + edge.dist + stairPenalty;

      if (alt < distances.get(edge.to)) {
        distances.set(edge.to, alt);
        previous.set(edge.to, currentId);
      }
    }
  }

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
    return null;
  }

  const pathNodes = pathIds.map((id) => nodeMap.get(id)).filter(Boolean);

  let totalDistanceMeters = 0;
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const a = pathNodes[i];
    const b = pathNodes[i + 1];
    const directEdge = edges.find(
      (e) => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id)
    );
    if (directEdge) {
      totalDistanceMeters += directEdge.dist;
    } else {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      totalDistanceMeters += Math.round(Math.sqrt(dx * dx + dy * dy) * 0.2);
    }
  }

  const floorTransitions = [];
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const fromFloor = pathNodes[i].floor;
    const toFloor = pathNodes[i + 1].floor;
    if (fromFloor !== toFloor) {
      floorTransitions.push({
        atNode: pathNodes[i],
        fromFloor,
        toFloor,
        isUp: getFloorLevel(toFloor) > getFloorLevel(fromFloor),
      });
    }
  }

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
  const f = FLOORS.find((x) => x.id === floorId);
  return f ? f.level : 0;
}

export function getFloorLabel(floorId) {
  const f = FLOORS.find((x) => x.id === floorId);
  return f ? f.label : floorId;
}

export function generateTurnDirections(pathNodes) {
  if (!pathNodes || pathNodes.length < 2) return [];

  const directions = [];
  directions.push({
    step: 1,
    title: `Start at ${pathNodes[0].name}`,
    instruction: `Facing the corridor, begin walking from ${pathNodes[0].block || "your starting point"}.`,
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
        instruction: `Use ${curr.name} to transition from ${getFloorLabel(prev.floor)} to ${getFloorLabel(curr.floor)}.`,
        floor: curr.floor,
        icon: isUp ? "stairs-up" : "stairs-down",
      });
    } else if (curr.type === "stairs" && next.floor !== curr.floor) {
      directions.push({
        step: stepNumber++,
        title: `Approach ${curr.name}`,
        instruction: `Head straight to ${curr.name}.`,
        floor: curr.floor,
        icon: "stairs",
      });
    } else if (curr.type === "corridor" || curr.type === "gate") {
      directions.push({
        step: stepNumber++,
        title: `Continue through ${curr.name}`,
        instruction: `Walk past ${curr.block || "the hallway"} towards ${next.name}.`,
        floor: curr.floor,
        icon: "straight",
      });
    } else {
      directions.push({
        step: stepNumber++,
        title: `Pass by ${curr.name}`,
        instruction: `Proceed along hallway past ${curr.name} (${curr.code || ""}).`,
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

export function calculateBearing(nodeA, nodeB) {
  if (!nodeA || !nodeB) return 0;
  const dx = nodeB.x - nodeA.x;
  const dy = -(nodeB.y - nodeA.y);
  let theta = Math.atan2(dx, dy);
  let deg = (theta * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return Math.round(deg);
}

export const STORAGE_KEY = "svit_custom_campus_data_v2";

export function loadCampusData() {
  if (typeof window === "undefined") return DEFAULT_CAMPUS_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CAMPUS_DATA;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return {
        ...DEFAULT_CAMPUS_DATA,
        ...parsed,
        rooms: Array.isArray(parsed.rooms) && parsed.rooms.length > 0 ? parsed.rooms : DEFAULT_ROOMS,
      };
    }
  } catch (err) {
    console.error("Failed to load custom campus data", err);
  }
  return DEFAULT_CAMPUS_DATA;
}

export function saveCampusData(data) {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...data,
        lastUpdated: new Date().toISOString(),
      })
    );
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

export function exportCampusDataJson(data) {
  return JSON.stringify(data, null, 2);
}

export function importCampusDataJson(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return {
        ...DEFAULT_CAMPUS_DATA,
        ...parsed,
        rooms: Array.isArray(parsed.rooms) ? parsed.rooms : DEFAULT_ROOMS,
      };
    }
  } catch (e) {
    console.error("Invalid campus JSON import", e);
  }
  return null;
}
