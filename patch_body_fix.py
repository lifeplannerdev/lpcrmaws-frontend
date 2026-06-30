import os

file_path = "b:/lp alternative/lpcrm-frontend-main/src/Pages/FeesManagementPage.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

body_start = """        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">"""
body_end = """      </div>

      {/* Template Creation Modal */}"""

if body_start in content and body_end in content:
    # 1. wrap start
    content = content.replace(body_start, "{workspace === 'analytics' ? (\n          <FeesAnalyticsWorkspace />\n        ) : (\n          <>\n" + body_start, 1)
    
    # 2. wrap end
    content = content.replace(body_end, "          </>\n        )}\n" + body_end, 1)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Body successfully wrapped!")
else:
    print("Couldn't patch. Already wrapped or strings not found.")
