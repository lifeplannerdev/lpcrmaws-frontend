with open('src/Pages/MailCenter/MailLogList.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
    
# We need to import toast
if 'import toast from' not in content:
    content = content.replace('import { Table', 'import toast from \'react-hot-toast\';\nimport { Table')

delete_func = '''    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this email log? If this is a Draft, it will also be deleted from Gmail.')) return;
        try {
            await axios.delete(`${API_BASE_URL}/mail/messages/${id}/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            toast.success("Message deleted");
            fetchMessages();
        } catch (error) {
            toast.error("Failed to delete message");
        }
    };
'''

content = content.replace('    const fetchMessages = async', delete_func + '\n    const fetchMessages = async')

action_replacement = '''                            <TableCell>
                                <div className="flex gap-2">
                                    <Button size='small' variant='outlined' onClick={() => navigate(`/processing-students/${msg.student}/mail`)}>
                                        View Thread
                                    </Button>
                                    <Button size='small' variant='outlined' color='error' onClick={() => handleDelete(msg.id)}>
                                        Delete
                                    </Button>
                                </div>
                            </TableCell>'''

content = content.replace('''                            <TableCell>
                                <Button size='small' variant='outlined' onClick={() => navigate(`/processing-students/${msg.student}/mail`)}>
                                    View Thread
                                </Button>
                            </TableCell>''', action_replacement)

with open('src/Pages/MailCenter/MailLogList.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
