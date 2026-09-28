import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Info,
  ListChecks,
  Lock,
  MapPin,
  Wallet,
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useHistoryBack } from '../hooks/useHistoryBack';
import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { getJobPostings, loadJobPostings } from '../lib/recruitmentData';
import { supabase } from '../lib/supabase';
import { JobPosting } from '../types/recruitment.types';
import { QualificationGapPanel } from './QualificationGapPanel';
import {
  APPLY_STEPS,
  ConfirmModal,
  PublicTopBar,
  StatusBadge,
  Stepper,
} from '../modules/applicant/flow/FlowUi';
import {
  buildPlantillaChoices,
  choiceLabel,
  draftKeysWithData,
  formatShortDate,
  isSelectable,
  loadDrafts,
  previouslySelectedKeys,
  saveDrafts,
  type PlantillaChoice,
} from '../modules/applicant/flow/applicationDrafts';

interface LandingJobData {
  id: number;
  title: string;
  department: string;
  itemNumber: string;
  postingDate: string;
  closingDate: string;
  type: string;
}

const DISABLED_REASON: Record<string, string> = {
  filled: 'This item has been filled. Choose another item.',
  closed: 'This item is closed. Choose another item.',
  applied: "You've already applied for this item. Choose another item.",
};

const formatPeso = (value: number) =>
  `Php ${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** One qualification standard. An unstated requirement reads as muted italic text, never a made-up value. */
const RequirementTile = ({ icon, label, value, emptyText }: { icon: ReactNode; label: string; value: string; emptyText: string }) => (
  <div className="af-req">
    <dt>{icon}{label}</dt>
    <dd className={value ? '' : 'is-empty'}>{value || emptyText}</dd>
  </div>
);

const Detail = ({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) => (
  <div className="af-detail">
    <dt>{icon}{label}</dt>
    <dd>{children}</dd>
  </div>
);

const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

export const JobDetailsPage = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const location = useLocation();
  const isAdminView = location.pathname.startsWith('/admin');
  // Previous page when there is one; otherwise the listing this page belongs to.
  const goBack = useHistoryBack(isAdminView ? '/admin/rsp' : '/');
  // Lazy initializer reads location.state immediately, preventing "not found" flash
  const [landingJob] = useState<LandingJobData | null>(() => location.state?.landingJob ?? null);
  const [job, setJob] = useState<JobPosting | null>(
    // The Job Portal navigates by item number and hands us the posting it
    // already loaded. Seed from it so the qualifications render on that path too.
    () => (location.state?.landingJob?.originalJob as JobPosting | undefined) ?? null,
  );
  const [allPostings, setAllPostings] = useState<JobPosting[]>([]);
  /** False until the postings cache has been checked, so a direct link shows a skeleton, not "not found". */
  const [loaded, setLoaded] = useState(() => Boolean(location.state?.landingJob?.originalJob));
  /** Name of the applicant placed in each filled slot, for the admin view. */
  const [hireNamesBySlotId, setHireNamesBySlotId] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    // The route param is the item number on the portal path and the id on
    // the admin path — accept either.
    const find = (jobs: JobPosting[]) => jobs.find((j) => j.id === jobId || j.jobCode === jobId) ?? null;

    const cached = getJobPostings();
    setAllPostings(cached);
    setJob((current) => current ?? find(cached));
    if (find(cached)) setLoaded(true);

    // A direct link or refresh can arrive before the cache is warm.
    void loadJobPostings()
      .then((fresh) => {
        if (cancelled) return;
        const jobs = fresh.length > 0 ? fresh : getJobPostings();
        setAllPostings(jobs);
        // Prefer the fresh row: its plantilla slot statuses are current.
        const match = find(jobs);
        if (match) setJob(match);
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [jobId]);

  // Who was placed in each filled slot. Admin view only — applicants have no
  // business seeing who took the other plantilla items.
  useEffect(() => {
    const filled = (job?.plantillaSlots ?? []).filter((slot) => slot.filledByApplicantId);
    if (!isAdminView || filled.length === 0) {
      setHireNamesBySlotId({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await (supabase as any)
        .from('applicants')
        .select('id, first_name, last_name')
        .in('id', filled.map((slot) => slot.filledByApplicantId));
      if (cancelled || error || !Array.isArray(data)) return;

      const nameById = new Map<string, string>(
        data.map((row: any) => [
          String(row.id),
          [row.first_name, row.last_name].filter(Boolean).join(' ').trim(),
        ]),
      );
      setHireNamesBySlotId(
        Object.fromEntries(
          filled
            .map((slot) => [slot.id, nameById.get(String(slot.filledByApplicantId)) ?? ''])
            .filter(([, name]) => Boolean(name)),
        ),
      );
    })();
    return () => { cancelled = true; };
  }, [job?.id, job?.plantillaSlots, isAdminView]);

  // ── Step 1 state: which plantilla items the applicant is applying for ─────
  const choices: PlantillaChoice[] = useMemo(() => {
    if (job) return buildPlantillaChoices(job);
    // Arrived from a vacancy card whose posting row isn't loaded (or no longer
    // matches): it still advertises exactly one item, its own item number.
    if (landingJob && loaded) {
      return buildPlantillaChoices({
        id: String(landingJob.id),
        jobCode: landingJob.itemNumber,
        status: 'Active',
        applicationDeadline: landingJob.closingDate,
      } as JobPosting);
    }
    return [];
  }, [job, landingJob, loaded]);
  const selectable = useMemo(() => choices.filter(isSelectable), [choices]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const [pendingDeselect, setPendingDeselect] = useState<PlantillaChoice | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(isDesktop);

  // Restore the previous selection when coming back from Step 2; otherwise,
  // with exactly one open item, preselect it (the step is still shown).
  const postingKey = job?.id ?? (landingJob ? String(landingJob.id) : '');
  useEffect(() => {
    if (!postingKey || choices.length === 0 || seededFor === postingKey) return;
    const openKeys = new Set(selectable.map((choice) => choice.key));
    const restored = previouslySelectedKeys(postingKey).filter((key) => openKeys.has(key));
    setSelectedKeys(restored.length > 0 ? restored : selectable.length === 1 ? [selectable[0].key] : []);
    setSeededFor(postingKey);
  }, [postingKey, choices.length, selectable, seededFor]);

  // The summary is collapsible on mobile only; on desktop it is always open.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const sync = () => { if (mql.matches) setSummaryOpen(true); };
    mql.addEventListener?.('change', sync);
    return () => mql.removeEventListener?.('change', sync);
  }, []);

  const toggleChoice = (choice: PlantillaChoice) => {
    if (!isSelectable(choice)) return;
    if (selectedKeys.includes(choice.key)) {
      // Unticking an item that already has answers throws them away — ask first.
      if (postingKey && draftKeysWithData(postingKey).has(choice.key)) {
        setPendingDeselect(choice);
        return;
      }
      setSelectedKeys((prev) => prev.filter((key) => key !== choice.key));
    } else {
      setSelectedKeys((prev) => [...prev, choice.key]);
    }
  };

  const confirmDeselect = () => {
    if (!pendingDeselect) return;
    const key = pendingDeselect.key;
    // Drop the stored copy so re-selecting starts blank.
    const state = loadDrafts();
    delete state.drafts[key];
    state.choices = state.choices.filter((choice) => choice.key !== key);
    saveDrafts(state);
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
    setPendingDeselect(null);
  };

  const selectAllOpen = () => setSelectedKeys(selectable.map((choice) => choice.key));

  if (!job && !landingJob) {
    return (
      <div className="abyan-ds af">
        {!isAdminView && <PublicTopBar />}
        <main className="af-main">
          <div className="af-container">
            {!loaded ? (
              <div className="af-two-col" aria-busy="true" aria-label="Loading job posting">
                <div className="af-card af-stack">
                  <div className="af-skel" style={{ height: 32, width: '60%' }} />
                  <div className="af-skel" style={{ height: 120 }} />
                  <div className="af-skel" style={{ height: 200 }} />
                </div>
                <div className="af-card af-stack">
                  <div className="af-skel" style={{ height: 24, width: '50%' }} />
                  <div className="af-skel" style={{ height: 72 }} />
                  <div className="af-skel" style={{ height: 72 }} />
                </div>
              </div>
            ) : (
              <div className="af-card af-empty">
                <Briefcase size={32} strokeWidth={1.75} aria-hidden="true" />
                <h1 className="af-title-s">Job posting not found</h1>
                <p className="af-body-m">It may have been closed or removed. Browse the current vacancies instead.</p>
                <button type="button" onClick={goBack} className="btn btn-md btn-primary">
                  <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
                  Go Back
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const title = landingJob?.title || job?.title || '';
  const itemNo = landingJob?.itemNumber || job?.jobCode || '';
  const department = job?.department || landingJob?.department || '';
  const postingDate = landingJob?.postingDate || job?.postedDate || '';
  const closingDate = landingJob?.closingDate || job?.applicationDeadline || '';

  // A posting can advertise several identical vacancies, each with its own
  // plantilla item number. `itemNo` above is only the first one.
  const slots = job?.plantillaSlots ?? [];
  const isMultiSlot = slots.length > 1;
  const openSlots = slots.filter((slot) => slot.status === 'open');
  const selectedChoices = choices.filter((choice) => selectedKeys.includes(choice.key));
  const canContinue = selectedChoices.length > 0;

  // Salary grade can live on the posting or on each plantilla item. Show the
  // posting's, else the items' ("SG 10", or a range when they differ).
  const salaryGradeText = (() => {
    if (job?.salaryGrade != null) return `SG ${job.salaryGrade}`;
    const grades = Array.from(new Set(choices.map((c) => c.salaryGrade).filter((g): g is number => g != null))).sort((a, b) => a - b);
    if (grades.length === 0) return 'Not specified';
    return grades.length === 1 ? `SG ${grades[0]}` : `SG ${grades[0]}–${grades[grades.length - 1]}`;
  })();

  const handleContinue = () => {
    if (!canContinue || !postingKey) return;
    navigate('/apply', {
      state: {
        landingJob: {
          title,
          department,
          itemNumber: itemNo,
          jobPostingId: postingKey,
          plantillaSlots: slots,
          // Step 2 opens one form tab per item chosen here.
          selectedChoices,
        },
      },
    });
  };

  const summaryCard = (
    <details
      className="af-card af-collapse"
      open={summaryOpen}
      onToggle={(event) => setSummaryOpen((event.currentTarget as HTMLDetailsElement).open)}
      style={{ gridArea: 'summary' }}
    >
      <summary>
        <span className="af-chip" aria-hidden="true"><Briefcase size={20} strokeWidth={1.75} /></span>
        <span className="af-card-head-text">
          <span className="af-title-s" style={{ display: 'block' }}>Posting summary</span>
          <span className="af-caption" style={{ display: 'block' }}>{department || 'Department not specified'}</span>
        </span>
        <ChevronDown className="af-collapse-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
      </summary>

      <dl className="af-details">
        <Detail icon={<MapPin size={18} strokeWidth={1.75} />} label="Place of Assignment">
          {department || 'Not specified'}
        </Detail>
        <Detail icon={<Award size={18} strokeWidth={1.75} />} label="Salary Grade">
          {salaryGradeText}
        </Detail>
        <Detail icon={<Calendar size={18} strokeWidth={1.75} />} label="Posted">
          {formatShortDate(postingDate)}
        </Detail>
        <Detail icon={<Clock size={18} strokeWidth={1.75} />} label="Application Closes">
          {formatShortDate(closingDate)}
        </Detail>
        {job?.monthlySalary != null && (
          <Detail icon={<Wallet size={18} strokeWidth={1.75} />} label="Monthly Salary">
            {formatPeso(job.monthlySalary)}
          </Detail>
        )}
      </dl>

      {job?.summary && (
        <>
          <hr className="af-divider" />
          <p className="af-caps">Position summary</p>
          <p className="af-text">{job.summary}</p>
        </>
      )}

      {job && (
        <>
          <hr className="af-divider" />
          <p className="af-caps">Qualification standards</p>
          <p className="af-body-m" style={{ marginBottom: 16 }}>
            What this position requires. Anything marked "Not specified" has no stated requirement.
          </p>
          <dl className="af-req-grid">
            <RequirementTile
              icon={<Award size={18} strokeWidth={1.75} />}
              label="Education"
              value={
                job.qualifications.education
                  ? `${job.qualifications.education}${job.qualifications.educationField ? ` in ${job.qualifications.educationField}` : ' (any field)'}`
                  : ''
              }
              emptyText="Not specified"
            />
            <RequirementTile
              icon={<Briefcase size={18} strokeWidth={1.75} />}
              label="Work Experience"
              value={(() => {
                const total = Number(job.qualifications.experience.years || 0);
                const field = job.qualifications.experience.field;
                if (total <= 0) {
                  // Years may be 0 while a domain of experience is still required.
                  return field ? `Relevant experience in ${field}` : '';
                }
                const years = Math.floor(total);
                const months = Math.round((total - years) * 12);
                const parts: string[] = [];
                if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
                if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
                const duration = parts.join(' ');
                return field ? `${duration} in ${field}` : duration;
              })()}
              emptyText="None required"
            />
            <RequirementTile icon={<BookOpen size={18} strokeWidth={1.75} />} label="Training" value={job.training ?? ''} emptyText="None required" />
            <RequirementTile icon={<Award size={18} strokeWidth={1.75} />} label="Eligibility" value={job.eligibility ?? ''} emptyText="Not specified" />
            <RequirementTile icon={<ListChecks size={18} strokeWidth={1.75} />} label="Competency" value={job.competency ?? ''} emptyText="Not specified" />
          </dl>

          {job.qualifications.skills.length > 0 && (
            <>
              <p className="af-caps" style={{ marginTop: 20 }}>Required skills</p>
              <div className="af-tags">
                {job.qualifications.skills.map((skill) => (
                  <span key={skill} className="badge badge-tint">{skill}</span>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </details>
  );

  const requiredDocs = job && !landingJob
    ? job.requiredDocuments || ['Resume/CV', 'Application Letter']
    : [
        'Personal Data Sheet (PDS) with Work Experience Sheet',
        'Application Letter',
        'Proof of eligibility/rating/license',
        'Transcript of Records',
      ];
  const deadlineText = closingDate ? formatShortDate(closingDate) : 'the closing date';

  const moreCards = (
    <div className="af-stack" style={{ gridArea: 'more' }}>
      {/* Where do I stand? — self-assessment against this posting */}
      {job && <QualificationGapPanel posting={job} allPostings={allPostings} department={department} />}

      {job && !landingJob && job.responsibilities && job.responsibilities.filter((r) => r.trim()).length > 0 && (
        <section className="af-card" aria-labelledby="jd-resp">
          <div className="af-card-head">
            <span className="af-chip" aria-hidden="true"><ListChecks size={20} strokeWidth={1.75} /></span>
            <h2 className="af-title-s" id="jd-resp">Responsibilities</h2>
          </div>
          <ul className="af-list">
            {job.responsibilities.filter((r) => r.trim()).map((resp, idx) => (
              <li key={idx}><CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />{resp}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="af-card" aria-labelledby="jd-docs">
        <div className="af-card-head">
          <span className="af-chip" aria-hidden="true"><FileText size={20} strokeWidth={1.75} /></span>
          <div className="af-card-head-text">
            <h2 className="af-title-s" id="jd-docs">Required documents</h2>
            <p className="af-caption">Submit these before {deadlineText} as part of your application.</p>
          </div>
        </div>
        <ul className="af-list">
          {requiredDocs.map((doc, idx) => (
            <li key={idx}><CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />{doc}</li>
          ))}
        </ul>

        <hr className="af-divider" />
        <p className="af-caps">Important instructions</p>
        <p className="af-body-m">
          Address your application letter to the head of office and attach the required documents listed above.
          Applications received after {deadlineText} may not be considered.
        </p>

        <div className="af-alert af-alert-info" style={{ marginTop: 20 }}>
          <Info size={20} strokeWidth={1.75} aria-hidden="true" />
          <div>
            <p className="af-alert-title">Equal opportunities for employment</p>
            <p className="af-alert-body">
              This Office highly encourages all interested and qualified applicants to apply, which include persons with
              disability (PWD) and members of the indigenous communities, irrespective of sexual orientation and gender
              identities and/or expression, civil status, religion, and political affiliation. This Office does not
              discriminate in the selection of employees based on the aforementioned pursuant to Equal Opportunities for
              Employment Principle (EOP).
            </p>
          </div>
        </div>
      </section>
    </div>
  );

  // ── Right column: the chooser (public) or the slot breakdown (RSP) ─────────
  const chooser = (
    <section className="af-card" aria-labelledby="jd-choose">
      <div className="af-chooser-head">
        <div className="af-card-head" style={{ marginBottom: 0 }}>
          <span className="af-chip" aria-hidden="true"><Building2 size={20} strokeWidth={1.75} /></span>
          <h2 className="af-title-s" id="jd-choose">Choose your plantilla items ({choices.length})</h2>
        </div>
        <span className="badge badge-info af-counter" aria-live="polite">
          {selectedChoices.length} selected
        </span>
      </div>

      <p className="af-body-m" style={{ marginTop: 12 }}>
        Select the plantilla items you want to apply for. You'll fill out a separate application for each one.
      </p>
      {selectable.length > 1 && (
        <button
          type="button"
          className="af-textbtn"
          onClick={selectAllOpen}
          disabled={selectedChoices.length === selectable.length}
          style={{ marginTop: 8 }}
        >
          Select all open items
        </button>
      )}

      {!loaded && choices.length === 0 ? (
        <div className="af-stack" aria-busy="true" aria-label="Loading plantilla items" style={{ margin: '16px 0 20px', gap: 12 }}>
          <div className="af-skel" style={{ height: 76 }} />
          <div className="af-skel" style={{ height: 76 }} />
        </div>
      ) : selectable.length === 0 ? (
        <div className="af-empty">
          <Lock size={28} strokeWidth={1.75} aria-hidden="true" />
          <p className="af-title-s">No open plantilla items right now</p>
          <p className="af-body-m">Every item on this posting has been filled or closed.</p>
          <button type="button" className="btn btn-md btn-secondary" onClick={() => navigate('/job-portal')}>
            Back to Vacancies
          </button>
        </div>
      ) : null}

      <ul className="af-choices">
        {choices.map((choice) => {
          const selected = selectedKeys.includes(choice.key);
          const meta = (
            <div className="af-choice-body">
              <div className="af-choice-row">
                <span className="af-choice-name">Plantilla {choice.slotNumber}</span>
                {choice.salaryGrade != null && <span className="af-choice-sg">SG {choice.salaryGrade}</span>}
              </div>
              <div className="af-choice-row" style={{ marginTop: 6 }}>
                <span className="af-choice-meta" style={{ marginTop: 0 }}>
                  Plantilla Item No. {choice.itemNumber || '—'}
                </span>
                <StatusBadge status={choice.status} />
              </div>
              {choice.monthlySalary != null && (
                <p className="af-choice-meta">{formatPeso(choice.monthlySalary)} monthly</p>
              )}
            </div>
          );

          if (!isSelectable(choice)) {
            const reason = DISABLED_REASON[choice.status] ?? '';
            return (
              <li key={choice.key}>
                <div className="af-choice" aria-disabled="true" tabIndex={0} data-tooltip={reason} title={reason}>
                  <Lock className="af-choice-lock" strokeWidth={1.75} aria-hidden="true" />
                  {meta}
                  <span className="af-sr-only">{reason}</span>
                </div>
              </li>
            );
          }

          return (
            <li key={choice.key}>
              <label className="af-choice" data-selected={selected}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleChoice(choice)}
                  aria-label={`${choiceLabel(choice)}${choice.salaryGrade != null ? `, SG ${choice.salaryGrade}` : ''}, ${choice.status === 'closing' ? 'closing soon' : 'open'}`}
                />
                {meta}
              </label>
            </li>
          );
        })}
      </ul>

      {selectable.length > 0 && (
        <button
          type="button"
          className="btn btn-md btn-primary btn-block af-desktop-only"
          onClick={handleContinue}
          disabled={!canContinue}
        >
          Continue to Application
          <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
    </section>
  );

  const adminSlots = (
    <section className="af-card" aria-labelledby="jd-slots">
      <div className="af-card-head">
        <span className="af-chip" aria-hidden="true"><Building2 size={20} strokeWidth={1.75} /></span>
        <div className="af-card-head-text">
          <h2 className="af-title-s" id="jd-slots">Plantilla items ({choices.length})</h2>
          <p className="af-caption">
            {openSlots.length} open · {slots.filter((slot) => slot.status === 'filled').length} filled ·{' '}
            {slots.filter((slot) => slot.status === 'closed').length} closed
          </p>
        </div>
      </div>
      <ul className="af-choices" style={{ marginBottom: 0 }}>
        {choices.map((choice) => (
          <li key={choice.key} className="af-choice" style={{ cursor: 'default' }}>
            <div className="af-choice-body">
              <div className="af-choice-row">
                <span className="af-choice-name">Plantilla {choice.slotNumber}</span>
                <StatusBadge status={choice.status === 'applied' || choice.status === 'closing' ? 'open' : choice.status} />
              </div>
              <p className="af-choice-meta">
                Plantilla Item No. {choice.itemNumber || '—'}
                {choice.salaryGrade != null ? ` · SG ${choice.salaryGrade}` : ''}
              </p>
              {hireNamesBySlotId[choice.key] && (
                <p className="af-choice-meta">Filled by {hireNamesBySlotId[choice.key]}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="abyan-ds af">
      {!isAdminView && <PublicTopBar />}

      <section className="af-hero">
        <div className="af-container">
          <button type="button" onClick={goBack} className="btn btn-sm btn-ghost-white af-hero-back">
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            Back
          </button>
          <h1>{title}</h1>
          <p className="af-hero-sub">
            <Briefcase size={18} strokeWidth={1.75} aria-hidden="true" />
            {isMultiSlot
              ? `${slots.length} Plantilla Items · ${openSlots.length} open`
              : `Plantilla Item No. ${slots[0]?.itemNumber || itemNo}`}
            {department ? ` · ${department}` : ''}
          </p>
        </div>
      </section>

      {!isAdminView && (
        <div className="af-stepper-wrap">
          <div className="af-container">
            <Stepper steps={APPLY_STEPS} current={0} />
          </div>
        </div>
      )}

      <main className="af-main">
        <div className="af-container">
          <div className="af-step1">
            {summaryCard}
            <div className="af-sticky-col" style={{ gridArea: 'chooser' }}>
              {isAdminView ? adminSlots : chooser}
            </div>
            {moreCards}
          </div>
        </div>
      </main>

      {!isAdminView && selectable.length > 0 && (
        <div className="af-actionbar af-mobile-only">
          <button type="button" className="btn btn-md btn-primary" onClick={handleContinue} disabled={!canContinue}>
            Continue to Application
            <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      )}

      <ConfirmModal
        open={Boolean(pendingDeselect)}
        title={pendingDeselect ? `Discard your answers for Plantilla ${pendingDeselect.slotNumber}?` : ''}
        confirmLabel="Discard Answers"
        destructive
        onConfirm={confirmDeselect}
        onCancel={() => setPendingDeselect(null)}
      >
        You've started an application for {pendingDeselect ? choiceLabel(pendingDeselect) : ''}. Removing it deletes those
        answers. If you select it again, you'll start with a blank form.
      </ConfirmModal>
    </div>
  );
};
