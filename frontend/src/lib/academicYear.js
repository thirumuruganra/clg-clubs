const ACADEMIC_YEAR_ROLLOVER_MONTH_INDEX = 4; // May, 0-indexed
const REGISTER_NUMBER_PATTERN = /^3122\d{9}$/;
const ROMAN_YEARS = ['', 'I', 'II', 'III', 'IV', 'V'];

export const YEAR_RANK = { V: 5, IV: 4, III: 3, II: 2, I: 1, Alumni: 0, '-': -1 };

export function getEffectiveAcademicYear() {
  const currentDate = new Date();
  return currentDate.getMonth() >= ACADEMIC_YEAR_ROLLOVER_MONTH_INDEX ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
}

function toCompact(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getDegreeDuration(degreeStr) {
  const normalizedDegree = toCompact(degreeStr);
  if (!normalizedDegree) return null;

  if (normalizedDegree.includes('mtech') && normalizedDegree.includes('integrated')) {
    return 5;
  }
  if (normalizedDegree === 'be' || normalizedDegree.includes('btech')) {
    return 4;
  }
  if (normalizedDegree === 'me' || normalizedDegree.includes('mtech')) {
    return 2;
  }

  return null;
}

export function getAdmissionYearFromRegisterNumber(registerNumber) {
  const digitsOnly = String(registerNumber || '').replace(/\D/g, '');
  if (!REGISTER_NUMBER_PATTERN.test(digitsOnly)) return null;

  // SSN register numbers usually encode admission year as the 5th and 6th digits.
  const admissionYearCode = parseInt(digitsOnly.slice(4, 6), 10);
  if (Number.isNaN(admissionYearCode)) return null;

  const admissionYear = 2000 + admissionYearCode;
  if (admissionYear > new Date().getFullYear()) return null;

  return admissionYear;
}

export function calculateYearFromAdmission(admissionYear, duration, academicYear) {
  if (!admissionYear || !duration) return null;

  let yearNumber = academicYear - admissionYear;
  if (yearNumber <= 0) yearNumber = 1;

  if (yearNumber > duration) return 'Alumni';

  return ROMAN_YEARS[yearNumber] || '-';
}

export function calculateYear(batchStr, degreeStr, registerNumber) {
  const duration = getDegreeDuration(degreeStr);
  if (!duration) return '-';

  const academicYear = getEffectiveAcademicYear();

  const admissionYear = getAdmissionYearFromRegisterNumber(registerNumber);
  const yearFromRegister = calculateYearFromAdmission(admissionYear, duration, academicYear);
  if (yearFromRegister) return yearFromRegister;

  if (!batchStr) return '-';
  const passout = parseInt(batchStr, 10);
  if (isNaN(passout)) return '-';

  const diff = passout - academicYear;
  if (diff < 0) return 'Alumni';

  const yearNumber = duration - diff;
  if (yearNumber < 1 || yearNumber > duration) return '-';

  return ROMAN_YEARS[yearNumber] || '-';
}
