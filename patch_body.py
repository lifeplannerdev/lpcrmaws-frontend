import os

file_path = "b:/lp alternative/lpcrm-frontend-main/src/Pages/FeesManagementPage.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

body_start = """        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">"""

if "<FeesAnalyticsWorkspace />" not in content and body_start in content:
    parts = content.split(body_start, 1)
    new_parts = parts[0] + "{workspace === 'analytics' ? (\n          <FeesAnalyticsWorkspace />\n        ) : (\n          <>\n" + body_start + parts[1]
    
    last_div_idx = new_parts.rfind("    </div>\n  );\n}")
    if last_div_idx == -1:
        last_div_idx = new_parts.rfind("    </div>\r\n  );\r\n}")

    if last_div_idx != -1:
        new_parts = new_parts[:last_div_idx] + "          </>\n        )}\n" + new_parts[last_div_idx:]
    else:
        print("WARNING: Could not find end of file signature")
        
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_parts)
    print("Patched body wrapping successfully!")
else:
    print("Already wrapped or body_start not found!")
