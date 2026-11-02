import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';

import GlobalFeesPage from '../Pages/Fees/GlobalFeesPage';
import { getFilteredMenu, getCategorizedMenu } from '../config/roles';
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

// Mock Navbar to keep test isolated to GlobalFeesPage
vi.mock('../Components/layouts/Navbar', () => ({
  default: () => <nav data-testid="mock-navbar">Navbar</nav>,
}));

// Mock ReceiptsWorkspace to isolate register tab behavior
vi.mock('../Components/fees/ReceiptsWorkspace', () => ({
  default: ({ company, students }) => (
    <div data-testid="mock-receipts-workspace" data-company={company}>
      <span>Receipts Workspace for {company}</span>
      <span data-testid="workspace-student-count">{students.length} students</span>
    </div>
  ),
}));

// Mock ReceiptStudioModal
vi.mock('../Components/fees/ReceiptStudioModal', () => ({
  default: ({ isOpen, onClose, company, initialStudent, onSaved }) =>
    isOpen ? (
      <div data-testid="mock-receipt-studio-modal" data-company={company}>
        <h2>Receipt Studio ({company})</h2>
        {initialStudent && (
          <span data-testid="modal-student-name">{initialStudent.student_name || initialStudent.name}</span>
        )}
        <button data-testid="studio-close-btn" onClick={onClose}>
          Close
        </button>
        <button data-testid="studio-save-btn" onClick={() => onSaved && onSaved()}>
          Save
        </button>
      </div>
    ) : null,
}));

// Mock printReceiptElement
vi.spyOn(receiptUtils, 'printReceiptElement').mockImplementation(() => Promise.resolve(true));

describe('GlobalFeesPage & RBAC Access Control Suite', () => {
  let originalFetch;
  let fetchedUrls = [];

  const mockCompaniesResponse = {
    companies: [
      {
        code: 'FLAG',
        name: 'FLAG German Language Academy',
        subtitle: 'Foreign Language Academy for Global Careers',
        prefix: 'FLAG',
        brand_color: '#312e81',
        divisions: ['FLG-KOC', 'FLG-KTM'],
        currency: 'INR',
        is_active: true,
      },
      {
        code: 'FDS',
        name: 'FILMAATIC Dance Studio',
        subtitle: 'Dance • Fitness • Wedding Choreography',
        prefix: 'FDS',
        brand_color: '#4f46e5',
        divisions: ['Kottayam', 'Kochi'],
        currency: 'INR',
        is_active: true,
      },
      {
        code: 'LP',
        name: 'Life Planner Universal',
        subtitle: 'Study Abroad & Global Processing',
        prefix: 'LP',
        brand_color: '#0f766e',
        divisions: ['Study Abroad', 'GCC Students'],
        currency: 'INR',
        is_active: true,
      },
    ],
    default_company: 'FLAG',
  };

  const flagStudents = [
    {
      id: 101,
      student_name: 'John German Doe',
      student_id: 'FLAG-001',
      email: 'john.flag@example.com',
      phone: '+919876500001',
      division: 'FLG-KOC',
      total_fee: 50000,
      total_paid: 25000,
      balance_due: 25000,
      fee_account_id: 501,
      latest_receipt_number: 'FLAG/26-27/0001',
      status: 'PARTIAL',
      company: 'FLAG',
    },
    {
      id: 102,
      student_name: 'Anna German Schmidt',
      student_id: 'FLAG-002',
      email: 'anna.flag@example.com',
      phone: '+919876500002',
      division: 'FLG-KTM',
      total_fee: 45000,
      total_paid: 45000,
      balance_due: 0,
      fee_account_id: 502,
      latest_receipt_number: 'FLAG/26-27/0002',
      status: 'PAID',
      company: 'FLAG',
    },
  ];

  const lpStudents = [
    {
      id: 301,
      student_name: 'Rajesh LifePlanner Kumar',
      student_id: 'LP-PROC-881',
      email: 'rajesh.lp@studyabroad.com',
      phone: '+919846011111',
      division: 'Study Abroad',
      total_fee: 150000,
      total_paid: 50000,
      balance_due: 100000,
      fee_account_id: 701,
      latest_receipt_number: 'LP/26-27/0001',
      status: 'PARTIAL',
      company: 'LP',
    },
    {
      id: 302,
      student_name: 'Fatima LifePlanner Zahra',
      student_id: 'LP-PROC-882',
      email: 'fatima.lp@studyabroad.com',
      phone: '+919846022222',
      division: 'GCC Students',
      total_fee: 120000,
      total_paid: 120000,
      balance_due: 0,
      fee_account_id: 702,
      latest_receipt_number: 'LP/26-27/0002',
      status: 'PAID',
      company: 'LP',
    },
  ];

  const fdsStudents = [
    {
      id: 201,
      student_name: 'Maya Dance Dancer',
      student_id: 'FDS-001',
      email: 'maya.fds@dance.com',
      phone: '+919876599991',
      division: 'Kottayam',
      total_fee: 15000,
      total_paid: 15000,
      balance_due: 0,
      fee_account_id: 601,
      latest_receipt_number: 'FDS/26-27/0001',
      status: 'PAID',
      company: 'FDS',
    },
  ];

  beforeEach(() => {
    fetchedUrls = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      const urlStr = String(url);
      fetchedUrls.push(urlStr);

      if (urlStr.includes('/fees/companies/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockCompaniesResponse),
        });
      }

      if (urlStr.includes('company=LP')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ results: lpStudents }),
        });
      }

      if (urlStr.includes('company=FDS')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ results: fdsStudents }),
        });
      }

      if (urlStr.includes('company=FLAG')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ results: flagStudents }),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      });
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  const setupAuth = (user, permissions = {}) => {
    useAuth.mockReturnValue({
      accessToken: 'jwt-accountant-token',
      refreshAccessToken: vi.fn().mockResolvedValue('jwt-accountant-refreshed'),
      user,
      isAuthenticated: Boolean(user),
      loading: false,
    });

    const hasPermission = (permStr) => {
      if (!permStr) return false;
      if (permissions['*'] && permissions['*'].includes('*')) return true;
      const [res, act] = permStr.split(':');
      if (permissions[res]) {
        return permissions[res].includes('*') || permissions[res].includes(act);
      }
      return false;
    };

    const hasAnyPermission = (res) => {
      if (!res) return false;
      if (permissions['*'] && permissions['*'].includes('*')) return true;
      return Boolean(permissions[res] && permissions[res].length > 0);
    };

    usePermissions.mockReturnValue({
      permissions,
      hasPermission,
      hasAnyPermission,
    });

    return { hasPermission, hasAnyPermission };
  };

  // ── 1. Navigation Menu Access Control Tests (R1) ───────────────────────────
  describe('Navigation & Menu RBAC Filtering (roles.js)', () => {
    it('strictly shows Global Fees navigation entry ONLY to users with fees:accounts', () => {
      const { hasPermission, hasAnyPermission } = setupAuth(
        { id: 1, name: 'Accountant' },
        { fees: ['accounts'] }
      );

      const filtered = getFilteredMenu(hasAnyPermission, hasPermission, { role_names: ['ACCOUNTANT'] });
      const globalFeesItem = filtered.find((item) => item.id === 'globalFees');

      expect(globalFeesItem).toBeDefined();
      expect(globalFeesItem.path).toBe('/accounts/global-fees');
      expect(globalFeesItem.requiredPermissions).toEqual(['fees:accounts']);
      expect(globalFeesItem.category).toBe('accounts');
    });

    it('shows Global Fees to superuser with {"*": ["*"]}', () => {
      const { hasPermission, hasAnyPermission } = setupAuth(
        { id: 99, name: 'Super Admin', is_superuser: true },
        { '*': ['*'] }
      );

      const filtered = getFilteredMenu(hasAnyPermission, hasPermission, { role_names: ['SUPERUSER'] });
      const globalFeesItem = filtered.find((item) => item.id === 'globalFees');
      expect(globalFeesItem).toBeDefined();
    });

    it('strictly hides Global Fees navigation from users lacking fees:accounts (e.g. fees:view or flag:fees only)', () => {
      const { hasPermission, hasAnyPermission } = setupAuth(
        { id: 2, name: 'FLAG Staff' },
        { fees: ['view'], flag: ['fees', 'admin'] }
      );

      const filtered = getFilteredMenu(hasAnyPermission, hasPermission, { role_names: ['TRAINER'] });
      const globalFeesItem = filtered.find((item) => item.id === 'globalFees');
      expect(globalFeesItem).toBeUndefined();
    });

    it('hides the entire Accounts category in getCategorizedMenu when fees:accounts is absent', () => {
      const { hasPermission, hasAnyPermission } = setupAuth(
        { id: 3, name: 'Sales Agent' },
        { leads: ['*'] }
      );

      const filtered = getFilteredMenu(hasAnyPermission, hasPermission, { role_names: ['SALES'] });
      const { categories } = getCategorizedMenu(filtered, { company: 'FLAG' });
      const accountsCategory = categories.find((c) => c.id === 'accounts');
      expect(accountsCategory).toBeUndefined();
    });
  });

  // ── 2. Route Protection & PermissionRoute Tests (R1) ───────────────────────
  describe('Route Guarding & Permission Enforcement (PermissionRoute)', () => {
    // PermissionRoute helper matching App.jsx logic
    const PermissionRoute = ({ children, permissions = [] }) => {
      const { isAuthenticated, loading } = useAuth();
      const { hasPermission } = usePermissions();

      if (loading) return null;
      if (!isAuthenticated) return <Navigate to="/login" replace />;

      const allowed = permissions.some((perm) => hasPermission(perm));
      return allowed ? children : <Navigate to="/" replace />;
    };

    it('blocks unauthorized users and redirects to / when fees:accounts is missing', () => {
      setupAuth({ id: 5, name: 'Unauthorized User' }, { fees: ['view'] });

      render(
        <MemoryRouter initialEntries={['/accounts/global-fees']}>
          <Routes>
            <Route path="/" element={<div data-testid="home-page">Home Redirected</div>} />
            <Route
              path="/accounts/global-fees"
              element={
                <PermissionRoute permissions={['fees:accounts']}>
                  <div data-testid="protected-content">Global Fees Secret</div>
                </PermissionRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('home-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });

    it('redirects unauthenticated users to /login', () => {
      setupAuth(null, {});

      render(
        <MemoryRouter initialEntries={['/accounts/global-fees']}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login Screen</div>} />
            <Route
              path="/accounts/global-fees"
              element={
                <PermissionRoute permissions={['fees:accounts']}>
                  <div data-testid="protected-content">Global Fees Secret</div>
                </PermissionRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).toBeNull();
    });

    it('permits authorized user with fees:accounts to load GlobalFeesPage', async () => {
      setupAuth({ id: 1, name: 'Lead Accountant' }, { fees: ['accounts'] });

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

      await waitFor(() => {
        expect(screen.getByTestId('global-fees-page')).toBeInTheDocument();
        expect(screen.getByTestId('page-title')).toHaveTextContent('Global Fees & Accounts');
      });
    });
  });

  // ── 3. Dynamic Company Selector & Zero-Bleed Isolation (R2 & User Directive) ─
  describe('Company Switching & Strict Zero-Bleed Data Isolation', () => {
    it('initializes with FLAG, loads FLAG students, and renders correct KPI metrics', async () => {
      setupAuth({ id: 1, name: 'Auditor' }, { fees: ['accounts'] });

      render(
        <MemoryRouter>
          <GlobalFeesPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('active-company-badge')).toHaveTextContent('FLAG');
      });

      // Assert FLAG students rendered
      await waitFor(() => {
        expect(screen.getByText('John German Doe')).toBeInTheDocument();
        expect(screen.getByText('Anna German Schmidt')).toBeInTheDocument();
      });

      // Assert total volume derived from FLAG students: 50000 + 45000 = 95,000
      expect(screen.getByTestId('kpi-student-count')).toHaveTextContent('2');
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('₹95,000.00');
    });

    it('CRITICAL DIRECTIVE: switching to LP immediately clears FLAG records and displays LP processing students exclusively', async () => {
      setupAuth({ id: 1, name: 'Auditor' }, { fees: ['accounts'] });

      render(
        <MemoryRouter>
          <GlobalFeesPage />
        </MemoryRouter>
      );

      // Wait for initial FLAG records
      await waitFor(() => {
        expect(screen.getByText('John German Doe')).toBeInTheDocument();
      });

      // Click LP tab
      const lpTab = screen.getByTestId('company-tab-LP');
      fireEvent.click(lpTab);

      // Verify active company badge switched to LP
      await waitFor(() => {
        expect(screen.getByTestId('active-company-badge')).toHaveTextContent('LP');
      });

      // Verify LP processing students are loaded and displayed
      await waitFor(() => {
        expect(screen.getByText('Rajesh LifePlanner Kumar')).toBeInTheDocument();
        expect(screen.getByText('Fatima LifePlanner Zahra')).toBeInTheDocument();
      });

      // STRICT ZERO-BLEED VERIFICATION:
      // Absolutely NO FLAG students must remain on screen
      expect(screen.queryByText('John German Doe')).toBeNull();
      expect(screen.queryByText('Anna German Schmidt')).toBeNull();

      // Verify KPI metrics recalculated strictly for LP: 150000 + 120000 = 270,000
      expect(screen.getByTestId('kpi-student-count')).toHaveTextContent('2');
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('₹2,70,000.00');
      expect(screen.getByTestId('kpi-total-due')).toHaveTextContent('₹1,00,000.00');
    });

    it('switching to FDS displays FDS dance studio students with zero LP or FLAG leakage', async () => {
      setupAuth({ id: 1, name: 'Auditor' }, { fees: ['accounts'] });

      render(
        <MemoryRouter>
          <GlobalFeesPage />
        </MemoryRouter>
      );

      // Switch directly to FDS
      const fdsTab = screen.getByTestId('company-tab-FDS');
      fireEvent.click(fdsTab);

      await waitFor(() => {
        expect(screen.getByTestId('active-company-badge')).toHaveTextContent('FDS');
        expect(screen.getByText('Maya Dance Dancer')).toBeInTheDocument();
      });

      // Zero-bleed: neither FLAG nor LP students appear
      expect(screen.queryByText('John German Doe')).toBeNull();
      expect(screen.queryByText('Rajesh LifePlanner Kumar')).toBeNull();
      expect(screen.getByTestId('kpi-student-count')).toHaveTextContent('1');
    });

    it('filters students by search query and status filter without cross-company bleed', async () => {
      setupAuth({ id: 1, name: 'Auditor' }, { fees: ['accounts'] });

      render(
        <MemoryRouter>
          <GlobalFeesPage />
        </MemoryRouter>
      );

      // Wait for initial students
      await waitFor(() => {
        expect(screen.getByText('John German Doe')).toBeInTheDocument();
      });

      // Search for "Anna"
      const searchInput = screen.getByTestId('student-search-input');
      fireEvent.change(searchInput, { target: { value: 'Anna' } });

      expect(screen.getByText('Anna German Schmidt')).toBeInTheDocument();
      expect(screen.queryByText('John German Doe')).toBeNull();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });

      // Filter by status PAID
      const statusSelect = screen.getByTestId('status-filter-select');
      fireEvent.change(statusSelect, { target: { value: 'PAID' } });

      expect(screen.getByText('Anna German Schmidt')).toBeInTheDocument();
      expect(screen.queryByText('John German Doe')).toBeNull();
    });
  });

  // ── 4. Student Ledger & Receipt Workflow Tests (R3) ─────────────────────────
  describe('Student Ledger, Receipt Issuance & Direct Printing', () => {
    it('clicking a student row opens the ledger inspection panel with fee breakdown', async () => {
      setupAuth({ id: 1, name: 'Accountant' }, { fees: ['accounts'] });

      render(
        <MemoryRouter>
          <GlobalFeesPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John German Doe')).toBeInTheDocument();
      });

      // Click row
      const row = screen.getByTestId('student-row-101');
      fireEvent.click(row);

      // Verify ledger panel is visible
      const ledger = screen.getByTestId('student-ledger-panel');
      expect(ledger).toBeInTheDocument();
      expect(within(ledger).getByText('John German Doe')).toBeInTheDocument();
      expect(within(ledger).getByText('FLAG-001')).toBeInTheDocument();
      expect(within(ledger).getByText('FLAG')).toBeInTheDocument();
    });

    it('triggers ReceiptStudioModal with active company and selected student pre-populated', async () => {
      setupAuth({ id: 1, name: 'Accountant' }, { fees: ['accounts'] });

      render(
        <MemoryRouter>
          <GlobalFeesPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John German Doe')).toBeInTheDocument();
      });

      // Click "Receipt" button on student row
      const issueBtn = screen.getByTestId('issue-receipt-btn-101');
      fireEvent.click(issueBtn);

      // Verify ReceiptStudioModal opened with FLAG and John German Doe
      await waitFor(() => {
        const modal = screen.getByTestId('mock-receipt-studio-modal');
        expect(modal).toBeInTheDocument();
        expect(modal).toHaveAttribute('data-company', 'FLAG');
        expect(screen.getByTestId('modal-student-name')).toHaveTextContent('John German Doe');
      });

      // Close modal
      fireEvent.click(screen.getByTestId('studio-close-btn'));
      expect(screen.queryByTestId('mock-receipt-studio-modal')).toBeNull();
    });

    it('switches to Receipts Register tab and renders company-scoped workspace', async () => {
      setupAuth({ id: 1, name: 'Accountant' }, { fees: ['accounts'] });

      render(
        <MemoryRouter>
          <GlobalFeesPage />
        </MemoryRouter>
      );

      // Click tab
      const receiptsTab = screen.getByTestId('tab-receipts');
      fireEvent.click(receiptsTab);

      // ReceiptsWorkspace is rendered
      await waitFor(() => {
        const workspace = screen.getByTestId('mock-receipts-workspace');
        expect(workspace).toBeInTheDocument();
        expect(workspace).toHaveAttribute('data-company', 'FLAG');
      });
    });

    it('allows viewing and direct printing of a receipt via printReceiptElement', async () => {
      setupAuth({ id: 1, name: 'Accountant' }, { fees: ['accounts'] });

      render(
        <MemoryRouter>
          <GlobalFeesPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John German Doe')).toBeInTheDocument();
      });

      // Open ledger
      fireEvent.click(screen.getByTestId('student-row-101'));

      // Click "View Latest Receipt" in ledger
      const viewBtn = screen.getByTestId('ledger-view-latest-btn');
      expect(viewBtn).toBeInTheDocument();
      fireEvent.click(viewBtn);

      // Receipt View Modal opens
      await waitFor(() => {
        expect(screen.getByTestId('receipt-view-modal')).toBeInTheDocument();
      });

      // Click Print button
      const printBtn = screen.getByTestId('modal-print-btn');
      fireEvent.click(printBtn);

      // Verify printReceiptElement was invoked
      await waitFor(() => {
        expect(receiptUtils.printReceiptElement).toHaveBeenCalled();
      });
    });
  });
});
