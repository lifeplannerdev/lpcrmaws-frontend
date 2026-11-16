import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveCallProvider, useLiveCall } from '../context/LiveCallContext';

vi.mock('../hooks/useUserChannel', () => ({
  useUserChannel: () => {},
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, username: 'navya' } }),
}));

vi.mock('../context/ApiContext', () => ({
  useApi: () => ({ authFetch: vi.fn(), apiBaseUrl: 'http://localhost:8000/api' }),
}));

function TestHarness() {
  const { openLiveCall, activeCall } = useLiveCall();
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          openLiveCall({
            id: 18242,
            name: 'Shruti',
            phone: '918377865451',
            status: 'CLOSED',
            remarks: '[30/10/2026 16:55] Linta Achu Benny: Previous remark',
          })
        }
      >
        Open Call
      </button>
      <span data-testid="remarks-value">{activeCall?.formData?.remarks ?? 'NONE'}</span>
    </div>
  );
}

describe('LiveCallContext openLiveCall remarks', () => {
  it('starts with an empty Call Remarks box even when the lead has previous remarks', () => {
    render(
      <LiveCallProvider>
        <TestHarness />
      </LiveCallProvider>
    );

    fireEvent.click(screen.getByText('Open Call'));
    expect(screen.getByTestId('remarks-value').textContent).toBe('');
  });
});
