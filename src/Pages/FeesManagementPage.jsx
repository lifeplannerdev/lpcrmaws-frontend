import { useEffect, useMemo, useState } from 'react';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, Plus, Receipt, AlertTriangle, Repeat, IndianRupee } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const currency = (value) => {
  const num = Number(value || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const emptyPayment = {
  amount: '',
  installment: '',
  payment_method: 'CASH',
  payment_date: new Date().toISOString().slice(0, 16),
  reference: '',
  notes: '',
};

const emptyRestructure = {
  plan_type: 'INSTALLMENT',
  total_due: '',
  registration_amount: '',
  due_day: 10,
  notes: '',
  next_due_date: '',
  template_id: '',
};

export default function FeesManagementPage() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState(user?.company || 'FLAG');
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [restructureForm, setRestructureForm] = useState(emptyRestructure);
  const [createForm, setCreateForm] = useState({
    student: '',
    template: '',
    plan_code: '',
    plan_name: '',
    plan_type: 'CUSTOM',
    total_due: '',
    registration_amount: '',
    due_day: 10,
    notes: '',
    source_label: 'manual',
  });

  const canManageFees = (user?.permissions || []).includes('manage_fees');
  const canRestructureFees = canManageFees || (user?.permissions || []).includes('restructure_fees');
  const canRecordPartial = canManageFees || (user?.permissions || []).includes('record_partial_payment');
  const canViewFees = canManageFees || (user?.permissions || []).includes('view_fees') || (user?.permissions || []).includes('view_fee_reports');

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const applyTemplateToFeeForm = (template, setter) => {
    setter((prev) => {
      if (!template) {
        return {
          ...prev,
          template: '',
          plan_code: '',
          plan_name: '',
          plan_type: 'CUSTOM',
          total_due: '',
          registration_amount: '',
          due_day: 10,
        };
      }

      return {
        ...prev,
        template: String(template.id),
        plan_code: template.code || '',
        plan_name: template.name || '',
        plan_type: template.plan_type || 'CUSTOM',
        total_due: template.total_amount ? String(template.total_amount) : prev.total_due,
        registration_amount: template.registration_amount ? String(template.registration_amount) : prev.registration_amount,
        due_day: template.due_day || 10,
      };
    });
  };

  const selectedCreateTemplate = useMemo(
    () => templates.find((template) => String(template.id) === String(createForm.template)) || null,
    [templates, createForm.template]
  );

  const selectedRestructureTemplate = useMemo(
    () => templates.find((template) => String(template.id) === String(restructureForm.template_id)) || null,
    [templates, restructureForm.template_id]
  );

  const getToken = async () => accessToken || await refreshAccessToken();

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const [templatesRes, accountsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/fees/catalog/?company=${company}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/fees/accounts/?company=${company}${search ? `&search=${encodeURIComponent(search)}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const templatesData = await templatesRes.json();
      const accountsData = await accountsRes.json();

      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      if (!selectedAccountId && Array.isArray(accountsData) && accountsData.length > 0) {
        setSelectedAccountId(accountsData[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch fees data', err);
      setMessage({ type: 'error', text: 'Failed to load fees data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewFees) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, search, canViewFees]);

  const postJson = async (url, body) => {
    const token = await getToken();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Request failed');
    }
    return data;
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await postJson(`${API_BASE_URL}/fees/accounts/`, {
        ...createForm,
        company,
        student: Number(createForm.student),
        template: createForm.template ? Number(createForm.template) : null,
        total_due: createForm.total_due ? createForm.total_due : '0.00',
        registration_amount: createForm.registration_amount ? createForm.registration_amount : '0.00',
      });
      setCreateForm({
        student: '',
        template: '',
        plan_code: '',
        plan_name: '',
        plan_type: 'CUSTOM',
        total_due: '',
        registration_amount: '',
        due_day: 10,
        notes: '',
        source_label: 'manual',
      });
      setMessage({ type: 'success', text: 'Fee account created.' });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTemplateChange = (e) => {
    const templateId = e.target.value;
    if (!templateId) {
      applyTemplateToFeeForm(null, setCreateForm);
      return;
    }
    const template = templates.find((item) => String(item.id) === String(templateId));
    applyTemplateToFeeForm(template, setCreateForm);
  };

  const handleRestructureTemplateChange = (e) => {
    const templateId = e.target.value;
    if (!templateId) {
      applyTemplateToFeeForm(null, setRestructureForm);
      setRestructureForm((prev) => ({ ...prev, template_id: '' }));
      return;
    }
    const template = templates.find((item) => String(item.id) === String(templateId));
    if (template) {
      setRestructureForm((prev) => ({
        ...prev,
        template_id: String(template.id),
        plan_type: template.plan_type || prev.plan_type,
        total_due: template.total_amount ? String(template.total_amount) : prev.total_due,
        registration_amount: template.registration_amount ? String(template.registration_amount) : prev.registration_amount,
        due_day: template.due_day || prev.due_day,
      }));
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setSaving(true);
    setMessage(null);
    try {
      await postJson(`${API_BASE_URL}/fees/accounts/${selectedAccount.id}/payments/`, {
        ...paymentForm,
        account: selectedAccount.id,
        installment: paymentForm.installment ? Number(paymentForm.installment) : null,
        amount: paymentForm.amount,
        payment_date: new Date(paymentForm.payment_date).toISOString(),
      });
      setPaymentForm(emptyPayment);
      setMessage({ type: 'success', text: 'Payment recorded.' });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRestructureSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setSaving(true);
    setMessage(null);
    try {
      await postJson(`${API_BASE_URL}/fees/accounts/${selectedAccount.id}/restructure/`, {
        ...restructureForm,
        template_id: restructureForm.template_id ? Number(restructureForm.template_id) : null,
        total_due: restructureForm.total_due ? restructureForm.total_due : null,
        registration_amount: restructureForm.registration_amount ? restructureForm.registration_amount : null,
      });
      setRestructureForm(emptyRestructure);
      setMessage({ type: 'success', text: 'Fee plan restructured.' });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const selectedInstallments = selectedAccount?.installments || [];
  const selectedPayments = selectedAccount?.payments || [];
  const selectedAdjustments = selectedAccount?.adjustments || [];
  const createFormLocked = !!selectedCreateTemplate && createForm.plan_type !== 'CUSTOM';
  const restructureFormLocked = !!selectedRestructureTemplate && restructureForm.plan_type !== 'CUSTOM';

  if (!canViewFees) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="bg-white border border-gray-100 rounded-3xl p-10 shadow-lg">
            <div className="flex items-center gap-3 text-red-600 font-semibold mb-3">
              <AlertTriangle size={20} />
              Access denied
            </div>
            <p className="text-gray-600">Your role does not include fee access.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 text-indigo-700 text-sm font-medium shadow-sm mb-4">
              <IndianRupee size={16} />
              Accounting Workspace
            </div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Fees Management
            </h1>
            <p className="text-gray-600 mt-2">Manage fee plans, balances, partial payments, and restructures from one place.</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 shadow-sm"
            >
              <option value="FLAG">FLAG</option>
              <option value="LP">LP</option>
            </select>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 shadow-sm"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {message && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Fee Catalog</h2>
                  <p className="text-sm text-gray-500">Template plans imported from the spreadsheet and image rules.</p>
                </div>
                <span className="text-sm text-gray-500">{templates.length} templates</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-slate-50 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{template.code}</p>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{template.plan_type} {template.course_label ? `• ${template.course_label}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="font-bold text-indigo-700">{currency(template.total_amount)}</p>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-3">
                      {template.registration_amount ? <span>Registration {currency(template.registration_amount)}</span> : null}
                      {template.installment_amount ? <span>Installment {currency(template.installment_amount)}</span> : null}
                      {template.monthly_amount ? <span>Monthly {currency(template.monthly_amount)}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Fee Accounts</h2>
                  <p className="text-sm text-gray-500">Balance, overdue, and plan status by student.</p>
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student or plan..."
                  className="w-full md:w-80 px-4 py-3 rounded-xl border border-gray-200 bg-slate-50"
                />
              </div>

              {loading ? (
                <div className="py-20 text-center text-gray-500">Loading fee accounts...</div>
              ) : accounts.length === 0 ? (
                <div className="py-20 text-center text-gray-500">
                  <Receipt className="mx-auto mb-3 text-gray-300" size={32} />
                  No fee accounts found
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Plan</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Balance</th>
                        <th className="px-4 py-3">Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {accounts.map((account) => (
                        <tr
                          key={account.id}
                          onClick={() => setSelectedAccountId(account.id)}
                          className={`cursor-pointer hover:bg-indigo-50/40 ${selectedAccountId === account.id ? 'bg-indigo-50/60' : ''}`}
                        >
                          <td className="px-4 py-4">
                            <div className="font-semibold text-gray-900">{account.student_name}</div>
                            <div className="text-xs text-gray-500">{account.branch_name || 'No branch'} • {account.trainer_name || 'No trainer'}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">{account.plan_name || account.plan_code || account.plan_type}</div>
                            <div className="text-xs text-gray-500">{account.plan_type}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{account.status}</span>
                          </td>
                          <td className="px-4 py-4 font-semibold text-indigo-700">{currency(account.balance_due)}</td>
                          <td className="px-4 py-4 font-semibold text-red-600">{currency(account.overdue_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create Fee Account</h2>
              <form className="space-y-3" onSubmit={handleCreateAccount}>
                <input value={createForm.student} onChange={(e) => setCreateForm((p) => ({ ...p, student: e.target.value }))} placeholder="Student ID" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" />
                <select value={createForm.template} onChange={handleCreateTemplateChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50">
                  <option value="">Select template</option>
                  {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
                <input value={createForm.plan_name} onChange={(e) => setCreateForm((p) => ({ ...p, plan_name: e.target.value }))} placeholder="Plan name" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" readOnly={createFormLocked} />
                <select value={createForm.plan_type} onChange={(e) => setCreateForm((p) => ({ ...p, plan_type: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50">
                  <option value="CUSTOM">Custom</option>
                  <option value="ONE_TIME">One Time</option>
                  <option value="INSTALLMENT">Installment</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="PACKAGE">Package</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input value={createForm.total_due} onChange={(e) => setCreateForm((p) => ({ ...p, total_due: e.target.value }))} placeholder="Total due" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" readOnly={createFormLocked} />
                  <input value={createForm.registration_amount} onChange={(e) => setCreateForm((p) => ({ ...p, registration_amount: e.target.value }))} placeholder="Registration" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" readOnly={createFormLocked} />
                </div>
                <input value={createForm.plan_code} onChange={(e) => setCreateForm((p) => ({ ...p, plan_code: e.target.value }))} placeholder="Plan code" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" readOnly={createFormLocked} />
                <input value={createForm.due_day} onChange={(e) => setCreateForm((p) => ({ ...p, due_day: e.target.value }))} placeholder="Due day" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" readOnly={createFormLocked} />
                <textarea value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 min-h-24" />
                {selectedCreateTemplate ? (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                    Template selected: <span className="font-semibold">{selectedCreateTemplate.name}</span>. Standard fields are auto-filled; switch to Custom to override.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    No template selected yet. Choose one from the catalog to auto-fill the fee plan.
                  </div>
                )}
                <button disabled={saving || !canManageFees} type="submit" className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold disabled:opacity-50">
                  <Plus size={16} />
                  Create Account
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Selected Account</h2>
              {!selectedAccount ? (
                <p className="text-gray-500">Select an account to view balance, payment history, and restructure controls.</p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="font-semibold text-gray-900">{selectedAccount.student_name}</div>
                    <div className="text-sm text-gray-500">{selectedAccount.plan_name || selectedAccount.plan_code || selectedAccount.plan_type}</div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Due</div>
                        <div className="font-bold text-gray-900">{currency(selectedAccount.total_due)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Paid</div>
                        <div className="font-bold text-green-700">{currency(selectedAccount.total_paid)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Balance</div>
                        <div className="font-bold text-indigo-700">{currency(selectedAccount.balance_due)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Overdue</div>
                        <div className="font-bold text-red-600">{currency(selectedAccount.overdue_amount)}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Record Payment</h3>
                    <form className="space-y-3" onSubmit={handlePaymentSubmit}>
                      <div className="grid grid-cols-2 gap-3">
                        <input value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" />
                        <select value={paymentForm.installment} onChange={(e) => setPaymentForm((p) => ({ ...p, installment: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50">
                          <option value="">No installment</option>
                          {selectedInstallments.map((item) => <option key={item.id} value={item.id}>#{item.sequence_number} - {currency(item.balance_amount)} left</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50">
                          <option value="CASH">Cash</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="UPI">UPI</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="CARD">Card</option>
                          <option value="OTHER">Other</option>
                        </select>
                        <input type="datetime-local" value={paymentForm.payment_date} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" />
                      </div>
                      <input value={paymentForm.reference} onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))} placeholder="Reference" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" />
                      <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Payment notes" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 min-h-20" />
                      <button disabled={saving || !canRecordPartial} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50">
                        <Receipt size={16} />
                        Save Payment
                      </button>
                    </form>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Restructure Plan</h3>
                    <form className="space-y-3" onSubmit={handleRestructureSubmit}>
                      <div className="grid grid-cols-2 gap-3">
                        <select value={restructureForm.plan_type} onChange={(e) => setRestructureForm((p) => ({ ...p, plan_type: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50">
                          <option value="INSTALLMENT">Installment</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="CUSTOM">Custom</option>
                          <option value="ONE_TIME">One Time</option>
                        </select>
                        <select value={restructureForm.template_id} onChange={handleRestructureTemplateChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50">
                          <option value="">Choose template</option>
                          {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input value={restructureForm.total_due} onChange={(e) => setRestructureForm((p) => ({ ...p, total_due: e.target.value }))} placeholder="New total due" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" readOnly={restructureFormLocked} />
                        <input value={restructureForm.registration_amount} onChange={(e) => setRestructureForm((p) => ({ ...p, registration_amount: e.target.value }))} placeholder="Registration" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" readOnly={restructureFormLocked} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input value={restructureForm.due_day} onChange={(e) => setRestructureForm((p) => ({ ...p, due_day: e.target.value }))} placeholder="Due day" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" readOnly={restructureFormLocked} />
                        <input type="date" value={restructureForm.next_due_date} onChange={(e) => setRestructureForm((p) => ({ ...p, next_due_date: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" />
                      </div>
                      {selectedRestructureTemplate ? (
                        <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-700">
                          Restructure template: <span className="font-semibold">{selectedRestructureTemplate.name}</span>.
                        </div>
                      ) : null}
                      <textarea value={restructureForm.notes} onChange={(e) => setRestructureForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Why is this being restructured?" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 min-h-20" />
                      <button disabled={saving || !canRestructureFees} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-50">
                        <Repeat size={16} />
                        Restructure Plan
                      </button>
                    </form>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Installments</h3>
                    <div className="space-y-2">
                      {selectedInstallments.length === 0 ? (
                        <p className="text-sm text-gray-500">No installments configured.</p>
                      ) : selectedInstallments.map((installment) => (
                        <div key={installment.id} className="rounded-2xl border border-gray-100 p-3 bg-slate-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">#{installment.sequence_number} {installment.label}</div>
                              <div className="text-xs text-gray-500">{installment.due_date} • {installment.status}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-gray-900">{currency(installment.scheduled_amount)}</div>
                              <div className="text-xs text-gray-500">{currency(installment.balance_amount)} left</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Payments</h3>
                    <div className="space-y-2">
                      {selectedPayments.length === 0 ? (
                        <p className="text-sm text-gray-500">No payments recorded.</p>
                      ) : selectedPayments.map((payment) => (
                        <div key={payment.id} className="rounded-2xl border border-gray-100 p-3 bg-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{payment.receipt_number}</div>
                              <div className="text-xs text-gray-500">{payment.payment_method} • {new Date(payment.payment_date).toLocaleString()}</div>
                            </div>
                            <div className="font-bold text-green-700">{currency(payment.amount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Adjustments</h3>
                    <div className="space-y-2">
                      {selectedAdjustments.length === 0 ? (
                        <p className="text-sm text-gray-500">No adjustments recorded.</p>
                      ) : selectedAdjustments.map((adjustment) => (
                        <div key={adjustment.id} className="rounded-2xl border border-gray-100 p-3 bg-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{adjustment.adjustment_type}</div>
                              <div className="text-xs text-gray-500">{adjustment.reason}</div>
                            </div>
                            <div className="font-bold text-indigo-700">{currency(adjustment.amount_delta)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
