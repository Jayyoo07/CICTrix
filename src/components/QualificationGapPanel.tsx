import { useMemo, useState } from 'react';
import { TrendingUp, CheckCircle2, AlertTriangle, ArrowUpRight, Info } from 'lucide-react';
import type { JobPosting } from '../types/recruitment.types';
import {
  compareQualifications,
  findTopPositionInDepartment,
  type CandidateBackground,
  type QualificationComparison,
  type QualificationGap,
} from '../lib/qualificationMatch';

const EDUCATION_OPTIONS = [
  'Elementary Graduate',
  'High School Graduate',
  'College Level',
  'College Graduate',
  'Masteral Units',
  'Graduate School',
  'Doctorate',
];

// Styled with the applicant-flow tokens (src/styles/applicant-flow.css); it
// renders inside the `.abyan-ds .af` Job Details page. Gaps are a caution
// status (warning), a met requirement is success — never decorative colour.
const GapList = ({ comparison }: { comparison: QualificationComparison }) => {
  if (comparison.noStatedRequirements) {
    return (
      <p className="af-notice af-notice-neutral">
        This position hasn't published its qualification standards yet, so there's nothing to compare against.
      </p>
    );
  }

  if (comparison.meetsAll) {
    return (
      <div className="af-alert af-alert-success">
        <CheckCircle2 size={20} strokeWidth={1.75} aria-hidden="true" />
        <p className="af-alert-body">You meet every stated requirement for this position.</p>
      </div>
    );
  }

  return (
    <div className="af-stack" style={{ gap: 12 }}>
      {comparison.gaps.map((gap: QualificationGap) => (
        <div key={gap.kind} className="af-alert af-alert-warning">
          <AlertTriangle size={20} strokeWidth={1.75} aria-hidden="true" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="af-alert-title">{gap.label}</p>
            {gap.kind === 'skills' && gap.missingSkills && gap.missingSkills.length > 0 ? (
              <>
                <p className="af-alert-body">You're missing:</p>
                <div className="af-tags" style={{ marginTop: 8 }}>
                  {gap.missingSkills.map((skill) => (
                    <span key={skill} className="badge badge-neutral">{skill}</span>
                  ))}
                </div>
              </>
            ) : (
              <p className="af-alert-body">
                Requires <strong>{gap.required}</strong>; you have <strong>{gap.current}</strong>.
              </p>
            )}
          </div>
        </div>
      ))}

      {comparison.met.length > 0 && (
        <p className="af-body-m af-met">
          <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
          You already meet: {comparison.met.map((m) => m.label.toLowerCase()).join(', ')}.
        </p>
      )}
    </div>
  );
};

/**
 * "Where do I stand?" — the visitor describes their background once, and we
 * show what they're missing for (a) this posting and (b) the most senior
 * position in the same department.
 *
 * It's a self-assessment: the public portal has no account to read a real
 * profile from, so the inputs are the candidate's own. Nothing is stored.
 */
export const QualificationGapPanel = ({
  posting,
  allPostings,
  department,
}: {
  posting: JobPosting;
  allPostings: JobPosting[];
  department: string;
}) => {
  const [open, setOpen] = useState(false);
  const [education, setEducation] = useState('');
  const [years, setYears] = useState('');
  const [skills, setSkills] = useState('');

  const background: CandidateBackground = useMemo(
    () => ({
      educationAttainment: education,
      experienceYears: years ? Number(years) : 0,
      skills: skills
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    }),
    [education, years, skills],
  );

  const topPosition = useMemo(
    () => findTopPositionInDepartment(allPostings, department),
    [allPostings, department],
  );

  const thisJobComparison = useMemo(
    () => compareQualifications(background, posting),
    [background, posting],
  );

  const topJobComparison = useMemo(
    () => (topPosition ? compareQualifications(background, topPosition) : null),
    [background, topPosition],
  );

  const isTopPositionThisJob = topPosition?.id === posting.id;
  const hasAnswered = Boolean(education || years || skills.trim());

  return (
    <section className="af-card" aria-labelledby="gap-title">
      <div className="af-card-head" style={{ marginBottom: open ? 20 : 0 }}>
        <span className="af-chip" aria-hidden="true"><TrendingUp size={20} strokeWidth={1.75} /></span>
        <div className="af-card-head-text">
          <h2 className="af-title-s" id="gap-title">Where do I stand?</h2>
          <p className="af-caption">
            See what you're missing for this role
            {topPosition && !isTopPositionThisJob
              ? `, and for ${topPosition.title}, the most senior ${department} position.`
              : '.'}
          </p>
        </div>
        <button
          type="button"
          className="af-textbtn"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="gap-body"
        >
          {open ? 'Hide' : 'Check Now'}
        </button>
      </div>

      {open && (
        <div id="gap-body" className="af-stack">
          {/* Self-assessment inputs */}
          <div className="af-fields">
            <div className="af-field">
              <label htmlFor="gap-education" className="af-label">Your highest educational attainment</label>
              <select
                id="gap-education"
                value={education}
                onChange={(event) => setEducation(event.target.value)}
                className="af-control"
              >
                <option value="">Select…</option>
                {EDUCATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="af-field">
              <label htmlFor="gap-years" className="af-label">Years of relevant work experience</label>
              <input
                id="gap-years"
                type="number"
                min={0}
                step={0.5}
                value={years}
                onChange={(event) => setYears(event.target.value)}
                placeholder="0"
                className="af-control"
              />
            </div>

            <div className="af-field af-field-full">
              <label htmlFor="gap-skills" className="af-label">Your skills</label>
              <textarea
                id="gap-skills"
                rows={3}
                value={skills}
                onChange={(event) => setSkills(event.target.value)}
                placeholder="One per line, or comma-separated, e.g. Network administration, SQL, Technical writing"
                className="af-control"
                aria-describedby="gap-skills-help"
              />
              <p id="gap-skills-help" className="af-helper">Nothing you type here is saved or submitted.</p>
            </div>
          </div>

          <div aria-live="polite">
            {!hasAnswered ? (
              <p className="af-notice af-notice-neutral">
                Fill in your background above and your gaps will appear here.
              </p>
            ) : (
              <div className="af-stack">
                {/* This posting */}
                <div>
                  <h3 className="af-headline" style={{ marginBottom: 12 }}>For this role: {posting.title}</h3>
                  <GapList comparison={thisJobComparison} />
                </div>

                {/* The department's most senior position */}
                {topPosition && topJobComparison && !isTopPositionThisJob && (
                  <div>
                    <h3 className="af-headline af-headline-icon">
                      <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" />
                      To reach {topPosition.title}
                    </h3>
                    <p className="af-body-m" style={{ margin: '4px 0 12px' }}>
                      The most senior position in {department}
                      {topPosition.salaryGrade != null ? ` (SG ${topPosition.salaryGrade})` : ''}.
                    </p>
                    <GapList comparison={topJobComparison} />
                  </div>
                )}

                {topPosition && isTopPositionThisJob && (
                  <div className="af-alert af-alert-info">
                    <Info size={20} strokeWidth={1.75} aria-hidden="true" />
                    <p className="af-alert-body">This is already the most senior {department} position on record.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
