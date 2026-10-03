import React, { useState, useEffect } from 'react';
import { 
    fetchFdsWeeklyTasks, 
    submitFdsWeeklyTask 
} from './fdsApi';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const FdsWeeklyChecklistPage = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [notesState, setNotesState] = useState({});

    const loadTasks = async () => {
        setLoading(true);
        try {
            const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
            const data = await fetchFdsWeeklyTasks(weekStartStr);
            setTasks(data);
            
            // Initialize notes state
            const initialNotes = {};
            data.forEach(t => {
                initialNotes[t.id] = t.coordinator_notes || '';
            });
            setNotesState(initialNotes);
        } catch (error) {
            toast.error("Failed to load tasks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTasks();
    }, [currentWeek]);

    const handleNotesChange = (taskId, val) => {
        setNotesState(prev => ({...prev, [taskId]: val}));
    };

    const handleSubmit = async (taskId) => {
        try {
            await submitFdsWeeklyTask(taskId, notesState[taskId]);
            toast.success("Task submitted for approval");
            loadTasks();
        } catch (e) {
            toast.error("Failed to submit");
        }
    };

    const approvedCount = tasks.filter(t => t.status === 'APPROVED').length;
    const progress = tasks.length ? Math.round((approvedCount / tasks.length) * 100) : 0;

    return (
        <div className="p-4 fds-theme">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">My Weekly Checklist</h1>
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="px-3 py-1 bg-gray-200 rounded">Prev Week</button>
                    <span className="font-semibold">{format(currentWeek, 'MMM dd, yyyy')}</span>
                    <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="px-3 py-1 bg-gray-200 rounded">Next Week</button>
                </div>
            </div>

            <div className="mb-6 bg-white p-4 rounded shadow">
                <div className="flex justify-between mb-2">
                    <span>Progress: {approvedCount} / {tasks.length} Approved</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {loading ? <p>Loading tasks...</p> : (
                <div className="grid gap-4">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
                            <div className="flex justify-between">
                                <h3 className="text-lg font-bold">{task.title}</h3>
                                <span className={`px-2 py-1 text-sm rounded ${
                                    task.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                    task.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                    task.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {task.status.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-gray-600 mt-1">{task.description}</p>
                            
                            {task.status === 'REJECTED' && (
                                <div className="mt-3 p-3 bg-red-50 text-red-800 rounded text-sm">
                                    <strong>Admin Remarks:</strong> {task.admin_remarks}
                                </div>
                            )}

                            <div className="mt-4">
                                <textarea
                                    value={notesState[task.id] || ''}
                                    onChange={(e) => handleNotesChange(task.id, e.target.value)}
                                    placeholder="Add notes, links (e.g., Instagram Reel link)..."
                                    className="w-full border rounded p-2 text-sm"
                                    disabled={task.status === 'APPROVED' || task.status === 'PENDING_APPROVAL'}
                                    rows={2}
                                />
                            </div>

                            {(task.status === 'PENDING' || task.status === 'REJECTED') && (
                                <button 
                                    onClick={() => handleSubmit(task.id)}
                                    className="mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm"
                                >
                                    Submit for Approval
                                </button>
                            )}
                        </div>
                    ))}
                    {tasks.length === 0 && <p className="text-gray-500 italic">No tasks assigned for this week.</p>}
                </div>
            )}
        </div>
    );
};

export default FdsWeeklyChecklistPage;
