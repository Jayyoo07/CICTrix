import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  LogOut,
  Search,
  Trash2,
  UserCircle2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import abyanLogo from '../../assets/abyan-logo.png';
import { Dialog } from '../../components/Dialog';
import { POSITION_TO_DEPARTMENT_MAP } from '../../constants/positions';
import { isPositionAssignedToInterviewer, resolveAssignedPositionsForInterviewer } from '../../lib/interviewerAccess';
import { mockDatabase } from '../../lib/mockDatabase';
import { ensureRecruitmentSeedData, getAuthoritativeJobPostings, getJobPostingsFromSupabase } from '../../lib/recruitmentData';
import { supabase } from '../../lib/supabase';
import '../../styles/interviewer.css';
import '../../styles/abyan-tokens.css';
import '../../styles/interviewer-dashboard.css';
import type { JobPosting as RecruitmentJobPosting } from '../../types/recruitment.types';

interface JobPosting {
  id: number;
  title: string;
  item_number: string;
  department: string;
  office: string;
  status: string;
  created_at: string;
  applicant_count: number;
  evaluated_count?: number;
  is_fully_evaluated?: boolean;
  interview_date?: string;
}

interface Applicant {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  position: string;
  office: string;
  contact_number: string;
  status: string;
  created_at: string;
  evaluation_status: 'Completed' | 'In Progress' | 'Not Yet Rated';
}

// Helper function to construct full name
const getFullName = (applicant: Applicant): string => {
  const parts = [applicant.first_name];
  if (applicant.middle_name) {
    parts.push(applicant.middle_name);
  }
  parts.push(applicant.last_name);
  return parts.join(' ');
};

type KpiKey = 'pending' | 'today' | 'completed';

interface KpiItem {
  id: string;
  name: string;
  position: string;
  department: string;
  titleKey: string;
  /** Interview date for pending/today, evaluation timestamp for completed. */
  date: string;
}

interface KpiConfig {
  label: string;
  tone: 'warning' | 'primary' | 'success';
  icon: LucideIcon;
  subtext: (count: number) => string;
  peopleHeading: string;
  emptyTitle: string;
  emptyBody: string;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const KPI_ORDER: KpiKey[] = ['pending', 'today', 'completed'];

const KPI_CONFIG: Record<KpiKey, KpiConfig> = {
  pending: {
    label: 'To evaluate',
    tone: 'warning',
    icon: ClipboardList,
    subtext: (n) => `${plural(n, 'applicant')} waiting`,
    peopleHeading: 'Next to evaluate',
    emptyTitle: 'Nothing to evaluate 🎉',
    emptyBody: 'Every assigned applicant already has a submitted evaluation.',
  },
  today: {
    label: 'Due today',
    tone: 'primary',
    icon: CalendarClock,
    subtext: (n) => `${plural(n, 'interview')} scheduled`,
    peopleHeading: 'Scheduled today',
    emptyTitle: 'No interviews today',
    emptyBody: 'Nothing is scheduled for today. Upcoming dates are listed in the table.',
  },
  completed: {
    label: 'Completed',
    tone: 'success',
    icon: CircleCheck,
    subtext: (n) => `${n} submitted this month`,
    peopleHeading: 'Recently submitted',
    emptyTitle: 'No evaluations yet this month',
    emptyBody: 'Evaluations you submit this month will be listed here.',
  },
};

const PAGE_SIZE = 6;
const QUICK_VIEW_MAX_ROWS = 5;
const QUICK_VIEW_MAX_PEOPLE = 3;

const pad2 = (n: number) => String(n).padStart(2, '0');
const toLocalKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Date-only strings ("2026-09-28") are calendar dates, not UTC instants, so
// they are parsed as local dates to avoid shifting a day in the viewer's zone.
const parseDate = (raw: unknown): Date | null => {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const dateKey = (raw: unknown) => {
  const d = parseDate(raw);
  return d ? toLocalKey(d) : '';
};

// Design Identity §9.5: dates render as "MMM DD, YYYY".
const formatDate = (raw: string) => {
  const d = parseDate(raw);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—';
};

const formatShortDate = (raw: string) => {
  const d = parseDate(raw);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date';
};

type DateStatus = 'today' | 'upcoming' | 'past';

const DATE_BADGE: Record<DateStatus, { label: string; className: string }> = {
  today: { label: 'Today', className: 'badge-warning' },
  upcoming: { label: 'Upcoming', className: 'badge-info' },
  past: { label: 'Past', className: 'badge-neutral' },
};

const getDateStatus = (raw: string, todayKey: string): DateStatus | null => {
  const key = dateKey(raw);
  if (!key) return null;
  if (key === todayKey) return 'today';
  return key > todayKey ? 'upcoming' : 'past';
};

const applicantDisplayName = (applicant: any): string => {
  const name = [applicant?.first_name, applicant?.last_name]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return name || String(applicant?.full_name ?? applicant?.email ?? 'Unnamed applicant');
};

const evaluationTimestamp = (evaluation: any) =>
  String(evaluation?.created_at ?? evaluation?.submitted_at ?? evaluation?.updated_at ?? '').trim();

// Design Identity §9.6: first, last, current ±1, with ellipses past 7 pages.
const getPageList = (current: number, total: number): Array<number | 'gap'> => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
};

interface InterviewerSessionInfo {
  email: string;
  name: string;
}

const isDemoApplicant = (applicant: any): boolean => {
  const applicantId = String(applicant?.id || '').toLowerCase();
  const applicantEmail = String(applicant?.email || '').toLowerCase();
  return applicantId.startsWith('mock-') || applicantEmail.endsWith('@example.com');
};

const fetchApplicantsFromClient = async (client: any): Promise<any[]> => {
  // Use backend API to bypass RLS on Supabase
  if (client && typeof client.from === 'function') {
    try {
      const response = await fetch('/api/applicants/?skip=0&limit=1000');
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fall back to direct query if API fails
      const { data } = await client.from('applicants').select('*');
      return data || [];
    }
  }
  const { data } = await client.from('applicants').select('*');
  return data || [];
};

const fetchEvaluationsFromClient = async (client: any): Promise<any[]> => {
  const { data } = await client.from('evaluations').select('*');
  return data || [];
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const buildJobsFromPostings = (
  jobRows: RecruitmentJobPosting[],
  allApplicants: any[],
  allEvaluations: any[] = [],
) => {
  // Dedup defensively: same posting may exist twice in Supabase (e.g. created via
  // both job_postings and jobs tables, or a duplicate row was inserted). Keep the
  // first occurrence by jobCode → falls back to normalized title when jobCode is
  // empty. This is a display-layer guard and does not modify the DB.
  const seenKeys = new Set<string>();
  const dedupedRows: RecruitmentJobPosting[] = [];
  for (const job of jobRows || []) {
    const code = String(job?.jobCode || '').trim();
    const title = normalizeText(String(job?.title || ''));
    const key = code || title;
    if (!key) continue;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    dedupedRows.push(job);
  }

  const activeJobs = dedupedRows.filter((job) => String(job?.status || '').toLowerCase() === 'active');
  const activeTitleSet = new Set(activeJobs.map((job) => normalizeText(String(job?.title || ''))).filter(Boolean));

  const visibleApplicants = (allApplicants || []).filter((applicant) => {
    const position = normalizeText(String(applicant?.position || ''));
    return position && activeTitleSet.has(position);
  });

  const applicantCountByTitle = new Map<string, number>();
  visibleApplicants.forEach((applicant) => {
    const key = normalizeText(String(applicant?.position || ''));
    if (!key) return;
    applicantCountByTitle.set(key, (applicantCountByTitle.get(key) || 0) + 1);
  });

  // Build a set of applicant ids that already have an evaluation so we can
  // compute, per job, how many of its applicants are done.
  const evaluatedApplicantIds = new Set<string>(
    (allEvaluations || [])
      .map((evaluation: any) => String(evaluation?.applicant_id ?? '').trim())
      .filter(Boolean),
  );

  const evaluatedCountByTitle = new Map<string, number>();
  visibleApplicants.forEach((applicant) => {
    const applicantId = String(applicant?.id ?? '').trim();
    if (!applicantId || !evaluatedApplicantIds.has(applicantId)) return;
    const key = normalizeText(String(applicant?.position || ''));
    if (!key) return;
    evaluatedCountByTitle.set(key, (evaluatedCountByTitle.get(key) || 0) + 1);
  });

  // Pick the earliest applicant.interview_date per job — that's what RSP
  // published via the Pending Assignment workflow.
  const interviewDateByTitle = new Map<string, string>();
  visibleApplicants.forEach((applicant) => {
    const raw = String(applicant?.interview_date ?? '').trim();
    if (!raw) return;
    const key = normalizeText(String(applicant?.position || ''));
    if (!key) return;
    const existing = interviewDateByTitle.get(key);
    if (!existing || new Date(raw).getTime() < new Date(existing).getTime()) {
      interviewDateByTitle.set(key, raw);
    }
  });

  const jobs = activeJobs
    .map((job, index) => {
      const normalizedTitle = normalizeText(String(job?.title || ''));
      const office = String(job?.department || '').trim() || POSITION_TO_DEPARTMENT_MAP[job.title] || 'N/A';
      const numericId = Number(job.id);
      const applicantCount = applicantCountByTitle.get(normalizedTitle) || 0;
      const evaluatedCount = evaluatedCountByTitle.get(normalizedTitle) || 0;
      const interviewDate = interviewDateByTitle.get(normalizedTitle) || '';

      return {
        id: Number.isFinite(numericId) ? numericId : index + 1,
        title: job.title,
        item_number: job.jobCode || 'N/A',
        department: office,
        office,
        status: 'Open',
        created_at: job.postedDate || new Date().toISOString(),
        applicant_count: applicantCount,
        evaluated_count: evaluatedCount,
        is_fully_evaluated: applicantCount > 0 && evaluatedCount >= applicantCount,
        interview_date: interviewDate,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    jobs,
    visibleApplicants,
  };
};

const filterJobsByAssignments = (jobRows: RecruitmentJobPosting[], assignedPositions: string[]) => {
  if (assignedPositions.length === 0) return jobRows;
  return jobRows.filter((job) => isPositionAssignedToInterviewer(String(job?.title ?? ''), assignedPositions));
};

// Compact, fixed-height summary for one KPI. Content is capped (departments +
// people) instead of scrolled; anything beyond the cap goes to "View all",
// which filters the table below.
function KpiQuickView({
  kpi,
  items,
  onClose,
  onViewAll,
  onPickDepartment,
}: {
  kpi: KpiKey;
  items: KpiItem[];
  onClose: () => void;
  onViewAll: () => void;
  onPickDepartment: (department: string) => void;
}) {
  const config = KPI_CONFIG[kpi];
  const headingId = `ivd-qv-${kpi}-title`;

  const departments = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => counts.set(item.department, (counts.get(item.department) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items]);

  // Five rows total: the top applicants first, departments fill the rest.
  const people = items.slice(0, QUICK_VIEW_MAX_PEOPLE);
  const shownDepartments = departments.slice(0, QUICK_VIEW_MAX_ROWS - people.length);
  const hasMore = departments.length > shownDepartments.length || items.length > people.length;

  return (
    <div id={`ivd-qv-${kpi}`} className="ivd-qv" role="dialog" aria-modal="false" aria-labelledby={headingId}>
      <div className="ivd-qv-head">
        <h3 id={headingId}>{config.label}</h3>
        <button type="button" className="ivd-qv-close" onClick={onClose} aria-label="Close quick view">
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="ivd-qv-empty">
          <p className="text-headline-m">{config.emptyTitle}</p>
          <p className="text-body-m">{config.emptyBody}</p>
        </div>
      ) : (
        <>
          <div className="ivd-qv-section">
            <p className="ivd-qv-overline text-caps">By department</p>
            <ul className="ivd-qv-list">
              {shownDepartments.map(([department, count]) => (
                <li key={department}>
                  <button
                    type="button"
                    className="ivd-qv-dept"
                    onClick={() => onPickDepartment(department)}
                    aria-label={`Show ${config.label.toLowerCase()} postings in ${department} (${count})`}
                  >
                    <span className="ivd-qv-dept-name">
                      <Building2 size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span>{department}</span>
                    </span>
                    <span className="badge badge-tint">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="ivd-qv-section">
            <p className="ivd-qv-overline text-caps">{config.peopleHeading}</p>
            <ul className="ivd-qv-list">
              {people.map((person) => (
                <li key={`${person.id}-${person.titleKey}`} className="ivd-qv-person">
                  <div>
                    <span className="ivd-qv-person-name">{person.name}</span>
                    <span className="ivd-qv-person-pos text-body-s">{person.position}</span>
                  </div>
                  <span className="ivd-qv-person-date text-body-s">
                    {kpi === 'completed' ? `Submitted ${formatShortDate(person.date)}` : formatShortDate(person.date)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ivd-qv-foot">
            <button type="button" className="ivd-link" onClick={onViewAll}>
              {hasMore ? `View all (${items.length})` : 'Show in table'}
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function InterviewerDashboard({
  session,
  onLogout,
}: {
  session?: InterviewerSessionInfo | null;
  onLogout?: () => void;
}) {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [kpiFilter, setKpiFilter] = useState<KpiKey | null>(null);
  const [openKpi, setOpenKpi] = useState<KpiKey | null>(null);
  const [page, setPage] = useState(1);
  const kpiButtonRefs = useRef<Partial<Record<KpiKey, HTMLButtonElement | null>>>({});
  const kpiCellRefs = useRef<Partial<Record<KpiKey, HTMLDivElement | null>>>({});
  const tableSectionRef = useRef<HTMLElement | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [applicantToDelete, setApplicantToDelete] = useState<Applicant | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const syncJobs = () => {
      void fetchJobsAndApplicants(true);
    };

    const onStorage = (event: StorageEvent) => {
      if (
        !event.key ||
        event.key === 'cictrix_rater_assigned_positions' ||
        event.key === 'cictrix_job_postings' ||
        event.key === 'cictrix_authoritative_job_postings'
      ) {
        void fetchJobsAndApplicants(true);
      }
    };

    void fetchJobsAndApplicants(false);
    
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', syncJobs);
      window.addEventListener('cictrix:job-postings-updated', syncJobs as EventListener);
      window.addEventListener('storage', onStorage);

      return () => {
        window.removeEventListener('focus', syncJobs);
        window.removeEventListener('cictrix:job-postings-updated', syncJobs as EventListener);
        window.removeEventListener('storage', onStorage);
      };
    }
  }, []);

  useRealtimeRefresh({
    channel: 'interviewer-dashboard',
    tables: ['applicants', 'evaluations', 'job_postings'],
    onChange: useCallback(() => { void fetchJobsAndApplicants(true); }, []),
  });

  const fetchJobsAndApplicants = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      // CRITICAL: Always fetch applicants from Supabase (as per user requirement: "all datas must be stored in supabase")
      const primaryClient = supabase; // Always use Supabase for applicants
      const secondaryClient = (mockDatabase as any); // Fallback only if Supabase fails

      let allApplicants: any[] = [];
      let allEvaluations: any[] = [];
      ensureRecruitmentSeedData();
      const { positions } = await resolveAssignedPositionsForInterviewer(session?.email);
      
      // CRITICAL: Fetch job postings from Supabase first (source of truth), fallback to localStorage
      let canonicalJobPostings: RecruitmentJobPosting[] = [];
      try {
        canonicalJobPostings = await getJobPostingsFromSupabase();
        if (canonicalJobPostings.length === 0) {
          console.log('[INTERVIEWER] No jobs from Supabase, falling back to localStorage');
          canonicalJobPostings = getAuthoritativeJobPostings();
        } else {
          console.log('[INTERVIEWER] ✓ Loaded', canonicalJobPostings.length, 'jobs from Supabase');
        }
      } catch (err) {
        console.warn('[INTERVIEWER] Failed to fetch jobs from Supabase, using localStorage:', err);
        canonicalJobPostings = getAuthoritativeJobPostings();
      }
      
      const canonicalJobRows = filterJobsByAssignments(canonicalJobPostings, positions);

      try {
        allApplicants = await fetchApplicantsFromClient(primaryClient);
        allEvaluations = await fetchEvaluationsFromClient(primaryClient);
      } catch (primaryErr) {
        console.warn('Primary interviewer data source failed:', primaryErr);
      }

      if ((!allApplicants || allApplicants.length === 0)) {
        try {
          allApplicants = await fetchApplicantsFromClient(secondaryClient);
          allEvaluations = await fetchEvaluationsFromClient(secondaryClient);
        } catch (secondaryErr) {
          console.warn('Secondary interviewer data source failed:', secondaryErr);
        }
      }

      allApplicants = (allApplicants || []).filter((item) => !isDemoApplicant(item));

      // Single source of truth: use canonical RSP/Admin postings only.
      const { jobs: jobsFromPostings, visibleApplicants } = buildJobsFromPostings(canonicalJobRows, allApplicants, allEvaluations);
      const visibleApplicantIds = new Set(
        visibleApplicants.map((applicant: any) => String(applicant?.id ?? '').trim()).filter(Boolean)
      );
      const visibleEvaluations = (allEvaluations || []).filter((evaluation: any) =>
        visibleApplicantIds.has(String(evaluation?.applicant_id ?? '').trim())
      );

      setJobs(jobsFromPostings);
      setApplicants(visibleApplicants);
      setEvaluations(visibleEvaluations);
    } catch (err) {
      console.error('Error initializing dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(jobs.map(job => job.office))).sort();
  }, [jobs]);

  const todayKey = toLocalKey(new Date());

  // Derived KPI lists, all scoped to the applicants this interviewer can see:
  //   pending   = no evaluation submitted yet
  //   today     = interview_date is today (local calendar date)
  //   completed = latest evaluation was submitted this calendar month
  const kpiItems = useMemo<Record<KpiKey, KpiItem[]>>(() => {
    const officeByTitle = new Map(jobs.map((job) => [normalizeText(job.title), job.office]));

    const latestEvaluationAt = new Map<string, string>();
    evaluations.forEach((evaluation: any) => {
      const applicantId = String(evaluation?.applicant_id ?? '').trim();
      if (!applicantId) return;
      const at = evaluationTimestamp(evaluation);
      const previous = latestEvaluationAt.get(applicantId);
      if (previous === undefined || at > previous) latestEvaluationAt.set(applicantId, at);
    });

    const monthKey = todayKey.slice(0, 7);
    const result: Record<KpiKey, KpiItem[]> = { pending: [], today: [], completed: [] };

    applicants.forEach((applicant: any) => {
      const id = String(applicant?.id ?? '').trim();
      const position = String(applicant?.position || '').trim();
      const titleKey = normalizeText(position);
      const base = {
        id,
        name: applicantDisplayName(applicant),
        position,
        department: officeByTitle.get(titleKey) || String(applicant?.office || '').trim() || 'Unassigned',
        titleKey,
      };
      const interviewDate = String(applicant?.interview_date ?? '').trim();
      const evaluatedAt = latestEvaluationAt.get(id);

      if (evaluatedAt === undefined) result.pending.push({ ...base, date: interviewDate });
      if (interviewDate && dateKey(interviewDate) === todayKey) result.today.push({ ...base, date: interviewDate });
      if (evaluatedAt && dateKey(evaluatedAt).startsWith(monthKey)) result.completed.push({ ...base, date: evaluatedAt });
    });

    // Soonest interview first (undated last); most recent submission first.
    result.pending.sort((a, b) => (dateKey(a.date) || '9999').localeCompare(dateKey(b.date) || '9999'));
    result.today.sort((a, b) => a.name.localeCompare(b.name));
    result.completed.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [applicants, evaluations, jobs, todayKey]);

  const kpiTitleSets = useMemo(() => {
    const sets = {} as Record<KpiKey, Set<string>>;
    KPI_ORDER.forEach((key) => { sets[key] = new Set(kpiItems[key].map((item) => item.titleKey)); });
    return sets;
  }, [kpiItems]);

  const filteredJobs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return jobs.filter(job => {
      const matchesSearch = !query ||
        job.title.toLowerCase().includes(query) ||
        job.office.toLowerCase().includes(query);

      const matchesDept = departmentFilter === 'all' || job.office === departmentFilter;

      // Default view hides jobs once every applicant has an evaluation — the
      // interviewer is done with them. A KPI filter replaces that rule, so
      // "Completed" can still surface finished postings.
      const inScope = kpiFilter
        ? kpiTitleSets[kpiFilter].has(normalizeText(job.title))
        : !job.is_fully_evaluated;

      return matchesSearch && matchesDept && inScope;
    });
  }, [jobs, searchTerm, departmentFilter, kpiFilter, kpiTitleSets]);

  const pageCount = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedJobs = filteredJobs.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchTerm, departmentFilter, kpiFilter]);

  // Quick view: Esc closes and returns focus to its card; a pointer-down
  // outside the card's cell closes it (the mobile backdrop is outside too).
  useEffect(() => {
    if (!openKpi) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenKpi(null);
      kpiButtonRefs.current[openKpi]?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const cell = kpiCellRefs.current[openKpi];
      if (cell && !cell.contains(event.target as Node)) setOpenKpi(null);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [openKpi]);

  const applyKpiFilter = (key: KpiKey, department = 'all') => {
    setKpiFilter(key);
    setDepartmentFilter(department);
    setOpenKpi(null);
    tableSectionRef.current?.scrollIntoView({ block: 'nearest' });
  };

  const clearFilters = () => {
    setKpiFilter(null);
    setDepartmentFilter('all');
    setSearchTerm('');
  };

  const hasActiveFilters = Boolean(kpiFilter) || departmentFilter !== 'all' || searchTerm.trim() !== '';

  const handleViewJobApplicants = (jobTitle: string) => {
    navigate(`/interviewer/applicants?position=${encodeURIComponent(jobTitle)}`);
  };

  const handleDeleteConfirm = async () => {
    if (!applicantToDelete) return;

    try {
      setDeleting(true);
      const { error: deleteError } = await supabase
        .from('applicants')
        .delete()
        .eq('id', applicantToDelete.id);

      if (deleteError) throw deleteError;

      // Refresh jobs data to update applicant counts
      fetchJobsAndApplicants();
      
      setDeleteConfirmOpen(false);
      setApplicantToDelete(null);
    } catch (err) {
      console.error('Error deleting applicant:', err);
      alert('Failed to delete applicant. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const renderKpiRow = () => {
    if (loading) {
      return (
        <div className="ivd-kpis" aria-busy="true" aria-label="Loading summary">
          {KPI_ORDER.map((key) => (
            <div key={key} className="ivd-kpi-cell">
              <div className="ivd-kpi ivd-kpi--skeleton">
                <div className="ivd-kpi-head">
                  <span className="ivd-skel" style={{ width: 40, height: 40, borderRadius: 'var(--radius-chip)' }} />
                  <span className="ivd-skel" style={{ width: 96, height: 14 }} />
                </div>
                <span className="ivd-skel" style={{ width: 56, height: 36 }} />
                <span className="ivd-skel" style={{ width: '70%', height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="ivd-kpis">
        {KPI_ORDER.map((key) => {
          const config = KPI_CONFIG[key];
          const Icon = config.icon;
          const count = kpiItems[key].length;
          const isOpen = openKpi === key;
          const toneClass = config.tone === 'primary' ? '' : ` ivd-kpi--${config.tone}`;
          return (
            <div key={key} className="ivd-kpi-cell" ref={(el) => { kpiCellRefs.current[key] = el; }}>
              <button
                type="button"
                ref={(el) => { kpiButtonRefs.current[key] = el; }}
                className={`ivd-kpi${toneClass}${kpiFilter === key ? ' is-selected' : ''}`}
                aria-expanded={isOpen}
                aria-controls={`ivd-qv-${key}`}
                aria-haspopup="dialog"
                onClick={() => setOpenKpi((prev) => (prev === key ? null : key))}
              >
                <span className="ivd-kpi-head">
                  <span className="ivd-kpi-chip" aria-hidden="true">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="ivd-kpi-label text-caption">{config.label}</span>
                  <ChevronDown className="ivd-kpi-chevron" size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="ivd-kpi-value text-title-l">{count}</span>
                <span className="ivd-kpi-sub text-body-s">{config.subtext(count)}</span>
              </button>

              {isOpen && (
                <KpiQuickView
                  kpi={key}
                  items={kpiItems[key]}
                  onClose={() => { setOpenKpi(null); kpiButtonRefs.current[key]?.focus(); }}
                  onViewAll={() => applyKpiFilter(key)}
                  onPickDepartment={(department) => applyKpiFilter(key, department)}
                />
              )}
            </div>
          );
        })}
        {openKpi && <div className="ivd-sheet-backdrop" aria-hidden="true" />}
      </div>
    );
  };

  const renderTableBody = () => {
    if (loading) {
      return Array.from({ length: 4 }, (_, i) => (
        <tr key={`skeleton-${i}`} aria-hidden="true">
          <td className="ivd-cell-title"><span className="ivd-skel" style={{ width: '60%', height: 14 }} /></td>
          <td className="ivd-cell-office"><span className="ivd-skel" style={{ width: '70%', height: 14 }} /></td>
          <td className="ivd-cell-count is-num"><span className="ivd-skel" style={{ width: 32, height: 24, marginLeft: 'auto' }} /></td>
          <td className="ivd-cell-date"><span className="ivd-skel" style={{ width: 120, height: 14 }} /></td>
          <td className="is-action"><span className="ivd-skel" style={{ width: 148, height: 36, marginLeft: 'auto', borderRadius: 'var(--radius-pill)' }} /></td>
        </tr>
      ));
    }

    if (pagedJobs.length === 0) {
      return (
        <tr>
          <td colSpan={5} className="ivd-cell-empty">
            <div className="ivd-empty">
              <div className="ivd-empty-icon" aria-hidden="true">
                <Briefcase size={24} strokeWidth={1.75} />
              </div>
              {hasActiveFilters ? (
                <>
                  <h3 className="text-title-s">No postings match these filters</h3>
                  <p className="text-body-m">Try another department or clear the filters to see all of your assigned postings.</p>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={clearFilters}>Clear Filters</button>
                </>
              ) : (
                <>
                  <h3 className="text-title-s">Nothing to evaluate 🎉</h3>
                  <p className="text-body-m">You have no postings waiting for an evaluation. New assignments from RSP will appear here.</p>
                </>
              )}
            </div>
          </td>
        </tr>
      );
    }

    return pagedJobs.map((job) => {
      const remaining = Math.max(0, job.applicant_count - (job.evaluated_count ?? 0));
      const status = job.interview_date ? getDateStatus(job.interview_date, todayKey) : null;
      const showItemNo = job.item_number && job.item_number !== 'N/A';
      return (
        <tr key={job.id}>
          <td className="ivd-cell-title">
            <span className="ivd-job-title">{job.title}</span>
            {showItemNo && <span className="ivd-job-meta text-body-s">Item No. {job.item_number}</span>}
          </td>
          <td className="ivd-cell-office" data-label="Office / Department">
            <span>{job.office}</span>
            {job.department && job.department !== job.office && (
              <span className="ivd-job-meta text-body-s">{job.department}</span>
            )}
          </td>
          <td className="ivd-cell-count is-num" data-label="Applicants">
            <span
              className={`ivd-count${remaining === 0 ? ' is-zero' : ''}`}
              title={`${remaining} of ${job.applicant_count} still to evaluate`}
              aria-label={`${remaining} of ${job.applicant_count} applicants still to evaluate`}
            >
              {remaining}
            </span>
          </td>
          <td className="ivd-cell-date" data-label="Interview date">
            {job.interview_date ? (
              <span className="ivd-date">
                <span className="ivd-date-text">{formatDate(job.interview_date)}</span>
                {status && (
                  <span className={`badge ${DATE_BADGE[status].className}`}>
                    <span className="badge-dot" aria-hidden="true" />
                    {DATE_BADGE[status].label}
                  </span>
                )}
              </span>
            ) : (
              <span className="ivd-muted">Not scheduled</span>
            )}
          </td>
          <td className="is-action">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => handleViewJobApplicants(job.title)}
              aria-label={`View applicants for ${job.title}`}
            >
              View<span className="ivd-view-more">Applicants</span>
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="abyan-ds ivd">
      {/* ── Top navigation bar (same lockup as the admin portals' header) ── */}
      <nav className="ivd-nav" aria-label="Interviewer Portal">
        <button type="button" className="ivd-brand" onClick={() => navigate('/interviewer/dashboard')}>
          <img src={abyanLogo} alt="" />
          <span className="ivd-brand-name">ABYAN</span>
          <span className="ivd-brand-sub">Human Resource Information System</span>
        </button>

        <div className="ivd-user">
          <span className="ivd-user-avatar" aria-hidden="true">
            <UserCircle2 size={20} strokeWidth={1.75} />
          </span>
          <span className="ivd-user-meta">
            <span className="ivd-user-name" title={session?.name}>{session?.name || 'Interviewer'}</span>
            <span className="ivd-user-role">Interviewer Portal</span>
          </span>
          {onLogout && (
            <>
              <span className="ivd-nav-divider" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(true)}
                className="ivd-logout"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                <span className="ivd-logout-label">Logout</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Curved hero with flat brand-pattern shapes (§7) ── */}
      <header className="ivd-hero">
        <span className="ivd-shape ivd-shape--disc-left" aria-hidden="true" />
        <span className="ivd-shape ivd-shape--disc-right" aria-hidden="true" />
        <span className="ivd-shape ivd-shape--half" aria-hidden="true" />
        <span className="ivd-shape ivd-shape--quarter" aria-hidden="true" />

        <div className="ivd-container">
          <div className="ivd-hero-text">
            <h1 className="text-title-l">Interviewer Dashboard</h1>
            <p className="text-body-l">View assigned job postings and manage applicant evaluations</p>
          </div>
        </div>
      </header>

      {/* ── Logout Confirmation Dialog (§9.10) ── */}
      {logoutConfirmOpen && (
        <div className="ivd-modal-overlay" onClick={() => setLogoutConfirmOpen(false)}>
          <div
            className="ivd-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ivd-logout-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') setLogoutConfirmOpen(false); }}
          >
            <div className="ivd-modal-icon" aria-hidden="true">
              <LogOut size={22} strokeWidth={1.75} />
            </div>
            <h3 id="ivd-logout-title" className="text-title-s">Confirm Logout</h3>
            <p className="text-body-m">Are you sure you want to log out of your Interviewer Portal session?</p>
            <div className="ivd-modal-actions">
              <button type="button" className="btn btn-md btn-secondary" onClick={() => setLogoutConfirmOpen(false)} autoFocus>
                Cancel
              </button>
              <button type="button" className="btn btn-md btn-primary" onClick={() => { setLogoutConfirmOpen(false); onLogout?.(); }}>
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Content panel overlapping the hero curve ── */}
      <main className="ivd-container ivd-main">
        <div className="ivd-panel">
          {error ? (
            <div className="ivd-alert" role="alert">
              <CircleAlert size={20} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <h3 className="text-headline-m">We couldn't load your assignments</h3>
                <p className="text-body-m">{error}. Check your connection and try again.</p>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => void fetchJobsAndApplicants(false)}>
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
              <section aria-label="Evaluation summary">{renderKpiRow()}</section>

              <section className="ivd-section" ref={tableSectionRef} aria-labelledby="ivd-postings-title">
                <div className="ivd-section-head">
                  <div>
                    <h2 id="ivd-postings-title" className="text-title-m">Assigned job postings</h2>
                    <p className="text-body-m">Open a posting to view and evaluate its applicants.</p>
                  </div>

                  <div className="ivd-toolbar">
                    <label className="ivd-field">
                      <span className="sr-only">Search job postings</span>
                      <Search className="ivd-field-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
                      <input
                        type="search"
                        placeholder="Search by job title or office…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="ivd-input"
                      />
                    </label>

                    <label className="ivd-field">
                      <span className="sr-only">Filter by department</span>
                      <Building2 className="ivd-field-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="ivd-select"
                      >
                        <option value="all">All Departments</option>
                        {uniqueDepartments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <ChevronDown className="ivd-field-caret" size={16} strokeWidth={1.75} aria-hidden="true" />
                    </label>
                  </div>
                </div>

                {(kpiFilter || departmentFilter !== 'all') && (
                  <div className="ivd-chips" aria-live="polite">
                    {kpiFilter && (
                      <span className="ivd-chip">
                        Filtered: <strong>{KPI_CONFIG[kpiFilter].label}</strong>
                        <button type="button" onClick={() => setKpiFilter(null)} aria-label={`Remove ${KPI_CONFIG[kpiFilter].label} filter`}>
                          <X size={14} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </span>
                    )}
                    {departmentFilter !== 'all' && (
                      <span className="ivd-chip">
                        Department: <strong>{departmentFilter}</strong>
                        <button type="button" onClick={() => setDepartmentFilter('all')} aria-label={`Remove ${departmentFilter} filter`}>
                          <X size={14} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </span>
                    )}
                  </div>
                )}

                <div className="ivd-table-wrap">
                  <table className="ivd-table" aria-busy={loading}>
                    <thead>
                      <tr>
                        <th scope="col">Job title / position</th>
                        <th scope="col">Office / department</th>
                        <th scope="col" className="is-num">Applicants</th>
                        <th scope="col">Interview date</th>
                        <th scope="col" className="is-action"><span className="sr-only">Action</span></th>
                      </tr>
                    </thead>
                    <tbody>{renderTableBody()}</tbody>
                  </table>
                </div>

                {!loading && filteredJobs.length > 0 && (
                  <nav className="ivd-pager" aria-label="Job postings pages">
                    <span className="ivd-pager-info text-body-s">
                      Showing {pageStart + 1}–{pageStart + pagedJobs.length} of {filteredJobs.length} entries
                    </span>
                    {pageCount > 1 && (
                      <div className="ivd-pager-btns">
                        <button
                          type="button"
                          className="ivd-page ivd-page--nav"
                          onClick={() => setPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Previous
                        </button>
                        {getPageList(currentPage, pageCount).map((p, i) =>
                          p === 'gap' ? (
                            <span key={`gap-${i}`} className="ivd-page-num ivd-muted" aria-hidden="true">…</span>
                          ) : (
                            <button
                              key={p}
                              type="button"
                              className={`ivd-page ivd-page-num${p === currentPage ? ' is-active' : ''}`}
                              onClick={() => setPage(p)}
                              aria-current={p === currentPage ? 'page' : undefined}
                              aria-label={`Page ${p}`}
                            >
                              {p}
                            </button>
                          ),
                        )}
                        <button
                          type="button"
                          className="ivd-page ivd-page--nav"
                          onClick={() => setPage(currentPage + 1)}
                          disabled={currentPage === pageCount}
                        >
                          Next <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </nav>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <div className="modal-header">
          <h2 className="modal-title">Confirm Delete</h2>
          <button 
            onClick={() => setDeleteConfirmOpen(false)}
            className="modal-close-btn"
            disabled={deleting}
          >
            <X size={24} />
          </button>
        </div>
        <div className="modal-content">
          <div className="delete-confirm-content">
            <div className="warning-icon">⚠️</div>
            <p className="delete-warning-text">
              Are you sure you want to delete <strong>{applicantToDelete ? getFullName(applicantToDelete) : ''}</strong>?
            </p>
            <p className="delete-warning-subtext">
              This action cannot be undone. All applicant data and attachments will be permanently removed.
            </p>
            <div className="delete-confirm-actions">
              <button
                className="cancel-delete-btn"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="confirm-delete-btn"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <div className="spinner-small"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Delete Applicant</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
