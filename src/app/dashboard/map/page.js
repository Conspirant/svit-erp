"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { 
  Search, MapPin, Cpu, FlaskConical, BookOpen, Briefcase, 
  Info, X, Layers, Compass, HelpCircle, Phone, ArrowRight,
  Sparkles, Check, School
} from "lucide-react";

// Local static database of SVIT campus buildings, floors, and rooms
const ROOM_DATABASE = [
  // ══════════════════════════════════════
  // BUILDING 1: MAIN BLOCK (ADMIN & CORE DEPTS)
  // ══════════════════════════════════════
  // Ground Floor (GF)
  {
    id: "main-gf-reception",
    number: "GF-01",
    name: "Reception & Lobby",
    type: "reception",
    building: "main",
    floor: "GF",
    gridArea: "1 / 1 / 2 / 3",
    facilities: ["Information Desk", "Visitor Seating", "CCTV Monitor"],
    faculty: "Mrs. Shobha K. (Receptionist)",
    description: "The main entrance lobby and front desk of the institute, welcoming all visitors, students, and staff."
  },
  {
    id: "main-gf-admin",
    number: "GF-02",
    name: "Administrative Office",
    type: "office",
    building: "main",
    floor: "GF",
    gridArea: "1 / 3 / 2 / 5",
    facilities: ["Student Section", "Accounts Section", "Scholarship Desk", "Main Server Room"],
    faculty: "Mr. Ramesh Kumar (Registrar)",
    description: "The administrative powerhouse of SVIT, handling admissions, fee submissions, academic records, and scholarships."
  },
  {
    id: "main-gf-corridor1",
    name: "Central Hallway",
    type: "corridor",
    building: "main",
    floor: "GF",
    gridArea: "2 / 1 / 2 / 5"
  },
  {
    id: "main-gf-principal",
    number: "GF-03",
    name: "Principal's Cabin",
    type: "office",
    building: "main",
    floor: "GF",
    gridArea: "3 / 1 / 4 / 2",
    facilities: ["Video Conference Setup", "AC", "Board Room Access"],
    faculty: "Dr. B. R. Lakshmikantha (Principal)",
    description: "The executive office of the SVIT Principal. Meetings and academic delegations are hosted here."
  },
  {
    id: "main-gf-boardroom",
    number: "GF-04",
    name: "Executive Board Room",
    type: "office",
    building: "main",
    floor: "GF",
    gridArea: "3 / 2 / 4 / 3",
    facilities: ["Smart Board", "AC", "18-Seater Conference Table"],
    faculty: "Governing Council Secretariat",
    description: "Used for high-level meetings, academic audits, and strategic governing council discussions."
  },
  {
    id: "main-gf-seminar1",
    number: "GF-SH1",
    name: "Dr. M.C. Modi Seminar Hall",
    type: "seminar",
    building: "main",
    floor: "GF",
    gridArea: "3 / 3 / 4 / 5",
    facilities: ["250 Seating Capacity", "PA System", "Dual Projectors", "AC"],
    faculty: "Prof. Vinod Kumar (Seminar Coordinator)",
    description: "The primary seminar hall for department seminars, guest lectures, technical workshops, and cultural debates."
  },
  {
    id: "main-gf-corridor2",
    name: "South Hallway",
    type: "corridor",
    building: "main",
    floor: "GF",
    gridArea: "4 / 1 / 4 / 5"
  },
  {
    id: "main-gf-placement",
    number: "GF-05",
    name: "Placement & Training Cell",
    type: "office",
    building: "main",
    floor: "GF",
    gridArea: "5 / 1 / 6 / 2",
    facilities: ["Interview Cabins", "GD Rooms", "Counseling Desk"],
    faculty: "Mr. Santosh S. (Placement Officer)",
    description: "Hub for corporate relations, soft skills coaching, aptitude training, and coordination of campus drives."
  },
  {
    id: "main-gf-library",
    number: "GF-LIB",
    name: "Central Library",
    type: "library",
    building: "main",
    floor: "GF",
    gridArea: "5 / 2 / 6 / 5",
    facilities: ["40,000+ Volumes", "Reading Room (150 capacity)", "Digital Library Center", "OPAC Terminal"],
    faculty: "Dr. Ravichandra Y. (Librarian)",
    description: "Spacious library cataloging academic resources, reference books, IEEE journals, and providing PC access for digital research."
  },

  // First Floor (1F) - Computer Science Dept
  {
    id: "main-1f-hod",
    number: "LH-101",
    name: "CSE HOD Office",
    type: "office",
    building: "main",
    floor: "1F",
    gridArea: "1 / 1 / 2 / 2",
    facilities: ["HOD Cabin", "Department Records Desk"],
    faculty: "Dr. H.S. Shwetha (HOD, CSE)",
    description: "Head office for the Department of Computer Science & Engineering, handling curriculum operations and student queries."
  },
  {
    id: "main-1f-staff",
    number: "LH-102",
    name: "CSE Staff Room",
    type: "office",
    building: "main",
    floor: "1F",
    gridArea: "1 / 2 / 2 / 3",
    facilities: ["Faculty Cubicles", "Academic Counselling Desk"],
    faculty: "CSE Department Faculty",
    description: "Cabin block for Computer Science teaching staff. Students can meet their teachers here for academic mentoring."
  },
  {
    id: "main-1f-lab1",
    number: "LH-103",
    name: "Turing Lab (CSE Lab 1)",
    type: "lab",
    building: "main",
    floor: "1F",
    gridArea: "1 / 3 / 2 / 5",
    facilities: ["40 high-end Intel i7 PCs", "AC", "1 Gbps LAN", "Projector"],
    faculty: "Prof. Manjunatha S. (Lab in-charge)",
    description: "Dedicated to Web Development, Compiler Design, Data Structures, and Java Object Oriented Programming labs."
  },
  {
    id: "main-1f-corridor1",
    name: "Central Hallway 1F",
    type: "corridor",
    building: "main",
    floor: "1F",
    gridArea: "2 / 1 / 2 / 5"
  },
  {
    id: "main-1f-c101",
    number: "LH-104",
    name: "Classroom 104 (3rd Sem CSE)",
    type: "classroom",
    building: "main",
    floor: "1F",
    gridArea: "3 / 1 / 4 / 3",
    facilities: ["Smart Projector", "70 Bench Capacity", "Acoustic Panels"],
    faculty: "Prof. Geetha Rani (Class Teacher)",
    description: "Lecture room equipped for CSE second year lectures. Features interactive whiteboards."
  },
  {
    id: "main-1f-c102",
    number: "LH-105",
    name: "Classroom 105 (5th Sem CSE)",
    type: "classroom",
    building: "main",
    floor: "1F",
    gridArea: "3 / 3 / 4 / 5",
    facilities: ["Smart Projector", "70 Bench Capacity"],
    faculty: "Dr. Prabhakar M. (Class Teacher)",
    description: "Lecture room equipped for CSE third year. Holds standard VTU syllabus core classes."
  },
  {
    id: "main-1f-corridor2",
    name: "South Hallway 1F",
    type: "corridor",
    building: "main",
    floor: "1F",
    gridArea: "4 / 1 / 4 / 5"
  },
  {
    id: "main-1f-lab2",
    number: "LH-106",
    name: "Ada Lab (CSE Lab 2)",
    type: "lab",
    building: "main",
    floor: "1F",
    gridArea: "5 / 1 / 6 / 3",
    facilities: ["35 Core i5 PCs", "UPS Backup", "Linux OS", "Projector"],
    faculty: "Prof. Roopa G. (Lab in-charge)",
    description: "Specialized lab room for Design & Analysis of Algorithms, Database Management Systems (DBMS), and UNIX System Programming."
  },
  {
    id: "main-1f-lab3",
    number: "LH-107",
    name: "IoT & Embedded Hardware Lab",
    type: "lab",
    building: "main",
    floor: "1F",
    gridArea: "5 / 3 / 6 / 5",
    facilities: ["Arduino/Raspberry Pi Kits", "Digital Oscilloscopes", "AC", "Soldering Station"],
    faculty: "Prof. Shivakumar (Lab in-charge)",
    description: "Lab for microcontrollers, IoT prototype development, robotic assemblies, and embedded logic design experiments."
  },

  // Second Floor (2F) - Information Science Dept
  {
    id: "main-2f-hod",
    number: "LH-201",
    name: "ISE HOD Office",
    type: "office",
    building: "main",
    floor: "2F",
    gridArea: "1 / 1 / 2 / 2",
    facilities: ["HOD Cabin", "Department Archive Room"],
    faculty: "Dr. Vrinda S. (HOD, ISE)",
    description: "Head department office for Information Science & Engineering. Students queries regarding semesters are coordinated here."
  },
  {
    id: "main-2f-staff",
    number: "LH-202",
    name: "ISE Staff Room",
    type: "office",
    building: "main",
    floor: "2F",
    gridArea: "1 / 2 / 2 / 3",
    facilities: ["Faculty Cubicles", "Counselling Area"],
    faculty: "ISE Department Faculty",
    description: "Dedicated workspace for ISE teaching faculty, mentors, and placement coordinators."
  },
  {
    id: "main-2f-lab1",
    number: "LH-203",
    name: "Computer Networks & OS Lab",
    type: "lab",
    building: "main",
    floor: "2F",
    gridArea: "1 / 3 / 2 / 5",
    facilities: ["40 high-spec LAN nodes", "AC", "Dual Servers", "Packet Tracer"],
    faculty: "Prof. Prema Latha (Lab in-charge)",
    description: "Configured for CISCO Packet Tracer simulation, socket programming, Operating Systems kernel tests, and computer routing labs."
  },
  {
    id: "main-2f-corridor1",
    name: "Central Hallway 2F",
    type: "corridor",
    building: "main",
    floor: "2F",
    gridArea: "2 / 1 / 2 / 5"
  },
  {
    id: "main-2f-c201",
    number: "LH-204",
    name: "Classroom 204 (3rd Sem ISE)",
    type: "classroom",
    building: "main",
    floor: "2F",
    gridArea: "3 / 1 / 4 / 3",
    facilities: ["Projector Screen", "65 Seating benches"],
    faculty: "Prof. Sridhar Murthy (Class Teacher)",
    description: "Lecture room for ISE second year class. Well ventilated with digital audio assistance."
  },
  {
    id: "main-2f-c202",
    number: "LH-205",
    name: "Classroom 205 (5th Sem ISE)",
    type: "classroom",
    building: "main",
    floor: "2F",
    gridArea: "3 / 3 / 4 / 5",
    facilities: ["Projector Screen", "65 Seating benches"],
    faculty: "Prof. Kavitha (Class Teacher)",
    description: "Lecture room for ISE third year students, hosting standard theoretical lectures."
  },
  {
    id: "main-2f-corridor2",
    name: "South Hallway 2F",
    type: "corridor",
    building: "main",
    floor: "2F",
    gridArea: "4 / 1 / 4 / 5"
  },
  {
    id: "main-2f-c203",
    number: "LH-206",
    name: "Classroom 206 (7th Sem ISE)",
    type: "classroom",
    building: "main",
    floor: "2F",
    gridArea: "5 / 1 / 6 / 3",
    facilities: ["Projector Screen", "60 Seating benches"],
    faculty: "Prof. Harsha Vardhan (Class Teacher)",
    description: "Classroom for final year ISE classes and elective presentations."
  },
  {
    id: "main-2f-seminar2",
    number: "LH-SH2",
    name: "Srinivasa Ramanujan Seminar Hall",
    type: "seminar",
    building: "main",
    floor: "2F",
    gridArea: "5 / 3 / 6 / 5",
    facilities: ["150 Seating Capacity", "AC", "Surround Sound", "HD Projector"],
    faculty: "Prof. Aruna Kumar (Seminar In-charge)",
    description: "A mid-sized, premium acoustics seminar hall used for technical paper presentations, project expos, and group seminars."
  },

  // Third Floor (3F) - AIML & Data Science Depts
  {
    id: "main-3f-hod",
    number: "LH-301",
    name: "AI & DS HOD Office",
    type: "office",
    building: "main",
    floor: "3F",
    gridArea: "1 / 1 / 2 / 2",
    facilities: ["HOD Cabin", "Department Library"],
    faculty: "Dr. Chandrakanth (HOD, AIML/DS)",
    description: "Combined administrative office for artificial intelligence and data science streams."
  },
  {
    id: "main-3f-staff",
    number: "LH-302",
    name: "AIML & DS Staff Room",
    type: "office",
    building: "main",
    floor: "3F",
    gridArea: "1 / 2 / 2 / 3",
    facilities: ["Faculty cubicles", "Research Workstations"],
    faculty: "AIML/DS Core Staff",
    description: "Cabin block for professors specializing in machine learning, neural networks, Big Data, and database administration."
  },
  {
    id: "main-3f-lab1",
    number: "LH-303",
    name: "Machine Learning & Python Lab",
    type: "lab",
    building: "main",
    floor: "3F",
    gridArea: "1 / 3 / 2 / 5",
    facilities: ["45 NVIDIA GPU enabled PCs", "AC", "10 Gbps backbone LAN", "Jupyter Notebooks"],
    faculty: "Prof. Sunitha K. (Lab in-charge)",
    description: "High-end compute lab room for deep learning, artificial intelligence model training, Python coding, and AI application workshops."
  },
  {
    id: "main-3f-corridor1",
    name: "Central Hallway 3F",
    type: "corridor",
    building: "main",
    floor: "3F",
    gridArea: "2 / 1 / 2 / 5"
  },
  {
    id: "main-3f-c301",
    number: "LH-304",
    name: "Classroom 304 (3rd Sem AIML)",
    type: "classroom",
    building: "main",
    floor: "3F",
    gridArea: "3 / 1 / 4 / 3",
    facilities: ["Smart Board", "60 Seating benches"],
    faculty: "Prof. Anand (Class Teacher)",
    description: "Equipped with interactive audio-visual projectors for machine learning lectures."
  },
  {
    id: "main-3f-c302",
    number: "LH-305",
    name: "Classroom 305 (5th Sem AIML)",
    type: "classroom",
    building: "main",
    floor: "3F",
    gridArea: "3 / 3 / 4 / 5",
    facilities: ["Smart Board", "60 Seating benches"],
    faculty: "Prof. Rekha (Class Teacher)",
    description: "Lecture room for AI & ML 5th semester, hosting advanced database and logic design theory classes."
  },
  {
    id: "main-3f-corridor2",
    name: "South Hallway 3F",
    type: "corridor",
    building: "main",
    floor: "3F",
    gridArea: "4 / 1 / 4 / 5"
  },
  {
    id: "main-3f-c303",
    number: "LH-306",
    name: "Classroom 306 (3rd Sem DS)",
    type: "classroom",
    building: "main",
    floor: "3F",
    gridArea: "5 / 1 / 6 / 3",
    facilities: ["HD Projector Screen", "60 Seating benches"],
    faculty: "Prof. Vinayak (Class Teacher)",
    description: "Classroom for Data Science students, hosting statistics and mathematics lectures."
  },
  {
    id: "main-3f-lab2",
    number: "LH-307",
    name: "Big Data & DBMS Lab",
    type: "lab",
    building: "main",
    floor: "3F",
    gridArea: "5 / 3 / 6 / 5",
    facilities: ["40 high-memory PCs", "AC", "Apache Hadoop cluster setup", "Oracle/MySQL DBs"],
    faculty: "Prof. Shashi Kumar (Lab in-charge)",
    description: "Used for Data Science database management, big data storage, MapReduce runs, and data mining project work."
  },

  // ══════════════════════════════════════
  // BUILDING 2: ECE & BASIC SCIENCE BLOCK
  // ══════════════════════════════════════
  // Ground Floor (GF)
  {
    id: "ece-gf-physics",
    number: "BS-01",
    name: "Engineering Physics Lab",
    type: "lab",
    building: "ece",
    floor: "GF",
    gridArea: "1 / 1 / 2 / 3",
    facilities: ["Darkroom for optics", "Spectrometers", "Laser setups", "Newton's rings kit"],
    faculty: "Dr. R. Madhusudhan (Lab Head)",
    description: "First year Physics laboratory designed with specialized tables and light control for laser and wave experiments."
  },
  {
    id: "ece-gf-chemistry",
    number: "BS-02",
    name: "Engineering Chemistry Lab",
    type: "lab",
    building: "ece",
    floor: "GF",
    gridArea: "1 / 3 / 2 / 5",
    facilities: ["Fume hoods", "Electronic balances", "Conductometers", "Titration setups"],
    faculty: "Dr. Ashwatha (Lab Head)",
    description: "Chemistry lab equipped with standard safety equipment, chemical racks, and electronic measurement devices for chemistry batches."
  },
  {
    id: "ece-gf-corridor1",
    name: "ECE Block Corridor GF",
    type: "corridor",
    building: "ece",
    floor: "GF",
    gridArea: "2 / 1 / 2 / 5"
  },
  {
    id: "ece-gf-workshop",
    number: "BS-WS1",
    name: "Basic Workshop & Fitting Shop",
    type: "lab",
    building: "ece",
    floor: "GF",
    gridArea: "3 / 1 / 5 / 3",
    facilities: ["Bench vices", "Wood lathes", "Fitting tools", "Carpentry equipment"],
    faculty: "Prof. N. Srinivas (Workshop Superintendent)",
    description: "First year basic engineering workshop. Students learn wooden model carving, metal fitting, and sheet metal layouts."
  },
  {
    id: "ece-gf-foundry",
    number: "BS-WS2",
    name: "Foundry & Forging Section",
    type: "lab",
    building: "ece",
    floor: "GF",
    gridArea: "3 / 3 / 5 / 5",
    facilities: ["Moulding sand pits", "Forging furnaces", "Anvils", "Casting flasks"],
    faculty: "Mr. Gangadhar (Instructor)",
    description: "High-temperature forge zone where students perform manual casting, metal heating, and shaping operations."
  },
  {
    id: "ece-gf-corridor2",
    name: "Workshop Corridor",
    type: "corridor",
    building: "ece",
    floor: "GF",
    gridArea: "5 / 1 / 5 / 5"
  },
  {
    id: "ece-gf-c001",
    number: "BS-LH01",
    name: "Classroom 001 (1st Year Sec A)",
    type: "classroom",
    building: "ece",
    floor: "GF",
    gridArea: "6 / 1 / 7 / 3",
    facilities: ["Projector", "75 seating capacity"],
    faculty: "Prof. Latha M. (Section Coordinator)",
    description: "Lecture room for first-semester physics cycle sections."
  },
  {
    id: "ece-gf-c002",
    number: "BS-LH02",
    name: "Classroom 002 (1st Year Sec B)",
    type: "classroom",
    building: "ece",
    floor: "GF",
    gridArea: "6 / 3 / 7 / 5",
    facilities: ["Projector", "75 seating capacity"],
    faculty: "Prof. Venkatesh (Section Coordinator)",
    description: "Lecture room for first-semester chemistry cycle sections."
  },

  // First Floor (1F) - Electronics & Comm
  {
    id: "ece-1f-hod",
    number: "EC-101",
    name: "ECE HOD Office",
    type: "office",
    building: "ece",
    floor: "1F",
    gridArea: "1 / 1 / 2 / 2",
    facilities: ["HOD Cabin", "Department Library"],
    faculty: "Dr. Y.S. Narayana (HOD, ECE)",
    description: "Head office for Electronics & Communication Engineering branch management."
  },
  {
    id: "ece-1f-staff",
    number: "EC-102",
    name: "ECE Staff Room",
    type: "office",
    building: "ece",
    floor: "1F",
    gridArea: "1 / 2 / 2 / 3",
    facilities: ["Faculty cubicles", "Counselling corner"],
    faculty: "ECE Department Faculty",
    description: "Cabin space for ECE department academic advisors and professors."
  },
  {
    id: "ece-1f-lab1",
    number: "EC-103",
    name: "Analog & Digital Electronics Lab",
    type: "lab",
    building: "ece",
    floor: "1F",
    gridArea: "1 / 3 / 2 / 5",
    facilities: ["CRO / DSO units", "Function Generators", "Power Supplies", "Breadboard IC kits"],
    faculty: "Prof. Nanda Kishor (Lab in-charge)",
    description: "Designed for hardware circuits layout experiments, logic gate wiring, and operational amplifier test benches."
  },
  {
    id: "ece-1f-corridor1",
    name: "ECE Corridor 1F",
    type: "corridor",
    building: "ece",
    floor: "1F",
    gridArea: "2 / 1 / 2 / 5"
  },
  {
    id: "ece-1f-c111",
    number: "EC-104",
    name: "Classroom 111 (3rd Sem ECE)",
    type: "classroom",
    building: "ece",
    floor: "1F",
    gridArea: "3 / 1 / 4 / 3",
    facilities: ["Projector Screen", "70 benches"],
    faculty: "Prof. Savitha (Class Teacher)",
    description: "Lecture room for ECE second year classes."
  },
  {
    id: "ece-1f-c112",
    number: "EC-105",
    name: "Classroom 112 (5th Sem ECE)",
    type: "classroom",
    building: "ece",
    floor: "1F",
    gridArea: "3 / 3 / 4 / 5",
    facilities: ["Projector Screen", "70 benches"],
    faculty: "Prof. Raghavendra (Class Teacher)",
    description: "Lecture room for ECE third year classes."
  },
  {
    id: "ece-1f-corridor2",
    name: "ECE South Corridor 1F",
    type: "corridor",
    building: "ece",
    floor: "1F",
    gridArea: "4 / 1 / 4 / 5"
  },
  {
    id: "ece-1f-lab2",
    number: "EC-106",
    name: "VLSI & Digital Communication Lab",
    type: "lab",
    building: "ece",
    floor: "1F",
    gridArea: "5 / 1 / 6 / 3",
    facilities: ["30 high-speed CAD PCs", "Xilinx / Cadence Software suite", "RF Signal generators"],
    faculty: "Prof. Sudheer (Lab in-charge)",
    description: "Used for simulating VLSI design blocks, Verilog HDL coding, and hardware communication modulation experiments."
  },
  {
    id: "ece-1f-lab3",
    number: "EC-107",
    name: "Microcontroller & ARM Lab",
    type: "lab",
    building: "ece",
    floor: "1F",
    gridArea: "5 / 3 / 6 / 5",
    facilities: ["Keil Software nodes", "MSP430 & ARM Board kits", "Stepper motors interface"],
    faculty: "Prof. Jayashree (Lab in-charge)",
    description: "Students learn assembly language, C coding for ARM microcontrollers, and interface hardware sensors."
  },

  // Second Floor (2F) - Civil & Mechanical CAD
  {
    id: "ece-2f-hod",
    number: "CV-201",
    name: "Civil Engineering HOD Cabin",
    type: "office",
    building: "ece",
    floor: "2F",
    gridArea: "1 / 1 / 2 / 2",
    facilities: ["HOD Desk", "Department library"],
    faculty: "Dr. M. S. Mallikarjuna (HOD, Civil)",
    description: "Head office of the Department of Civil Engineering."
  },
  {
    id: "ece-2f-staff",
    number: "CV-202",
    name: "Civil Faculty Room",
    type: "office",
    building: "ece",
    floor: "2F",
    gridArea: "1 / 2 / 2 / 3",
    facilities: ["Faculty cubicles"],
    faculty: "Civil Engineering Faculty",
    description: "Cabin blocks for Civil and Mechanical engineering professors."
  },
  {
    id: "ece-2f-labcivil",
    number: "CV-203",
    name: "Geology & Concrete Lab",
    type: "lab",
    building: "ece",
    floor: "2F",
    gridArea: "1 / 3 / 2 / 5",
    facilities: ["Compression testing machine", "Sieve shakers", "Rock specimen racks", "Universal Testing Machine"],
    faculty: "Prof. Raghunath (Lab in-charge)",
    description: "Heavy testing lab where students perform concrete strength testing, soil grading, and inspect mineral/geology rock specimens."
  },
  {
    id: "ece-2f-corridor1",
    name: "Civil Corridor 2F",
    type: "corridor",
    building: "ece",
    floor: "2F",
    gridArea: "2 / 1 / 2 / 5"
  },
  {
    id: "ece-2f-c211",
    number: "CV-204",
    name: "Classroom 211 (Civil 3rd Sem)",
    type: "classroom",
    building: "ece",
    floor: "2F",
    gridArea: "3 / 1 / 4 / 3",
    facilities: ["Standard Classroom whiteboard", "55 seats"],
    faculty: "Prof. Sunil (Class Teacher)",
    description: "Lecture room for second year civil engineering students."
  },
  {
    id: "ece-2f-c212",
    number: "CV-205",
    name: "Classroom 212 (Civil 5th Sem)",
    type: "classroom",
    building: "ece",
    floor: "2F",
    gridArea: "3 / 3 / 4 / 5",
    facilities: ["Standard Classroom whiteboard", "55 seats"],
    faculty: "Prof. Pallavi (Class Teacher)",
    description: "Lecture room for third year civil engineering students."
  },
  {
    id: "ece-2f-corridor2",
    name: "Civil South Corridor 2F",
    type: "corridor",
    building: "ece",
    floor: "2F",
    gridArea: "4 / 1 / 4 / 5"
  },
  {
    id: "ece-2f-cadlab",
    number: "ME-206",
    name: "Mechanical CAD & CAE Lab",
    type: "lab",
    building: "ece",
    floor: "2F",
    gridArea: "5 / 1 / 6 / 3",
    facilities: ["35 CAD workstations", "SolidWorks", "ANSYS", "AC", "Plotter"],
    faculty: "Dr. K. M. Kumar (Mechanical Lab Head)",
    description: "Advanced simulation laboratory room where mechanical and civil engineering students work on 3D solid models, finite element analysis (FEA), and stress profiling."
  },
  {
    id: "ece-2f-c213",
    number: "ME-207",
    name: "Classroom 213 (Mech 5th Sem)",
    type: "classroom",
    building: "ece",
    floor: "2F",
    gridArea: "5 / 3 / 6 / 5",
    facilities: ["Whiteboard", "60 seats"],
    faculty: "Prof. Sharath (Class Teacher)",
    description: "Lecture room for Mechanical engineering third year classes."
  },

  // ══════════════════════════════════════
  // BUILDING 3: CAMPUS GROUNDS (OUTDOOR & AMENITIES)
  // ══════════════════════════════════════
  {
    id: "grounds-gate",
    number: "MAIN-GATE",
    name: "Security Gate & Entrance",
    type: "amenity",
    building: "grounds",
    floor: "OUT",
    gridArea: "1 / 1 / 2 / 2",
    facilities: ["Security Post", "Visitor Registers", "CCTV Surveillance"],
    faculty: "Chief Security Officer",
    description: "The primary entry checkpoint of Sai Vidya Institute of Technology, operating 24/7 security verification."
  },
  {
    id: "grounds-parking",
    number: "PARK-01",
    name: "Parking Zone & Bus Stand",
    type: "amenity",
    building: "grounds",
    floor: "OUT",
    gridArea: "1 / 2 / 2 / 5",
    facilities: ["College Bus Pickup Shelters", "2-Wheeler Sheds", "4-Wheeler Slots"],
    faculty: "Mr. Manju (Transport Manager)",
    description: "Spacious parking area for college transport buses, student and staff two-wheelers, and visitor cars."
  },
  {
    id: "grounds-temple",
    number: "TEMPLE",
    name: "Sri Ganesha Temple",
    type: "amenity",
    building: "grounds",
    floor: "OUT",
    gridArea: "2 / 1 / 3 / 2",
    facilities: ["Peaceful Sitting Lawn"],
    faculty: "Temple Committee",
    description: "A serene, beautifully sculpted temple at the campus entrance. Students and staff gather here for morning prayers."
  },
  {
    id: "grounds-garden",
    number: "LAWN",
    name: "Central Lawn & Green Quadrangle",
    type: "amenity",
    building: "grounds",
    floor: "OUT",
    gridArea: "2 / 2 / 3 / 4",
    facilities: ["Seating benches", "Shaded study zones"],
    faculty: "Campus Beautification Dept",
    description: "An open-air lush quadrangle landscape between blocks. Highly popular among students during lunch and recess breaks."
  },
  {
    id: "grounds-sports",
    number: "GROUND",
    name: "Athletics Ground & Cricket Pitch",
    type: "amenity",
    building: "grounds",
    floor: "OUT",
    gridArea: "3 / 1 / 5 / 3",
    facilities: ["Cricket Pitch", "Football Goalposts", "Running track"],
    faculty: "Mr. Nagaraj (Physical Education Director)",
    description: "Spacious playground hosting annual college athletic events, cricket matches, inter-college football, and sports trials."
  },
  {
    id: "grounds-basketball",
    number: "COURT",
    name: "Basketball Court",
    type: "amenity",
    building: "grounds",
    floor: "OUT",
    gridArea: "3 / 3 / 4 / 5",
    facilities: ["Synthetic court surface", "Floodlights"],
    faculty: "Sports Gymkhana",
    description: "Standard dimension basketball court, fully equipped with concrete flooring and overhead floodlights."
  },
  {
    id: "grounds-canteen",
    number: "CANTEEN",
    name: "Student Canteen",
    type: "amenity",
    building: "grounds",
    floor: "OUT",
    gridArea: "4 / 3 / 5 / 5",
    facilities: ["South Indian Kitchen", "Juice Center", "Indoors and Patio seating", "POS Counters"],
    faculty: "Canteen Operator (Mr. Gowda)",
    description: "The food court of SVIT. Offers filter coffee, masala dosa, meals, and snacks. Connected to the digital ticket scanner queue system."
  },
  {
    id: "grounds-hostel-boys",
    number: "HOSTEL-A",
    name: "Boys Hostel Block",
    type: "amenity",
    building: "grounds",
    floor: "OUT",
    gridArea: "5 / 1 / 6 / 3",
    facilities: ["Hostel Mess", "Common Room", "Wi-Fi nodes", "Warden Office"],
    faculty: "Prof. K. R. Prasad (Hostel Warden)",
    description: "Safe and secure residential block for male SVIT students. Equips 150 twin-sharing rooms."
  },
  {
    id: "grounds-hostel-girls",
    number: "HOSTEL-B",
    name: "Girls Hostel Block",
    type: "amenity",
    building: "grounds",
    floor: "OUT",
    gridArea: "5 / 3 / 6 / 5",
    facilities: ["Separate Dining mess", "Recreation Gym", "24/7 Security Desk"],
    faculty: "Mrs. Annapoorna (Assistant Warden)",
    description: "Highly secure and clean residential block for female students, built close to the administrative block."
  }
];

const BUILDINGS = [
  { id: "main", name: "Main Block", floors: ["GF", "1F", "2F", "3F"] },
  { id: "ece", name: "ECE Block", floors: ["GF", "1F", "2F"] },
  { id: "grounds", name: "Campus Grounds", floors: ["OUT"] }
];

export default function CampusMapPage() {
  const [activeBuilding, setActiveBuilding] = useState("main");
  const [activeFloor, setActiveFloor] = useState("GF");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [highlightedRoomId, setHighlightedRoomId] = useState(null);

  const searchContainerRef = useRef(null);
  const highlightedRoomRef = useRef(null);

  // Set the first available floor when the active building changes
  const activeBuildingMeta = useMemo(() => {
    return BUILDINGS.find(b => b.id === activeBuilding);
  }, [activeBuilding]);

  useEffect(() => {
    if (activeBuildingMeta) {
      // If active floor isn't valid for the new building, switch it
      if (!activeBuildingMeta.floors.includes(activeFloor)) {
        setActiveFloor(activeBuildingMeta.floors[0]);
      }
    }
  }, [activeBuilding, activeBuildingMeta, activeFloor]);

  // Clean up suggestions list on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filter rooms database based on building and floor for rendering
  const displayedRooms = useMemo(() => {
    return ROOM_DATABASE.filter(
      room => room.building === activeBuilding && room.floor === activeFloor
    );
  }, [activeBuilding, activeFloor]);

  // Auto-scroll highlighted room into viewport
  useEffect(() => {
    if (highlightedRoomId && highlightedRoomRef.current) {
      setTimeout(() => {
        highlightedRoomRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center"
        });
      }, 200);
    }
  }, [highlightedRoomId]);

  // Filter suggestion list based on query
  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return ROOM_DATABASE.filter(
      room => 
        room.name.toLowerCase().includes(q) ||
        (room.number && room.number.toLowerCase().includes(q)) ||
        room.facilities.some(f => f.toLowerCase().includes(q)) ||
        (room.faculty && room.faculty.toLowerCase().includes(q)) ||
        room.type.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [searchQuery]);

  // Handle click on suggestion
  const handleSelectSuggestion = (room) => {
    setSearchQuery(room.name);
    setShowSuggestions(false);
    
    // Switch to building and floor of the selected room
    setActiveBuilding(room.building);
    setActiveFloor(room.floor);
    
    // Highlight room and open detailed card
    setSelectedRoom(room);
    setHighlightedRoomId(room.id);
    
    // Clear highlight flash after 4 seconds
    setTimeout(() => {
      setHighlightedRoomId(null);
    }, 4000);
  };

  const getRoomIcon = (type) => {
    switch (type) {
      case "lab":
        return <Cpu className="room-icon" size={18} />;
      case "classroom":
        return <School className="room-icon" size={18} />;
      case "office":
        return <Briefcase className="room-icon" size={18} />;
      case "seminar":
        return <Compass className="room-icon" size={18} />;
      case "library":
        return <BookOpen className="room-icon" size={18} />;
      case "reception":
        return <Info className="room-icon" size={18} />;
      default:
        return <MapPin className="room-icon" size={18} />;
    }
  };

  return (
    <main className="page-shell native-screen fade-in" style={{ paddingBottom: "110px" }}>
      
      {/* ── Search & Autocomplete Room Finder ── */}
      <section className="panel" style={{ marginBottom: 16, position: "relative", zIndex: 10 }}>
        <span className="eyebrow">SVIT Room Finder</span>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 12 }}>Search Classroom, Lab, or Office</h2>
        
        <div ref={searchContainerRef} style={{ position: "relative" }}>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input
              type="text"
              className="input"
              placeholder="e.g. Turing Lab, HOD, 104, library..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              style={{ paddingLeft: 42, width: "100%", fontWeight: 700 }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => { setSearchQuery(""); setSelectedRoom(null); }}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", color: "var(--muted)" }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="map-suggestions-box">
              {suggestions.map((room) => {
                const bMeta = BUILDINGS.find(b => b.id === room.building);
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(room)}
                    className="map-suggestion-item"
                  >
                    <div>
                      <strong style={{ display: "block", color: "var(--ink)", fontSize: "0.88rem" }}>
                        {room.name} {room.number ? `(${room.number})` : ""}
                      </strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "capitalize" }}>
                        {bMeta?.name} • {room.floor === "OUT" ? "Outdoor" : `Floor ${room.floor}`}
                      </span>
                    </div>
                    <ChevronRight size={16} color="var(--muted)" style={{ marginLeft: "auto" }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Building Block Selector Tabs ── */}
      <section className="tabs" aria-label="SVIT Blocks" style={{ width: "100%", marginBottom: 12 }}>
        {BUILDINGS.map(b => (
          <button
            key={b.id}
            type="button"
            className={`tab ${activeBuilding === b.id ? "active" : ""}`}
            onClick={() => {
              setActiveBuilding(b.id);
              setSelectedRoom(null);
            }}
            style={{ flex: 1, textAlign: "center" }}
          >
            {b.name}
          </button>
        ))}
      </section>

      {/* ── Floor Level Selector Chips ── */}
      {activeBuildingMeta && activeBuildingMeta.floors.length > 1 && (
        <section className="native-chip-row" style={{ marginBottom: 16 }}>
          {activeBuildingMeta.floors.map(f => (
            <button
              key={f}
              type="button"
              className={activeFloor === f ? "active" : ""}
              onClick={() => {
                setActiveFloor(f);
                setSelectedRoom(null);
              }}
              style={{
                padding: "6px 14px",
                fontSize: "0.75rem",
                borderRadius: "16px",
                fontWeight: 900
              }}
            >
              {f === "GF" ? "Ground Floor" : f === "1F" ? "1st Floor" : f === "2F" ? "2nd Floor" : "3rd Floor"}
            </button>
          ))}
        </section>
      )}

      {/* ── Interactive Floorplan Layout Blueprint ── */}
      <section className="panel" style={{ padding: "14px", overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Layers size={16} color="var(--primary)" />
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {activeBuildingMeta?.name} Plan • {activeFloor === "OUT" ? "Outdoor grounds" : `${activeFloor} Blueprint`}
            </span>
          </div>
          <span className="badge success" style={{ padding: "2px 8px", fontSize: "0.68rem" }}>
            {displayedRooms.filter(r => r.type !== "corridor").length} clickable rooms
          </span>
        </div>

        {/* Blueprint Container */}
        <div className="blueprint-wrapper">
          <div className="blueprint-grid" style={{
            gridTemplateRows: activeBuilding === "grounds" ? "repeat(5, 76px)" : "repeat(6, 68px)",
          }}>
            {displayedRooms.map((room) => {
              const isCorridor = room.type === "corridor";
              const isHighlighted = highlightedRoomId === room.id;
              const isSelected = selectedRoom?.id === room.id;
              
              if (isCorridor) {
                return (
                  <div
                    key={room.id}
                    style={{
                      gridArea: room.gridArea,
                      background: "rgba(220, 227, 214, 0.08)",
                      border: "1px dashed rgba(220, 227, 214, 0.2)",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,255,255,0.12)",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase"
                    }}
                  >
                    <span>{room.name}</span>
                  </div>
                );
              }

              return (
                <button
                  key={room.id}
                  ref={isHighlighted || isSelected ? highlightedRoomRef : null}
                  type="button"
                  onClick={() => setSelectedRoom(room)}
                  className={`blueprint-room-card ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlight-pulse' : ''}`}
                  style={{
                    gridArea: room.gridArea,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                    <span className="blueprint-room-num">{room.number || ""}</span>
                    {getRoomIcon(room.type)}
                  </div>
                  <strong className="blueprint-room-name">{room.name}</strong>
                  {isSelected && <span style={{ position: "absolute", bottom: 6, right: 6, width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compass Legend */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--muted)", padding: "10px 4px 0", borderTop: "1px solid var(--line)", marginTop: 12 }}>
          <span>West Wing (Entrance side)</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Compass size={12} className="spin" style={{ animationDuration: "12s" }} /> North Oriented
          </span>
          <span>East Wing (Workshops side)</span>
        </div>
      </section>

      {/* ── Room Details Modal/Drawer ── */}
      {selectedRoom ? (
        <section className="panel fade-in" style={{ border: "1px solid var(--primary)", background: "rgba(35, 102, 84, 0.02)", boxShadow: "0 8px 32px rgba(35, 102, 84, 0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--line)", paddingBottom: 10, marginBottom: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="eyebrow" style={{ textTransform: "uppercase", fontSize: "0.68rem" }}>
                  {selectedRoom.type}
                </span>
                {selectedRoom.number && (
                  <span className="badge" style={{ background: "var(--surface-soft)", color: "var(--ink)", padding: "2px 6px", fontSize: "0.68rem" }}>
                    Room {selectedRoom.number}
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--ink)", marginTop: 4 }}>
                {selectedRoom.name}
              </h3>
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedRoom(null)}
              style={{ background: "rgba(255,255,255,0.06)", padding: 6, borderRadius: "50%", color: "var(--muted)" }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            
            {/* Faculty / Coordinator */}
            {selectedRoom.faculty && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ padding: 6, background: "rgba(35, 102, 84, 0.06)", borderRadius: 8, color: "var(--primary)" }}>
                  <Briefcase size={16} />
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 700, display: "block" }}>FACULTY / COORDINATOR</span>
                  <strong style={{ fontSize: "0.85rem", color: "var(--ink)" }}>{selectedRoom.faculty}</strong>
                </div>
              </div>
            )}

            {/* Description */}
            <p className="subtle" style={{ fontSize: "0.84rem", lineHeight: 1.45 }}>
              {selectedRoom.description}
            </p>

            {/* Facilities Tags list */}
            {selectedRoom.facilities && selectedRoom.facilities.length > 0 && (
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 700, display: "block", marginBottom: 6 }}>
                  FACILITIES & HARDWARE
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedRoom.facilities.map((fac, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        fontSize: "0.74rem", 
                        padding: "4px 10px", 
                        background: "var(--surface-soft)", 
                        border: "1px solid var(--line)", 
                        borderRadius: "8px",
                        color: "var(--ink)",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <Check size={10} color="var(--success)" /> {fac}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <a 
                href={`/dashboard/connect?channel=general&mention=${selectedRoom.name}`}
                className="button secondary"
                style={{ flex: 1, fontSize: "0.78rem", minHeight: 38 }}
              >
                Ask about room in Chat
              </a>
              {selectedRoom.faculty && (
                <button 
                  type="button" 
                  onClick={() => alert(`Department coordinator contact details: Office Intercom Ext - 402. Email: support@svit.edu.in`)}
                  className="button"
                  style={{ fontSize: "0.78rem", minHeight: 38, padding: "0 14px" }}
                >
                  <Phone size={14} /> Call Office
                </button>
              )}
            </div>

          </div>
        </section>
      ) : (
        /* Welcome card when no room is selected */
        <section className="panel" style={{ textAlign: "center", padding: "24px 16px" }}>
          <HelpCircle size={28} color="var(--muted)" style={{ margin: "0 auto 10px", opacity: 0.6 }} />
          <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--ink)" }}>Tap on any room card</strong>
          <p className="subtle" style={{ fontSize: "0.78rem", marginTop: 4 }}>
            Click on classrooms or labs on the blueprint grid above to inspect their description, faculty, and facilities.
          </p>
        </section>
      )}

      {/* Styled inline components specific to the Map/Blueprint */}
      <style dangerouslySetInnerHTML={{__html: `
        .blueprint-wrapper {
          width: 100%;
          overflow-x: auto;
          background: #0d1117;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);
          scrollbar-width: thin;
        }
        
        .blueprint-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(130px, 1fr));
          grid-gap: 8px;
          padding: 14px;
          min-width: 580px; /* Force minimum width to scroll nicely on small screens */
          background-image: 
            radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 14px 14px;
          background-position: 0 0, 7px 7px;
        }

        .blueprint-room-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: space-between;
          padding: 8px 10px;
          background: rgba(35, 102, 84, 0.06);
          border: 1.5px solid rgba(35, 102, 84, 0.35);
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          color: rgba(255, 255, 255, 0.85);
          transition: all 180ms ease;
          overflow: hidden;
        }

        .blueprint-room-card:hover {
          background: rgba(35, 102, 84, 0.16);
          border-color: rgba(35, 102, 84, 0.85);
          transform: scale(1.02);
          box-shadow: 0 4px 14px rgba(35, 102, 84, 0.25);
        }

        .blueprint-room-card.selected {
          background: rgba(35, 102, 84, 0.22);
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(35, 102, 84, 0.2), inset 0 0 8px rgba(35, 102, 84, 0.3);
        }

        .blueprint-room-card.selected .blueprint-room-num {
          color: #ffffff;
        }

        .blueprint-room-num {
          font-size: 0.65rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.45);
        }

        .blueprint-room-name {
          font-size: 0.78rem;
          font-weight: 800;
          line-height: 1.25;
          margin-top: 4px;
          color: #ffffff;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .room-icon {
          color: rgba(255,255,255,0.3);
          flex-shrink: 0;
        }

        .blueprint-room-card.selected .room-icon {
          color: var(--primary);
        }

        /* Neon pulsing animation for searched room */
        .highlight-pulse {
          animation: mapPulseBorder 1.2s infinite ease-in-out;
          z-index: 5;
        }

        @keyframes mapPulseBorder {
          0% {
            border-color: rgba(35, 102, 84, 0.85);
            box-shadow: 0 0 0 0px rgba(35, 102, 84, 0.4);
          }
          50% {
            border-color: #34d178;
            box-shadow: 0 0 0 6px rgba(52, 209, 120, 0.25);
          }
          100% {
            border-color: rgba(35, 102, 84, 0.85);
            box-shadow: 0 0 0 0px rgba(35, 102, 84, 0.4);
          }
        }

        /* Suggestions autocomplete box */
        .map-suggestions-box {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          max-height: 240px;
          overflow-y: auto;
          z-index: 999;
          display: flex;
          flex-direction: column;
        }

        .map-suggestion-item {
          width: 100%;
          text-align: left;
          padding: 10px 14px;
          background: transparent;
          border-bottom: 1px solid var(--line);
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: background 150ms ease;
        }

        .map-suggestion-item:last-child {
          border-bottom: none;
        }

        .map-suggestion-item:hover {
          background: var(--surface-soft);
        }
      `}} />
    </main>
  );
}
