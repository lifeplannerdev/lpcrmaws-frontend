import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditStudentModal from '../Pages/FLAG/EditStudentModal';

const mockRefreshAccessToken = vi.fn().mockResolvedValue('test-token');

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'test-token',
    refreshAccessToken: mockRefreshAccessToken,
  }),
}));

describe('EditStudentModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('allows marking a student as exited even when no academic batch is assigned', async () => {
    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();
    const student = {
      id: 42,
      name: 'Indraj A',
      phone: '',
      email: '',
      campus: 1,
      academic_package: 2,
      batch: null,
      grade_batch_id: null,
      status: 'active',
      joined_date: '2026-06-08',
    };

    const fetchMock = vi.fn(async (url, options = {}) => {
      if (url.includes('/students/batches/')) {
        return { ok: true, json: async () => [{ id: 10, name: 'Batch A', grade_batches: [] }] };
      }
      if (url.includes('/students/campuses/')) {
        return { ok: true, json: async () => [{ id: 1, name: 'FLAG Kochi' }] };
      }
      if (url.includes('/students/packages/')) {
        return { ok: true, json: async () => [{ id: 2, name: 'A1 to B2 Package' }] };
      }
      if (url.includes('/students/students/42/') && options.method === 'PATCH') {
        const body = JSON.parse(options.body);
        return { ok: true, json: async () => ({ ...student, ...body }) };
      }
      return { ok: false, json: async () => ({}) };
    });

    global.fetch = fetchMock;

    render(
      <EditStudentModal
        student={student}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeTruthy();
    });

    const batchSelect = screen.getByDisplayValue('No Batch Assigned');
    expect(batchSelect.hasAttribute('required')).toBe(false);

    const statusSelect = screen.getByDisplayValue('Active');
    fireEvent.change(statusSelect, { target: { name: 'status', value: 'exited' } });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    const patchCall = fetchMock.mock.calls.find(
      ([url, opts]) => url.includes('/students/students/42/') && opts?.method === 'PATCH'
    );
    expect(patchCall).toBeTruthy();
    const sentPayload = JSON.parse(patchCall[1].body);
    expect(sentPayload.batch).toBeNull();
    expect(sentPayload.status).toBe('exited');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
