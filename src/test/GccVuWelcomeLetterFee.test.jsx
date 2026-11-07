import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReceiptStudioModal from '../Components/fees/ReceiptStudioModal';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('fake-jwt-token'),
    user: { id: 1, username: 'accounts_admin' },
  }),
}));

describe('GCC VU WELCOME LETTER in ReceiptStudioModal & LP Fees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/fees/receipt-settings/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              organization_name: 'Life Planner Abroad',
              receipt_prefix: 'LP',
              default_gst_rate: '18.00',
              default_gst_mode: 'INCLUSIVE',
              place_of_supply: 'Kerala (32)',
              sac_code: '999293',
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('renders "+ GCC VU WELCOME LETTER" button for LP company and updates line items when clicked', async () => {
    render(
      <ReceiptStudioModal
        isOpen={true}
        onClose={vi.fn()}
        company="LP"
      />
    );

    const lineItemsTab = await screen.findByText(/2\. Line Items & GST/i);
    fireEvent.click(lineItemsTab);

    const gccButton = await screen.findByRole('button', { name: /\+ GCC VU WELCOME LETTER/i });
    expect(gccButton).toBeInTheDocument();

    fireEvent.click(gccButton);

    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox');
      const itemTitleInput = inputs.find(i => i.value === 'GCC VU WELCOME LETTER');
      expect(itemTitleInput).toBeDefined();
    });
  });

  it('renders quick selection tag "GCC VU Welcome Letter" for LP line items', async () => {
    render(
      <ReceiptStudioModal
        isOpen={true}
        onClose={vi.fn()}
        company="LP"
      />
    );

    const lineItemsTab = await screen.findByText(/2\. Line Items & GST/i);
    fireEvent.click(lineItemsTab);

    const tagButton = await screen.findByRole('button', { name: 'GCC VU Welcome Letter' });
    expect(tagButton).toBeInTheDocument();

    fireEvent.click(tagButton);

    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox');
      const itemTitleInput = inputs.find(i => i.value === 'GCC VU WELCOME LETTER');
      expect(itemTitleInput).toBeDefined();
    });
  });
});
