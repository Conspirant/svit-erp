export const LETTERS_API_ORIGIN = (process.env.LETTERS_API_URL || 'https://api.erpsaividya.in').replace(/\/+$/, '');

export const LETTERS_ENDPOINTS = {
  STUDENT_LOGIN: `${LETTERS_API_ORIGIN}/api/auth/student/login`,
  STUDENT_SIGNUP: `${LETTERS_API_ORIGIN}/api/auth/student/signup`,
  STUDENT_SIGNUP_OTP: `${LETTERS_API_ORIGIN}/api/auth/student/signup/request-otp`,
  FACULTY_LOGIN: `${LETTERS_API_ORIGIN}/api/auth/faculty/login`,
  PROFILE: `${LETTERS_API_ORIGIN}/api/auth/profile`,
  FORGOT_PASSWORD: `${LETTERS_API_ORIGIN}/api/auth/forgot-password`,
  VERIFY_OTP: `${LETTERS_API_ORIGIN}/api/auth/verify-otp`,
  RESET_PASSWORD: `${LETTERS_API_ORIGIN}/api/auth/reset-password`,
  CHANGE_PASSWORD: `${LETTERS_API_ORIGIN}/api/auth/change-password`,
  LETTERS: `${LETTERS_API_ORIGIN}/api/letters`,
  SCHEMAS: `${LETTERS_API_ORIGIN}/api/letter-schemas`,
  DEPARTMENTS: `${LETTERS_API_ORIGIN}/api/departments`,
  AUTHORITIES: (dept) => `${LETTERS_API_ORIGIN}/api/auth/authorities/${encodeURIComponent(dept)}`,
  LETTER_DETAIL: (id) => `${LETTERS_API_ORIGIN}/api/letters/${id}`,
  LETTER_PDF: (id) => `${LETTERS_API_ORIGIN}/api/letters/${id}/pdf`,
  LETTER_FILE: (id, fileIdx) => `${LETTERS_API_ORIGIN}/api/letters/${id}/file/${fileIdx}`,
};

