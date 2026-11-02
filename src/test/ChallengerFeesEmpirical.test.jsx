import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';

import GlobalFeesPage from '../Pages/Fees/GlobalFeesPage';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import * as receiptUtils from '../utils/receiptUtils';

// Mock contexts
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/PermissionsContext', () => ({
  usePermissions: vi.fn(),
}));

// Mock Navbar to keep test isolated
vi.mock('../Components/layouts/Navbar', () => ({
  default: () => <nav data-testid="mock-navbar">Navbar</nav>,
}));

// Mock ReceiptsWorkspace
vi.mock('../Components/fees/ReceiptsWorkspace', () => ({
  default: ({ company, students }) => (
    <div data-testid="mock-receipts-workspace" data-company={company}>
      <span>Receipts for {company}</span>
      <span data-testid="ws-count">{students.length}</span>
    </div>
  ),
}));

// Mock ReceiptStudioModal
vi.mock('../Components/fees/ReceiptStudioModal', () => ({
  default: ({ isOpen, onClose, company, initialStudent }) =>
    isOpen ? (
      <div data-testid="challenger-studio-modal" data-company={company}>
        <span data-testid="modal-co">{company}</span>
        <span data-testid="modal-student">{initialStudent?.student_name}</span>
        <button data-testid="close-studio" onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.spyOn(receiptUtils, 'printReceiptElement').mockImplementation(() => Promise.resolve(true));

describe('Challenger M4 Empirical Suite: Global Fees Access Control & State Isolation', () => {
  let originalFetch;

  const setupUser = (user, permissionsObj = {}) => {
    useAuth.mockReturnValue({
      accessToken: 'jwt-accountant-token',
      refreshAccessToken: vi.fn().mockResolvedValue('jwt-accountant-refreshed'),
      user,
      isAuthenticated: Boolean(user),
      loading: false,
    });

    usePermissions.mockReturnValue({
      hasPermission: (perm) => {
        if (!perm) return false;
        if (permissionsObj['*']?.includes('*')) return true;
        const [resource, action] = perm.split(':');
        return permissionsObj[resource]?.includes(action) || permissionsObj[resource]?.includes('*') || false;
      },
      hasAnyPermission: (resource) => {
        if (permissionsObj['*']) return true;
        return !!permissionsObj[resource];
      },
      permissions: permissionsObj,
    });
  };

  // PermissionRoute component matching App.jsx logic
  const PermissionRoute = ({ children, permissions = [] }) => {
    const { isAuthenticated, loading } = useAuth();
    const { hasPermission } = usePermissions();

    if (loading) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    const allowed = permissions.some((perm) => hasPermission(perm));
    return allowed ? children : <Navigate to="/" replace />;
  };

  const mockCompanies = {
    companies: [
      { code: 'FLAG', name: 'FLAG German Academy', prefix: 'FLAG', divisions: ['FLG-KOC'], brand_color: '#312e81', is_active: true },
      { code: 'FDS', name: 'FILMAATIC Dance Studio', prefix: 'FDS', divisions: ['Kochi'], brand_color: '#4f46e5', is_active: true },
      { code: 'LP', name: 'Life Planner Universal', prefix: 'LP', divisions: ['Study Abroad'], brand_color: '#0f766e', is_active: true },
    ],
    default_company: 'FLAG',
  };

  const flagStudents = [
    {
      id: 101,
      student_name: 'FLAG Academic Scholar',
      student_id: 'FLAG-0101',
      email: 'flag@test.com',
      phone: '+919900000001',
      division: 'FLG-KOC',
      total_fee: 50000.0,
      total_paid: 25000.0,
      balance_due: 25000.0,
      fee_account_id: 11,
      latest_receipt_number: 'FLAG/26-27/0001',
      status: 'PARTIAL',
    },
  ];

  const lpStudents = [
    {
      id: 501,
      student_name: 'Adversarial LP Scholar',
      student_id: 'LP-0501',
      email: 'scholar@lp.test',
      phone: '+919988776655',
      division: 'Study Abroad',
      total_fee: 90000.0,
      total_paid: 45000.0,
      balance_due: 45000.0,
      fee_account_id: null,
      latest_receipt_number: 'LP/26-27/0001',
      status: 'PARTIAL',
    },
  ];

  const fdsStudents = [
    {
      id: 301,
      student_name: 'Adversarial FDS Performer',
      student_id: 'FDS-0301',
      email: 'performer@fds.test',
      phone: '+919988112233',
      division: 'Kochi',
      total_fee: 15000.0,
      total_paid: 15000.0,
      balance_due: 0.0,
      fee_account_id: 88,
      latest_receipt_number: 'FDS/26-27/0002',
      status: 'SETTLED',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('/fees/companies/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockCompanies),
        });
      }
      if (u.includes('company=LP')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ company: 'LP', count: 1, results: lpStudents }),
        });
      }
      if (u.includes('company=FDS')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ company: 'FDS', count: 1, results: fdsStudents }),
        });
      }
      if (u.includes('company=FLAG')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ company: 'FLAG', count: 1, results: flagStudents }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ company: 'FLAG', count: 0, results: [] }),
      });
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  // ── 1. Access Control Rejection Tests ─────────────────────────────────────

  it('unauthenticated user is redirected to /login', () => {
    setupUser(null, {});

    render(
      <MemoryRouter initialEntries={['/accounts/global-fees']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-view">Login Required</div>} />
          <Route
            path="/accounts/global-fees"
            element={
              <PermissionRoute permissions={['fees:accounts']}>
                <GlobalFeesPage />
              </PermissionRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('login-view')).toBeInTheDocument();
    expect(screen.queryByTestId('global-fees-page')).toBeNull();
  });

  it('user without fees:accounts (even with company-specific fee perms) is redirected to /', () => {
    // User has fees:lp and fees:fds, but NOT fees:accounts
    setupUser({ id: 10, name: 'Company Fee User' }, { fees: ['lp', 'fds', 'view'], flag: ['fees'] });

    render(
      <MemoryRouter initialEntries={['/accounts/global-fees']}>
        <Routes>
          <Route path="/" element={<div data-testid="home-view">Home Root</div>} />
          <Route
            path="/accounts/global-fees"
            element={
              <PermissionRoute permissions={['fees:accounts']}>
                <GlobalFeesPage />
              </PermissionRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('home-view')).toBeInTheDocument();
    expect(screen.queryByTestId('global-fees-page')).toBeNull();
  });

  // ── 2. Data Isolation & Immediate State Purging on Company Switch ─────────

  it('purges student records and resets ledger state immediately when company tab is switched', async () => {
    setupUser({ id: 1, name: 'Accountant' }, { fees: ['accounts'] });

    render(
      <MemoryRouter initialEntries={['/accounts/global-fees']}>
        <Routes>
          <Route
            path="/accounts/global-fees"
            element={
              <PermissionRoute permissions={['fees:accounts']}>
                <GlobalFeesPage />
              </PermissionRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Initial load defaults to FLAG
    await waitFor(() => {
      expect(screen.getByTestId('active-company-badge')).toHaveTextContent('FLAG');
      expect(screen.getByText('FLAG Academic Scholar')).toBeInTheDocument();
    });

    // Switch to LP tab
    const lpTab = screen.getByTestId('company-tab-LP');
    fireEvent.click(lpTab);

    // Verify active company badge switched to LP
    await waitFor(() => {
      expect(screen.getByTestId('active-company-badge')).toHaveTextContent('LP');
    });

    // Verify LP student is loaded and FLAG student is completely purged
    await waitFor(() => {
      expect(screen.getByText('Adversarial LP Scholar')).toBeInTheDocument();
      expect(screen.queryByText('FLAG Academic Scholar')).toBeNull();
    });

    // Switch to FDS tab
    const fdsTab = screen.getByTestId('company-tab-FDS');
    fireEvent.click(fdsTab);

    // Verify LP student disappears and FDS student appears
    await waitFor(() => {
      expect(screen.getByTestId('active-company-badge')).toHaveTextContent('FDS');
      expect(screen.queryByText('Adversarial LP Scholar')).toBeNull();
      expect(screen.getByText('Adversarial FDS Performer')).toBeInTheDocument();
    });
  });

  // ── 3. Receipt Studio Modal Context Binding ───────────────────────────────

  it('binds ReceiptStudioModal to the active company context when issuing a receipt', async () => {
    setupUser({ id: 1, name: 'Accountant' }, { fees: ['accounts'] });

    render(
      <MemoryRouter initialEntries={['/accounts/global-fees']}>
        <Routes>
          <Route
            path="/accounts/global-fees"
            element={
              <PermissionRoute permissions={['fees:accounts']}>
                <GlobalFeesPage />
              </PermissionRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Switch to LP tab
    await waitFor(() => {
      expect(screen.getByTestId('company-tab-LP')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('company-tab-LP'));

    await waitFor(() => {
      expect(screen.getByText('Adversarial LP Scholar')).toBeInTheDocument();
    });

    // Open receipt studio for the LP student
    const issueBtn = screen.getByTestId('issue-receipt-btn-501');
    fireEvent.click(issueBtn);

    // Verify modal receives company="LP" and student details
    await waitFor(() => {
      expect(screen.getByTestId('challenger-studio-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-co').textContent).toBe('LP');
      expect(screen.getByTestId('modal-student').textContent).toBe('Adversarial LP Scholar');
    });
  });
});
