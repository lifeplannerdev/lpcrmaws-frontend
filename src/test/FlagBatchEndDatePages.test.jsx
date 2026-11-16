import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StudentsPage from '../Pages/FLAG/StudentsPage';
import StudentProfilePage from '../Pages/FLAG/StudentProfilePage';
import BatchesPage from '../Pages/FLAG/BatchesPage';

vi.mock('../Components/layouts/Navbar', () => ({
  default: () => <nav>Navbar</nav>,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'test-token',
    refreshAccessToken: vi.fn(),
    user: { id: 1, is_superuser: true, role_names: ['ADMIN'], company: 'FLAG' },
  }),
}));

vi.mock('../context/PermissionsContext', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

describe('FLAG batch end_date display across 3 pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn(async (url) => {
      if (url.includes('/students/batches/')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 10,
              name: 'CHN 1',
              campus_name: 'FLAG Kochi',
              mode: 'offline',
              status: 'active',
              package_name: 'A1 to B2 Package',
              student_count: 5,
              trainer_name: 'Aiswarya pk',
              end_date: '2026-12-15',
            },
          ],
        };
      }
      if (url.includes('/students/students/28/history/')) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/students/students/28/')) {
        return {
          ok: true,
          json: async () => ({
            id: 28,
            name: 'Abhiya Kuriakose',
            phone: '9447104279',
            status: 'active',
            campus_name: 'FLAG Kochi',
            batch: 10,
            batch_name: 'CHN 1',
            batch_end_date: '2026-12-15',
            current_grade: 'B1',
            package_name: 'A1 to B2 Package',
            trainer_name: 'Aiswarya pk',
            joined_date: '2026-04-22',
            updated_at: '2026-04-22T10:00:00Z',
          }),
        };
      }
      if (url.includes('/students/students/')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 28,
              name: 'Abhiya Kuriakose',
              phone: '9447104279',
              batch: 10,
              batch_name: 'CHN 1',
              batch_end_date: '2026-12-15',
              campus_name: 'FLAG Kochi',
              trainer_name: 'Aiswarya pk',
              current_grade: 'B1',
              fee_status: 'SETTLED',
            },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });
  });

  it('displays batch end_date on Student Directory (StudentsPage)', async () => {
    render(
      <MemoryRouter>
        <StudentsPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Abhiya Kuriakose')).toBeInTheDocument();
      expect(screen.getByText(/Ends:\s*15 Dec 2026/i)).toBeInTheDocument();
    });
  });

  it('displays Batch End Date inside Timeline section on StudentProfilePage', async () => {
    render(
      <MemoryRouter initialEntries={['/flag/students/28']}>
        <Routes>
          <Route path="/flag/students/:id" element={<StudentProfilePage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Batch Scope')).toBeInTheDocument();
      expect(screen.getByText('Batch End Date')).toBeInTheDocument();
      expect(
        screen.getByText(new Date('2026-12-15T00:00:00').toLocaleDateString())
      ).toBeInTheDocument();
    });
  });

  it('displays End Date on batch cards in BatchesPage', async () => {
    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('CHN 1')).toBeInTheDocument();
      expect(screen.getByText(/End Date:\s*15 Dec 2026/i)).toBeInTheDocument();
    });
  });
});
