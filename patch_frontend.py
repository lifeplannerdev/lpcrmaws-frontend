import re

with open("src/Pages/FLAG/StudentProfilePage.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add new state variables
state_vars = """  const [showDemotionModal, setShowDemotionModal] = useState(false);
  const [demotionForm, setDemotionForm] = useState({ academic_batch_id: '', grade_batch_id: '', reason: '' });
  const [academicBatches, setAcademicBatches] = useState([]);
  const [gradeBatches, setGradeBatches] = useState([]);"""

content = re.sub(
    r"(const \[showExamModal, setShowExamModal\] = useState\(false\);)",
    state_vars + "\n  \\1",
    content
)

# 2. Add fetch function for batches inside the effect or separate
fetch_batches_fn = """  const fetchBatches = async () => {
    const token = accessToken || await refreshAccessToken();
    const res = await fetch(`${API_BASE_URL}/students/batches/`, { headers: { Authorization: `Bearer ${token}` } });
    if(res.ok) {
        const data = await res.json();
        setAcademicBatches(data.results || data);
    }
  };
  
  const fetchGradeBatches = async (batchId) => {
    const token = accessToken || await refreshAccessToken();
    const res = await fetch(`${API_BASE_URL}/students/grade-batches/?academic_batch=${batchId}`, { headers: { Authorization: `Bearer ${token}` } });
    if(res.ok) {
        const data = await res.json();
        setGradeBatches(data.results || data);
    }
  };

  const handlePromote = async () => {
    if(!window.confirm("Are you sure you want to promote this student to the next grade?")) return;
    const token = accessToken || await refreshAccessToken();
    const res = await fetch(`${API_BASE_URL}/students/students/${id}/promote/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Passed exam' })
    });
    if(res.ok) {
        alert("Student promoted successfully");
        fetchStudentData();
    } else {
        const err = await res.json();
        alert(err.error || "Failed to promote");
    }
  };

  const handleDemote = async () => {
    const token = accessToken || await refreshAccessToken();
    const res = await fetch(`${API_BASE_URL}/students/students/${id}/demote/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(demotionForm)
    });
    if(res.ok) {
        alert("Student demoted/reassigned successfully");
        setShowDemotionModal(false);
        fetchStudentData();
    } else {
        const err = await res.json();
        alert(err.error || "Failed to demote");
    }
  };"""

content = re.sub(
    r"(const fetchStudentData = async \(\) => \{)",
    fetch_batches_fn + "\n\n  \\1",
    content
)

# 3. Add buttons to the header actions
buttons_ui = """<button onClick={handlePromote} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
              Promote
            </button>
            <button onClick={() => { fetchBatches(); setShowDemotionModal(true); }} className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 transition-colors">
              Demote / Reassign
            </button>"""

content = re.sub(
    r"(<button\s+onClick=\{() => setShowEditModal\(true\)\}\s+className=\"flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm\">)",
    buttons_ui + "\n            \\1",
    content
)

# 4. Add the Demotion Modal
modal_ui = """{showDemotionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Demote / Reassign Student</h3>
              <button onClick={() => setShowDemotionModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Academic Batch</label>
                <select 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={demotionForm.academic_batch_id}
                  onChange={(e) => {
                    setDemotionForm({...demotionForm, academic_batch_id: e.target.value});
                    fetchGradeBatches(e.target.value);
                  }}
                >
                  <option value="">-- Select --</option>
                  {academicBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Grade Batch</label>
                <select 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={demotionForm.grade_batch_id}
                  onChange={(e) => setDemotionForm({...demotionForm, grade_batch_id: e.target.value})}
                >
                  <option value="">-- Select --</option>
                  {gradeBatches.map(gb => <option key={gb.id} value={gb.id}>{gb.grade_code}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Reason (Optional)</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={demotionForm.reason}
                  onChange={(e) => setDemotionForm({...demotionForm, reason: e.target.value})}
                  rows="2"
                />
              </div>
              <button 
                onClick={handleDemote}
                className="w-full bg-orange-600 text-white font-bold py-2 rounded-lg hover:bg-orange-700"
              >
                Confirm Demotion / Reassignment
              </button>
            </div>
          </div>
        </div>
      )}"""

content = re.sub(
    r"(<!-- Modal Placeholders -->|{\/\*\s*Modals\s*\*\/\})",
    "{/* Modals */}\n      " + modal_ui,
    content
)

# fallback if `{/* Modals */}` isn't found
if "Confirm Demotion" not in content:
    content = content.replace("</main>", modal_ui + "\n      </main>")

with open("src/Pages/FLAG/StudentProfilePage.jsx", "w", encoding="utf-8") as f:
    f.write(content)
