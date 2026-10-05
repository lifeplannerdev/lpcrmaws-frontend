with open('src/Pages/MailCenter/StudentMailPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

badge_code = '''                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    msg.state === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                    msg.direction === 'in' ? 'bg-indigo-100 text-indigo-800' :
                                    msg.state === 'sent' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {msg.state === 'draft' ? 'DRAFT' : msg.direction === 'in' ? 'INBOX' : 'SENT'}
                                </span>
                                <span className="text-xs text-gray-500">{new Date(msg.effective_time).toLocaleString()}</span>'''

content = content.replace('''                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    msg.state === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                    msg.state === 'sent' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {msg.state.toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-500">{new Date(msg.effective_time).toLocaleDateString()}</span>''', badge_code)

with open('src/Pages/MailCenter/StudentMailPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
