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
