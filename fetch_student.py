
import re

with open('src/Pages/MailCenter/StudentMailPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace studentData state
content = content.replace('// const [studentData, setStudentData] = useState(null); // Unused', 'const [studentEmail, setStudentEmail] = useState('''');')

# Add axios.get for student
replacement = '''            try {
                const studentRes = await axios.get(\/processing-students/\/, { headers: { Authorization: \Bearer \\ } });
                setStudentEmail(studentRes.data.email || studentRes.data.email_address || '');
            } catch (err) {
                console.error('Failed to load student data', err);
            }
            
            const msgRes ='''
content = content.replace('            // In a real app we\\'d load the student data as well\\n            const msgRes =', replacement)

# Replace handleCreateDraft
replacement2 = '''    const handleCreateDraft = () => {
        setSelectedMessage(null);
        setIsDraft(true);
        setDraft({
            account: accounts.length > 0 ? accounts[0].id : '',
            to: studentEmail ? [studentEmail] : [''],
            subject: '',
            body_html: '',
            cc: [],
            bcc: []
        });
    };'''
content = re.sub(r'    const handleCreateDraft = \(\) => \{.*?\};', replacement2, content, flags=re.DOTALL)

with open('src/Pages/MailCenter/StudentMailPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

