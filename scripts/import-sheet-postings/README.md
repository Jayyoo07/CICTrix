# import-sheet-postings

Turns the four-office plantilla sheet into one SQL file that adds the job postings, their plantilla slots, the Social Welfare office and every office's divisions. Plan and decisions: `docs/plans/2026-10-20-import-sheet-job-postings.md`.

## Use

```bash
python scripts/import-sheet-postings/generate.py
```

This reads `sheet.csv`, a CSV export of the Google Sheet, and writes `import_sheet_postings.sql`. Review that file, then run it in the Supabase SQL editor **after** the divisions code fix is deployed. Otherwise the new division rows show up as offices in dropdowns.

The SQL runs as a single transaction. It stops without writing anything if any plantilla item number already exists, if a salary grade has no Step 1 salary, or if the final row counts don't match the sheet.

## What it does

- VACANT rows become `Open` postings with an `open` slot and dates. FILLED rows become `Closed` postings with a `filled` slot and no dates.
- Item numbers are stored exactly as written in the sheet.
- Qualifications follow CSC conventions by job family and salary grade. Faker (`en_PH`, fixed seed) only varies wording, the duties picked and the dates, so every run gives the same output.
- Monthly salary is the live Step 1 rate from `salary_grades`, looked up when the SQL runs.

## What it does not do

- It doesn't create employees, link incumbents to filled seats, or add critical positions to Succession Planning. That's the employee import.
- It doesn't read the Google Sheet directly. Re-export `sheet.csv` if the sheet changes. The row fixes in `FIXES` check their expected values and stop if rows have moved.

## Dependencies

Python 3.10+ and `faker`.
