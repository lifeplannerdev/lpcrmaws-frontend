import React, { useState, useEffect } from 'react';
import { 
    fetchFdsWeeklyTasks, 
    approveFdsWeeklyTask, 
    rejectFdsWeeklyTask 
} from './fdsApi';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { toast } from 'react-hot-toast';

const FdsTaskManagementPage = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [rejectRemarks, setRejectRemarks] = useState({});

    const loadTasks = async () => {
        setLoading(true);
        try {
            const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
            // Admins fetch tasks for all users for this week
            const data = await fetchFdsWeeklyTasks(weekStartStr);
            setTasks(data);
        } catch (error) {
            toast.error("Failed to load tasks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTasks();
    }, [currentWeek]);

    const handleApprove = async (taskId) => {
        try {
            await approveFdsWeeklyTask(taskId);
            toast.success("Task approved");
            loadTasks();
        } catch (e) {
            toast.error("Failed to approve");
        }
    };

    const handleReject = async (taskId) => {
        if (!rejectRemarks[taskId]) {
            toast.error("Remarks required for rejection");
            return;
        }
        try {
            await rejectFdsWeeklyTask(taskId, rejectRemarks[taskId]);
            toast.success("Task rejected");
            loadTasks();
        } catch (e) {
            toast.error("Failed to reject");
        }
    };

    const pendingApprovalTasks = tasks.filter(t => t.status === 'PENDING_APPROVAL');

    return (
        <div className="p-4 fds-theme">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">FDS Task Approvals</h1>
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="px-3 py-1 bg-gray-200 rounded">Prev Week</button>
                    <span className="font-semibold">{format(currentWeek, 'MMM dd, yyyy')}</span>
                    <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="px-3 py-1 bg-gray-200 rounded">Next Week</button>
                </div>
            </div>

            <h2 className="text-xl mb-4 font-semibold">Needs Approval ({pendingApprovalTasks.length})</h2>
            
            {loading ? <p>Loading...</p> : (
                <div className="grid gap-4">
                    {pendingApprovalTasks.map(task => (
                        <div key={task.id} className="bg-white p-4 rounded shadow border-l-4 border-yellow-500">
                            <div className="flex justify-between">
                                <div>
                                    <h3 className="text-lg font-bold">{task.title}</h3>
                                    <p className="text-sm text-gray-500">Assignee: {task.assignee_name}</p>
                                </div>
                            </div>
                            <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                                <strong>Coordinator Notes:</strong> 
                                <p className="mt-1 whitespace-pre-wrap">{task.coordinator_notes || 'No notes provided.'}</p>
                            </div>

                            <div className="mt-4 flex flex-col gap-2">
                                <textarea 
                                    placeholder="Remarks (if rejecting)..."
                                    className="border rounded p-2 text-sm w-full"
                                    value={rejectRemarks[task.id] || ''}
                                    onChange={e => setRejectRemarks({...rejectRemarks, [task.id]: e.target.value})}
                                    rows={2}
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleApprove(task.id)}
                                        className="bg-green-600 text-white px-4 py-2 rounded text-sm flex-1"
                                    >
                                        Approve
                                    </button>
                                    <button 
                                        onClick={() => handleReject(task.id)}
                                        className="bg-red-600 text-white px-4 py-2 rounded text-sm flex-1"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {pendingApprovalTasks.length === 0 && <p className="text-gray-500 italic">No tasks pending approval for this week.</p>}
                </div>
            )}
        </div>
    );
};

export default FdsTaskManagementPage;
