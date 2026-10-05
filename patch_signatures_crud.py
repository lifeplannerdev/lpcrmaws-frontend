with open('src/Pages/MailCenter/MailSignatures.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

delete_func = '''    const handleDelete = async () => {
        if (!currentSignature || !currentSignature.id) return;
        if (!window.confirm('Are you sure you want to delete this signature?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/mail/signatures/${currentSignature.id}/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            toast.success("Signature deleted");
            setOpenModal(false);
            fetchSignatures();
        } catch (error) {
            toast.error("Failed to delete signature");
        }
    };
'''

content = content.replace('    const handleSave = async', delete_func + '\n    const handleSave = async')

buttons_replacement = '''                        <div className="flex justify-between mt-4">
                            <div>
                                {currentSignature?.id && (
                                    <Button color="error" onClick={handleDelete}>Delete</Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                                <Button variant="contained" onClick={handleSave}>Save</Button>
                            </div>
                        </div>'''

content = content.replace('''                        <div className="flex justify-end gap-2 mt-4">
                            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                            <Button variant="contained" onClick={handleSave}>Save</Button>
                        </div>''', buttons_replacement)

with open('src/Pages/MailCenter/MailSignatures.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
