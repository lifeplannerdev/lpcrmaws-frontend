import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AssignedBatchesView from '../Components/leads/AssignedBatchesView';

const mockInitiateCall = vi.fn();
const mockOpenLiveCall = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'test-token',
    user: { id: 10, username: 'anjali', first_name: 'Anjali', last_name: 'Nair', company: 'LP' },
  }),
}));

vi.mock('../context/PermissionsContext', () => ({
  Can: ({ children }) => <>{children}</>,
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock('../hooks/useVoxbayCall', () => ({
  useVoxbayCall: () => ({ initiateCall: mockInitiateCall }),
}));

vi.mock('../context/LiveCallContext', () => ({
  useLiveCall: () => ({ openLiveCall: mockOpenLiveCall }),
}));

// Lightweight DataGrid shim so SpreadsheetView's real column definitions & cell renderers run in JSDOM
vi.mock('react-data-grid', () => ({
  renderTextEditor: () => null,
  DataGrid: ({ columns, rows }) => (
    <table>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key}>{c.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((c) => (
              <td key={c.key}>
                {c.renderCell ? c.renderCell({ row, column: c }) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const sampleBatches = [
  {
    id: 101,
    company: 'LP',
    title: 'Batch 1 - From Rahul',
    assigned_to: { id: 10, first_name: 'Anjali', last_name: 'Nair', username: 'anjali' },
    assigned_by: { id: 1, first_name: 'Admin', last_name: 'User', username: 'admin' },
    assignment_type: 'PRIMARY',
    followup_strategy: 'specific_date',
    notes: 'Priority follow-up',
    source_summary: 'From Rahul',
    total_leads_count: 10,
    total_assigned_count: 10,
    active_count: 8,
    reassigned_out_count: 2,
    new_count: 3,
    contacted_count: 4,
    converted_count: 1,
    overdue_followups_count: 2,
    created_at: '2026-11-16T09:00:00Z',
  },
  {
    id: 102,
    company: 'LP',
    title: 'Batch 2 - 5 Fresh Leads',
    assigned_to: { id: 10, first_name: 'Anjali', last_name: 'Nair', username: 'anjali' },
    assigned_by: { id: 1, first_name: 'Admin', last_name: 'User', username: 'admin' },
    assignment_type: 'PRIMARY',
    followup_strategy: 'keep',
    notes: '',
    source_summary: 'From Unassigned',
    total_leads_count: 5,
    total_assigned_count: 5,
    active_count: 5,
    reassigned_out_count: 0,
    new_count: 5,
    contacted_count: 0,
    converted_count: 0,
    overdue_followups_count: 0,
    created_at: '2026-11-16T11:30:00Z',
  },
];

const batch1ActiveLeads = [
  {
    id: 501,
    name: 'Meera Thomas',
    phone: '9876543210',
    email: 'meera@example.com',
    status: 'HOT',
    priority: 'HIGH',
    next_follow_up_date: '2026-11-17',
    last_follow_up_date: '2026-11-15',
    remarks: 'Interested in Ausbildung',
    created_at: '2026-10-05T10:00:00Z',
    is_reassigned_out: false,
  },
];

const batch1AllLeads = [
  ...batch1ActiveLeads,
  {
    id: 502,
    name: 'Moved Lead',
    phone: '9876500000',
    email: 'moved@example.com',
    status: 'ENQUIRY',
    priority: 'MEDIUM',
    next_follow_up_date: null,
    last_follow_up_date: null,
    remarks: 'Transferred elsewhere',
    created_at: '2026-10-02T10:00:00Z',
    is_reassigned_out: true,
  },
];

describe('AssignedBatchesView', () => {
  let mockAuthFetch;
  let mockOnOpenLeadPanel;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnOpenLeadPanel = vi.fn();
    mockAuthFetch = vi.fn(async (url) => {
      if (url.includes('/leads/assignment-batches/101/leads/')) {
        const includeMoved = url.includes('include_reassigned_out=true');
        const rows = includeMoved ? batch1AllLeads : batch1ActiveLeads;
        return {
          ok: true,
          json: async () => ({ count: rows.length, results: rows }),
        };
      }
      if (url.includes('/leads/assignment-batches/')) {
        return {
          ok: true,
          json: async () => ({ count: sampleBatches.length, results: sampleBatches }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  it('renders separate assignment batches and loads batch leads into spreadsheet grid', async () => {
    render(
      <AssignedBatchesView
        authFetch={mockAuthFetch}
        companyFilter="LP"
        filterStaff="all"
        staffMembers={[]}
        hasGlobalRead={false}
        onOpenLeadPanel={mockOnOpenLeadPanel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Batch 1 - From Rahul')).toBeInTheDocument();
      expect(screen.getByText('Batch 2 - 5 Fresh Leads')).toBeInTheDocument();
    });

    // Click to expand Batch 1
    fireEvent.click(screen.getByTestId('batch-toggle-101'));

    await waitFor(() => {
      expect(screen.getByText('Meera Thomas')).toBeInTheDocument();
      expect(screen.getByText('Next Follow-up')).toBeInTheDocument();
      expect(screen.getByText('Last Follow-up')).toBeInTheDocument();
    });

    // Verify Direct Call, Live Call Modal, and Side Panel buttons work
    fireEvent.click(screen.getByTitle('Direct Call (Voxbay)'));
    expect(mockInitiateCall).toHaveBeenCalledWith('9876543210', expect.objectContaining({ id: 501 }));

    fireEvent.click(screen.getByTitle('Open Live Call Modal (Dossier & Dialer)'));
    expect(mockOpenLiveCall).toHaveBeenCalledWith(expect.objectContaining({ id: 501 }));

    fireEvent.click(screen.getByTitle('Open Lead Follow-ups & Lifecycle Panel'));
    expect(mockOnOpenLeadPanel).toHaveBeenCalledWith(expect.objectContaining({ id: 501 }));

    // Toggle "Show Reassigned Out"
    const toggle = screen.getByTestId('toggle-reassigned-101');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(
        mockAuthFetch.mock.calls.some(([u]) =>
          u.includes('/leads/assignment-batches/101/leads/') && u.includes('include_reassigned_out=true')
        )
      ).toBe(true);
      expect(screen.getByText('Moved Lead')).toBeInTheDocument();
      expect(screen.getByText('Reassigned Out')).toBeInTheDocument();
    });
  });
});
