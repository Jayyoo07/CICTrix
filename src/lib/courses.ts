/**
 * The standardised list of degrees/courses an applicant can select.
 *
 * The field used to be free text, which produced four spellings of one degree —
 * "BS Information Systems", "BSIS", "Bachelor of Science in Information
 * Systems", "B.S. Information Systems". Nothing downstream could group those:
 * matching an applicant's course against a posting's required field, counting
 * degrees for a report, or scoring education in succession all treated them as
 * four different qualifications.
 *
 * So the canonical name is what gets stored, and the applicant picks it rather
 * than typing it.
 *
 * `OTHER_COURSE` escapes the list. A standardised list that cannot express a
 * real applicant's degree is worse than free text, because the applicant either
 * abandons the form or picks something that is not true. When it is chosen the
 * form asks what the course actually is and stores that verbatim — flagged as
 * unlisted, not silently mixed in with the canonical values.
 */

export const OTHER_COURSE = 'Others';

export interface CourseGroup {
  label: string;
  courses: string[];
}

/**
 * Grouped so a long list stays navigable in a native <select>, which has no
 * search. The groups are the fields an LGU actually recruits into.
 */
export const COURSE_GROUPS: CourseGroup[] = [
  {
    label: 'Information Technology & Computing',
    courses: [
      'Bachelor of Science in Information Technology',
      'Bachelor of Science in Information Systems',
      'Bachelor of Science in Computer Science',
      'Bachelor of Library and Information Science',
      'Bachelor of Science in Entertainment and Multimedia Computing',
    ],
  },
  {
    label: 'Engineering & Architecture',
    courses: [
      'Bachelor of Science in Civil Engineering',
      'Bachelor of Science in Electrical Engineering',
      'Bachelor of Science in Mechanical Engineering',
      'Bachelor of Science in Electronics Engineering',
      'Bachelor of Science in Geodetic Engineering',
      'Bachelor of Science in Sanitary Engineering',
      'Bachelor of Science in Architecture',
    ],
  },
  {
    label: 'Business, Accountancy & Management',
    courses: [
      'Bachelor of Science in Accountancy',
      'Bachelor of Science in Management Accounting',
      'Bachelor of Science in Business Administration',
      'Bachelor of Science in Office Administration',
      'Bachelor of Science in Entrepreneurship',
      'Bachelor of Science in Customs Administration',
    ],
  },
  {
    label: 'Public Administration, Law & Social Sciences',
    courses: [
      'Bachelor of Public Administration',
      'Bachelor of Arts in Political Science',
      'Bachelor of Arts in Economics',
      'Bachelor of Arts in Psychology',
      'Bachelor of Science in Social Work',
      'Bachelor of Arts in Communication',
      'Bachelor of Laws / Juris Doctor',
    ],
  },
  {
    label: 'Health & Allied Sciences',
    courses: [
      'Bachelor of Science in Nursing',
      'Bachelor of Science in Midwifery',
      'Bachelor of Science in Pharmacy',
      'Bachelor of Science in Medical Technology',
      'Bachelor of Science in Nutrition and Dietetics',
      'Bachelor of Science in Public Health',
      'Doctor of Medicine',
      'Doctor of Dental Medicine',
      'Doctor of Veterinary Medicine',
    ],
  },
  {
    label: 'Education',
    courses: [
      'Bachelor of Elementary Education',
      'Bachelor of Secondary Education',
      'Bachelor of Physical Education',
      'Bachelor of Technical-Vocational Teacher Education',
    ],
  },
  {
    label: 'Sciences & Agriculture',
    courses: [
      'Bachelor of Science in Biology',
      'Bachelor of Science in Chemistry',
      'Bachelor of Science in Environmental Science',
      'Bachelor of Science in Agriculture',
      'Bachelor of Science in Fisheries',
      'Bachelor of Science in Forestry',
      'Bachelor of Science in Statistics',
    ],
  },
  {
    label: 'Criminology & Public Safety',
    courses: [
      'Bachelor of Science in Criminology',
      'Bachelor of Science in Industrial Security Management',
    ],
  },
];

/** Every canonical course, flattened. */
export const COURSES: string[] = COURSE_GROUPS.flatMap((g) => g.courses);

const canonicalByKey = new Map<string, string>();

/** Strip the punctuation and casing that made one degree look like four. */
function key(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

for (const course of COURSES) canonicalByKey.set(key(course), course);

/**
 * Abbreviations and common spellings mapped onto the canonical name.
 *
 * This exists for the entries already stored as free text. Without it every
 * historical applicant would read as "unlisted" the moment the dropdown
 * shipped, and the inconsistency the dropdown was meant to end would simply be
 * frozen rather than resolved.
 */
const ALIASES: Record<string, string> = {
  bsit: 'Bachelor of Science in Information Technology',
  'bs information technology': 'Bachelor of Science in Information Technology',
  'bs it': 'Bachelor of Science in Information Technology',
  bsis: 'Bachelor of Science in Information Systems',
  'bs information systems': 'Bachelor of Science in Information Systems',
  bscs: 'Bachelor of Science in Computer Science',
  'bs computer science': 'Bachelor of Science in Computer Science',
  bsce: 'Bachelor of Science in Civil Engineering',
  'bs civil engineering': 'Bachelor of Science in Civil Engineering',
  bsee: 'Bachelor of Science in Electrical Engineering',
  'bs electrical engineering': 'Bachelor of Science in Electrical Engineering',
  bsme: 'Bachelor of Science in Mechanical Engineering',
  'bs mechanical engineering': 'Bachelor of Science in Mechanical Engineering',
  bsece: 'Bachelor of Science in Electronics Engineering',
  'bs electronics engineering': 'Bachelor of Science in Electronics Engineering',
  bsa: 'Bachelor of Science in Accountancy',
  'bs accountancy': 'Bachelor of Science in Accountancy',
  bsba: 'Bachelor of Science in Business Administration',
  'bs business administration': 'Bachelor of Science in Business Administration',
  bsoa: 'Bachelor of Science in Office Administration',
  bpa: 'Bachelor of Public Administration',
  'ab political science': 'Bachelor of Arts in Political Science',
  'bs political science': 'Bachelor of Arts in Political Science',
  'ab psychology': 'Bachelor of Arts in Psychology',
  'bs psychology': 'Bachelor of Arts in Psychology',
  'ab economics': 'Bachelor of Arts in Economics',
  'bs social work': 'Bachelor of Science in Social Work',
  bssw: 'Bachelor of Science in Social Work',
  'ab communication': 'Bachelor of Arts in Communication',
  bsn: 'Bachelor of Science in Nursing',
  'bs nursing': 'Bachelor of Science in Nursing',
  'bs midwifery': 'Bachelor of Science in Midwifery',
  'bs pharmacy': 'Bachelor of Science in Pharmacy',
  bsmt: 'Bachelor of Science in Medical Technology',
  'bs medical technology': 'Bachelor of Science in Medical Technology',
  'bs nutrition and dietetics': 'Bachelor of Science in Nutrition and Dietetics',
  md: 'Doctor of Medicine',
  dmd: 'Doctor of Dental Medicine',
  dvm: 'Doctor of Veterinary Medicine',
  beed: 'Bachelor of Elementary Education',
  'bachelor in elementary education': 'Bachelor of Elementary Education',
  bsed: 'Bachelor of Secondary Education',
  'bachelor in secondary education': 'Bachelor of Secondary Education',
  'bs biology': 'Bachelor of Science in Biology',
  'bs chemistry': 'Bachelor of Science in Chemistry',
  'bs environmental science': 'Bachelor of Science in Environmental Science',
  'bs agriculture': 'Bachelor of Science in Agriculture',
  'bs statistics': 'Bachelor of Science in Statistics',
  bscrim: 'Bachelor of Science in Criminology',
  'bs criminology': 'Bachelor of Science in Criminology',
  'juris doctor': 'Bachelor of Laws / Juris Doctor',
  llb: 'Bachelor of Laws / Juris Doctor',
  jd: 'Bachelor of Laws / Juris Doctor',
};

/**
 * Resolve a stored or typed course to its canonical name.
 *
 * Returns null when nothing matches, so the caller can show the value as the
 * applicant wrote it rather than mapping it to a near-miss. Guessing which
 * degree somebody meant is not this function's job — a wrong canonical name is
 * harder to spot than an unrecognised one.
 */
export function canonicalCourse(value: string | null | undefined): string | null {
  const k = key(value ?? '');
  if (!k) return null;
  return canonicalByKey.get(k) ?? ALIASES[k] ?? null;
}

/** Whether a stored value is one of the standardised courses. */
export function isCanonicalCourse(value: string | null | undefined): boolean {
  return canonicalCourse(value) !== null;
}
