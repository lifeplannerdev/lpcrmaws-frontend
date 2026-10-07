with open('src/Pages/MailCenter/StudentMailPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "import { ArrowLeft, RefreshCw, Send, Save, Trash, PenSquare, Mail } from 'lucide-react';",
    "import { ArrowLeft, RefreshCw, Send, Save, Trash, PenSquare, Mail, Paperclip, Download } from 'lucide-react';"
)

with open('src/Pages/MailCenter/StudentMailPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
