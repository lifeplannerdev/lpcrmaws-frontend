import os

file_path = "b:/lp alternative/lpcrm-frontend-main/src/Pages/FeesManagementPage.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import_str = "import FeesAnalyticsWorkspace from './FeesAnalyticsWorkspace';"
if import_str not in content:
    content = content.replace("import Navbar from '../Components/layouts/Navbar';", "import Navbar from '../Components/layouts/Navbar';\n" + import_str)

state_str = "const [workspace, setWorkspace] = useState('accounting');"
if state_str not in content:
    content = content.replace("const [mainTab, setMainTab] = useState('accounts');", "const [mainTab, setMainTab] = useState('accounts');\n  const [workspace, setWorkspace] = useState('accounting');")

permissions_old = "const canViewFees = hasAnyPermission('fees');"
permissions_new = "const canViewFees = hasAnyPermission('fees');\n  const canViewAnalytics = hasPermission('fees:analytics') || hasPermission('fees:manage');"
if "canViewAnalytics =" not in content:
    content = content.replace(permissions_old, permissions_new)

switcher_old = """            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 text-indigo-700 text-sm font-medium shadow-sm mb-4">
              <IndianRupee size={16} />
              Accounting Workspace
            </div>"""

switcher_new = """            {canViewAnalytics ? (
              <div className="inline-flex bg-white rounded-full p-1 border border-indigo-100 shadow-sm mb-4">
                <button
                  onClick={() => setWorkspace('accounting')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${workspace === 'accounting' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <IndianRupee size={16} /> Accounting Workspace
                </button>
                <button
                  onClick={() => setWorkspace('analytics')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${workspace === 'analytics' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <TrendingUp size={16} /> Analytics Workspace
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 text-indigo-700 text-sm font-medium shadow-sm mb-4">
                <IndianRupee size={16} />
                Accounting Workspace
              </div>
            )}"""

if switcher_old in content:
    content = content.replace(switcher_old, switcher_new)
else:
    print("WARNING: Could not find switcher_old")

body_start = """        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">"""

if "workspace === 'analytics' ?" not in content and body_start in content:
    parts = content.split(body_start, 1)
    new_parts = parts[0] + "{workspace === 'analytics' ? (\n          <FeesAnalyticsWorkspace />\n        ) : (\n          <>\n" + body_start + parts[1]
    
    last_div_idx = new_parts.rfind("    </div>\n  );\n}")
    if last_div_idx == -1:
        last_div_idx = new_parts.rfind("    </div>\r\n  );\r\n}")

    if last_div_idx != -1:
        new_parts = new_parts[:last_div_idx] + "          </>\n        )}\n" + new_parts[last_div_idx:]
    else:
        print("WARNING: Could not find end of file signature")
        
    content = new_parts

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("FeesManagementPage patched successfully!")
