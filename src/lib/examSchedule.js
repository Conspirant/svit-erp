// IA 1 Exam Schedule for Even Sem 2025-26
// Derived from the official FIRST INTERNAL ASSESSMENT TIME TABLE

const IA_EXAMS = {
  physics: {
    label: 'Physics Cycle',
    semester: 'II-SEM',
    exams: [
      {
        date: '2026-04-27',
        day: 'Monday',
        morning: 'Numerical Methods (1BMATS201), Calculus, Laplace transform & Numerical techniques (1BMATE201)',
        afternoon: 'Building Sciences & Mechanics (1BESC204A), Introduction to Electrical Engineering (1BESC204B), Essentials of Information technology (1BESC204E)',
      },
      {
        date: '2026-04-28',
        day: 'Tuesday',
        morning: 'Quantum Physics and Applications (1BPHYS202), Quantum Physics and electronic sensors (1BPHYE202)',
        afternoon: 'Samskrutika Kannada (1BKSK209), Balake Kannada (1BKBK209) — Timings: 2.00 to 3.00 PM',
      },
      {
        date: '2026-04-29',
        day: 'Wednesday',
        morning: 'Programming in C (1BEIT205), Fundamentals of Electronics and Communication Engineering (1BECE205)',
        afternoon: 'NOTE: From 11.20 AM onwards classes will be conducted as per the Time Table',
      },
    ],
  },
  chemistry: {
    label: 'Chemistry Cycle',
    semester: 'II-SEM',
    exams: [
      {
        date: '2026-04-27',
        day: 'Monday',
        morning: 'Numerical Methods (1BMATS201), Differential Calculus and Numerical Methods (1BMATC201), Multivariable Calculus and Numerical Methods (1BMATM201)',
        afternoon: 'Introduction to Electronics & Communication Engineering (1BESC204C), Introduction to Mechanical Engineering (1BESC204D)',
      },
      {
        date: '2026-04-28',
        day: 'Tuesday',
        morning: 'Applied Chemistry for Smart Systems (1BCHES202), Applied Chemistry for Sustainable Structure & Material Design (1BCHEC202), Applied Chemistry for Advanced Metal Protection and Sustainable Energy Systems (1BCHEM202)',
        afternoon: 'Communication Skills (1BENG206) — Timings: 2.00 to 3.00 PM',
      },
      {
        date: '2026-04-29',
        day: 'Wednesday',
        morning: 'Introduction to AI and Applications (1BAIA203)',
        afternoon: 'Indian Constitution & Engineering Ethics (1BICO207) — Timings: 2.00 to 3.00 PM',
      },
      {
        date: '2026-04-30',
        day: 'Thursday',
        morning: 'Introduction to Python Programming (1BPLC205B), Introduction to C Programming (1BPLC205E)',
        afternoon: 'From 11.20 AM onwards classes will be conducted as per the Time Table',
      },
    ],
  },
};

// Detect cycle from course codes in the student's timetable/attendance data
export function detectCycle(attendance = []) {
  const allCourses = attendance.map(a => (a.course || '').toUpperCase());
  const courseText = allCourses.join(' ');

  // Physics cycle indicators
  const physicsIndicators = ['1BPHYS', '1BPHYE', '1BEIT205', '1BECE205', '1BESC204A', '1BESC204B', '1BESC204E', '1BMATE201'];
  // Chemistry cycle indicators
  const chemistryIndicators = ['1BCHES', '1BCHEC', '1BCHEM', '1BAIA203', '1BENG206', '1BICO207', '1BPLC205', '1BESC204C', '1BESC204D', '1BMATC201', '1BMATM201'];

  let physScore = 0;
  let chemScore = 0;

  for (const ind of physicsIndicators) {
    if (courseText.includes(ind)) physScore++;
  }
  for (const ind of chemistryIndicators) {
    if (courseText.includes(ind)) chemScore++;
  }

  if (physScore > chemScore) return 'physics';
  if (chemScore > physScore) return 'chemistry';
  // Default: check if any PHYCYCLE appears in course names
  if (courseText.includes('PHYCYCLE') || courseText.includes('PHYSICS')) return 'physics';
  if (courseText.includes('CHEMCYCLE') || courseText.includes('CHEMISTRY') || courseText.includes('CHEM')) return 'chemistry';
  
  return null; // Can't determine
}

// Get the next upcoming exam for a given cycle
export function getNextExam(cycle) {
  if (!cycle || !IA_EXAMS[cycle]) return null;

  const now = new Date();
  // Use start of day in IST for comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const exams = IA_EXAMS[cycle].exams;

  for (const exam of exams) {
    const examDate = new Date(exam.date + 'T00:00:00');
    // Show exams that are today or in the future
    if (examDate >= today) {
      return {
        ...exam,
        cycleLabel: IA_EXAMS[cycle].label,
        semester: IA_EXAMS[cycle].semester,
      };
    }
  }

  return null; // All exams are past
}

export function getAllExams(cycle) {
  if (!cycle || !IA_EXAMS[cycle]) return [];
  return IA_EXAMS[cycle].exams.map(e => ({
    ...e,
    cycleLabel: IA_EXAMS[cycle].label,
    semester: IA_EXAMS[cycle].semester,
  }));
}

export const EXAM_DATABASE = [
  // Day 1: 23-06-2026
  { code: "1BPHYC102", title: "Physics for Sustainable Structural Systems", date: "2026-06-23", day: "Tuesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BPHYC202", title: "Physics for Sustainable Structural Systems", date: "2026-06-23", day: "Tuesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BPHYM102", title: "Physics of Materials", date: "2026-06-23", day: "Tuesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BPHYM202", title: "Physics of Materials", date: "2026-06-23", day: "Tuesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BPHEC102", title: "Quantum Physics and Electronics Sensors", date: "2026-06-23", day: "Tuesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BPHEC202", title: "Quantum Physics and Electronics Sensors", date: "2026-06-23", day: "Tuesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BPHEE102", title: "Electrical Engineering Materials", date: "2026-06-23", day: "Tuesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BPHEE202", title: "Electrical Engineering Materials", date: "2026-06-23", day: "Tuesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BPHYS102", title: "Quantum Physics and Applications", date: "2026-06-23", day: "Tuesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BPHYS202", title: "Quantum Physics and Applications", date: "2026-06-23", day: "Tuesday", time: "9:30 AM to 12:30 PM" },

  // Day 2: 25-06-2026
  { code: "1BCHEC102", title: "Applied Chemistry for Sustainable Structure & Material Design", date: "2026-06-25", day: "Thursday", time: "9:30 AM to 12:30 PM" },
  { code: "1BCHEC202", title: "Applied Chemistry for Sustainable Structure & Material Design", date: "2026-06-25", day: "Thursday", time: "9:30 AM to 12:30 PM" },
  { code: "1BCHEM102", title: "Applied Chemistry for Advanced Metal Protection and Sustainable Energy Systems", date: "2026-06-25", day: "Thursday", time: "9:30 AM to 12:30 PM" },
  { code: "1BCHEM202", title: "Applied Chemistry for Advanced Metal Protection and Sustainable Energy Systems", date: "2026-06-25", day: "Thursday", time: "9:30 AM to 12:30 PM" },
  { code: "1BCHEE102", title: "Applied Chemistry for Emerging Electronics and Futuristic Devices", date: "2026-06-25", day: "Thursday", time: "9:30 AM to 12:30 PM" },
  { code: "1BCHEE202", title: "Applied Chemistry for Emerging Electronics and Futuristic Devices", date: "2026-06-25", day: "Thursday", time: "9:30 AM to 12:30 PM" },
  { code: "1BCHES102", title: "Applied Chemistry for Smart Systems", date: "2026-06-25", day: "Thursday", time: "9:30 AM to 12:30 PM" },
  { code: "1BCHES202", title: "Applied Chemistry for Smart Systems", date: "2026-06-25", day: "Thursday", time: "9:30 AM to 12:30 PM" },

  // Day 3: 27-06-2026
  { code: "1BPLC105B", title: "Python Programming", date: "2026-06-27", day: "Saturday", time: "9:30 AM to 12:30 PM" },
  { code: "1BPLC205B", title: "Python Programming", date: "2026-06-27", day: "Saturday", time: "9:30 AM to 12:30 PM" },
  { code: "1BPLC105E", title: "Introduction to C Programming", date: "2026-06-27", day: "Saturday", time: "9:30 AM to 12:30 PM" },
  { code: "1BPLC205E", title: "Introduction to C Programming", date: "2026-06-27", day: "Saturday", time: "9:30 AM to 12:30 PM" },

  // Day 4: 29-06-2026
  { code: "1BCIV105", title: "Engineering Mechanics", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BCIV205", title: "Engineering Mechanics", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BBEE105", title: "Basics of Electrical Engineering", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BBEE205", title: "Basics of Electrical Engineering", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BECE105", title: "Fundamentals of Electronics & Communication Engineering", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BECE205", title: "Fundamentals of Electronics & Communication Engineering", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BEME105", title: "Elements of Mechanical Engineering", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BEME205", title: "Elements of Mechanical Engineering", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BEBT105", title: "Elements of Biotechnology and Biomimetics", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BEBT205", title: "Elements of Biotechnology and Biomimetics", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BSSA105", title: "Principles of Soil Science & Agronomy", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BSSA205", title: "Principles of Soil Science & Agronomy", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BEAE105", title: "Elements of Aeronautical Engineering", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BEAE205", title: "Elements of Aeronautical Engineering", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BETX105", title: "Technology of Textile", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BETX205", title: "Technology of Textile", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BECHE105", title: "Elements of Chemical Engineering", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BECHE205", title: "Elements of Chemical Engineering", date: "2026-06-29", day: "Monday", time: "9:30 AM to 12:30 PM" },

  // Day 5: 01-07-2026
  { code: "1BEIT105", title: "Programming in C", date: "2026-07-01", day: "Wednesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BEIT205", title: "Programming in C", date: "2026-07-01", day: "Wednesday", time: "9:30 AM to 12:30 PM" },

  // Day 6: 03-07-2026
  { code: "1BENG106", title: "Communication Skills", date: "2026-07-03", day: "Friday", time: "9:30 AM to 10:30 AM" },
  { code: "1BENG206", title: "Communication Skills", date: "2026-07-03", day: "Friday", time: "9:30 AM to 10:30 AM" },

  // Day 7: 06-07-2026
  { code: "1BESC204A", title: "Building Sciences & Mechanics", date: "2026-07-06", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BESC204B", title: "Introduction to Electrical Engineering", date: "2026-07-06", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BESC204C", title: "Introduction to Electronics & Communication Engineering", date: "2026-07-06", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BESC204D", title: "Introduction to Mechanical Engineering", date: "2026-07-06", day: "Monday", time: "9:30 AM to 12:30 PM" },
  { code: "1BESC204E", title: "Essentials of Information Technology", date: "2026-07-06", day: "Monday", time: "9:30 AM to 12:30 PM" },

  // Day 8: 08-07-2026
  { code: "1BMATM201", title: "Multivariable Calculus and Numerical Methods", date: "2026-07-08", day: "Wednesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BMATE201", title: "Calculus, Laplace Transform and Numerical Techniques", date: "2026-07-08", day: "Wednesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BMATC201", title: "Differential Calculus & Numerical Methods", date: "2026-07-08", day: "Wednesday", time: "9:30 AM to 12:30 PM" },
  { code: "1BMATS201", title: "Numerical Methods", date: "2026-07-08", day: "Wednesday", time: "9:30 AM to 12:30 PM" },

  // Day 9: 10-07-2026
  { code: "1BAIA103", title: "Introduction to AI and Applications", date: "2026-07-10", day: "Friday", time: "9:30 AM to 12:30 PM" },
  { code: "1BAIA203", title: "Introduction to AI and Applications", date: "2026-07-10", day: "Friday", time: "9:30 AM to 12:30 PM" },

  // Day 10: 13-07-2026
  { code: "1BKSK109", title: "Samskrutika Kannada", date: "2026-07-13", day: "Monday", time: "9:30 AM to 10:30 AM" },
  { code: "1BKSK209", title: "Samskrutika Kannada", date: "2026-07-13", day: "Monday", time: "9:30 AM to 10:30 AM" },
  { code: "1BKBK109", title: "Balake Kannada", date: "2026-07-13", day: "Monday", time: "9:30 AM to 10:30 AM" },
  { code: "1BKBK209", title: "Balake Kannada", date: "2026-07-13", day: "Monday", time: "9:30 AM to 10:30 AM" },
];
