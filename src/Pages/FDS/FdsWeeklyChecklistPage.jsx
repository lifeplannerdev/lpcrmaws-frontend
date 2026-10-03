import React, { useState, useEffect } from 'react';
import { 
    fetchFdsWeeklyTasks, 
    submitFdsWeeklyTask 
} from './fdsApi';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const FdsWeeklyChecklistPage = () => {
    const { user, authFetch } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [notesState, setNotesState] = useState({});

    const loadTasks = async () => {
        setLoading(true);
        try {
            const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
            const data = await fetchFdsWeeklyTasks(authFetch, weekStartStr);
            // Handle DRF pagination object if it exists
            const tasksArray = data.results || data;
            setTasks(tasksArray);
            
            // Initialize notes state
            const initialNotes = {};
            tasksArray.forEach(t => {
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
            await submitFdsWeeklyTask(authFetch, taskId, notesState[taskId]);
            toast.success("Task submitted for approval");
            loadTasks();
        } catch (e) {
            toast.error("Failed to submit");
        }
    };

    const approvedCount = tasks.filter(t => t.status === 'APPROVED').length;
    const progress = tasks.length ? Math.round((approvedCount / tasks.length) * 100) : 0;
    
    // Week end date is 6 days after start date
    const weekEndDate = new Date(currentWeek);
    weekEndDate.setDate(currentWeek.getDate() + 6);

    return (
        <div className="p-4 fds-theme-global min-h-screen bg-[#1A1A1A] text-[#F5E6CC]">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4 border-b border-[#3A2C1E] pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#C9A96E]">My Weekly Checklist</h1>
                    <p className="text-[#8B7355] mt-1">Submit your weekly recurring tasks</p>
                </div>
                <div className="flex items-center gap-3 bg-[#251A14] border border-[#3A2C1E] p-1.5 rounded-lg w-fit">
                    <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#3A2C1E] rounded text-sm transition-colors">Prev</button>
                    <span className="font-semibold text-sm text-[#C9A96E] px-2">
                        {format(currentWeek, 'MMM dd')} - {format(weekEndDate, 'MMM dd, yyyy')}
                    </span>
                    <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#3A2C1E] rounded text-sm transition-colors">Next</button>
                </div>
            </div>

            <div className="mb-6 bg-[#251A14] border border-[#3A2C1E] p-4 rounded-xl shadow-lg">
                <div className="flex justify-between mb-2 font-bold text-white">
                    <span>Progress: {approvedCount} / {tasks.length} Approved</span>
                    <span className="text-[#C9A96E]">{progress}%</span>
                </div>
                <div className="w-full bg-[#1A1A1A] rounded-full h-3 border border-[#3A2C1E]">
                    <div className="bg-[#C9A96E] h-full rounded-full transition-all duration-500 relative" style={{ width: `${progress}%` }}>
                        <div className="absolute inset-0 bg-white/20 rounded-full"></div>
                    </div>
                </div>
            </div>

            {loading ? <p className="text-[#8B7355]">Loading tasks...</p> : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-[#251A14] border border-[#3A2C1E] hover:border-[#C9A96E]/50 transition-colors p-5 rounded-xl shadow-lg flex flex-col h-full">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-white pr-2">{task.title}</h3>
                                <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded whitespace-nowrap ${
                                    task.status === 'APPROVED' ? 'bg-green-900/40 text-green-400 border border-green-800' :
                                    task.status === 'REJECTED' ? 'bg-red-900/40 text-red-400 border border-red-800' :
                                    task.status === 'PENDING_APPROVAL' ? 'bg-yellow-900/40 text-yellow-500 border border-yellow-800' :
                                    'bg-[#1A1A1A] text-[#8B7355] border border-[#3A2C1E]'
                                }`}>
                                    {task.status.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-[#8B7355] text-sm mb-4 flex-1">{task.description}</p>
                            
                            {task.status === 'REJECTED' && (
                                <div className="mb-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-sm text-red-200">
                                    <strong className="text-red-400">Admin Remarks:</strong> 
                                    <p className="mt-1">{task.admin_remarks}</p>
                                </div>
                            )}

                            <div className="mt-auto">
                                <textarea
                                    value={notesState[task.id] || ''}
                                    onChange={(e) => handleNotesChange(task.id, e.target.value)}
                                    placeholder="Add notes, links (e.g., Instagram Reel link)..."
                                    className="w-full bg-[#1A1A1A] border border-[#3A2C1E] focus:border-[#C9A96E] rounded-lg p-3 text-sm outline-none placeholder-[#5C4D3C] text-[#F5E6CC] transition-colors resize-none"
                                    disabled={task.status === 'APPROVED' || task.status === 'PENDING_APPROVAL'}
                                    rows={2}
                                />
                            </div>

                            {(task.status === 'PENDING' || task.status === 'REJECTED') && (
                                <button 
                                    onClick={() => handleSubmit(task.id)}
                                    className="mt-4 w-full bg-[#C9A96E] hover:bg-[#B89B72] text-[#1A1A1A] font-bold px-4 py-2.5 rounded-lg text-sm transition-colors"
                                >
                                    Submit for Approval
                                </button>
                            )}
                        </div>
                    ))}
                    {tasks.length === 0 && (
                        <div className="col-span-full bg-[#251A14] border border-[#3A2C1E] p-8 rounded-xl text-center">
                            <p className="text-[#8B7355] text-lg">No tasks assigned for this week. Enjoy!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FdsWeeklyChecklistPage;
