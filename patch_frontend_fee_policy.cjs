const fs = require('fs');

const file = 'src/Pages/FeesManagementPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add feePolicy state
content = content.replace(
  "const [message, setMessage] = useState(null);",
  "const [message, setMessage] = useState(null);\n  const [feePolicy, setFeePolicy] = useState({ block_without_fee_account: false, pending_if_overdue: false });"
);

// 2. Update fetchData to load policy
const fetchCalls = `        fetch(\`\${API_BASE_URL}/fees/summary/\`, {
          headers: { Authorization: \`Bearer \${token}\` },
        }),
        fetch(\`\${API_BASE_URL}/attendance/detail/?approval_status=PENDING_FEE_APPROVAL\`, {
          headers: { Authorization: \`Bearer \${token}\` },
        }),
      ]);`;
      
const newFetchCalls = `        fetch(\`\${API_BASE_URL}/fees/summary/\`, {
          headers: { Authorization: \`Bearer \${token}\` },
        }),
        fetch(\`\${API_BASE_URL}/attendance/detail/?approval_status=PENDING_FEE_APPROVAL\`, {
          headers: { Authorization: \`Bearer \${token}\` },
        }),
        fetch(\`\${API_BASE_URL}/fees/policy/\`, {
          headers: { Authorization: \`Bearer \${token}\` },
        }),
      ]);`;
content = content.replace(fetchCalls, newFetchCalls);

const fetchAssigns = `      const summaryJson = await summaryRes.json();
      const pendingData = await pendingRes.json();`;

const newFetchAssigns = `      const summaryJson = await summaryRes.json();
      const pendingData = await pendingRes.json();
      const policyData = await Promise.all([templatesRes, accountsRes, studentsRes, summaryRes, pendingRes].length > 5 ? [] : fetch(\`\${API_BASE_URL}/fees/policy/\`, { headers: { Authorization: \`Bearer \${token}\` } }).then(r => r.json()).catch(() => ({}))); // Handle safely`;
// Actually, let's just use replace carefully for fetchAssigns.
content = content.replace(
  "const [templatesRes, accountsRes, studentsRes, summaryRes, pendingRes] = await Promise.all([",
  "const [templatesRes, accountsRes, studentsRes, summaryRes, pendingRes, policyRes] = await Promise.all(["
);

content = content.replace(
  "const pendingData = await pendingRes.json();",
  "const pendingData = await pendingRes.json();\n      const policyData = policyRes ? await policyRes.json().catch(()=>({})) : {};"
);

content = content.replace(
  "setPendingAttendances(pendingData.results || pendingData || []);",
  "setPendingAttendances(pendingData.results || pendingData || []);\n      if(policyData.company) setFeePolicy(policyData);"
);

// 3. Add Save Policy handler
const savePolicyHandler = `
  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(\`\${API_BASE_URL}/fees/policy/\`, {
        method: 'PATCH',
        headers: { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' },
        body: JSON.stringify(feePolicy)
      });
      if (!res.ok) throw new Error('Failed to update fee policy');
      setMessage({ type: 'success', text: 'Fee policy updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };
`;
content = content.replace(
  "const handleApproveAttendance = async (attendanceId) => {",
  savePolicyHandler + "\n  const handleApproveAttendance = async (attendanceId) => {"
);

// 4. Update tab buttons
const oldTabs = `<div className="flex space-x-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <button onClick={() => setMainTab('accounts')} className={\`flex-1 py-3 text-sm font-semibold rounded-xl transition-all \${mainTab === 'accounts' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}\`}>Accounts & Payments</button>
          <button onClick={() => setMainTab('all_fees')} className={\`flex-1 py-3 text-sm font-semibold rounded-xl transition-all \${mainTab === 'all_fees' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}\`}>All Fees Overview</button>
          <button onClick={() => setMainTab('catalog')} className={\`flex-1 py-3 text-sm font-semibold rounded-xl transition-all \${mainTab === 'catalog' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}\`}>Fee Catalog (Templates)</button>
        </div>`;

const newTabs = `<div className="flex space-x-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-x-auto">
          <button onClick={() => setMainTab('accounts')} className={\`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all \${mainTab === 'accounts' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}\`}>Accounts & Payments</button>
          <button onClick={() => setMainTab('pending_attendances')} className={\`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all \${mainTab === 'pending_attendances' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}\`}>Pending Attendances {pendingAttendances.length > 0 && <span className="ml-1 bg-white text-orange-600 px-2 py-0.5 rounded-full text-xs">{pendingAttendances.length}</span>}</button>
          <button onClick={() => setMainTab('all_fees')} className={\`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all \${mainTab === 'all_fees' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}\`}>All Fees</button>
          <button onClick={() => setMainTab('catalog')} className={\`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all \${mainTab === 'catalog' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}\`}>Fee Catalog</button>
          <button onClick={() => setMainTab('policies')} className={\`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all \${mainTab === 'policies' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}\`}>Settings & Policies</button>
        </div>`;
content = content.replace(oldTabs, newTabs);

// 5. Move Pending Attendance out of accounts and into its own tab
const pendingAttendanceBlock = `{pendingAttendances.length > 0 && (
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
        )}`;

// We remove it from accounts tab
content = content.replace(
  `        {mainTab === 'accounts' && (
          <div className="space-y-6">

        ${pendingAttendanceBlock}

          </div>
        )}`,
  ``
);

// We add the two new tabs
const newTabsContent = `
        {mainTab === 'pending_attendances' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Pending Attendances</h2>
                  <p className="text-sm text-gray-500">Review and approve attendance for students with overdue fees.</p>
                </div>
              </div>
              
              {pendingAttendances.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <CheckCircle className="mx-auto mb-3 text-green-300" size={32} />
                  No pending attendances require approval.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingAttendances.map(record => (
                    <div key={record.id} className="bg-white rounded-xl p-5 border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="font-bold text-gray-900 text-lg">{record.student_name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            Trainer: <span className="font-medium text-gray-700">{record.trainer_name}</span>
                          </div>
                        </div>
                        <div className="text-xs text-orange-700 font-bold bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200">
                          {record.date}
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-3 rounded-lg border border-gray-100 mb-4 text-sm text-gray-600">
                        Attendance was marked as <span className="font-semibold text-gray-900">{record.status}</span>, but the student's fee account was overdue at the time.
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApproveAttendance(record.id)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                        >
                          <CheckCircle size={16} /> Regularize
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {mainTab === 'policies' && (
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 max-w-3xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Fee Attendance Policies</h2>
              <p className="text-sm text-gray-500 mt-1">Configure how student fee statuses affect trainer attendance marking.</p>
            </div>
            
            <form onSubmit={handleSavePolicy} className="space-y-6">
              <div className="p-5 border border-gray-100 rounded-2xl bg-slate-50">
                <label className="flex items-start gap-4 cursor-pointer">
                  <div className="pt-0.5">
                    <input 
                      type="checkbox" 
                      checked={feePolicy.block_without_fee_account}
                      onChange={(e) => setFeePolicy(p => ({ ...p, block_without_fee_account: e.target.checked }))}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-base">Block attendance for students without a Fee Structure</div>
                    <div className="text-sm text-gray-500 mt-1">If enabled, trainers cannot mark attendance for any student who has not been assigned a fee account. The API will reject the request.</div>
                  </div>
                </label>
              </div>

              <div className="p-5 border border-gray-100 rounded-2xl bg-slate-50">
                <label className="flex items-start gap-4 cursor-pointer">
                  <div className="pt-0.5">
                    <input 
                      type="checkbox" 
                      checked={feePolicy.pending_if_overdue}
                      onChange={(e) => setFeePolicy(p => ({ ...p, pending_if_overdue: e.target.checked }))}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-base">Send to Pending if Fee Account is Overdue</div>
                    <div className="text-sm text-gray-500 mt-1">If enabled, when a trainer marks an overdue student as "PRESENT", the attendance status will automatically become "PENDING FEE APPROVAL". Absences are recorded normally.</div>
                  </div>
                </label>
              </div>
              
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={saving || !canManageFees}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Policies'}
                </button>
              </div>
            </form>
          </div>
        )}
`;

content = content.replace(
  "{mainTab === 'catalog' && (",
  newTabsContent + "\n        {mainTab === 'catalog' && ("
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched FeesManagementPage.jsx');
