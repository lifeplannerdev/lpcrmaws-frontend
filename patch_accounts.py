with open('src/Pages/MailCenter/MailAccounts.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

delete_func = '''    const handleDeleteAccount = async (id) => {
        if (!window.confirm('Are you sure you want to disconnect this account?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/mail/accounts/${id}/`, { headers: { Authorization: `Bearer ${accessToken}` } });
            toast.success('Account disconnected');
            fetchAccounts();
        } catch (error) {
            toast.error('Failed to disconnect account');
        }
    };
'''

content = content.replace('    const handleConnectGmail', delete_func + '\n    const handleConnectGmail')

button_replacement = '''                        <div className="flex gap-2">
                            {acc.status !== 'connected' && (
                                <Button variant="outlined" color="warning" onClick={handleConnectGmail}>
                                    Reconnect
                                </Button>
                            )}
                            <Button variant="outlined" color="error" onClick={() => handleDeleteAccount(acc.id)}>
                                Disconnect
                            </Button>
                        </div>'''

content = content.replace('''                        <div>
                            {acc.status !== 'connected' && (
                                <Button variant="outlined" color="warning" onClick={handleConnectGmail}>
                                    Reconnect
                                </Button>
                            )}
                        </div>''', button_replacement)

with open('src/Pages/MailCenter/MailAccounts.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
