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

describe('ReceiptStudioModal FLAG Fee Accounts & Students Linking', () => {
  const mockStudents = [
    {
      id: 41,
      student_name: 'Aditi Menon',
      student_id: 'STU-0041',
      division: 'FLAG Kochi',
      total_fee: 50000,
      total_paid: 50000,
      balance_due: 0,
      fee_account_id: 2,
    },
    {
      id: 37,
      student_name: 'Akshaya',
      student_id: 'STU-0037',
      division: 'Test Campus',
      total_fee: 60000,
      total_paid: 35000,
      balance_due: 25000,
      fee_account_id: 1,
    },
  ];

  const mockAccounts = [
    {
      id: 2,
      student: 41,
      student_name: 'Aditi Menon',
      plan_name: 'FLAG A1-B2 Full Package',
      balance_due: 0,
      total_due: 50000,
      total_paid: 50000,
      company: 'FLAG',
      payments: [
        {
          id: 101,
          amount: 25000,
          payment_method: 'UPI',
          payment_date: '2026-10-15T10:00:00Z',
          reference: 'UPI12345',
          latest_receipt_number: 'FLAG/26-27/0001',
        },
        {
          id: 102,
          amount: 25000,
          payment_method: 'Bank Transfer',
          payment_date: '2026-10-25T10:00:00Z',
          reference: 'NEFT998877',
          latest_receipt_number: 'FLAG/26-27/0002',
        },
      ],
    },
    {
      id: 1,
      student: 37,
      student_name: 'Akshaya',
      plan_name: 'FLAG Standard A1',
      balance_due: 25000,
      total_due: 60000,
      total_paid: 35000,
      company: 'FLAG',
      payments: [
        {
          id: 99,
          amount: 35000,
          payment_method: 'Cash',
          payment_date: '2026-10-01T10:00:00Z',
          reference: 'CASH-REC',
          latest_receipt_number: 'FLAG/26-27/0003',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/fees/receipt-settings/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              organization_name: 'Foreign Language Academy Gurukulam (F.L.A.G)',
              receipt_prefix: 'FLAG',
              default_gst_rate: '18.00',
              default_gst_mode: 'INCLUSIVE',
              place_of_supply: 'Kerala (32)',
            }),
        });
      }
      if (url.includes('/fees/receipts/calculate-preview/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              student_metadata: {
                recipient_name: 'Aditi Menon',
                recipient_phone: '9876543210',
                student_enrollment_code: 'FLAG-STU-0041',
                course_or_package_name: 'FLAG A1-B2 Full Package',
                campus_name: 'FLAG Kochi',
              },
              ledger_snapshot: {
                ledger_total_fee: '50000.00',
                ledger_previously_paid: '50000.00',
                ledger_balance_due: '0.00',
              },
              financials: {
                subtotal_amount: '25000.00',
                total_amount: '25000.00',
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('renders FLAG fee accounts with student name, plan name, and balance due', async () => {
    render(
      <ReceiptStudioModal
        isOpen={true}
        onClose={vi.fn()}
        company="FLAG"
        students={mockStudents}
        accounts={mockAccounts}
      />
    );

    const accountSelect = await screen.findByTestId('link-fee-account-select');
    expect(accountSelect).toBeInTheDocument();

    const feeAccountOption = await screen.findByText(/Aditi Menon — FLAG A1-B2 Full Package/);
    expect(feeAccountOption).toBeInTheDocument();

    const akshayaOption = screen.getByText(/Akshaya — FLAG Standard A1/);
    expect(akshayaOption).toBeInTheDocument();
  });

  it('renders FLAG enrolled students with name, enrollment code, and campus', async () => {
    render(
      <ReceiptStudioModal
        isOpen={true}
        onClose={vi.fn()}
        company="FLAG"
        students={mockStudents}
        accounts={mockAccounts}
      />
    );

    const studentSelect = await screen.findByTestId('link-enrolled-student-select');
    expect(studentSelect).toBeInTheDocument();

    const studentOption = await screen.findByText(/Aditi Menon \[STU-0041\] \(FLAG Kochi\)/);
    expect(studentOption).toBeInTheDocument();

    const akshayaStudentOption = screen.getByText(/Akshaya \[STU-0037\] \(Test Campus\)/);
    expect(akshayaStudentOption).toBeInTheDocument();
  });

  it('displays Quick Fetch buttons when an account with payments is selected', async () => {
    render(
      <ReceiptStudioModal
        isOpen={true}
        onClose={vi.fn()}
        company="FLAG"
        students={mockStudents}
        accounts={mockAccounts}
      />
    );

    const accountSelect = await screen.findByTestId('link-fee-account-select');
    fireEvent.change(accountSelect, { target: { value: '2' } });

    // Should show Quick Fetch bar with payment items
    await waitFor(() => {
      expect(screen.getByText(/Quick Fetch:/i)).toBeInTheDocument();
    });

    // Should show the 2 payments on record
    expect(screen.getByText(/2 Payments on record/i)).toBeInTheDocument();
    expect(screen.getByText(/FLAG\/26-27\/0001: ₹25,000/)).toBeInTheDocument();
    expect(screen.getByText(/FLAG\/26-27\/0002: ₹25,000/)).toBeInTheDocument();
    expect(screen.getByText(/Full Settlement Receipt/i)).toBeInTheDocument();
  });

  it('auto-links fee account when student is selected from dropdown', async () => {
    render(
      <ReceiptStudioModal
        isOpen={true}
        onClose={vi.fn()}
        company="FLAG"
        students={mockStudents}
        accounts={mockAccounts}
      />
    );

    const studentSelect = await screen.findByTestId('link-enrolled-student-select');
    fireEvent.change(studentSelect, { target: { value: '41' } });

    // Both student and account should be selected
    await waitFor(() => {
      const accountSelect = screen.getByTestId('link-fee-account-select');
      expect(accountSelect.value).toBe('2');
    });

    // Quick fetch should appear
    await waitFor(() => {
      expect(screen.getByText(/Quick Fetch:/i)).toBeInTheDocument();
    });
  });
});
