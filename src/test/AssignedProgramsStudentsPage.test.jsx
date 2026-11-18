import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import AssignedProgramsStudentsPage from '../Pages/AssignedProgramsStudentsPage';
import { mapImportedRows } from '../Components/programs/BulkImportModal';
import { getFilteredMenu } from '../config/roles';

let mockAuthState = {
  accessToken: 'test-token',
  user: { id: 1, username: 'manager', is_superuser: false, permissions: { processing: ['prog_stud_manage'] } },
};

let mockPermissionsSet = new Set(['processing:prog_stud_manage']);

vi.mock('../Components/layouts/Navbar', () => ({
  default: () => <nav data-testid="navbar" />,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('../context/PermissionsContext', () => ({
  usePermissions: () => ({
    hasPermission: (perm) => mockPermissionsSet.has(perm),
  }),
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Lightweight DataGrid shim so real column headers, frozen metadata, custom renderers, and onRowsChange run in JSDOM
vi.mock('react-data-grid', () => ({
  renderTextEditor: () => null,
  DataGrid: ({ columns, rows, onRowsChange }) => (
    <table data-testid="mock-grid">
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              data-key={c.key}
              data-frozen={c.frozen ? 'true' : 'false'}
            >
              {c.renderHeaderCell ? c.renderHeaderCell() : c.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIdx) => (
          <tr key={row.id}>
            {columns.map((c) => (
              <td key={c.key}>
                {c.renderCell ? (
                  c.renderCell({ row })
                ) : c.renderEditCell ? (
                  <input
                    aria-label={`${c.name}-${row.id}`}
                    defaultValue={row[c.key] ?? ''}
                    onBlur={(e) => {
                      const nextRows = rows.map((r, i) =>
                        i === rowIdx ? { ...r, [c.key]: e.target.value } : r
                      );
                      onRowsChange?.(nextRows, { indexes: [rowIdx] });
                    }}
                  />
                ) : (
                  row[c.key] ?? ''
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const SAMPLE_PROGRAMS = [
  {
    id: 11,
    sl_no: 1,
    project: 'AUSBILDUNG',
    country: 'GERMANY',
    assignment: 'GIVEN',
    completed: 'DONE',
    presentation: '-',
    training_to_team: 'Done by Navya',
    assigned_to: 20,
    assigned_to_name: 'Navya Doc',
  },
];

const SAMPLE_STUDENTS = [
  {
    id: 21,
    sl_no: 1,
    name: 'Joshua Shaji',
    age: 21,
    phone: '6282693592',
    email_address: 'joshua@example.com',
    place: 'Kochi',
    qualification: 'Bcom',
    preferred_country: 'Ireland',
    preferred_program: 'finance and accounting',
    intake: 'Sep 2026',
    aps_status: 'Pending',
    ielts_status: '7.0',
    german_status: 'A1',
    assigned_to: 20,
    assigned_to_name: 'Navya Doc',
  },
];

const SAMPLE_STAFF = [
  { id: 20, name: 'Navya Doc', role: 'DOCUMENTATION' },
  { id: 21, name: 'Akhil Ops', role: 'OPERATION' },
];

describe('AssignedProgramsStudentsPage & tracker workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      accessToken: 'test-token',
      user: { id: 1, username: 'manager', is_superuser: false },
    };
    mockPermissionsSet = new Set(['processing:prog_stud_manage']);

    axios.get.mockImplementation((url) => {
      if (url.includes('/employees/')) {
        return Promise.resolve({ data: SAMPLE_STAFF });
      }
      if (url.includes('/assigned-programs/') && !url.includes('/timeline/')) {
        return Promise.resolve({ data: SAMPLE_PROGRAMS });
      }
      if (url.includes('/assigned-students-db/') && !url.includes('/timeline/')) {
        return Promise.resolve({ data: SAMPLE_STUDENTS });
      }
      if (url.includes('/timeline/')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              action: 'UPDATED',
              field_name: 'aps_status',
              field_label: 'APS STATUS',
              old_value: 'Pending',
              new_value: 'Verified',
              changed_by_name: 'Navya Doc',
              created_at: '2026-11-16T10:00:00Z',
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    axios.patch.mockImplementation((url, payload) =>
      Promise.resolve({ data: { ...SAMPLE_PROGRAMS[0], ...payload } })
    );
  });

  it('renders exact headers & frozen columns for Assigned Programs and Assigned Students Database', async () => {
    render(<AssignedProgramsStudentsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('AUSBILDUNG')).toBeInTheDocument();
    });

    // Assigned Programs exact headers + frozen up to PROJECT
    const progHeaders = Array.from(document.querySelectorAll('thead th'));
    const progNames = progHeaders.map((th) => th.textContent);
    expect(progNames).toEqual([
      '',
      'SL.NO.',
      'PROJECT',
      'COUNTRY',
      'ASSIGNMENT',
      'COMPLETED',
      'PRESENTATION',
      'TRAINING TO TEAM',
      'ASSIGNED TO',
      'TIMELINE',
      'DELETE',
    ]);
    expect(progHeaders.find((th) => th.dataset.key === 'sl_no').dataset.frozen).toBe('true');
    expect(progHeaders.find((th) => th.dataset.key === 'project').dataset.frozen).toBe('true');
    expect(progHeaders.find((th) => th.dataset.key === 'country').dataset.frozen).toBe('false');

    // Manager sees DOCUMENTATION,OPERATION staff fetch, real employee names, and management buttons
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/employees/?roles=DOCUMENTATION,OPERATION'),
      expect.any(Object)
    );
    const filterSelect = screen.getByLabelText(/Filter by assigned staff/i);
    expect(Array.from(filterSelect.options).map((o) => o.textContent)).toEqual([
      'All Staff',
      'Unassigned',
      'Navya Doc',
      'Akhil Ops',
    ]);
    const rowAssigneeSelect = screen.getByLabelText(/Assign staff for row/i);
    expect(Array.from(rowAssigneeSelect.options).map((o) => o.textContent)).toEqual([
      'Unassigned',
      'Navya Doc',
      'Akhil Ops',
    ]);
    expect(screen.getByRole('button', { name: /Add Row/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import Excel/i })).toBeInTheDocument();

    // Switch to Assigned Students Database tab
    fireEvent.click(screen.getByRole('button', { name: /Assigned Students Database/i }));
    await waitFor(() => {
      expect(screen.getByDisplayValue('Joshua Shaji')).toBeInTheDocument();
    });

    const studHeaders = Array.from(document.querySelectorAll('thead th'));
    const studNames = studHeaders.map((th) => th.textContent);
    expect(studNames).toEqual([
      '',
      'SL NO',
      'NAME',
      'AGE',
      'PHONE',
      'EMAIL ADDRESS',
      'PLACE',
      'QUALIFICATION',
      'PREFERRED COUNTRY',
      'PREFERRED PROGRAM',
      'INTAKE',
      'APS STATUS',
      'IELTS STATUS',
      'GERMAN STATUS',
      'SOURCE',
      'ASSIGNED TO',
      'TIMELINE',
      'DELETE',
    ]);

    // Frozen exactly up to EMAIL ADDRESS
    ['sl_no', 'name', 'age', 'phone', 'email_address'].forEach((key) => {
      expect(studHeaders.find((th) => th.dataset.key === key).dataset.frozen).toBe('true');
    });
    ['place', 'qualification', 'aps_status', 'german_status'].forEach((key) => {
      expect(studHeaders.find((th) => th.dataset.key === key).dataset.frozen).toBe('false');
    });
  });

  it('restricts Add/Import/Delete/Assign controls for assigned-only holders while keeping inline edit & timeline', async () => {
    mockPermissionsSet = new Set(['processing:prog_stud_assigned']);

    render(<AssignedProgramsStudentsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('AUSBILDUNG')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Add Row/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Import Excel/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Filter by assigned staff/i)).not.toBeInTheDocument();

    const headers = Array.from(document.querySelectorAll('thead th')).map((th) => th.textContent);
    expect(headers).not.toContain('ASSIGNED TO');
    expect(headers).not.toContain('DELETE');
    expect(headers).toContain('TIMELINE');

    // Assigned user performs full inline edit on row -> triggers PATCH
    const input = screen.getByLabelText('COMPLETED-11');
    fireEvent.blur(input, { target: { value: 'VERIFIED' } });

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/assigned-programs/11/'),
        { completed: 'VERIFIED' },
        expect.any(Object)
      );
    });

    // Open Change Timeline drawer
    fireEvent.click(screen.getByRole('button', { name: /History/i }));
    await waitFor(() => {
      expect(screen.getByText('APS STATUS')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });

  it('shows nav item only for processing:prog_stud_manage or processing:prog_stud_assigned holders', () => {
    const canManage = getFilteredMenu(
      () => false,
      (p) => p === 'processing:prog_stud_manage'
    );
    expect(canManage.some((item) => item.id === 'assignedProgramStudents')).toBe(true);

    const canAssigned = getFilteredMenu(
      () => false,
      (p) => p === 'processing:prog_stud_assigned'
    );
    expect(canAssigned.some((item) => item.id === 'assignedProgramStudents')).toBe(true);

    const unauthorized = getFilteredMenu(
      () => false,
      () => false
    );
    expect(unauthorized.some((item) => item.id === 'assignedProgramStudents')).toBe(false);
  });

  it('maps Google Sheets Excel headers cleanly including ASSIGNEMNT typo and skips blank numbered rows', () => {
    const mapped = mapImportedRows(
      [
        {
          'SL.NO.': '1',
          PROJECT: 'AUSBILDUNG',
          COUNTRY: 'GERMANY',
          ASSIGNEMNT: 'GIVEN',
          COMPLETED: 'DONE',
          PRESENTATION: '-',
          'TRAINING TO TEAM': 'Done by Navya',
        },
        {
          'SL.NO.': '12',
          PROJECT: '',
          COUNTRY: '',
          ASSIGNEMNT: '',
          COMPLETED: '',
          PRESENTATION: '',
          'TRAINING TO TEAM': '',
        },
      ],
      'programs'
    );

    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toEqual({
      sl_no: 1,
      project: 'AUSBILDUNG',
      country: 'GERMANY',
      assignment: 'GIVEN',
      completed: 'DONE',
      presentation: '-',
      training_to_team: 'Done by Navya',
    });
  });

  it('creates assigned student record with empty string age (not null) and source options', async () => {
    render(<AssignedProgramsStudentsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Assigned Students Database/i }));
    await waitFor(() => {
      expect(screen.getByDisplayValue('Joshua Shaji')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add Row/i }));

    const sourceSelect = screen.getByLabelText('SOURCE');
    const optionValues = Array.from(sourceSelect.querySelectorAll('option')).map((o) => o.value);
    expect(optionValues).toEqual(['', 'whatsapp', 'insta', 'facebook', 'chatgpt', 'voxbay', 'walkin']);

    fireEvent.change(screen.getByLabelText('NAME'), { target: { value: 'Akash' } });
    fireEvent.change(sourceSelect, { target: { value: 'whatsapp' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Row/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/assigned-students-db/'),
        expect.objectContaining({
          name: 'Akash',
          age: '',
          source: 'whatsapp',
        }),
        expect.any(Object)
      );
    });
  });

  it('keeps SL NO / SL.NO. non-editable in both Assigned Programs and Assigned Students Database grids', async () => {
    render(<AssignedProgramsStudentsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('AUSBILDUNG')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('SL.NO.-11')).not.toBeInTheDocument();
    expect(screen.getByLabelText('PROJECT-11')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Assigned Students Database/i }));
    await waitFor(() => {
      expect(screen.getByDisplayValue('Joshua Shaji')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('SL NO-21')).not.toBeInTheDocument();
    expect(screen.getByLabelText('NAME-21')).toBeInTheDocument();
  });
});
