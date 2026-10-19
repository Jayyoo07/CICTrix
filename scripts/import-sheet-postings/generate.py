"""
Turn the four-office plantilla sheet (sheet.csv) into one transactional SQL file
that adds the Social Welfare office, every division as a child department, and
one job posting + plantilla slot per sheet row.

Plan: docs/plans/2026-10-20-import-sheet-job-postings.md (decisions D1-D12).

    python scripts/import-sheet-postings/generate.py

Writes import_sheet_postings.sql next to this file. Review it, then run it in
the Supabase SQL editor AFTER the "divisions out of office lists" code fix is
deployed.

Qualifications follow CSC Qualification Standards conventions by job family and
salary grade. Faker (en_PH, fixed seed) only varies wording, duty picks and
dates, so two runs produce the same file.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path

from faker import Faker

HERE = Path(__file__).resolve().parent
SHEET = HERE / "sheet.csv"
OUTPUT = HERE / "import_sheet_postings.sql"

FAKER_SEED = 20261020
# Dates are anchored here rather than to "today" so the file is reproducible.
POSTING_DATE = date(2026, 10, 21)
DEADLINE_DAYS = (14, 28)
START_AFTER_DEADLINE_DAYS = (21, 45)

POSTED_BY = "HR Admin"
POSITION_TYPE = "Civil Service"
EMPLOYMENT_STATUS = "Permanent"
SALARY_STEP = 1  # hiring rate, same rule the RSP form uses
WEIGHTING_CODE = "C"  # D3

# The seven documents the application form enforces (src/utils/validation.ts).
REQUIRED_DOCUMENTS = [
    "Application Letter",
    "Personal Data Sheet (PDS)",
    "Proof of Eligibility Rating/License",
    "Certificate of Relevant Training/Seminars",
    "Transcript of Records",
    "Drug Test Result",
    "Government-Issued ID",
]

# Sheet office header -> (code, departments.name). Three already exist.
OFFICES = {
    "office of the city engineer": ("OCE", "Office of The City Engineer"),
    "office of the city accountant": ("OCA", "Office of The City Accountant"),
    "city health office": ("OCHO", "Office of The City Health Officer"),
    "office of the city social welfare": ("OCSWDO", "Office of The City Social Welfare and Development Officer"),
}
NEW_OFFICE_CODE = "OCSWDO"

# D5: the only sheet corrections. Each names the value it expects to replace,
# so a re-exported sheet that moved rows fails loudly instead of fixing the
# wrong row.
FIXES = {
    98: ("title", "Disaster Relief & Crisis Division", "Social Welfare Officer III (CIU Head)"),
    103: ("function", "Out-of-School Youth & CICL Case Manager", "Day Care Center Operations Lead"),
    108: ("division", "Community, Family & Gender Division", "Community, Family & Gender Welfare Division"),
    110: ("title", "Admin Assistant II (CIU Intake Desk)Disaster Relief & Crisis Division", "Admin Assistant II (CIU Intake Desk)"),
}

STATUS_MAP = {"VACANT": ("Open", "open"), "FILLED": ("Closed", "filled")}  # D1, D10

ELIG_SUBPROF = "Career Service (Subprofessional) / First Level Eligibility"
ELIG_PROF = "Career Service (Professional) / Second Level Eligibility"
ELIG_NONE = "None required (MC 11, s. 1996 - Cat. II)"
FIRST_LEVEL_MAX_SG = 10


@dataclass
class Family:
    education: str  # one of EDUCATION_LEVELS (src/constants/positions.ts)
    education_field: str
    eligibility: str | None  # None = by salary grade
    experience_field: str
    competency: str  # one of COMPETENCIES (src/constants/positions.ts)
    skills: list[str]
    duties: list[str]
    preferred: list[str] = field(default_factory=list)
    closing: list[str] = field(default_factory=list)


FAMILIES: dict[str, Family] = {
    "engineer": Family(
        "College Graduate", "Bachelor of Science in {discipline} Engineering", "RA 1080 ({discipline} Engineer)",
        "{discipline} engineering, public works or infrastructure projects",
        "Project Management in a Public Setting",
        ["Engineering design and estimates", "AutoCAD and technical drawings", "Site inspection and reporting"],
        [
            "Prepares detailed engineering designs, plans and cost estimates for city projects",
            "Conducts site inspections and validates contractor accomplishment reports",
            "Reviews program of works and bills of materials before approval",
            "Evaluates building and occupancy permit applications against the National Building Code",
            "Prepares technical reports and recommendations for the City Engineer",
            "Coordinates with barangays and contractors on project schedules",
            "Monitors compliance with safety, quality and environmental standards",
        ],
        ["Experience with DPWH standard specifications", "Training on the National Building Code (PD 1096)", "Familiarity with GIS or project scheduling software"],
        ["Works closely with field crews and contractors across the city.", "Supports the city's infrastructure and public works program."],
    ),
    "architect": Family(
        "College Graduate", "Bachelor of Science in Architecture", "RA 1080 (Architect)",
        "Architectural design or city planning",
        "Project Management in a Public Setting",
        ["Architectural design", "AutoCAD / BIM drafting", "Space and site planning"],
        [
            "Prepares architectural designs and working drawings for city buildings",
            "Reviews architectural plans submitted for building permits",
            "Prepares perspective drawings, layouts and specifications",
            "Coordinates with engineers on structural and utility requirements",
            "Supports land-use and master planning studies",
            "Inspects ongoing construction for conformity with approved plans",
        ],
        ["Experience with BIM software", "Background in urban design or master planning"],
        ["Supports the city's building and master planning program."],
    ),
    "accountant": Family(
        "College Graduate", "Bachelor of Science in Accountancy", "RA 1080 (Certified Public Accountant)",
        "Government accounting, auditing or financial reporting",
        "Fiscal Management / Budgeting for LGU",
        ["Government Accounting Manual (GAM)", "Financial statement preparation", "Pre-audit of disbursements"],
        [
            "Pre-audits disbursement vouchers and supporting documents for completeness",
            "Maintains books of accounts and journal entries under the Government Accounting Manual",
            "Prepares trial balances, financial statements and schedules",
            "Reconciles bank accounts and subsidiary ledgers",
            "Responds to COA audit observations and prepares replies",
            "Prepares accounting reports required by DBM, COA and the city",
            "Reviews payroll, claims and liquidation reports",
        ],
        ["Familiarity with eNGAS or the LGU financial system", "Training on the Revised Chart of Accounts"],
        ["Works within the city's financial management and pre-audit cycle.", "Supports timely and accurate financial reporting to COA."],
    ),
    "analyst": Family(
        "College Graduate", "Bachelor's degree in Accountancy, Commerce or Business Administration", None,
        "Accounting, audit or financial analysis",
        "Transparency and Accountability Practices",
        ["Financial analysis", "Audit documentation", "Spreadsheet reporting"],
        [
            "Consolidates replies to COA audit observation memoranda",
            "Analyzes account balances and flags unreconciled items",
            "Tracks implementation of audit recommendations",
            "Prepares analytical reports for the Chief Accountant",
            "Maintains the audit liaison log and document files",
        ],
        ["Experience with COA audit processes"],
        ["Serves as the office's working link with the COA audit team."],
    ),
    "physician": Family(
        "Graduate School", "Doctor of Medicine", "RA 1080 (Physician)",
        "Clinical or public health practice",
        "Community Engagement Skills",
        ["Clinical diagnosis and management", "Public health programs", "Medical documentation"],
        [
            "Provides consultation, diagnosis and treatment at the health center",
            "Implements DOH public health programs in the assigned district",
            "Supervises nurses, midwives and barangay health workers",
            "Conducts medico-legal examinations and issues medical certificates",
            "Leads disease surveillance and outbreak response in the district",
            "Prepares health program accomplishment reports",
        ],
        ["Diploma or units in Public Health", "Experience in a rural health unit"],
        ["Serves residents through the city's network of health centers.", "Supports the city's Universal Health Care implementation."],
    ),
    "nurse": Family(
        "College Graduate", "Bachelor of Science in Nursing", "RA 1080 (Nurse)",
        "Nursing or public health nursing",
        "Community Engagement Skills",
        ["Public health nursing", "Immunization and maternal care", "Health records"],
        [
            "Provides nursing care and health education at the health center",
            "Implements immunization, maternal and child health programs",
            "Conducts home visits and community health assessments",
            "Supervises barangay health workers in the catchment area",
            "Maintains patient records and program registries",
            "Assists in disease surveillance and outbreak response",
        ],
        ["Basic Life Support certification", "Experience in community or public health nursing"],
        ["Works with barangay health stations across the district.", "Supports the city's primary health care programs."],
    ),
    "midwife": Family(
        "College Graduate", "Bachelor of Science in Midwifery", "RA 1080 (Midwife)",
        "Midwifery or maternal and child health care",
        "Community Engagement Skills",
        ["Prenatal and postnatal care", "Normal deliveries", "Family planning counseling"],
        [
            "Provides prenatal, delivery and postnatal care",
            "Conducts family planning counseling and services",
            "Manages the barangay health station schedule and logbooks",
            "Implements immunization and nutrition programs for mothers and children",
            "Refers high-risk pregnancies to the physician",
            "Prepares monthly maternal and child health reports",
        ],
        ["Basic Emergency Obstetric and Newborn Care (BEmONC) training"],
        ["Serves mothers and children through the city's birthing and health stations."],
    ),
    "dentist": Family(
        "College Graduate", "Doctor of Dental Medicine", "RA 1080 (Dentist)",
        "Dental practice or public health dentistry",
        "Community Engagement Skills",
        ["Oral examination and treatment", "Preventive dentistry", "Dental records"],
        [
            "Provides oral examinations, extractions and restorative treatment",
            "Conducts school and community oral health programs",
            "Implements preventive programs such as fluoride and sealant application",
            "Maintains dental records and program reports",
            "Supervises dental aides and manages dental supplies",
        ],
        ["Training in public health dentistry"],
        ["Supports the city's oral health program in schools and communities."],
    ),
    "nutritionist": Family(
        "College Graduate", "Bachelor of Science in Nutrition and Dietetics", "RA 1080 (Nutritionist-Dietitian)",
        "Nutrition program management",
        "Community Engagement Skills",
        ["Nutrition assessment", "Program planning", "Community nutrition education"],
        [
            "Plans and coordinates the city nutrition action plan",
            "Conducts Operation Timbang and nutrition status assessments",
            "Manages supplementary feeding programs",
            "Trains barangay nutrition scholars",
            "Prepares nutrition reports for the National Nutrition Council",
        ],
        ["Experience as a City or Municipal Nutrition Action Officer"],
        ["Leads the city's nutrition program with the barangay nutrition scholars."],
    ),
    "records": Family(
        "College Graduate", "Bachelor's degree in Health Information Management or a related course", None,
        "Health information or records management",
        "Data and Records Management and Organization",
        ["Health records management", "ICD-10 coding", "Vital statistics reporting"],
        [
            "Manages patient records and health information systems",
            "Codes diagnoses using ICD-10",
            "Prepares vital statistics and FHSIS reports",
            "Ensures data privacy compliance for health records",
            "Trains staff on records procedures",
        ],
        ["Familiarity with iClinicSys or FHSIS"],
        ["Keeps the office's health data accurate and secure."],
    ),
    "social_worker": Family(
        "College Graduate", "Bachelor of Science in Social Work", "RA 1080 (Social Worker)",
        "Social work or community development",
        "Community Engagement Skills",
        ["Case management", "Community organizing", "Psychosocial intervention"],
        [
            "Conducts intake interviews and case assessments of clients",
            "Prepares case studies and social case summary reports",
            "Provides psychosocial counseling and referrals",
            "Implements DSWD and city social protection programs",
            "Organizes community and family welfare activities",
            "Processes assistance under AICS and related programs",
            "Coordinates with barangays, NGOs and partner agencies",
        ],
        ["Experience in crisis intervention or case management", "Training on child protection and gender-responsive case handling"],
        ["Serves vulnerable individuals and families across the city.", "Supports the city's social protection programs."],
    ),
    "sw_assistant": Family(
        "College Level", "Completion of two years of studies in college", None,
        "Social welfare program support",
        "Community Engagement Skills",
        ["Client assistance", "Records and logistics", "Program documentation"],
        [
            "Assists social workers in client intake and documentation",
            "Maintains client records and beneficiary lists",
            "Prepares relief goods and assistance packages for distribution",
            "Encodes assistance data into the office system",
            "Coordinates schedules with barangay focal persons",
        ],
        [],
        ["Supports the office's front-line welfare services."],
    ),
    "eccd": Family(
        "College Level", "Early Childhood Education, Social Work or a related course", None,
        "Early childhood care or day care services",
        "Community Engagement Skills",
        ["Early childhood education", "Child development monitoring", "Parent education"],
        [
            "Plans and conducts age-appropriate learning activities",
            "Monitors child development using the ECCD checklist",
            "Conducts parent education sessions",
            "Supervises supplementary feeding in the day care center",
            "Maintains day care records and accreditation documents",
        ],
        ["Training on the ECCD curriculum"],
        ["Supports the city's day care and early childhood programs."],
    ),
    "admin_officer": Family(
        "College Graduate", "Bachelor's degree in Public Administration, Business Administration or a related course", None,
        "Administrative, personnel or records management",
        "Public Administration Principles",
        ["Human resource administration", "Records management", "Office procedures"],
        [
            "Manages personnel actions, appointments and service records",
            "Prepares leave, payroll and benefit documents",
            "Implements CSC rules on recruitment and personnel records",
            "Supervises administrative staff and office procedures",
            "Prepares administrative reports and correspondence",
            "Maintains the office's records management system",
        ],
        ["Training on CSC personnel policies"],
        ["Supports the office's personnel and administrative services."],
    ),
    "admin_assistant": Family(
        "College Level", "Completion of two years of studies in college", None,
        "Clerical, bookkeeping or data processing work",
        "Data and Records Management and Organization",
        ["Bookkeeping or data encoding", "Spreadsheets", "Document control"],
        [
            "Encodes and verifies transactions and records",
            "Maintains ledgers, logbooks and filing systems",
            "Prepares routine reports and correspondence",
            "Tracks incoming and outgoing documents",
            "Assists in preparing payroll and remittance schedules",
        ],
        [],
        ["Keeps the office's records and transactions in order."],
    ),
    "aide": Family(
        "College Level", "Completion of two years of studies in college", None,
        "Clerical or records work",
        "Data and Records Management and Organization",
        ["Document handling", "Filing and logbooks", "Basic computer use"],
        [
            "Receives, records and routes incoming documents",
            "Maintains logbooks and filing systems",
            "Dispatches outgoing communications",
            "Assists walk-in clients at the front desk",
            "Photocopies, scans and files records",
        ],
        [],
        ["Supports the office's front desk and document flow."],
    ),
    "utility": Family(
        "Elementary Level", "Able to read and write", ELIG_NONE,
        "None required",
        "Ethical Conduct and Public Service Standards",
        ["Facility cleaning and upkeep", "Basic maintenance", "Messengerial work"],
        [
            "Keeps offices, clinics and facilities clean and sanitary",
            "Performs minor repairs and upkeep",
            "Delivers documents and supplies within the office",
            "Assists in moving equipment and supplies",
        ],
        [],
        ["Keeps the office's facilities clean and running."],
    ),
    "carpenter": Family(
        "Elementary Graduate", "Elementary school graduate", "Carpenter (MC 11, s. 1996 - Cat. II)",
        "Carpentry work",
        "Ethical Conduct and Public Service Standards",
        ["Carpentry", "Reading simple plans", "Tool handling"],
        [
            "Repairs and fabricates wooden structures, doors and furniture",
            "Performs framing and finishing work on city facilities",
            "Estimates materials for carpentry jobs",
            "Maintains carpentry tools and equipment",
        ],
        ["TESDA Carpentry NC II"],
        ["Part of the city's construction and maintenance crew."],
    ),
    "electrician": Family(
        "Elementary Graduate", "Elementary school graduate", "Electrician (MC 11, s. 1996 - Cat. II)",
        "Electrical installation and maintenance",
        "Ethical Conduct and Public Service Standards",
        ["Electrical wiring", "Streetlight maintenance", "Electrical safety"],
        [
            "Installs and repairs electrical wiring and fixtures in city facilities",
            "Maintains and repairs streetlights",
            "Troubleshoots electrical faults",
            "Observes electrical safety procedures",
        ],
        ["TESDA Electrical Installation and Maintenance NC II"],
        ["Keeps city facilities and streetlights powered and safe."],
    ),
    "foreman": Family(
        "High School Graduate", "High school graduate", "Foreman (MC 11, s. 1996 - Cat. IV)",
        "Construction or maintenance supervision",
        "Project Management in a Public Setting",
        ["Crew supervision", "Construction methods", "Materials estimation"],
        [
            "Supervises construction and maintenance crews on site",
            "Assigns daily work and monitors progress",
            "Requests and accounts for materials and tools",
            "Ensures work follows plans and safety rules",
            "Prepares daily accomplishment reports",
        ],
        ["Experience leading masonry or carpentry crews"],
        ["Leads the city's field maintenance crews."],
    ),
    "laborer": Family(
        "Elementary Level", "Able to read and write", ELIG_NONE,
        "None required",
        "Ethical Conduct and Public Service Standards",
        ["Manual labor", "Tool handling", "Site cleanup"],
        [
            "Performs manual work on construction and maintenance projects",
            "Loads and unloads materials and equipment",
            "Assists skilled workers on site",
            "Cleans and secures work sites",
        ],
        [],
        ["Part of the city's construction and maintenance crew."],
    ),
}

# Checked in order; first match wins.
FAMILY_RULES = [
    ("architect", "architect"),
    ("engineer", "engineer"),
    ("accounts analyst", "analyst"),
    ("accountant", "accountant"),
    ("health officer", "physician"),
    ("medical officer", "physician"),
    ("medical specialist", "physician"),
    ("medical records", "records"),
    ("nurse", "nurse"),
    ("midwife", "midwife"),
    ("dentist", "dentist"),
    ("nutritionist", "nutritionist"),
    ("social welfare assistant", "sw_assistant"),
    ("social welfare", "social_worker"),
    ("early childhood", "eccd"),
    ("administrative officer", "admin_officer"),
    ("admin assistant", "admin_assistant"),
    ("administrative assistant", "admin_assistant"),
    ("utility worker", "utility"),
    ("laborer", "utility"),
    ("aide", "aide"),
    ("carpenter", "carpenter"),
    ("electrician", "electrician"),
    ("foreman", "foreman"),
    ("maintenance man", "laborer"),
]


def family_of(title: str) -> str:
    t = title.lower()
    for needle, fam in FAMILY_RULES:
        if needle in t:
            return fam
    raise ValueError(f"No job family for title: {title!r}")


def discipline_of(title: str) -> str:
    t = title.lower()
    if "mech/elec" in t:
        return "Electrical or Mechanical"
    if "mechanical" in t:
        return "Mechanical"
    if "electrical" in t:
        return "Electrical"
    return "Civil"


def is_entry_level(title: str, sg: int) -> bool:
    """Rank I of a series below the supervisory grades (Engineer I, Nurse I, Admin Aide I)."""
    return sg <= 15 and re.search(r"\sI(\s|\(|$)", title) is not None


def experience_years(title: str, sg: int) -> int:
    # Matches the existing CSC-based postings: SG 8 -> 1 yr, SG 18 -> 2 yrs.
    if is_entry_level(title, sg) or sg <= 4:
        return 0
    if sg <= 15:
        return 1
    if sg <= 18:
        return 2
    if sg <= 21:
        return 3
    if sg <= 24:
        return 4
    return 5


def training(title: str, sg: int) -> str:
    if is_entry_level(title, sg) or sg <= 3:
        return "None required"
    if sg <= 17:
        return "4 hours of relevant training"
    if sg <= 21:
        return "8 hours of relevant training"
    if sg <= 24:
        return "24 hours of relevant training"
    return "40 hours of supervisory/management training"


@dataclass
class Row:
    sheet_row: int
    item: str
    title: str
    division: str
    sg: int
    status: str
    function: str
    office_code: str
    office_name: str


def read_sheet() -> list[Row]:
    with SHEET.open(encoding="utf-8", newline="") as f:
        lines = list(csv.reader(f))

    rows: list[Row] = []
    office: tuple[str, str] | None = None
    for idx, cells in enumerate(lines[1:], start=2):  # sheet row numbers
        cells = (cells + [""] * 8)[:8]
        item, title, division, sg, _salary, status, _critical, function = (c.strip() for c in cells)

        if idx in FIXES:
            col, expected, fixed = FIXES[idx]
            current = {"title": title, "division": division, "function": function}[col]
            if current != expected:
                sys.exit(f"Row {idx}: expected {col} {expected!r}, found {current!r}. Sheet changed; check FIXES.")
            if col == "title":
                title = fixed
            elif col == "division":
                division = fixed
            else:
                function = fixed

        header = OFFICES.get(title.lower())
        if header and not sg:
            office = header
            continue
        if not item:
            continue  # blank separators and the partial block at rows 114-117 (D5)
        if not title:
            continue  # separator rows that only carry a filler number
        if office is None:
            sys.exit(f"Row {idx}: job row before any office header.")
        if status not in STATUS_MAP:
            sys.exit(f"Row {idx}: unknown status {status!r}.")
        m = re.search(r"\d+", sg)
        if not m:
            sys.exit(f"Row {idx}: unreadable SG {sg!r}.")
        rows.append(Row(idx, item, title, division, int(m.group()), status, function, office[0], office[1]))
    return rows


def sql_str(value: str | None) -> str:
    return "NULL" if value is None else "'" + value.replace("'", "''") + "'"


def sql_json(value: list[str]) -> str:
    return sql_str(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def division_names(rows: list[Row]) -> dict[tuple[str, str], str]:
    """(office code, sheet division) -> departments.name, suffixing names shared across offices (D6)."""
    offices_per_division: dict[str, set[str]] = defaultdict(set)
    for r in rows:
        offices_per_division[r.division].add(r.office_code)
    names = {}
    for r in rows:
        shared = len(offices_per_division[r.division]) > 1
        names[(r.office_code, r.division)] = f"{r.division} ({r.office_code})" if shared else r.division
    return names


def build_posting(fake: Faker, r: Row) -> dict:
    fam_key = family_of(r.title)
    fam = FAMILIES[fam_key]
    discipline = discipline_of(r.title)
    fill = lambda s: s.format(discipline=discipline)  # noqa: E731

    if fam.eligibility:
        eligibility = fill(fam.eligibility)
    else:
        eligibility = ELIG_SUBPROF if r.sg <= FIRST_LEVEL_MAX_SG else ELIG_PROF

    focus = re.sub(r"^Open Recruitment\s*—\s*", "", r.function).strip()
    lead = (
        f"The {r.office_name} is hiring {'an' if r.title[0].lower() in 'aeiou' else 'a'} {r.title} for its {r.division}."
        if r.status == "VACANT"
        else f"{r.title} position in the {r.division} of the {r.office_name}."
    )
    summary = " ".join(filter(None, [lead, f"Focus: {focus}." if focus else "", fake.random_element(fam.closing) if fam.closing else ""]))

    duties = fake.random_sample(fam.duties, length=min(4, len(fam.duties)))
    preferred = (
        "; ".join(fake.random_sample(fam.preferred, length=min(fake.random_int(1, 2), len(fam.preferred))))
        if fam.preferred
        else None
    )

    deadline = start = None
    if r.status == "VACANT":  # D10: filled seats carry no dates
        deadline = POSTING_DATE + timedelta(days=fake.random_int(*DEADLINE_DAYS))
        start = deadline + timedelta(days=fake.random_int(*START_AFTER_DEADLINE_DAYS))

    return {
        "family": fam_key,
        "summary": summary,
        "education_requirement": fam.education,
        "education_field": fill(fam.education_field),
        "experience_years": experience_years(r.title, r.sg),
        "experience_field": fill(fam.experience_field),
        "training_requirement": training(r.title, r.sg),
        "eligibility": eligibility,
        "competency": fam.competency,
        "preferred_qualifications": preferred,
        "responsibilities": duties,
        "required_skills": fam.skills,
        "certifications": [eligibility],  # the RSP form stores eligibility here too
        "application_deadline": deadline.isoformat() if deadline else None,
        "expected_start_date": start.isoformat() if start else None,
    }


def main() -> None:
    Faker.seed(FAKER_SEED)
    fake = Faker("en_PH")

    rows = read_sheet()
    dupes = [item for item, n in Counter(r.item.lower() for r in rows).items() if n > 1]
    if dupes:
        sys.exit(f"Duplicate plantilla item numbers in the sheet: {dupes}")

    div_names = division_names(rows)
    postings = [(r, build_posting(fake, r)) for r in rows]

    out: list[str] = [
        "-- Generated by scripts/import-sheet-postings/generate.py. Do not edit by hand.",
        "-- Plan: docs/plans/2026-10-20-import-sheet-job-postings.md",
        "-- Run in the Supabase SQL editor AFTER the divisions code fix is deployed.",
        f"-- {len(rows)} postings; all-or-nothing.",
        "",
        "BEGIN;",
        "",
        "-- Guards: stop before writing anything if this already ran or the data is off.",
        "DO $$",
        "DECLARE",
        "  clash text;",
        "  missing_sg int;",
        "BEGIN",
        "  SELECT string_agg(item_number, ', ') INTO clash FROM public.plantilla_slots",
        "   WHERE lower(btrim(item_number)) = ANY (ARRAY[" + ", ".join(sql_str(r.item.lower()) for r in rows) + "]);",
        "  IF clash IS NOT NULL THEN RAISE EXCEPTION 'Plantilla item numbers already exist: %', clash; END IF;",
        "",
        "  SELECT sg INTO missing_sg FROM unnest(ARRAY[" + ", ".join(str(s) for s in sorted({r.sg for r in rows})) + "]) AS sg",
        f"   WHERE NOT EXISTS (SELECT 1 FROM public.salary_grades g WHERE g.salary_grade = sg AND g.step = {SALARY_STEP}) LIMIT 1;",
        "  IF missing_sg IS NOT NULL THEN RAISE EXCEPTION 'Salary grade % has no Step 1 salary', missing_sg; END IF;",
        "",
        "  IF (SELECT count(*) FROM public.departments WHERE code IN ("
        + ", ".join(sql_str(c) for c in sorted({r.office_code for r in rows} - {NEW_OFFICE_CODE}))
        + ")) <> " + str(len({r.office_code for r in rows} - {NEW_OFFICE_CODE})) + " THEN",
        "    RAISE EXCEPTION 'An existing office code is missing from departments';",
        "  END IF;",
        "END $$;",
        "",
        "-- D3: the new office, active, with weighting option C.",
        "INSERT INTO public.departments (code, name, is_active) VALUES ("
        + sql_str(NEW_OFFICE_CODE) + ", " + sql_str(OFFICES["office of the city social welfare"][1]) + ", true);",
        "",
        "INSERT INTO public.department_weighting_configs (department_id, schema_option_id, is_active)",
        "SELECT d.id, o.id, true FROM public.departments d, public.weighting_schema_options o",
        f" WHERE d.code = {sql_str(NEW_OFFICE_CODE)} AND o.code = {sql_str(WEIGHTING_CODE)};",
        "",
        "-- D6: divisions as child rows of their office.",
        "INSERT INTO public.departments (code, name, parent_department_id, is_active)",
        "SELECT v.code, v.name, d.id, true",
        "FROM (VALUES",
    ]
    seen: list[tuple[str, str]] = []
    for r in rows:
        key = (r.office_code, r.division)
        if key not in seen:
            seen.append(key)
    per_office = Counter()
    value_lines = []
    for office_code, division in seen:
        per_office[office_code] += 1
        code = f"{office_code}-D{per_office[office_code]:02d}"
        value_lines.append(f"  ({sql_str(code)}, {sql_str(div_names[(office_code, division)])}, {sql_str(office_code)})")
    out.append(",\n".join(value_lines))
    out += [
        ") AS v(code, name, office_code)",
        "JOIN public.departments d ON d.code = v.office_code;",
        "",
        "-- D1/D4/D8/D10/D11: one posting + one slot per sheet row.",
        "CREATE TEMP TABLE _sheet_postings (",
        "  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),",
        "  sheet_row int, item_number text, title text, department text, division text,",
        "  status text, slot_status text, salary_grade int, summary text,",
        "  education_requirement text, education_field text, experience_years numeric, experience_field text,",
        "  training_requirement text, eligibility text, competency text, preferred_qualifications text,",
        "  responsibilities jsonb, required_skills jsonb, certifications jsonb,",
        "  application_deadline date, expected_start_date date",
        ") ON COMMIT DROP;",
        "",
        "INSERT INTO _sheet_postings (sheet_row, item_number, title, department, division, status, slot_status, salary_grade, summary,",
        "  education_requirement, education_field, experience_years, experience_field, training_requirement, eligibility,",
        "  competency, preferred_qualifications, responsibilities, required_skills, certifications, application_deadline, expected_start_date)",
        "VALUES",
    ]
    vals = []
    for r, p in postings:
        posting_status, slot_status = STATUS_MAP[r.status]
        vals.append(
            "  (" + ", ".join([
                str(r.sheet_row), sql_str(r.item), sql_str(r.title), sql_str(r.office_name), sql_str(r.division),
                sql_str(posting_status), sql_str(slot_status), str(r.sg), sql_str(p["summary"]),
                sql_str(p["education_requirement"]), sql_str(p["education_field"]), str(p["experience_years"]),
                sql_str(p["experience_field"]), sql_str(p["training_requirement"]), sql_str(p["eligibility"]),
                sql_str(p["competency"]), sql_str(p["preferred_qualifications"]), sql_json(p["responsibilities"]),
                sql_json(p["required_skills"]), sql_json(p["certifications"]),
                sql_str(p["application_deadline"]), sql_str(p["expected_start_date"]),
            ]) + ")"
        )
    out.append(",\n".join(vals) + ";")
    out += [
        "",
        "INSERT INTO public.job_postings (id, title, department, office, division, item_number, status, summary,",
        "  position_type, employment_status, number_of_positions, salary_grade, monthly_salary,",
        "  education_requirement, education_field, experience_years, experience_field, training_requirement,",
        "  eligibility, competency, preferred_qualifications, responsibilities, required_skills, certifications,",
        "  required_documents, application_deadline, expected_start_date, posted_by)",
        "SELECT s.id, s.title, s.department, s.department, s.division, s.item_number, s.status, s.summary,",
        f"  {sql_str(POSITION_TYPE)}, {sql_str(EMPLOYMENT_STATUS)}, 1, s.salary_grade, g.monthly_salary,",
        "  s.education_requirement, s.education_field, s.experience_years, s.experience_field, s.training_requirement,",
        "  s.eligibility, s.competency, s.preferred_qualifications, s.responsibilities, s.required_skills, s.certifications,",
        f"  {sql_json(REQUIRED_DOCUMENTS)}, s.application_deadline, s.expected_start_date, {sql_str(POSTED_BY)}",
        "FROM _sheet_postings s",
        f"JOIN public.salary_grades g ON g.salary_grade = s.salary_grade AND g.step = {SALARY_STEP};",
        "",
        # label is NOT NULL since 20260928; "Plantilla <slot_number>" matches its backfill.
        "INSERT INTO public.plantilla_slots (job_posting_id, slot_number, label, item_number, salary_grade, monthly_salary, status)",
        "SELECT s.id, 1, 'Plantilla 1', s.item_number, s.salary_grade, g.monthly_salary, s.slot_status",
        "FROM _sheet_postings s",
        f"JOIN public.salary_grades g ON g.salary_grade = s.salary_grade AND g.step = {SALARY_STEP};",
        "",
        "-- Final check: counts must match the sheet or everything rolls back.",
        "DO $$",
        "BEGIN",
        f"  IF (SELECT count(*) FROM public.job_postings jp JOIN _sheet_postings s ON s.id = jp.id) <> {len(rows)}",
        f"     OR (SELECT count(*) FROM public.plantilla_slots ps JOIN _sheet_postings s ON s.id = ps.job_posting_id) <> {len(rows)}",
        f"     OR (SELECT count(*) FROM public.departments d JOIN public.departments p ON p.id = d.parent_department_id",
        "         WHERE p.code IN (" + ", ".join(sql_str(c) for c in sorted({r.office_code for r in rows})) + ")) < " + str(len(seen)) + " THEN",
        "    RAISE EXCEPTION 'Import counts do not match the sheet; rolled back';",
        "  END IF;",
        "END $$;",
        "",
        "COMMIT;",
        "",
    ]
    OUTPUT.write_text("\n".join(out), encoding="utf-8", newline="\n")

    by = Counter((r.office_code, r.status) for r in rows)
    print(f"Wrote {OUTPUT.name}: {len(rows)} postings, {len(seen)} divisions")
    for (office, status), n in sorted(by.items()):
        print(f"  {office:7} {status:7} {n}")
    fams = Counter(p["family"] for _, p in postings)
    print("  families:", dict(sorted(fams.items())))


if __name__ == "__main__":
    main()
