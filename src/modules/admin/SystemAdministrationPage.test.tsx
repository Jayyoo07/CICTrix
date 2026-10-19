import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SystemAdministrationPage } from './SystemAdministrationPage';

vi.mock('../../components/Sidebar', () => ({
  Sidebar: () => <div data-testid="mock-sidebar">Sidebar</div>,
}));

vi.mock('../../components/AdminHeader', () => ({
  AdminHeader: () => <div data-testid="mock-admin-header">AdminHeader</div>,
}));

vi.mock('../../lib/api/officeRoles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/officeRoles')>();
  return {
    ...actual,
    listAssignments: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    listAuditTrail: vi.fn().mockResolvedValue([]),
    listEmployeeOptions: vi.fn().mockResolvedValue([]),
    createAssignment: vi.fn(),
    revokeOrTransfer: vi.fn(),
  };
});

vi.mock('../../lib/api/officeDirectory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/officeDirectory')>();
  return {
    ...actual,
    getOfficeDirectoryData: vi.fn().mockResolvedValue({ offices: [], rawHeadcount: [] }),
    filterOfficeDirectory: vi.fn().mockReturnValue([]),
  };
});

vi.mock('../../lib/api/departments', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/departments')>();
  return {
    ...actual,
    listDepartments: vi.fn().mockResolvedValue([]),
  };
});

describe('SystemAdministrationPage — Subtab Navigation (V1)', () => {
  it('renders default Office Directory tab and switches to Access & Role Management on click', async () => {
    render(
      <MemoryRouter>
        <SystemAdministrationPage />
      </MemoryRouter>
    );

    // Initial subtitle indicates Office Directory
    expect(
      screen.getByText('Master list of offices, department heads, supervisors, and headcount.')
    ).toBeInTheDocument();

    // Verify subtab buttons exist
    const directoryTab = screen.getByRole('button', { name: /Office Directory/i });
    const accessRolesTab = screen.getByRole('button', { name: /Access & Role Management/i });
    expect(directoryTab).toBeInTheDocument();
    expect(accessRolesTab).toBeInTheDocument();

    // Switch to Access & Role Management
    fireEvent.click(accessRolesTab);

    // Subtitle updates dynamically
    expect(
      screen.getByText('Assign or remove department heads, manage office access, and handle succession transfers.')
    ).toBeInTheDocument();

    // Switch back to Office Directory
    fireEvent.click(directoryTab);
    expect(
      screen.getByText('Master list of offices, department heads, supervisors, and headcount.')
    ).toBeInTheDocument();
  });
});
