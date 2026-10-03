import React, { useState, useEffect } from 'react';
import { 
    fetchFdsWeeklyTasks, 
    approveFdsWeeklyTask, 
    rejectFdsWeeklyTask,
    fetchFdsTaskTemplates,
    createFdsTaskTemplate,
    deleteFdsTaskTemplate
} from './fdsApi';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const FdsTaskManagementPage = () => {
    const { authFetch } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [rejectRemarks, setRejectRemarks] = useState({});
    
    // For new template
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [newTemplateDesc, setNewTemplateDesc] = useState('');
    const [newTemplateAssignee, setNewTemplateAssignee] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
            // Admins fetch tasks for all users for this week
            const tasksData = await fetchFdsWeeklyTasks(authFetch, weekStartStr);
            const templatesData = await fetchFdsTaskTemplates(authFetch);
            
            setTasks(tasksData.results || tasksData);
            setTemplates(templatesData.results || templatesData);
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentWeek]);

    const handleApprove = async (taskId) => {
        try {
            await approveFdsWeeklyTask(authFetch, taskId);
            toast.success("Task approved");
            loadData();
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
            await rejectFdsWeeklyTask(authFetch, taskId, rejectRemarks[taskId]);
            toast.success("Task rejected");
            loadData();
        } catch (e) {
            toast.error("Failed to reject");
        }
    };

    const handleCreateTemplate = async (e) => {
        e.preventDefault();
        if (!newTemplateAssignee || !newTemplateTitle) {
            toast.error("Assignee ID and Title are required");
            return;
        }
        try {
            await createFdsTaskTemplate(authFetch, {
                title: newTemplateTitle,
                description: newTemplateDesc,
                assignee: newTemplateAssignee
            });
            toast.success("Recurring task created!");
            setNewTemplateTitle('');
            setNewTemplateDesc('');
            loadData();
        } catch (e) {
            toast.error("Failed to create task template");
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm("Delete this recurring task? It won't generate in future weeks.")) return;
        try {
            await deleteFdsTaskTemplate(authFetch, id);
            toast.success("Recurring task deleted");
            loadData();
        } catch (e) {
            toast.error("Failed to delete");
        }
    };

    const pendingApprovalTasks = tasks.filter(t => t.status === 'PENDING_APPROVAL');

    const weekEndDate = new Date(currentWeek);
    weekEndDate.setDate(currentWeek.getDate() + 6);

    return (
        <div className="p-4 fds-theme grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN: APPROVALS */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">FDS Approvals</h1>
                </div>
                
                <div className="flex items-center gap-4 mb-4 bg-white p-2 rounded shadow inline-flex">
                    <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="px-3 py-1 bg-gray-200 rounded text-sm">Prev</button>
                    <span className="font-semibold text-sm">
                        {format(currentWeek, 'MMM dd')} - {format(weekEndDate, 'MMM dd')}
                    </span>
                    <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="px-3 py-1 bg-gray-200 rounded text-sm">Next</button>
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
                        {pendingApprovalTasks.length === 0 && <p className="text-gray-500 italic bg-white p-4 rounded shadow">No tasks pending approval for this week.</p>}
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: MANAGE RECURRING TASKS */}
            <div>
                <h1 className="text-2xl font-bold mb-6">Manage Recurring Tasks</h1>
                
                <div className="bg-white p-4 rounded shadow mb-6">
                    <h2 className="text-lg font-bold mb-3">Assign New Task</h2>
                    <form onSubmit={handleCreateTemplate} className="flex flex-col gap-3">
                        <input 
                            type="text"
                            placeholder="Assignee User ID (e.g. 5)"
                            className="border p-2 rounded"
                            value={newTemplateAssignee}
                            onChange={e => setNewTemplateAssignee(e.target.value)}
                        />
                        <input 
                            type="text"
                            placeholder="Task Title (e.g. 3 Reels per week)"
                            className="border p-2 rounded"
                            value={newTemplateTitle}
                            onChange={e => setNewTemplateTitle(e.target.value)}
                        />
                        <textarea 
                            placeholder="Task Description"
                            className="border p-2 rounded"
                            value={newTemplateDesc}
                            onChange={e => setNewTemplateDesc(e.target.value)}
                        />
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                            Create Recurring Task
                        </button>
                    </form>
                </div>

                <div className="bg-white p-4 rounded shadow">
                    <h2 className="text-lg font-bold mb-3">Active Recurring Tasks ({templates.length})</h2>
                    {loading ? <p>Loading...</p> : (
                        <div className="grid gap-3">
                            {templates.map(tpl => (
                                <div key={tpl.id} className="border p-3 rounded flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">{tpl.title}</p>
                                        <p className="text-sm text-gray-600">Assignee: {tpl.assignee_name}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteTemplate(tpl.id)}
                                        className="text-red-500 hover:text-red-700 text-sm font-semibold"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            {templates.length === 0 && <p className="text-gray-500 text-sm">No recurring tasks found.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FdsTaskManagementPage;
