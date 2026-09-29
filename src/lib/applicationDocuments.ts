/**
 * Curriculum Vitae is no longer a required application document. Postings
 * created before the change may still list it (as "Resume/CV" or "Curriculum
 * Vitae"); this recognises those entries so they can be dropped from what
 * applicants see and what admins configure. Uploaded CVs are never deleted.
 */
export const isCurriculumVitae = (documentName: string | null | undefined): boolean =>
  /\b(resume|curriculum\s*vitae|cv)\b/i.test(String(documentName ?? ''));
