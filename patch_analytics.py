import os

file_path = "b:/lp alternative/lpcrm-frontend-main/src/Pages/FeesAnalyticsWorkspace.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace imports
old_import = "import api from '../api';"
new_import = """import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;"""

if old_import in content:
    content = content.replace(old_import, new_import)

# Replace top of component
old_comp = """const FeesAnalyticsWorkspace = () => {
  const [loading, setLoading] = useState(true);"""
new_comp = """const FeesAnalyticsWorkspace = () => {
  const { accessToken } = useAuth();
  
  const fetchWithAuth = async (url) => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) throw new Error("API failed");
    return res.json();
  };

  const [loading, setLoading] = useState(true);"""

if old_comp in content:
    content = content.replace(old_comp, new_comp)

# Replace fetchMetadata
old_meta = """      const [branchRes, batchRes] = await Promise.all([
        api.get('/api/branches/'),
        api.get('/api/academic-batches/')
      ]);
      setBranches(branchRes.data);
      setBatches(batchRes.data);"""
new_meta = """      const [branchRes, batchRes] = await Promise.all([
        fetchWithAuth('/api/branches/'),
        fetchWithAuth('/api/academic-batches/')
      ]);
      setBranches(branchRes);
      setBatches(batchRes);"""

if old_meta in content:
    content = content.replace(old_meta, new_meta)

# Replace fetchAnalytics
old_analytics = """      const res = await api.get(`/api/analytics/overview/?${params.toString()}`);
      setData(res.data);"""
new_analytics = """      const data = await fetchWithAuth(`/api/analytics/overview/?${params.toString()}`);
      setData(data);"""

if old_analytics in content:
    content = content.replace(old_analytics, new_analytics)

# Replace fetchStudent360
old_360 = """      const res = await api.get(`/api/analytics/student/${studentId}/`);
      setStudent360(res.data);"""
new_360 = """      const data = await fetchWithAuth(`/api/analytics/student/${studentId}/`);
      setStudent360(data);"""

if old_360 in content:
    content = content.replace(old_360, new_360)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched FeesAnalyticsWorkspace!")
