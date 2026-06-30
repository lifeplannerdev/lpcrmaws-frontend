import os

file_path = "b:/lp alternative/lpcrm-frontend-main/src/Pages/FeesManagementPage.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the tabs
old_tabs = '''        <div className="flex space-x-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <button onClick={() => setMainTab('accounts')} className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'accounts' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}`}>Accounts & Payments</button>
          <button onClick={() => setMainTab('all_fees')} className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'all_fees' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}`}>All Fees Overview</button>
          <button onClick={() => setMainTab('catalog')} className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'catalog' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}`}>Fee Catalog (Templates)</button>
        </div>'''

new_tabs = '''        <div className="flex space-x-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-x-auto">
          <button onClick={() => setMainTab('accounts')} className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'accounts' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}`}>Accounts & Payments</button>
          <button onClick={() => setMainTab('pending_attendances')} className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'pending_attendances' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}`}>Pending Attendances {pendingAttendances.length > 0 && <span className="ml-1 bg-white text-orange-600 px-2 py-0.5 rounded-full text-xs">{pendingAttendances.length}</span>}</button>
          <button onClick={() => setMainTab('all_fees')} className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'all_fees' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}`}>All Fees</button>
          <button onClick={() => setMainTab('catalog')} className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'catalog' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}`}>Fee Catalog</button>
          <button onClick={() => setMainTab('policies')} className={`whitespace-nowrap px-4 py-3 text-sm font-semibold rounded-xl transition-all ${mainTab === 'policies' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'}`}>Settings & Policies</button>
        </div>'''

if old_tabs in content:
    content = content.replace(old_tabs, new_tabs)
    print("Replaced tabs successfully!")
else:
    print("Could not find old tabs to replace!")

# 2. Remove the pending attendance block from accounts
old_pending_block = '''        {mainTab === 'accounts' && (
          <div className="space-y-6">

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
        )}'''

new_pending_block = '''        {mainTab === 'accounts' && (
          <div className="space-y-6">'''

if old_pending_block in content:
    content = content.replace(old_pending_block, new_pending_block)
    print("Removed old pending block successfully!")
else:
    print("Could not find old pending block to replace!")


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
