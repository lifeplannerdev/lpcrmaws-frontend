/**
 * Automated Test Suite for DashboardOverview Component
 * Requirements Covered: R1 (Navbar & Dashboard Analysis), R3 (Admin Dashboard Permission), R5 (Full-Screen UI), R6 (Automated Test Coverage)
 * Methodology: 4-Tier Opaque-Box Testing Architecture (Feature, Boundary, Integration, Real-World)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import DashboardOverview from '../Pages/DashboardOverview';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';

// Mock context hooks directly
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/PermissionsContext', () => ({
  usePermissions: vi.fn(),
}));

// Mock child widgets to isolate DashboardOverview layout and role-gating
vi.mock('../Components/layouts/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>
}));

vi.mock('../Components/dashboard/DashboardHeader', () => ({
  default: ({ userName, userRole, isAdmin }) => (
    <div data-testid="dashboard-header" data-admin={isAdmin}>
      <span>Header: {userName} ({userRole})</span>
    </div>
  )
}));

vi.mock('../Components/dashboard/AdminStatsGrid', () => ({
  default: ({ stats }) => (
    <div data-testid="admin-stats-grid">
      <span>AdminStatsGrid (Leads: {stats?.total_leads}, Staff: {stats?.active_staff})</span>
    </div>
  )
}));

vi.mock('../Components/dashboard/LiveLeadsBoard', () => ({
  default: () => <div data-testid="live-leads-board">LiveLeadsBoard</div>
}));

vi.mock('../Components/dashboard/UserQuickActions', () => ({
  default: ({ tasksCount, upcomingCount, followUpsCount }) => (
    <div data-testid="user-quick-actions">
      <span>QuickActions: Tasks={tasksCount}, Upcoming={upcomingCount}, Followups={followUpsCount}</span>
    </div>
  )
}));

vi.mock('../Components/dashboard/FeedsWidget', () => ({
  default: () => <div data-testid="feeds-widget">FeedsWidget</div>
}));

vi.mock('../Components/dashboard/UserPenaltyWidget', () => ({
  default: () => <div data-testid="user-penalty-widget">UserPenaltyWidget</div>
}));

vi.mock('../Components/dashboard/DocumentExpiryWidget', () => ({
  default: () => <div data-testid="document-expiry-widget">DocumentExpiryWidget</div>
}));

vi.mock('../Components/dashboard/UpcomingTasks', () => ({
  default: ({ tasks }) => (
    <div data-testid="upcoming-tasks">
      <span>UpcomingTasks (count: {tasks?.length || 0})</span>
    </div>
  )
}));

vi.mock('../Components/dashboard/UpcomingTasksSection', () => ({
  default: ({ tasks }) => (
    <div data-testid="upcoming-tasks-section">
      <span>UpcomingTasksSection (count: {tasks?.length || 0})</span>
    </div>
  )
}));

vi.mock('../Components/dashboard/TodayFollowUps', () => ({
  default: ({ followUps }) => (
    <div data-testid="today-follow-ups">
      <span>TodayFollowUps (count: {followUps?.length || 0})</span>
    </div>
  )
}));

vi.mock('../Components/dashboard/RecentActivities', () => ({
  default: () => <div data-testid="recent-activities">RecentActivities</div>
}));

vi.mock('../Components/dashboard/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">LoadingSpinner</div>
}));

vi.mock('../Components/dashboard/ErrorAlert', () => ({
  default: ({ message }) => message ? <div data-testid="error-alert">{message}</div> : null
}));

describe('DashboardOverview Frontend Component Test Suite', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    // Mock global fetch to return resolved datasets immediately
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      let data = [];
      if (url.includes('/stats/')) {
        data = { total_leads: 12, active_staff: 6, total_students: 24, leads_change: 2 };
      } else if (url.includes('/tasks/pending/')) {
        data = [{ id: 1, title: 'Task 1' }, { id: 2, title: 'Task 2' }];
      } else if (url.includes('/followups/today/')) {
        data = [{ id: 10, name: 'Followup 1' }];
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data)
      });
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  const setupMocks = ({ user, permissions = {}, customHasPermission, loading = false, accessToken = 'mock-token' }) => {
    const defaultHasPermission = (perm) => {
      if (!perm || !perm.includes(':')) return false;
      const [res, act] = perm.split(':');
      if (permissions['*']?.includes('*')) return true;
      return Boolean(permissions[res]?.includes(act));
    };

    const hasPermission = customHasPermission || defaultHasPermission;

    useAuth.mockReturnValue({
      accessToken,
      refreshAccessToken: vi.fn().mockResolvedValue('refreshed-token'),
      user: user || { id: 1, username: 'testuser', name: 'Test User', role_names: ['STAFF'] },
      loading
    });

    usePermissions.mockReturnValue({
      permissions,
      hasPermission,
      hasAnyPermission: vi.fn().mockReturnValue(true)
    });
  };

  // ── Tier 1: Feature Coverage (Tab Navigation & Render) ─────────────────────

  it('renders navbar, header, and overview widgets successfully', async () => {
    const adminUser = {
      id: 1,
      username: 'admin',
      name: 'Executive Admin',
      role_names: ['ADMIN']
    };
    const permissions = { admin: ['dashboard'], staff: ['view_any'] };

    setupMocks({ user: adminUser, permissions });

    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    // Await async fetch to finish and dashboard to load
    await waitFor(() => {
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });

    // Check tab elements exist
    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /activities/i })).toBeInTheDocument();
  });

  it('switches between Overview and Activities tabs', async () => {
    const user = { id: 2, username: 'user', name: 'Regular User', role_names: ['SALES'] };
    setupMocks({ user, permissions: {} });

    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-quick-actions')).toBeInTheDocument();
    });

    // Switch to Activities tab
    const activitiesTabBtn = screen.getByRole('button', { name: /activities/i });
    fireEvent.click(activitiesTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('recent-activities')).toBeInTheDocument();
    });

    // Switch back to Overview tab
    const overviewTabBtn = screen.getByRole('button', { name: /overview/i });
    fireEvent.click(overviewTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('upcoming-tasks')).toBeInTheDocument();
    });
  });

  // ── Tier 2: Boundary & Corner Cases (Loading, Error Handling) ──────────────

  it('renders loading spinner while async data is being retrieved', () => {
    // When initial fetch hasn't completed, component renders LoadingSpinner
    setupMocks({
      user: { id: 1, username: 'admin' },
      permissions: { admin: ['dashboard'] }
    });

    // Mock fetch to not resolve immediately
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays error alert when fetch requests fail', async () => {
    setupMocks({
      user: { id: 1, username: 'admin' },
      permissions: { staff: ['view_any'] }
    });

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    });
  });

  // ── Tier 3: Role-Gating & Component Visibility ────────────────────────────

  // ── Tier 3: Role-Gating & Component Visibility ────────────────────────────

  it('displays executive metric cards when admin:dashboard permission is granted', async () => {
    const adminUser = {
      id: 10,
      username: 'boss',
      name: 'Super Boss',
      role_names: ['ADMIN']
    };
    // Isolated admin:dashboard permission test (without co-mingled staff:view_any)
    const permissions = { admin: ['dashboard'] };

    setupMocks({ user: adminUser, permissions });

    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-stats-grid')).toBeInTheDocument();
      expect(screen.getByTestId('live-leads-board')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('user-quick-actions')).not.toBeInTheDocument();
  });

  it('denies admin dashboard access when only staff:view_any is granted without admin:dashboard', async () => {
    const staffUser = {
      id: 15,
      username: 'staff_only',
      name: 'Staff Member',
      role_names: ['STAFF']
    };
    // staff:view_any alone must NOT grant admin dashboard access
    const permissions = { staff: ['view_any'] };

    setupMocks({ user: staffUser, permissions });

    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-quick-actions')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('admin-stats-grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('live-leads-board')).not.toBeInTheDocument();
  });

  it('displays user quick actions and hides executive metric cards when admin:dashboard is absent', async () => {
    const salesUser = {
      id: 20,
      username: 'sales_rep',
      name: 'Sales Rep',
      role_names: ['SALES']
    };
    const permissions = { leads: ['read_tenant'] };

    setupMocks({ user: salesUser, permissions });

    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-quick-actions')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('admin-stats-grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('live-leads-board')).not.toBeInTheDocument();
  });

  it('conditionally renders DocumentExpiryWidget only when license:admin is granted', async () => {
    const licensedUser = {
      id: 30,
      username: 'doc_admin',
      name: 'Document Admin',
      role_names: ['ADMIN']
    };
    const permissions = { 'license': ['admin'], 'admin': ['dashboard'] };

    setupMocks({ user: licensedUser, permissions });

    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('document-expiry-widget')).toBeInTheDocument();
    });
  });

  // ── Tier 4: Layout & Full-Screen Responsive Margins (Requirement R5) ──────

  it('renders in a full-screen layout container and eliminates blank margins', async () => {
    const adminUser = { id: 1, username: 'admin', name: 'Admin', role_names: ['ADMIN'] };
    setupMocks({
      user: adminUser,
      permissions: { admin: ['dashboard'] }
    });

    const { container } = render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });

    const mainEl = container.querySelector('main');
    expect(mainEl).toBeTruthy();

    // Verify fluid full-screen classes eliminating blank side gutters (Requirement R5)
    expect(mainEl.className).toContain('w-full');
    expect(mainEl.className).toContain('max-w-none');
    expect(mainEl.className).not.toContain('max-w-7xl');

    // Verify responsive horizontal and vertical padding
    expect(mainEl.className).toContain('px-4');
    expect(mainEl.className).toContain('sm:px-6');
    expect(mainEl.className).toContain('md:px-8');
    expect(mainEl.className).toContain('lg:px-10');
    expect(mainEl.className).toContain('2xl:px-12');
    expect(mainEl.className).toContain('py-6');
    expect(mainEl.className).toContain('space-y-6');
  });

  // ── Tier 5: Aggregation Endpoint Integration & Fallback Resilience ────────

  it('fetches primary aggregated dataset from /dashboard/stats/ with operational metrics', async () => {
    const adminUser = { id: 1, username: 'admin', name: 'Admin', role_names: ['ADMIN'] };
    setupMocks({ user: adminUser, permissions: { admin: ['dashboard'] } });

    const fetchUrls = [];
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      fetchUrls.push(url);
      if (url.includes('/dashboard/stats/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            total_leads: 1250,
            active_staff: 14,
            metrics: {
              leads: { total: 1250, conversion_rate: 25.6 },
              followups: { today_total: 45, overdue: 12 },
              tasks: { urgent: 3 },
              executive_financials: { total_revenue: 5420000, collections_this_month: 850000 }
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([])
      });
    });

    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-stats-grid')).toBeInTheDocument();
    });

    expect(fetchUrls.some(u => u.includes('/dashboard/stats/'))).toBe(true);
  });

  it('gracefully falls back to /stats/ when /dashboard/stats/ is unavailable', async () => {
    const adminUser = { id: 1, username: 'admin', name: 'Admin', role_names: ['ADMIN'] };
    setupMocks({ user: adminUser, permissions: { admin: ['dashboard'] } });

    const fetchUrls = [];
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      fetchUrls.push(url);
      if (url.includes('/dashboard/stats/')) {
        // Return 404 for primary endpoint
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ detail: 'Not found' })
        });
      }
      if (url.includes('/stats/')) {
        // Fallback endpoint succeeds
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            total_leads: 500,
            active_staff: 10,
            total_students: 120,
            staff_on_leave: 2
          })
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([])
      });
    });

    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-stats-grid')).toBeInTheDocument();
    });

    // Both endpoints were called in fallback chain
    expect(fetchUrls.some(u => u.includes('/dashboard/stats/'))).toBe(true);
    expect(fetchUrls.some(u => u.includes('/stats/'))).toBe(true);
  });

  it('resiliently handles null executive_financials without throwing errors', async () => {
    const adminUser = { id: 1, username: 'admin', name: 'Admin', role_names: ['ADMIN'] };
    setupMocks({ user: adminUser, permissions: { admin: ['dashboard'] } });

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/dashboard/stats/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            total_leads: 300,
            active_staff: 8,
            metrics: {
              leads: { total: 300 },
              executive_financials: null // Explicit null
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([])
      });
    });

    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-stats-grid')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument();
  });
});

describe('AdminStatsGrid Component Unit & Gating Suite', () => {
  let RealAdminStatsGrid;

  beforeEach(async () => {
    const mod = await vi.importActual('../Components/dashboard/AdminStatsGrid');
    RealAdminStatsGrid = mod.default;
  });

  it('renders responsive 12-card grid classes', () => {
    const stats = {
      has_admin_dashboard: true,
      total_leads: 1250,
      active_staff: 14,
      metrics: {
        leads: { total: 1250, conversion_rate: 25.6, hot: 180, warm: 320, converted: 250, registered: 70 },
        followups: { today_total: 45, overdue: 12 },
        tasks: { urgent: 3, overdue: 2 },
        executive_financials: {
          collections_this_month: 850000,
          pending_receivables: 1200000,
          total_overdue_balance: 350000,
          total_revenue: 5420000
        }
      }
    };

    const { container } = render(<RealAdminStatsGrid stats={stats} />);
    const grid = container.firstChild;

    expect(grid.className).toContain('grid');
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('sm:grid-cols-2');
    expect(grid.className).toContain('md:grid-cols-3');
    expect(grid.className).toContain('lg:grid-cols-4');
    expect(grid.className).toContain('2xl:grid-cols-6');
    expect(grid.className).toContain('gap-4');
  });

  it('renders role-gated financial cards with compact INR formatting when admin:dashboard is present', () => {
    const stats = {
      has_admin_dashboard: true,
      metrics: {
        executive_financials: {
          collections_this_month: 850000,
          pending_receivables: 1200000,
          total_overdue_balance: 350000,
          total_revenue: 5420000
        }
      }
    };

    render(<RealAdminStatsGrid stats={stats} />);

    expect(screen.getByText('Collections (Month)')).toBeInTheDocument();
    expect(screen.getByText('₹8.50 L')).toBeInTheDocument();

    expect(screen.getByText('Pending Receivables')).toBeInTheDocument();
    expect(screen.getByText('₹12.00 L')).toBeInTheDocument();

    expect(screen.getByText('Overdue Balance')).toBeInTheDocument();
    expect(screen.getByText('₹3.50 L')).toBeInTheDocument();

    expect(screen.getByText('Total Invoiced')).toBeInTheDocument();
    expect(screen.getByText('₹54.20 L')).toBeInTheDocument();
  });

  it('hides executive financial cards when has_admin_dashboard is false or financials are null', () => {
    const stats = {
      has_admin_dashboard: false,
      total_leads: 100,
      active_staff: 5,
      metrics: {
        leads: { total: 100 },
        executive_financials: null
      }
    };

    render(<RealAdminStatsGrid stats={stats} />);

    expect(screen.queryByText('Collections (Month)')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Receivables')).not.toBeInTheDocument();
    expect(screen.queryByText('Overdue Balance')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Invoiced')).not.toBeInTheDocument();
    expect(screen.getByText('Total Leads')).toBeInTheDocument();
  });
});

describe('MetricCard Component Unit Suite', () => {
  let RealMetricCard;

  beforeEach(async () => {
    const mod = await vi.importActual('../Components/common/MetricCard');
    RealMetricCard = mod.default;
  });

  it('renders subtitle, tooltip and dynamic font scaling for long values', () => {
    const { container } = render(
      <RealMetricCard
        title="Revenue"
        value="₹54,20,000"
        subtitle="Current FY"
        tooltip="Full amount: ₹54,20,000"
        gradient="from-blue-500 to-indigo-600"
        hoverColor="blue"
      />
    );

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('₹54,20,000')).toBeInTheDocument();
    expect(screen.getByText('Current FY')).toBeInTheDocument();

    // Value > 8 chars should downscale font
    const valueHeading = screen.getByText('₹54,20,000');
    expect(valueHeading.className).toContain('text-xl');

    // Tooltip should be on container title
    expect(container.firstChild).toHaveAttribute('title', 'Full amount: ₹54,20,000');
  });
});
