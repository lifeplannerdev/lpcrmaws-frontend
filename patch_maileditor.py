with open('src/Components/Mail/MailEditor.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import React, { useEffect } from \'react\';', 'import React, { useEffect, useState } from \'react\';\nimport axios from \'axios\';')

import_auth_str = '''import { useAuth } from '../../context/AuthContext';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
'''
content = content.replace('import { FormatBold', import_auth_str + 'import { FormatBold')


menubar_code = '''const MenuBar = ({ editor }) => {
  const { accessToken } = useAuth();
  const [variables, setVariables] = useState([]);

  useEffect(() => {
    if (accessToken) {
      axios.get(`${API_BASE_URL}/mail/template-variables/`, { headers: { Authorization: `Bearer ${accessToken}` } })
        .then(res => setVariables(res.data))
        .catch(err => console.error(err));
    }
  }, [accessToken]);
'''
content = content.replace('const MenuBar = ({ editor }) => {', menubar_code)

dropdown_code = '''      <div className="w-px bg-gray-300 mx-1"></div>
      
      <select 
        onChange={(e) => {
            if (e.target.value) {
                editor.chain().focus().insertContent(`{{${e.target.value}}}`).run();
                e.target.value = '';
            }
        }}
        className="p-1 border border-gray-300 rounded text-sm text-gray-700 bg-white cursor-pointer"
        title="Insert Template Variable"
        defaultValue=""
      >
        <option value="" disabled>@ Insert Variable...</option>
        {variables.map(v => (
            <option key={v.id} value={v.id}>{v.label} ({`{{${v.id}}}`})</option>
        ))}
      </select>
'''
content = content.replace('      <div className="w-px bg-gray-300 mx-1"></div>\n\n      <input', dropdown_code + '\n      <div className="w-px bg-gray-300 mx-1"></div>\n\n      <input')

with open('src/Components/Mail/MailEditor.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
