import React, { useState, useEffect } from 'react';
import { 
    fetchFdsWeeklyTasks, 
    approveFdsWeeklyTask, 
    rejectFdsWeeklyTask,
    fetchFdsTaskTemplates,
    createFdsTaskTemplate,
    deleteFdsTaskTemplate,
    fetchFdsTrainers
} from './fdsApi';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../context/ApiContext';
import { Users, BookOpen, UserCheck, Plus, X, Check, XCircle } from 'lucide-react';

const FdsTaskManagementPage = () => {
    const { user } = useAuth();
    const { authFetch } = useApi();
    const [trainers, setTrainers] = useState([]);
    const [globalTemplates, setGlobalTemplates] = useState([]);
    
    const [selectedTrainer, setSelectedTrainer] = useState(null);
    const [coordinatorTasks, setCoordinatorTasks] = useState([]);
    const [coordinatorTemplates, setCoordinatorTemplates] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [rejectRemarks, setRejectRemarks] = useState({});
    
    const [showLibraryForm, setShowLibraryForm] = useState(false);
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [newTemplateDesc, setNewTemplateDesc] = useState('');
    
    const [activeTab, setActiveTab] = useState('approvals'); // approvals | assigned

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const trainersRes = await fetchFdsTrainers(authFetch);
            if (!trainersRes.ok) throw new Error();
            const trainersData = await trainersRes.json();
            setTrainers(trainersData);
            
            const allTemplatesRes = await fetchFdsTaskTemplates(authFetch);
            if (!allTemplatesRes.ok) throw new Error();
            const allTemplates = await allTemplatesRes.json();
            const templatesArray = allTemplates.results || allTemplates;
            setGlobalTemplates(templatesArray.filter(t => !t.assignee));
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadCoordinatorData = async (trainer) => {
        if (!trainer) return;
        setLoading(true);
        try {
            const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
            const tasksRes = await fetchFdsWeeklyTasks(authFetch, weekStartStr, trainer.id);
            if (!tasksRes.ok) throw new Error();
            const tasksData = await tasksRes.json();
            
            const allTemplatesRes = await fetchFdsTaskTemplates(authFetch);
            if (!allTemplatesRes.ok) throw new Error();
            const allTemplates = await allTemplatesRes.json();
            
            setCoordinatorTasks(tasksData.results || tasksData);
            const templatesArray = allTemplates.results || allTemplates;
            setCoordinatorTemplates(templatesArray.filter(t => t.assignee === trainer.id));
        } catch (error) {
            toast.error("Failed to load coordinator data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedTrainer) {
            loadCoordinatorData(selectedTrainer);
        }
    }, [selectedTrainer, currentWeek]);

    const handleCreateGlobalTemplate = async (e) => {
        e.preventDefault();
        if (!newTemplateTitle) return;
        try {
            const res = await createFdsTaskTemplate(authFetch, {
                title: newTemplateTitle,
                description: newTemplateDesc,
                assignee: null // Global
            });
            if (!res.ok) throw new Error();
            toast.success("Global task added to library!");
            setNewTemplateTitle('');
            setNewTemplateDesc('');
            setShowLibraryForm(false);
            loadInitialData();
        } catch (e) {
            toast.error("Failed to add task to library");
        }
    };

    const handleAssignToCoordinator = async (template) => {
        try {
            const res = await createFdsTaskTemplate(authFetch, {
                title: template.title,
                description: template.description,
                assignee: selectedTrainer.id
            });
            if (!res.ok) throw new Error();
            toast.success("Task assigned to coordinator!");
            loadCoordinatorData(selectedTrainer);
        } catch (e) {
            toast.error("Failed to assign task");
        }
    };

    const handleTakeBackTemplate = async (id) => {
        if (!window.confirm("Remove this recurring task from this coordinator?")) return;
        try {
            const res = await deleteFdsTaskTemplate(authFetch, id);
            if (!res.ok) throw new Error();
            toast.success("Task taken back");
            loadCoordinatorData(selectedTrainer);
        } catch (e) {
            toast.error("Failed to remove task");
        }
    };

    const handleDeleteGlobalTemplate = async (id) => {
        if (!window.confirm("Delete this task from the global library?")) return;
        try {
            const res = await deleteFdsTaskTemplate(authFetch, id);
            if (!res.ok) throw new Error();
            toast.success("Global task deleted");
            loadInitialData();
        } catch (e) {
            toast.error("Failed to delete task");
        }
    };

    const handleApprove = async (taskId) => {
        try {
            const res = await approveFdsWeeklyTask(authFetch, taskId);
            if (!res.ok) throw new Error();
            toast.success("Task approved");
            loadCoordinatorData(selectedTrainer);
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
            const res = await rejectFdsWeeklyTask(authFetch, taskId, rejectRemarks[taskId]);
            if (!res.ok) throw new Error();
            toast.success("Task rejected");
            loadCoordinatorData(selectedTrainer);
        } catch (e) {
            toast.error("Failed to reject");
        }
    };

    const weekEndDate = new Date(currentWeek);
    weekEndDate.setDate(currentWeek.getDate() + 6);

    return (
        <div className="p-4 fds-theme-global min-h-screen bg-[#1A1A1A] text-[#F5E6CC]">
            <div className="mb-6 border-b border-[#3A2C1E] pb-4">
                <h1 className="text-3xl font-bold text-[#C9A96E]">Task Management Center</h1>
                <p className="text-[#8B7355] mt-1">Manage global task library and coordinate assignments</p>
            </div>

            {!selectedTrainer ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coordinators List */}
                    <div className="lg:col-span-2">
                        <h2 className="text-xl font-bold text-[#C9A96E] mb-4 flex items-center gap-2">
                            <Users size={20} /> Select Coordinator
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {trainers.map(t => (
                                <div 
                                    key={t.id} 
                                    onClick={() => setSelectedTrainer(t)}
                                    className="bg-[#251A14] border border-[#3A2C1E] p-4 rounded-xl cursor-pointer hover:border-[#C9A96E] transition-all group"
                                >
                                    <h3 className="text-lg font-bold text-white group-hover:text-[#C9A96E] transition-colors">{t.name || t.username}</h3>
                                    <p className="text-sm text-[#8B7355] mt-1 capitalize">{t.branch?.toLowerCase()} Branch</p>
                                    <div className="mt-3 flex gap-2">
                                        <span className="text-xs bg-[#3A2C1E] text-[#C9A96E] px-2 py-1 rounded">Manage Tasks &rarr;</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Global Task Library */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-[#C9A96E] flex items-center gap-2">
                                <BookOpen size={20} /> Task Library
                            </h2>
                            <button 
                                onClick={() => setShowLibraryForm(!showLibraryForm)}
                                className="bg-[#C9A96E] text-[#1A1A1A] px-2 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-yellow-600"
                            >
                                {showLibraryForm ? <X size={16} /> : <Plus size={16} />}
                            </button>
                        </div>

                        {showLibraryForm && (
                            <form onSubmit={handleCreateGlobalTemplate} className="bg-[#251A14] border border-[#C9A96E] p-4 rounded-xl mb-4 flex flex-col gap-3">
                                <input 
                                    type="text"
                                    placeholder="Task Title (e.g. 3 Reels per week)"
                                    className="bg-[#1A1A1A] border border-[#3A2C1E] p-2 rounded text-[#F5E6CC] placeholder-[#8B7355]"
                                    value={newTemplateTitle}
                                    onChange={e => setNewTemplateTitle(e.target.value)}
                                />
                                <textarea 
                                    placeholder="Task Description"
                                    className="bg-[#1A1A1A] border border-[#3A2C1E] p-2 rounded text-[#F5E6CC] placeholder-[#8B7355]"
                                    value={newTemplateDesc}
                                    onChange={e => setNewTemplateDesc(e.target.value)}
                                />
                                <button type="submit" className="bg-[#C9A96E] text-[#1A1A1A] px-4 py-2 rounded font-bold">
                                    Add to Library
                                </button>
                            </form>
                        )}

                        <div className="grid gap-3">
                            {globalTemplates.map(tpl => (
                                <div key={tpl.id} className="bg-[#251A14] border border-[#3A2C1E] p-3 rounded-xl flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-white">{tpl.title}</h4>
                                        <p className="text-xs text-[#8B7355] mt-1 line-clamp-2">{tpl.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteGlobalTemplate(tpl.id)}
                                        className="text-red-400 hover:text-red-300 ml-2"
                                        title="Delete from Library"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                </div>
                            ))}
                            {globalTemplates.length === 0 && <p className="text-[#8B7355] italic text-sm">Library is empty.</p>}
                        </div>
                    </div>
                </div>
            ) : (
                /* SELECTED COORDINATOR VIEW */
                <div>
                    <button 
                        onClick={() => setSelectedTrainer(null)}
                        className="text-[#C9A96E] hover:text-white mb-4 font-bold flex items-center gap-1"
                    >
                        &larr; Back to Coordinators
                    </button>
                    
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{selectedTrainer.name || selectedTrainer.username}</h2>
                            <p className="text-[#8B7355] capitalize">{selectedTrainer.branch?.toLowerCase()} Branch</p>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-[#251A14] border border-[#3A2C1E] p-1.5 rounded-lg">
                            <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#3A2C1E] rounded text-sm transition-colors">Prev</button>
                            <span className="font-semibold text-sm text-[#C9A96E] px-2">
                                {format(currentWeek, 'MMM dd')} - {format(weekEndDate, 'MMM dd')}
                            </span>
                            <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#3A2C1E] rounded text-sm transition-colors">Next</button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-[#3A2C1E] mb-6">
                        <button 
                            className={`pb-2 px-2 font-bold transition-colors ${activeTab === 'approvals' ? 'text-[#C9A96E] border-b-2 border-[#C9A96E]' : 'text-[#8B7355] hover:text-white'}`}
                            onClick={() => setActiveTab('approvals')}
                        >
                            Weekly Approvals
                        </button>
                        <button 
                            className={`pb-2 px-2 font-bold transition-colors ${activeTab === 'assigned' ? 'text-[#C9A96E] border-b-2 border-[#C9A96E]' : 'text-[#8B7355] hover:text-white'}`}
                            onClick={() => setActiveTab('assigned')}
                        >
                            Assigned Recurring Tasks
                        </button>
                    </div>

                    {loading ? <p className="text-[#8B7355]">Loading...</p> : activeTab === 'approvals' ? (
                        <div className="grid gap-4">
                            {coordinatorTasks.filter(t => t.status === 'PENDING_APPROVAL').length > 0 ? (
                                coordinatorTasks.filter(t => t.status === 'PENDING_APPROVAL').map(task => (
                                    <div key={task.id} className="bg-[#251A14] border border-[#C9A96E] p-4 rounded-xl shadow-lg">
                                        <div className="flex justify-between mb-2">
                                            <h3 className="text-lg font-bold text-white">{task.title}</h3>
                                            <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Pending Review</span>
                                        </div>
                                        <div className="mt-3 p-3 bg-[#1A1A1A] border border-[#3A2C1E] rounded-lg text-sm">
                                            <strong className="text-[#8B7355]">Coordinator Notes:</strong> 
                                            <p className="mt-1 whitespace-pre-wrap">{task.coordinator_notes || 'No notes provided.'}</p>
                                        </div>

                                        <div className="mt-4 flex flex-col gap-3">
                                            <textarea 
                                                placeholder="Remarks (required if rejecting)..."
                                                className="bg-[#1A1A1A] border border-[#3A2C1E] p-2 rounded text-[#F5E6CC] placeholder-[#8B7355] text-sm w-full focus:border-[#C9A96E] outline-none"
                                                value={rejectRemarks[task.id] || ''}
                                                onChange={e => setRejectRemarks({...rejectRemarks, [task.id]: e.target.value})}
                                                rows={2}
                                            />
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => handleApprove(task.id)}
                                                    className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/50 px-4 py-2 rounded font-bold flex-1 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Check size={18} /> Approve
                                                </button>
                                                <button 
                                                    onClick={() => handleReject(task.id)}
                                                    className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/50 px-4 py-2 rounded font-bold flex-1 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <X size={18} /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[#8B7355] italic bg-[#251A14] p-4 rounded-xl border border-[#3A2C1E]">No tasks pending approval for this week.</p>
                            )}
                            
                            <h3 className="text-lg font-bold text-[#C9A96E] mt-6 border-b border-[#3A2C1E] pb-2">Other Statuses</h3>
                            {coordinatorTasks.filter(t => t.status !== 'PENDING_APPROVAL').map(task => (
                                <div key={task.id} className="bg-[#1A1A1A] border border-[#3A2C1E] p-3 rounded-xl flex justify-between items-center opacity-70">
                                    <h4 className="font-bold text-white">{task.title}</h4>
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                                        task.status === 'APPROVED' ? 'bg-green-900/40 text-green-500' :
                                        task.status === 'REJECTED' ? 'bg-red-900/40 text-red-500' :
                                        'bg-gray-800 text-gray-400'
                                    }`}>
                                        {task.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Assigned Templates */}
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4">Currently Assigned</h3>
                                <div className="grid gap-3">
                                    {coordinatorTemplates.map(tpl => (
                                        <div key={tpl.id} className="bg-[#251A14] border border-[#C9A96E]/50 p-4 rounded-xl">
                                            <h4 className="font-bold text-[#C9A96E]">{tpl.title}</h4>
                                            <p className="text-sm text-[#8B7355] mt-1">{tpl.description}</p>
                                            <button 
                                                onClick={() => handleTakeBackTemplate(tpl.id)}
                                                className="mt-3 text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1"
                                            >
                                                <XCircle size={14} /> Take Back
                                            </button>
                                        </div>
                                    ))}
                                    {coordinatorTemplates.length === 0 && <p className="text-[#8B7355] italic">No recurring tasks assigned.</p>}
                                </div>
                            </div>
                            
                            {/* Available Library */}
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4">Assign from Library</h3>
                                <div className="grid gap-3">
                                    {globalTemplates.filter(gt => !coordinatorTemplates.find(ct => ct.title === gt.title)).map(tpl => (
                                        <div key={tpl.id} className="bg-[#1A1A1A] border border-[#3A2C1E] p-4 rounded-xl group hover:border-[#8B7355] transition-colors">
                                            <h4 className="font-bold text-white">{tpl.title}</h4>
                                            <p className="text-sm text-[#8B7355] mt-1 line-clamp-2">{tpl.description}</p>
                                            <button 
                                                onClick={() => handleAssignToCoordinator(tpl)}
                                                className="mt-3 bg-[#3A2C1E] hover:bg-[#C9A96E] hover:text-[#1A1A1A] text-[#C9A96E] px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1"
                                            >
                                                <Plus size={14} /> Assign to Coordinator
                                            </button>
                                        </div>
                                    ))}
                                    {globalTemplates.filter(gt => !coordinatorTemplates.find(ct => ct.title === gt.title)).length === 0 && (
                                        <p className="text-[#8B7355] italic">All library tasks are already assigned to this coordinator.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FdsTaskManagementPage;
