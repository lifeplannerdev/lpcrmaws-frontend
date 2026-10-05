with open('src/Pages/MailCenter/MailLogList.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_line = '''import { Table, TableBody, TableCell, TableHead, TableRow, TablePagination, Button, Chip } from '@mui/material';
import { RefreshCw, CloudDownload } from 'lucide-react';'''

content = content.replace("import { Table, TableBody, TableCell, TableHead, TableRow, TablePagination, Button, Chip } from '@mui/material';", import_line)


sync_methods = '''    const [isSyncing, setIsSyncing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            await axios.post(`${API_BASE_URL}/mail/messages/sync_all/`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
            toast.success('Background sync started. Click Refresh in a few moments.');
        } catch (error) {
            toast.error('Failed to start sync');
        }
        setIsSyncing(false);
    };
    
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchMessages();
        setIsRefreshing(false);
    };

    const fetchMessages = async () => {'''

content = content.replace('    const fetchMessages = async () => {', sync_methods)


header_code = '''    return (
        <div className='bg-white rounded shadow overflow-hidden'>
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-700">Email Logs</h3>
                <div className="flex gap-2">
                    <Button 
                        size="small" 
                        variant="outlined" 
                        color="secondary"
                        onClick={handleSyncAll}
                        disabled={isSyncing}
                        startIcon={<CloudDownload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />}
                    >
                        {isSyncing ? 'Starting Sync...' : 'Sync All Gmail Accounts'}
                    </Button>
                    <Button 
                        size="small" 
                        variant="contained" 
                        color="primary"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        startIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                </div>
            </div>
            <Table>'''

content = content.replace('''    return (
        <div className='bg-white rounded shadow overflow-hidden'>
            <Table>''', header_code)

with open('src/Pages/MailCenter/MailLogList.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
