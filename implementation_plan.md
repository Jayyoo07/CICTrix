# Implementation Plan - Remove Office Directory Search & Filter Card

## Proposed Changes

Remove the Search & Filter card element (the search input box, "Showing X offices" count, and "Clear Filters" button) and its associated filtering state from the Office Directory across all dashboards (PM, L&D, and RSP).

### 1. `src/components/OfficeDirectorySection.tsx` (PM and L&D Dashboards)
- Remove `officeDirectorySearch` state and `clearOfficeDirectoryFilters` function.
- Remove unused `Search` import from `lucide-react`.
- Update `filteredOfficeDirectoryRows` to direct active office filtering: `officeDirectoryRows.filter((r) => r.isActive)`.
- Remove the Search & Filter `<section>` card containing the search input, office count, and "Clear Filters" button.
- Keep the title, subtitle ("Click an office row to view all assigned employees and their accounts"), and the office directory table.
- Simplify empty table state message to "No offices found."

### 2. `src/modules/admin/RSPDashboard.tsx` (RSP Dashboard)
- Remove `employeeDirectorySearch` state and `clearEmployeeDirectoryFilters` function.
- Update `filteredOfficeDirectoryRows` to direct active office filtering without the search query.
- Remove the Search & Filter `<section>` card in the `accounts` directory tab.
- Update empty table state message to "No offices found."

## Verification Plan

### Manual / Browser Verification
- Open the Office Directory on PM Dashboard (`/admin/pm`) and verify the Search & Filter card is gone, while the subtitle, office list table, and row click behavior remain intact.
- Open the Office Directory on L&D Dashboard (`/admin/lnd`) and verify consistency.
- Open the Office Directory on RSP Dashboard (`/admin/rsp/accounts`) and verify the Search & Filter card is gone while the rest of the directory table operates normally.
