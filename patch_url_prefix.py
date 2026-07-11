import os

file_path = "b:/lp alternative/lpcrm-frontend-main/src/Pages/FeesAnalyticsWorkspace.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("'/api/branches/'", "'/branches/'")
content = content.replace("'/api/academic-batches/'", "'/academic-batches/'")
content = content.replace("`/api/fees/analytics/overview/", "`/fees/analytics/overview/")
content = content.replace("`/api/fees/analytics/student/", "`/fees/analytics/student/")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Frontend redundant /api/ prefixes removed!")
