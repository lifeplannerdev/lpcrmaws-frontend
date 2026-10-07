with open('src/Pages/MailCenter/StudentMailPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_line = "import { Paperclip, Download } from 'lucide-react';"
if 'Paperclip' not in content:
    content = content.replace("import { Mail, RefreshCw } from 'lucide-react';", "import { Mail, RefreshCw, Paperclip, Download } from 'lucide-react';")

attachment_ui = '''                                <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: selectedMessage.body_html }} />
                                
                                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-gray-100">
                                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                                            <Paperclip size={16} /> Attachments
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedMessage.attachments.map(att => (
                                                <a 
                                                    key={att.id}
                                                    href={`${API_BASE_URL}/mail/attachments/${att.id}/download/?token=${accessToken}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer group text-sm"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-800 group-hover:text-indigo-700 truncate max-w-[200px]">
                                                            {att.filename || att.document_name || 'Attachment'}
                                                        </span>
                                                        {att.size > 0 && (
                                                            <span className="text-xs text-gray-500">
                                                                {(att.size / 1024).toFixed(1)} KB
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Download size={14} className="text-gray-400 group-hover:text-indigo-600 ml-1" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}'''

content = content.replace('                                <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: selectedMessage.body_html }} />', attachment_ui)

with open('src/Pages/MailCenter/StudentMailPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
