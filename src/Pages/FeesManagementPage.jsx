import { useEffect, useMemo, useState } from 'react';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { RefreshCw, Plus, Receipt, AlertTriangle, Repeat, IndianRupee, Download, CheckCircle, Edit2, Trash2 } from 'lucide-react';

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
  const { hasPermission, hasAnyPermission } = usePermissions();
  const [templates, setTemplates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [students, setStudents] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [pendingAttendances, setPendingAttendances] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');
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
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('recordPayment');
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [newTemplateForm, setNewTemplateForm] = useState({
    company: user?.company || 'FLAG',
    code: '',
    name: '',
    plan_type: 'PACKAGE',
    course_label: '',
    total_amount: '',
    registration_amount: '',
    installment_amount: '',
    installment_count: '',
    monthly_amount: '',
    duration_months: '',
    due_day: 10,
    notes: '',
  });
  const [editingEntity, setEditingEntity] = useState(null);

  const canManageFees = hasPermission('fees:edit_any') || hasPermission('fees:edit_tenant');
  const canRestructureFees = canManageFees;
  const canRecordPartial = canManageFees;
  const canViewFees = hasAnyPermission('fees');

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

      const [templatesRes, accountsRes, studentsRes, summaryRes, pendingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/fees/catalog/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/fees/accounts/?${search ? `search=${encodeURIComponent(search)}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/fees/students/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/fees/summary/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/attendance/detail/?approval_status=PENDING_FEE_APPROVAL`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const templatesData = await templatesRes.json();
      const accountsData = await accountsRes.json();
      const studentsData = await studentsRes.json();
      const summaryJson = await summaryRes.json();
      const pendingData = await pendingRes.json();

      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setSummaryData(Array.isArray(summaryJson) ? summaryJson : []);
      setPendingAttendances(pendingData.results || pendingData || []);
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

  const dashboardStats = useMemo(() => {
    return summaryData.reduce(
      (acc, curr) => {
        acc.totalDue += Number(curr.total_due || 0);
        acc.totalPaid += Number(curr.total_paid || 0);
        acc.balanceDue += Number(curr.balance_due || 0);
        acc.overdueAmount += Number(curr.overdue_amount || 0);
        return acc;
      },
      { totalDue: 0, totalPaid: 0, balanceDue: 0, overdueAmount: 0 }
    );
  }, [summaryData]);

  useEffect(() => {
    if (canViewFees) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, canViewFees]);

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

  const patchJson = async (url, body) => {
    const token = await getToken();
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    return data;
  };

  const fetchDelete = async (url) => {
    const token = await getToken();
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Delete failed');
    }
  };

  const handleDeleteEntity = async (type, accountId, id) => {
    if (!window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    try {
      if (type === 'ACCOUNT') {
        await fetchDelete(`${API_BASE_URL}/fees/accounts/${accountId}/`);
        setSelectedAccountId(null);
      } else if (type === 'INSTALLMENT') {
        await fetchDelete(`${API_BASE_URL}/fees/accounts/${accountId}/installments/${id}/`);
      } else if (type === 'PAYMENT') {
        await fetchDelete(`${API_BASE_URL}/fees/accounts/${accountId}/payments/${id}/`);
      }
      setMessage({ type: 'success', text: `${type} deleted successfully.` });
      fetchData();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleEditEntity = (type, entity) => {
    setEditingEntity({ type, data: { ...entity } });
  };

  const handleSaveEditEntity = async (e) => {
    e.preventDefault();
    if (!editingEntity) return;
    setSaving(true);
    try {
      let url = '';
      if (editingEntity.type === 'ACCOUNT') {
        url = `${API_BASE_URL}/fees/accounts/${editingEntity.data.id}/`;
      } else if (editingEntity.type === 'INSTALLMENT') {
        url = `${API_BASE_URL}/fees/accounts/${selectedAccountId}/installments/${editingEntity.data.id}/`;
      } else if (editingEntity.type === 'PAYMENT') {
        url = `${API_BASE_URL}/fees/accounts/${selectedAccountId}/payments/${editingEntity.data.id}/`;
      }
      await patchJson(url, editingEntity.data);
      setMessage({ type: 'success', text: `${editingEntity.type} updated successfully.` });
      setEditingEntity(null);
      fetchData();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await postJson(`${API_BASE_URL}/fees/accounts/`, {
        ...createForm,
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

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const token = await getToken();
      const payload = {
        ...newTemplateForm,
        total_amount: newTemplateForm.total_amount || '0.00',
        registration_amount: newTemplateForm.registration_amount || '0.00',
        installment_amount: newTemplateForm.installment_amount || '0.00',
        monthly_amount: newTemplateForm.monthly_amount || '0.00',
        installment_count: newTemplateForm.installment_count ? Number(newTemplateForm.installment_count) : null,
        duration_months: newTemplateForm.duration_months ? Number(newTemplateForm.duration_months) : null,
        due_day: newTemplateForm.due_day ? Number(newTemplateForm.due_day) : 10,
      };

      let res;
      if (editingTemplateId) {
        res = await fetch(`${API_BASE_URL}/fees/catalog/${editingTemplateId}/`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE_URL}/fees/catalog/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) throw new Error('Failed to save template');

      setNewTemplateForm({
        company: user?.company || 'FLAG',
        code: '',
        name: '',
        plan_type: 'PACKAGE',
        course_label: '',
        total_amount: '',
        registration_amount: '',
        installment_amount: '',
        installment_count: '',
        monthly_amount: '',
        duration_months: '',
        due_day: 10,
        notes: '',
      });
      setEditingTemplateId(null);
      setIsTemplateModalOpen(false);
      setMessage({ type: 'success', text: editingTemplateId ? 'Template updated successfully.' : 'Template created successfully.' });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleEditTemplateClick = (template) => {
    setNewTemplateForm({
      company: template.company,
      code: template.code,
      name: template.name,
      plan_type: template.plan_type,
      course_label: template.course_label || '',
      total_amount: template.total_amount || '',
      registration_amount: template.registration_amount || '',
      installment_amount: template.installment_amount || '',
      installment_count: template.installment_count || '',
      monthly_amount: template.monthly_amount || '',
      duration_months: template.duration_months || '',
      due_day: template.due_day || 10,
      notes: template.notes || '',
    });
    setEditingTemplateId(template.id);
    setIsTemplateModalOpen(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/fees/catalog/${templateId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete template');
      setMessage({ type: 'success', text: 'Template deleted successfully.' });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
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
    if (!templateId || templateId === 'custom') {
      applyTemplateToFeeForm(null, setRestructureForm);
      setRestructureForm((prev) => ({ ...prev, template_id: '', plan_type: 'CUSTOM' }));
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

  const handleExport = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/fees/export/admissions/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'admissions_report.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setMessage({ type: 'error', text: 'Export failed' });
    }
  };

  const handleApproveAttendance = async (attendanceId) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/attendance/${attendanceId}/approve/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_notes: 'Approved from Fees Dashboard' })
      });
      if (!res.ok) throw new Error('Approval failed');
      setMessage({ type: 'success', text: 'Attendance approved' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Approval failed' });
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
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 shadow-sm"
            >
              <Download size={16} />
              Export
            </button>
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Due</p>
            <p className="text-2xl font-bold text-gray-900">{currency(dashboardStats.totalDue)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">{currency(dashboardStats.totalPaid)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 font-medium mb-1">Balance Due</p>
            <p className="text-2xl font-bold text-indigo-600">{currency(dashboardStats.balanceDue)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 font-medium mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{currency(dashboardStats.overdueAmount)}</p>
          </div>
        </div>

        {pendingAttendances.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
              <AlertTriangle size={24} /> Pending Attendance Approvals ({pendingAttendances.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingAttendances.map(record => (
                <div key={record.id} className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{record.student_name}</div>
                      <div className="text-xs text-gray-500">{record.trainer_name}</div>
                    </div>
                    <div className="text-xs text-orange-600 font-medium bg-orange-100 px-2 py-1 rounded-full">
                      {record.date}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleApproveAttendance(record.id)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fee Catalog Section */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Fee Catalog</h2>
                  <p className="text-sm text-gray-500">Template plans imported from the spreadsheet and image rules.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{templates.length} templates</span>
                  {canManageFees && (
                    <button
                      onClick={() => {
                        setEditingTemplateId(null);
                        setNewTemplateForm({
                          company: user?.company || 'FLAG',
                          code: '',
                          name: '',
                          plan_type: 'PACKAGE',
                          course_label: '',
                          total_amount: '',
                          registration_amount: '',
                          installment_amount: '',
                          installment_count: '',
                          monthly_amount: '',
                          duration_months: '',
                          due_day: 10,
                          notes: '',
                        });
                        setIsTemplateModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium"
                    >
                      <Plus size={16} className="inline mr-1" />
                      New
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-slate-50 p-4 relative group">
                    {canManageFees && (
                      <div className="absolute top-4 right-4 hidden group-hover:flex items-center gap-2 bg-white/90 px-2 py-1 rounded shadow-sm">
                        <button onClick={() => handleEditTemplateClick(template)} className="text-gray-500 hover:text-indigo-600 transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteTemplate(template.id)} className="text-gray-500 hover:text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="pr-12">
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

        {/* Master Detail Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column (Master - Fee Accounts) */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <div className="flex flex-col gap-4 mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Fee Accounts</h2>
                    <p className="text-sm text-gray-500">Select to view details</p>
                  </div>
                  {canManageFees && (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium"
                    >
                      <Plus size={16} className="inline mr-1" />
                      New
                    </button>
                  )}
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student or plan..."
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-slate-50 text-sm"
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
                        <th className="px-4 py-3 text-right">Actions</th>
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
                          <td className="px-4 py-4 text-right">
                            {canManageFees && (
                              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleEditEntity('ACCOUNT', account)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded bg-white shadow-sm border border-gray-200">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteEntity('ACCOUNT', account.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded bg-white shadow-sm border border-gray-200">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Detail - Selected Account) */}
          <div className="xl:col-span-2 space-y-6">


            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 min-h-[500px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Selected Account Details</h2>
              </div>
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

                  <div className="flex flex-wrap border-b border-gray-200 mb-6 gap-2">
                    <button onClick={() => setActiveTab('recordPayment')} className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'recordPayment' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Record Payment</button>
                    <button onClick={() => setActiveTab('restructure')} className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'restructure' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Restructure</button>
                    <button onClick={() => setActiveTab('installments')} className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'installments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Installments</button>
                    <button onClick={() => setActiveTab('payments')} className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'payments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Payments</button>
                    <button onClick={() => setActiveTab('adjustments')} className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'adjustments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Adjustments</button>
                  </div>

                  {activeTab === 'recordPayment' && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 hidden">Record Payment</h3>
                    <form className="space-y-3" onSubmit={handlePaymentSubmit}>
                      <div className="grid grid-cols-2 gap-3">
                        <input value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50" />
                        <select value={paymentForm.installment} onChange={(e) => setPaymentForm((p) => ({ ...p, installment: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50">
                          <option value="">No installment</option>
                          {selectedInstallments.map((item) => <option key={item.id} value={item.id}>#{item.sequence_number} {item.label ? `- ${item.label}` : ''} - {currency(item.balance_amount)} left</option>)}
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

                  )}
                  {activeTab === 'restructure' && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 hidden">Restructure Plan</h3>
                    <form className="space-y-3" onSubmit={handleRestructureSubmit}>
                      <div className="grid grid-cols-1 gap-3">
                        <select value={restructureForm.template_id || (restructureForm.plan_type === 'CUSTOM' ? 'custom' : '')} onChange={handleRestructureTemplateChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50">
                          <option value="">Choose template...</option>
                          <option value="custom">Custom (No Template)</option>
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

                  )}
                  {activeTab === 'installments' && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 hidden">Installments</h3>
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
                            <div className="text-right flex flex-col items-end gap-2">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{currency(installment.scheduled_amount)}</div>
                                <div className="text-xs text-gray-500">{currency(installment.balance_amount)} left</div>
                              </div>
                              {canManageFees && (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => handleEditEntity('INSTALLMENT', installment)} className="p-1 text-gray-400 hover:text-indigo-600 rounded bg-white border border-gray-200">
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteEntity('INSTALLMENT', selectedAccount.id, installment.id)} className="p-1 text-gray-400 hover:text-red-600 rounded bg-white border border-gray-200">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  )}
                  {activeTab === 'payments' && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 hidden">Payments</h3>
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
                            <div className="flex flex-col items-end gap-2">
                              <div className="font-bold text-green-700">{currency(payment.amount)}</div>
                              {canManageFees && (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => handleEditEntity('PAYMENT', payment)} className="p-1 text-gray-400 hover:text-indigo-600 rounded bg-gray-50 border border-gray-200">
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteEntity('PAYMENT', selectedAccount.id, payment.id)} className="p-1 text-gray-400 hover:text-red-600 rounded bg-gray-50 border border-gray-200">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  )}
                  {activeTab === 'adjustments' && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 hidden">Adjustments</h3>
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
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Creation Modal */}
              {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
              <div className="shrink-0 p-6 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-3xl z-10">
                <h2 className="text-2xl font-bold text-gray-900">Create Fee Account</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <form className="space-y-4" onSubmit={handleCreateAccount} id="create-fee-form">
                  <select value={createForm.student} onChange={(e) => setCreateForm((p) => ({ ...p, student: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50">
                    <option value="">Select student</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} {s.branch_name ? `(${s.branch_name})` : ''}</option>
                    ))}
                  </select>
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
                </form>
              </div>
              <div className="shrink-0 p-6 border-t border-gray-100 bg-white flex items-center justify-end gap-3 rounded-b-3xl z-10">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-50 border border-gray-200">Cancel</button>
                <button type="submit" form="create-fee-form" disabled={saving || !canManageFees} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="shrink-0 p-6 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-3xl z-10">
              <h2 className="text-2xl font-bold text-gray-900">{editingTemplateId ? 'Edit Fee Template' : 'Create Fee Template'}</h2>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSaveTemplate} className="space-y-4" id="fee-template-form">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <select value={newTemplateForm.company} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, company: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-slate-50" required>
                      <option value="FLAG">FLAG</option>
                      <option value="LP">LP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
                    <select value={newTemplateForm.plan_type} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, plan_type: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-slate-50" required>
                      <option value="PACKAGE">Package</option>
                      <option value="ONE_TIME">One Time</option>
                      <option value="INSTALLMENT">Installment</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <input value={newTemplateForm.code} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, code: e.target.value })} placeholder="e.g. FLAG-A1-B2" className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-slate-50" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input value={newTemplateForm.name} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, name: e.target.value })} placeholder="e.g. FLAG A1-B2 Package" className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-slate-50" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Label</label>
                  <input value={newTemplateForm.course_label} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, course_label: e.target.value })} placeholder="e.g. A1-B2" className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-slate-50" />
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Pricing Details</h3>
                  
                  {['ONE_TIME', 'PACKAGE', 'INSTALLMENT', 'MONTHLY', 'CUSTOM'].includes(newTemplateForm.plan_type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                      <input value={newTemplateForm.total_amount} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, total_amount: e.target.value })} placeholder="0.00" type="number" step="0.01" className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white" />
                    </div>
                  )}

                  {['MONTHLY', 'CUSTOM'].includes(newTemplateForm.plan_type) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Registration Amount</label>
                        <input value={newTemplateForm.registration_amount} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, registration_amount: e.target.value })} placeholder="0.00" type="number" step="0.01" className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Amount</label>
                        <input value={newTemplateForm.monthly_amount} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, monthly_amount: e.target.value })} placeholder="0.00" type="number" step="0.01" className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
                        <input value={newTemplateForm.duration_months} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, duration_months: e.target.value })} placeholder="e.g. 10" type="number" className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Day</label>
                        <input value={newTemplateForm.due_day} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, due_day: e.target.value })} placeholder="e.g. 10" type="number" className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white" />
                      </div>
                    </div>
                  )}

                  {['INSTALLMENT', 'CUSTOM'].includes(newTemplateForm.plan_type) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Installment Count</label>
                        <input value={newTemplateForm.installment_count} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, installment_count: e.target.value })} placeholder="e.g. 3" type="number" className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Installment Amount</label>
                        <input value={newTemplateForm.installment_amount} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, installment_amount: e.target.value })} placeholder="0.00" type="number" step="0.01" className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white" />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={newTemplateForm.notes} onChange={(e) => setNewTemplateForm({ ...newTemplateForm, notes: e.target.value })} placeholder="Template notes..." className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-slate-50 min-h-20" />
                </div>

              </form>
            </div>
            <div className="shrink-0 p-6 border-t border-gray-100 bg-white flex items-center justify-end gap-3 rounded-b-3xl z-10">
              <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-50 border border-gray-200">Cancel</button>
              <button type="submit" form="fee-template-form" disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50">
                {saving ? 'Saving...' : editingTemplateId ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Edit {editingEntity.type}
            </h2>
            <form onSubmit={handleSaveEditEntity} className="space-y-4">
              {editingEntity.type === 'ACCOUNT' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Total Due</label>
                    <input value={editingEntity.data.total_due} onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, total_due: e.target.value } })} className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Registration Amount</label>
                    <input value={editingEntity.data.registration_amount} onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, registration_amount: e.target.value } })} className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <select value={editingEntity.data.status} onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, status: e.target.value } })} className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="DROPPED">DROPPED</option>
                      <option value="PARTIAL">PARTIAL</option>
                    </select>
                  </div>
                </>
              )}

              {editingEntity.type === 'INSTALLMENT' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Scheduled Amount</label>
                    <input value={editingEntity.data.scheduled_amount} onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, scheduled_amount: e.target.value } })} className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Due Date</label>
                    <input type="date" value={editingEntity.data.due_date} onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, due_date: e.target.value } })} className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200" />
                  </div>
                </>
              )}

              {editingEntity.type === 'PAYMENT' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Amount</label>
                    <input value={editingEntity.data.amount} onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, amount: e.target.value } })} className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Payment Date</label>
                    <input type="datetime-local" value={editingEntity.data.payment_date?.slice(0, 16) || ''} onChange={(e) => setEditingEntity({ ...editingEntity, data: { ...editingEntity.data, payment_date: e.target.value } })} className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200" />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingEntity(null)} className="px-4 py-2 rounded-xl bg-gray-100 font-semibold text-gray-700">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-purple-600 font-semibold text-white">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
