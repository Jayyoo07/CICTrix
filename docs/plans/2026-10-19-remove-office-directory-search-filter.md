---
title: Remove Search and Filter Bar from Office Directory
date: 2026-10-19
status: Done
summary: Remove the search input, office count, and clear filters card from the Office Directory across PM, L&D, and RSP dashboards.
---

## Goal

Remove the Search & Filter card element (the search input box, "Showing X offices" count, and "Clear Filters" button) and its associated filtering state from the Office Directory across all dashboards (PM, L&D, and RSP).

## Approach

| # | Decision |
|---|---|
| D1 | In `src/components/OfficeDirectorySection.tsx`, remove the `<section>` card housing the search input, office count, and "Clear Filters" button. Retain the subtitle and office table. |
| D2 | In `src/components/OfficeDirectorySection.tsx`, remove the `officeDirectorySearch` state, `clearOfficeDirectoryFilters` handler, and simplify rows to active offices without search filtering. |
| D3 | In `src/modules/admin/RSPDashboard.tsx`, remove the matching Search & Filter `<section>` card in the accounts directory tab, remove `employeeDirectorySearch` state and `clearEmployeeDirectoryFilters` handler. |
| D4 | Update empty table state copy from filter-oriented messages to "No offices found." |

## Steps

1. Update `src/components/OfficeDirectorySection.tsx`:
   - Remove `officeDirectorySearch` state and `clearOfficeDirectoryFilters` function.
   - Remove unused `Search` import from `lucide-react`.
   - Update `filteredOfficeDirectoryRows` to direct active office filtering.
   - Remove the search input / filter card UI block.
   - Adjust empty table state text to "No offices found."
2. Update `src/modules/admin/RSPDashboard.tsx`:
   - Remove `employeeDirectorySearch` state and `clearEmployeeDirectoryFilters` function.
   - Update `filteredOfficeDirectoryRows` to direct active office filtering.
   - Remove the search input / filter card UI block from the `accounts` directory section.
   - Adjust empty table state text to "No offices found."
3. Verify changes and ensure clean builds.
