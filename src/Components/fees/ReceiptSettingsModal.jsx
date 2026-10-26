import React, { useEffect, useState } from 'react';
import {
  Building2,
  CreditCard,
  FileText,
  Hash,
  Image as ImageIcon,
  Save,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DEFAULT_DISPLAY_OPTIONS, getDefaultIssuerSnapshot } from '../../utils/receiptUtils';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ReceiptSettingsModal({ isOpen, onClose, getToken, company = 'FLAG', onSaved }) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const isSuper = user?.is_superuser || ['MANAGING_DIRECTOR', 'MD', 'DIRECTOR', 'CEO', 'ADMIN'].some(r => user?.role_names?.includes(r) || user?.role === r);
  const hasGlobal = isSuper || hasPermission('fees:accounts');

  const canAccessCompany = (comp) => {
    if (hasGlobal) return true;
    if (comp === 'FDS') return hasPermission('fees:fds') || hasPermission('fds:admin') || hasPermission('fds_fees:manage');
    if (comp === 'LP') return hasPermission('fees:lp') || hasPermission('processing_students:manage_fees');
    if (comp === 'FLAG') return hasPermission('fees:flag') || hasPermission('flag:admin') || hasPermission('flag:fees') || hasPermission('fees:manage');
    return false;
  };

  const allTabs = [
    { id: 'FLAG', label: 'FLAG Academy' },
    { id: 'LP', label: 'LifePlanner (LP)' },
    { id: 'FDS', label: 'Filmaatic (FDS)' },
  ];
  const availableTabs = allTabs.filter(c => canAccessCompany(c.id));

  const [selectedCompany, setSelectedCompany] = useState(() => {
    if (availableTabs.some(t => t.id === company)) return company;
    return availableTabs[0]?.id || 'FLAG';
  });

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.id === selectedCompany)) {
      setSelectedCompany(availableTabs[0].id);
    }
  }, [availableTabs, selectedCompany]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('branding');
  const initialSnap = getDefaultIssuerSnapshot(selectedCompany);
  const [form, setForm] = useState({
    company: selectedCompany,
    ...initialSnap,
    default_gst_mode: 'INCLUSIVE',
    default_gst_rate: '18.00',
    receipt_prefix: selectedCompany || 'FLAG',
    next_sequence_number: 1,
    default_template: 'EXECUTIVE',
    default_terms_and_conditions: initialSnap.terms || '',
    default_display_options: { ...DEFAULT_DISPLAY_OPTIONS },
  });

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const loadSettings = async () => {
      try {
        setLoading(true);
        const compSnap = getDefaultIssuerSnapshot(selectedCompany);
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/fees/receipt-settings/?company=${encodeURIComponent(selectedCompany)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && mounted) {
          const data = await res.json();
          setForm({
            ...compSnap,
            ...data,
            company: selectedCompany,
            default_display_options: {
              ...DEFAULT_DISPLAY_OPTIONS,
              ...(data.default_display_options || {}),
            },
          });
        } else if (mounted) {
          setForm({
            ...compSnap,
            company: selectedCompany,
            default_gst_mode: 'INCLUSIVE',
            default_gst_rate: '18.00',
            receipt_prefix: selectedCompany,
            next_sequence_number: 1,
            default_template: 'EXECUTIVE',
            default_terms_and_conditions: compSnap.terms || '',
            default_display_options: { ...DEFAULT_DISPLAY_OPTIONS },
          });
        }
      } catch (err) {
        console.error('Failed to load receipt settings', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadSettings();
    return () => {
      mounted = false;
    };
  }, [isOpen, selectedCompany, getToken]);

  if (!isOpen) return null;

  const handleImageUpload = (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, [field]: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const handleToggleOption = (key) => {
    setForm((prev) => ({
      ...prev,
      default_display_options: {
        ...(prev.default_display_options || {}),
        [key]: !prev.default_display_options?.[key],
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/fees/receipt-settings/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          company: selectedCompany,
          next_sequence_number: Math.max(1, Number(form.next_sequence_number || 1)),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save receipt settings');
      }
      toast.success('Receipt branding & numbering settings saved');
      if (onSaved) onSaved(data);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-400/30">
              <Building2 size={20} className="text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Receipt Studio Branding & Compliance Settings</h2>
              <p className="text-xs text-slate-400">
                Configure default academy header, sequential FY numbering, GST rules, bank details, and digital seal.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              {availableTabs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCompany(c.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedCompany === c.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto">
          {[
            { id: 'branding', label: 'Academy Branding', icon: Building2 },
            { id: 'tax_numbering', label: 'Numbering & GST Rules', icon: Hash },
            { id: 'seal_signatory', label: 'Digital Seal & Signatory', icon: ShieldCheck },
            { id: 'bank_terms', label: 'Bank, UPI & Terms', icon: CreditCard },
            { id: 'defaults', label: 'Default Visibility Toggles', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeSection === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-500">Loading receipt settings...</div>
          ) : (
            <>
              {activeSection === 'branding' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Organization / Academy Legal Name</label>
                      <input
                        value={form.organization_name || ''}
                        onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle / Tagline</label>
                      <input
                        value={form.subtitle || ''}
                        onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Registered Campus Address</label>
                    <textarea
                      value={form.address || ''}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Official Phone</label>
                      <input
                        value={form.phone || ''}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Accounts Email</label>
                      <input
                        type="email"
                        value={form.email || ''}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Website</label>
                      <input
                        value={form.website || ''}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Default Receipt Template</label>
                      <select
                        value={form.default_template || 'EXECUTIVE'}
                        onChange={(e) => setForm({ ...form, default_template: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                      >
                        <option value="EXECUTIVE">FLAG Executive A4 (Default)</option>
                        <option value="GST_INVOICE">Classic GST Tax Invoice</option>
                        <option value="DUAL_SLIP">Compact Dual-Slip Voucher (Student + Office)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Primary Brand Accent Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.brand_color || '#312e81'}
                          onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                          className="h-10 w-14 rounded-lg border border-slate-200 cursor-pointer"
                        />
                        <input
                          value={form.brand_color || '#312e81'}
                          onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Academy Logo (Upload or URL)</label>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1.5">
                          <Upload size={14} /> Upload PNG/SVG
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('logo_url', e)} />
                        </label>
                        {form.logo_url && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, logo_url: '' })}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {form.logo_url && (
                        <img src={form.logo_url} alt="Logo Preview" className="h-10 mt-2 object-contain border rounded p-1" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'tax_numbering' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
                    <div>
                      <label className="block text-xs font-bold text-indigo-950 mb-1">
                        Receipt Number Prefix
                      </label>
                      <input
                        value={form.receipt_prefix || 'FLAG'}
                        onChange={(e) => setForm({ ...form, receipt_prefix: e.target.value })}
                        placeholder="e.g. FLAG or FLAG/KOC"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white text-sm font-mono"
                      />
                      <p className="text-[11px] text-indigo-700 mt-1">
                        Auto-formats with Indian Financial Year: <strong>{form.receipt_prefix || 'FLAG'}/2026-27/0001</strong>
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-indigo-950 mb-1">
                        Next Sequence Number
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.next_sequence_number ?? 1}
                        onChange={(e) => setForm({ ...form, next_sequence_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white text-sm font-mono"
                      />
                      <p className="text-[11px] text-indigo-700 mt-1">
                        Automatically increments atomically on every new receipt.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Academy GSTIN</label>
                      <input
                        value={form.gstin || ''}
                        onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                        placeholder="e.g. 32AABCF1234D1Z5"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">PAN Number</label>
                      <input
                        value={form.pan_number || ''}
                        onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
                        placeholder="e.g. AABCF1234D"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Default SAC Code</label>
                      <input
                        value={form.sac_code || '999293'}
                        onChange={(e) => setForm({ ...form, sac_code: e.target.value })}
                        placeholder="999293"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Default Tax / GST Mode</label>
                      <select
                        value={form.default_gst_mode || 'INCLUSIVE'}
                        onChange={(e) => setForm({ ...form, default_gst_mode: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                      >
                        <option value="INCLUSIVE">GST Inclusive (Back-calculates 18% GST)</option>
                        <option value="EXCLUSIVE">GST Exclusive (Adds 18% GST on top)</option>
                        <option value="NONE">No Tax / Exempt Fee Receipt</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Default GST Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.default_gst_rate ?? '18.00'}
                        onChange={(e) => setForm({ ...form, default_gst_rate: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Default Place of Supply</label>
                      <input
                        value={form.place_of_supply || 'Kerala (32)'}
                        onChange={(e) => setForm({ ...form, place_of_supply: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'seal_signatory' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Authorized Signatory Name</label>
                      <input
                        value={form.authorized_signatory_name || ''}
                        onChange={(e) => setForm({ ...form, authorized_signatory_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Signatory Designation</label>
                      <input
                        value={form.authorized_signatory_designation || ''}
                        onChange={(e) => setForm({ ...form, authorized_signatory_designation: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Diagonal Security Watermark Text</label>
                      <input
                        value={form.watermark_text || ''}
                        onChange={(e) => setForm({ ...form, watermark_text: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                      <label className="block text-xs font-bold text-slate-800 mb-2">
                        Digital Signature Image (Transparent PNG recommended)
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm">
                          <ImageIcon size={14} /> Upload Signature
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload('signature_image', e)}
                          />
                        </label>
                        {form.signature_image && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, signature_image: '' })}
                            className="text-xs text-red-600 font-semibold"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {form.signature_image && (
                        <img
                          src={form.signature_image}
                          alt="Signature Preview"
                          className="h-14 mt-3 object-contain bg-white border rounded-lg p-1.5"
                        />
                      )}
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                      <label className="block text-xs font-bold text-slate-800 mb-2">
                        Official Academy Circular Stamp (Optional — built-in vector seal used if empty)
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm">
                          <ShieldCheck size={14} /> Upload Official Stamp
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload('stamp_image', e)}
                          />
                        </label>
                        {form.stamp_image && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, stamp_image: '' })}
                            className="text-xs text-red-600 font-semibold"
                          >
                            Use Built-In Vector Seal
                          </button>
                        )}
                      </div>
                      {form.stamp_image && (
                        <img
                          src={form.stamp_image}
                          alt="Stamp Preview"
                          className="h-16 w-16 mt-3 object-contain bg-white border rounded-lg p-1"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'bank_terms' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                      <input
                        value={form.bank_name || ''}
                        onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                        placeholder="e.g. HDFC Bank / Federal Bank"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Account Holder Name</label>
                      <input
                        value={form.account_name || ''}
                        onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                      <input
                        value={form.account_number || ''}
                        onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
                      <input
                        value={form.ifsc_code || ''}
                        onChange={(e) => setForm({ ...form, ifsc_code: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Official Merchant UPI ID</label>
                      <input
                        value={form.upi_id || ''}
                        onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                        placeholder="e.g. flagacademy@hdfcbank"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Default Terms & Conditions</label>
                    <textarea
                      value={form.default_terms_and_conditions || ''}
                      onChange={(e) => setForm({ ...form, default_terms_and_conditions: e.target.value })}
                      rows={4}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Footer Thank-You Note</label>
                    <input
                      value={form.footer_note || ''}
                      onChange={(e) => setForm({ ...form, footer_note: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>
              )}

              {activeSection === 'defaults' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'show_ledger_summary', label: 'Show Account Balance Summary (Total Fee / Paid / Balance Due)' },
                    { key: 'show_installment_schedule', label: 'Show Upcoming Installment Schedule Table' },
                    { key: 'show_tax_breakdown', label: 'Show Tax / GST Breakdown (CGST / SGST / IGST)' },
                    { key: 'show_bank_details', label: 'Show Academy Bank & UPI Details' },
                    { key: 'show_signature_and_stamp', label: 'Show Digital Stamp & Authorized Signature' },
                    { key: 'show_qr_verification', label: 'Show Cryptographic Verification QR Code' },
                    { key: 'show_amount_in_words', label: 'Show Amount in Words Callout' },
                    { key: 'show_sac_column', label: 'Show SAC / HSN Code Column' },
                    { key: 'show_discount_line', label: 'Show Discount / Concession Column & Row' },
                    { key: 'show_watermark', label: 'Show Diagonal Background Security Watermark' },
                    { key: 'show_student_academic_info', label: 'Show Student Batch, Campus & Course Context Block' },
                    { key: 'show_terms', label: 'Show Terms & Conditions Footer' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-indigo-50/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(form.default_display_options?.[item.key])}
                        onChange={() => handleToggleOption(item.key)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-semibold text-slate-800">{item.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Receipt Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
