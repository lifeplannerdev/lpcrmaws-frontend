import React, { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../../Components/layouts/Navbar';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { fdsApi, FDS_CATEGORIES } from './fdsApi';
import './fds-theme.css';

const STATUS_OPTIONS = ['PRESENT','ABSENT','LEAVE','MAKEUP','HOLIDAY'];
const STATUS_LABELS = { PRESENT:'Present', ABSENT:'Absent', LEAVE:'Leave', MAKEUP:'Makeup', HOLIDAY:'Holiday' };
const STATUS_CLASS = { PRESENT:'fds-att-present', ABSENT:'fds-att-absent', LEAVE:'fds-att-leave', MAKEUP:'fds-att-makeup', HOLIDAY:'fds-att-holiday' };

function StatusCycleBtn({ status, onChange }) {
  const order = STATUS_OPTIONS;
  const next = () => onChange(order[(order.indexOf(status) + 1) % order.length]);
  return (
    <button type="button" className={`fds-att-status-btn ${STATUS_CLASS[status]}`} onClick={next}>
      {STATUS_LABELS[status]}
    </button>
  );
}

const DAYS_MAP = { 0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' };

function FdsCalendar({ selectedDate, onSelectDate, scheduleDaysString }) {
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate));
  
  useEffect(() => {
    setCurrentDate(new Date(selectedDate));
  }, [selectedDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const scheduleDays = (scheduleDaysString || '').split(',').map(s => s.trim().toUpperCase());

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const pad = (n) => n.toString().padStart(2, '0');
  const selDateStr = selectedDate;

  const handleDateClick = (d) => {
    const dateStr = `${year}-${pad(month+1)}-${pad(d)}`;
    onSelectDate(dateStr);
  };

  const blanks = Array.from({ length: firstDayOfWeek });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="fds-card" style={{ padding: '20px', maxWidth: '350px', margin: '0 auto 20px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button className="fds-btn fds-btn-secondary" style={{ padding: '6px' }} onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
        <div style={{ fontWeight: 'bold', color: 'var(--fds-primary)' }}>
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
        <button className="fds-btn fds-btn-secondary" style={{ padding: '6px' }} onClick={handleNextMonth}><ChevronRight size={16} /></button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--fds-text-muted)', marginBottom: '8px' }}>
        <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {blanks.map((_, i) => <div key={`blank-${i}`} />)}
        {days.map(d => {
          const dateStr = `${year}-${pad(month+1)}-${pad(d)}`;
          const dayOfWeek = new Date(year, month, d).getDay();
          const dayName = DAYS_MAP[dayOfWeek];
          
          const isScheduled = scheduleDays.includes(dayName);
          const isSelected = dateStr === selDateStr;
          
          const baseStyle = { 
            width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', cursor: 'pointer',
            fontSize: '0.9rem', transition: 'all 0.2s', userSelect: 'none'
          };
          
          if (isSelected) {
            baseStyle.backgroundColor = 'var(--fds-primary)';
            baseStyle.color = 'var(--fds-bg)';
            baseStyle.fontWeight = 'bold';
          } else if (isScheduled) {
            baseStyle.color = 'var(--fds-primary)';
            baseStyle.border = '1px solid var(--fds-border)';
            baseStyle.backgroundColor = 'var(--fds-surface-2)';
          } else {
            baseStyle.color = 'var(--fds-text-faint)';
            baseStyle.backgroundColor = 'transparent';
          }

          return (
            <div 
              key={d} 
              onClick={() => handleDateClick(d)}
              style={baseStyle}
              onMouseOver={e => !isSelected && (e.currentTarget.style.backgroundColor = 'var(--fds-surface-3)')}
              onMouseOut={e => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = isScheduled ? 'var(--fds-surface-2)' : 'transparent';
                }
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FdsAttendancePage() {
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('fds:admin') || hasPermission('fds:admin_own');

  const [activeCategory, setActiveCategory] = useState('ALL');
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchStudents, setBatchStudents] = useState([]);
  const [existingAttendance, setExistingAttendance] = useState({});
  const [attendance, setAttendance] = useState({});
  const [lateArrival, setLateArrival] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Monthly report tab
  const [activeTab, setActiveTab] = useState('mark'); // 'mark' | 'report'
  const [reportBatch, setReportBatch] = useState('');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  const authFetchJson = useCallback(async (url, opts = {}) => {
    let token = accessToken;
    if (!token) token = await refreshAccessToken();
    const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
    if (!res.ok) throw new Error('Failed');
    if (res.status === 204) return null;
    return res.json();
  }, [accessToken, refreshAccessToken]);

  // Load batches
  useEffect(() => {
    const params = { status: 'ACTIVE', page_size: 200 };
    if (activeCategory !== 'ALL') params.class_category = activeCategory;
    fdsApi.batches(authFetchJson, params)
      .then(d => { setBatches(d.results ?? d); setSelectedBatch(''); })
      .catch(console.error);
  }, [authFetchJson, activeCategory]);

  // Load students and existing attendance when batch+date changes
  useEffect(() => {
    if (!selectedBatch) { setBatchStudents([]); setAttendance({}); return; }
    setLoading(true);
    Promise.all([
      fdsApi.batchStudents(authFetchJson, selectedBatch),
      fdsApi.attendance(authFetchJson, { batch: selectedBatch, date: selectedDate, page_size: 200 }),
    ]).then(([students, attData]) => {
      const atts = attData.results ?? attData;
      const attMap = {};
      const existing = {};
      atts.forEach(a => { attMap[a.student] = a.status; existing[a.student] = a; });
      setBatchStudents(students);
      setAttendance(prev => {
        const init = {};
        students.forEach(s => { init[s.id] = attMap[s.id] || 'PRESENT'; });
        return init;
      });
      setLateArrival({});
      setExistingAttendance(existing);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, [selectedBatch, selectedDate, authFetchJson]);

  const handleMarkAll = (status) => {
    setAttendance(prev => {
      const next = { ...prev };
      batchStudents.forEach(s => { next[s.id] = status; });
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedBatch || batchStudents.length === 0) return;
    setSaving(true);
    try {
      const records = batchStudents.map(s => ({
        student_id: s.id,
        status: attendance[s.id] || 'PRESENT',
        late_arrival: lateArrival[s.id] || false,
        notes: '',
      }));
      await fdsApi.bulkMarkAttendance(authFetchJson, {
        batch_id: parseInt(selectedBatch),
        date: selectedDate,
        records,
      });
      alert(`✓ Attendance saved for ${batchStudents.length} students.`);
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const loadMonthlyReport = async () => {
    if (!reportBatch) return;
    setReportLoading(true);
    try {
      const data = await fdsApi.monthlyReport(authFetchJson, {
        batch_id: reportBatch, month: reportMonth, year: reportYear
      });
      setMonthlyData(data);
    } catch (e) { console.error(e); }
    finally { setReportLoading(false); }
  };

  const selectedBatchObj = batches.find(b => String(b.id) === String(selectedBatch));

  return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="fds-theme">
        <div className="fds-page">
          <div className="fds-page-header">
            <div>
              <h1 className="fds-page-title">Attendance</h1>
              <p className="fds-page-subtitle">FILMAATIC Dance Studio</p>
            </div>
          </div>

          {/* Tab Toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['mark','report'].map(t => (
              <button
                key={t}
                className={`fds-btn ${activeTab === t ? 'fds-btn-primary' : 'fds-btn-secondary'}`}
                onClick={() => setActiveTab(t)}
              >
                {t === 'mark' ? '✏️ Mark Attendance' : '📊 Monthly Report'}
              </button>
            ))}
          </div>

          {/* ─── Mark Attendance ─── */}
          {activeTab === 'mark' && (
            <>
              {/* Category Tabs */}
              <div style={{ marginBottom: 16 }}>
                <div className="fds-tabs">
                  {FDS_CATEGORIES.map(({ key, label, tabClass, dotClass }) => (
                    <button key={key} className={`fds-tab ${activeCategory === key ? tabClass : ''}`} onClick={() => setActiveCategory(key)}>
                      {dotClass && <span className={dotClass}>●</span>} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch + Date selectors */}
              <div className="fds-filter-bar" style={{ marginBottom: 20 }}>
                <select className="fds-input fds-select" style={{ flex: 1 }} value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                  <option value="">Select Batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name} — {b.time_display || ''}</option>)}
                </select>
                <input className="fds-input" type="date" style={{ maxWidth: 180 }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>

              {/* Batch info */}
              {selectedBatchObj && (
                <>
                  <div className="fds-card" style={{ marginBottom: 16, padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`fds-badge fds-badge-${selectedBatchObj.class_category?.toLowerCase()}`}>{selectedBatchObj.class_category}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--fds-text)' }}>🕐 {selectedBatchObj.time_display || 'Time TBD'}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--fds-text-muted)' }}>{selectedBatchObj.enrolled_count} students</span>
                      {selectedBatchObj.trainer_name && <span style={{ fontSize: '0.85rem', color: 'var(--fds-primary)' }}>Trainer: {selectedBatchObj.trainer_name}</span>}
                    </div>
                  </div>
                  
                  <FdsCalendar 
                    selectedDate={selectedDate} 
                    onSelectDate={setSelectedDate} 
                    scheduleDaysString={selectedBatchObj.schedule_days} 
                  />
                </>
              )}

              {!selectedBatch ? (
                <div className="fds-empty">
                  <div className="fds-empty-icon"><CalendarCheck size={40} /></div>
                  <div className="fds-empty-title">Select a batch to mark attendance</div>
                </div>
              ) : loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="fds-spinner" /></div>
              ) : (
                <>
                  {/* Quick Actions */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--fds-text-muted)', fontSize: '0.85rem', alignSelf: 'center' }}>Mark all as:</span>
                    {STATUS_OPTIONS.filter(s => s !== 'HOLIDAY').map(s => (
                      <button key={s} className={`fds-att-status-btn ${STATUS_CLASS[s]}`} onClick={() => handleMarkAll(s)}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  {/* Student Grid */}
                  <div className="fds-att-grid">
                    {batchStudents.map(student => (
                      <div key={student.id} className="fds-att-row">
                        <div className="fds-att-name">
                          <div>{student.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--fds-text-muted)' }}>{student.student_id}</div>
                        </div>
                        {/* Late Arrival toggle */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--fds-text-muted)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={lateArrival[student.id] || false}
                            onChange={e => setLateArrival(prev => ({ ...prev, [student.id]: e.target.checked }))}
                            style={{ accentColor: 'var(--fds-primary)' }}
                          />
                          Late
                        </label>
                        <StatusCycleBtn
                          status={attendance[student.id] || 'PRESENT'}
                          onChange={(status) => setAttendance(prev => ({ ...prev, [student.id]: status }))}
                        />
                      </div>
                    ))}
                  </div>

                  {batchStudents.length > 0 && canEdit && (
                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                      <div style={{ color: 'var(--fds-text-muted)', fontSize: '0.82rem', alignSelf: 'center' }}>
                        {Object.values(attendance).filter(s => s === 'PRESENT').length} present of {batchStudents.length}
                      </div>
                      <button className="fds-btn fds-btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : '✓ Save Attendance'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ─── Monthly Report ─── */}
          {activeTab === 'report' && (
            <>
              <div className="fds-filter-bar" style={{ marginBottom: 20 }}>
                <select className="fds-input fds-select" style={{ flex: 1 }} value={reportBatch} onChange={e => setReportBatch(e.target.value)}>
                  <option value="">Select Batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select className="fds-input fds-select" style={{ maxWidth: 140 }} value={reportMonth} onChange={e => setReportMonth(parseInt(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
                <input className="fds-input" type="number" style={{ maxWidth: 100 }} value={reportYear} onChange={e => setReportYear(parseInt(e.target.value))} min={2020} max={2100} />
                <button className="fds-btn fds-btn-primary" onClick={loadMonthlyReport}>Load Report</button>
              </div>

              {reportBatch && (() => {
                const rbObj = batches.find(b => String(b.id) === String(reportBatch));
                return rbObj ? (
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <FdsCalendar 
                      selectedDate={`${reportYear}-${String(reportMonth).padStart(2, '0')}-01`} 
                      onSelectDate={(d) => {
                        const newD = new Date(d);
                        setReportMonth(newD.getMonth() + 1);
                        setReportYear(newD.getFullYear());
                      }} 
                      scheduleDaysString={rbObj.schedule_days} 
                    />
                  </div>
                ) : null;
              })()}

              {reportLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="fds-spinner" /></div>
              ) : monthlyData.length > 0 ? (
                <div className="fds-table-wrap">
                  <table className="fds-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Total Classes</th>
                        <th>Present</th>
                        <th>Absent</th>
                        <th>Others</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.sort((a, b) => b.pct - a.pct).map(row => (
                        <tr key={row.student_id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{row.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--fds-text-muted)' }}>{row.student_id}</div>
                          </td>
                          <td>{row.total}</td>
                          <td style={{ color: 'var(--fds-yoga)' }}>{row.present}</td>
                          <td style={{ color: '#e74c3c' }}>{row.absent}</td>
                          <td style={{ color: '#e67e22' }}>{row.total - row.present - row.absent}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--fds-surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${row.pct}%`, background: row.pct >= 80 ? 'var(--fds-yoga)' : row.pct >= 60 ? '#e67e22' : '#e74c3c', borderRadius: 3 }} />
                              </div>
                              <span style={{ minWidth: 36, fontSize: '0.82rem', fontWeight: 700, color: row.pct >= 80 ? 'var(--fds-yoga)' : row.pct >= 60 ? '#e67e22' : '#e74c3c' }}>
                                {row.pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="fds-empty">
                  <div className="fds-empty-title">Select a batch and month to view the report</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
