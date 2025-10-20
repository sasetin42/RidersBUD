import React, { useState, useMemo } from 'react';
import Header from '../../components/Header';
import { useDatabase } from '../../context/DatabaseContext';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import Spinner from '../../components/Spinner';
import { Task, TaskPriority } from '../../types';

const TaskFormModal: React.FC<{
    task?: Task;
    onClose: () => void;
    onSave: (task: Omit<Task, 'id' | 'mechanicId' | 'isComplete'>, id?: string) => void;
}> = ({ task, onClose, onSave }) => {
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [dueDate, setDueDate] = useState(task?.dueDate || new Date().toISOString().split('T')[0]);
    const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'Medium');
    const [error, setError] = useState('');

    const handleSave = () => {
        if (!title.trim() || !dueDate) {
            setError('Title and Due Date are required.');
            return;
        }
        onSave({ title, description, dueDate, priority }, task?.id);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm animate-scaleUp">
                <h2 className="text-xl font-bold mb-4">{task ? 'Edit Task' : 'New Task'}</h2>
                <div className="space-y-4">
                    <input type="text" placeholder="Task Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-field rounded-md" />
                    <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-3 bg-field rounded-md" />
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-3 bg-field rounded-md" />
                    <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full p-3 bg-field rounded-md">
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                    </select>
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                </div>
                <div className="mt-6 flex gap-4">
                    <button onClick={onClose} className="w-1/2 bg-field font-bold py-3 rounded-lg hover:bg-gray-700">Cancel</button>
                    <button onClick={handleSave} className="w-1/2 bg-primary font-bold py-3 rounded-lg hover:bg-orange-600">Save</button>
                </div>
            </div>
        </div>
    );
};

const MechanicTasksScreen: React.FC = () => {
    const { mechanic } = useMechanicAuth();
    const { db, loading, addTask, updateTask, deleteMultipleTasks, updateMultipleTasksStatus } = useDatabase();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [statusFilter, setStatusFilter] = useState<'all' | 'incomplete' | 'complete'>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
    const [sortBy, setSortBy] = useState<'dueDate' | 'priority'>('dueDate');

    const myTasks = useMemo(() => {
        if (!db || !mechanic) return [];
        return db.tasks?.filter(t => t.mechanicId === mechanic.id) || [];
    }, [db, mechanic]);

    const filteredAndSortedTasks = useMemo(() => {
        let filtered = myTasks;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => t.isComplete === (statusFilter === 'complete'));
        }
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(t => t.priority === priorityFilter);
        }

        const priorityOrder: Record<TaskPriority, number> = { High: 1, Medium: 2, Low: 3 };
        return filtered.sort((a, b) => {
            if (sortBy === 'priority') {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
    }, [myTasks, statusFilter, priorityFilter, sortBy]);

    const handleSaveTask = async (taskData: Omit<Task, 'id' | 'mechanicId' | 'isComplete'>, id?: string) => {
        if (id) {
            const taskToUpdate = myTasks.find(t => t.id === id);
            if(taskToUpdate) await updateTask({ ...taskToUpdate, ...taskData });
        } else {
            if(mechanic) await addTask({ ...taskData, mechanicId: mechanic.id, isComplete: false });
        }
        setIsModalOpen(false);
        setEditingTask(undefined);
    };

    const handleToggleComplete = async (task: Task) => {
        await updateTask({ ...task, isComplete: !task.isComplete });
    };
    
    const handleSelectTask = (taskId: string) => {
        const newSelection = new Set(selectedTaskIds);
        if (newSelection.has(taskId)) newSelection.delete(taskId);
        else newSelection.add(taskId);
        setSelectedTaskIds(newSelection);
    };
    
    const handleSelectAll = () => {
        if (selectedTaskIds.size === filteredAndSortedTasks.length) {
            setSelectedTaskIds(new Set());
        } else {
            setSelectedTaskIds(new Set(filteredAndSortedTasks.map(t => t.id)));
        }
    };
    
    const handleBatchDelete = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedTaskIds.size} selected tasks?`)) {
            deleteMultipleTasks(Array.from(selectedTaskIds));
            setSelectedTaskIds(new Set());
        }
    };

    const handleBatchComplete = () => {
        updateMultipleTasksStatus(Array.from(selectedTaskIds), true);
        setSelectedTaskIds(new Set());
    };

    const priorityColors: Record<TaskPriority, string> = { 
        High: 'bg-red-600 text-white', 
        Medium: 'bg-orange-500 text-white', 
        Low: 'bg-gray-500 text-white' 
    };

    if (loading || !mechanic) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;
    }
    
    return (
        <div className="flex flex-col h-full bg-secondary text-white">
            <Header title="My Tasks" />
            <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full p-2 bg-field rounded-md text-sm"><option value="all">All Statuses</option><option value="incomplete">Incomplete</option><option value="complete">Complete</option></select>
                    <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} className="w-full p-2 bg-field rounded-md text-sm"><option value="all">All Priorities</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select>
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="w-full p-2 bg-field rounded-md text-sm"><option value="dueDate">Sort by Due Date</option><option value="priority">Sort by Priority</option></select>
            </div>

            <div className="flex-grow overflow-y-auto px-4 pb-24">
                {filteredAndSortedTasks.length > 0 && (
                    <div className="flex items-center gap-3 p-2 border-b border-field">
                        <input type="checkbox" checked={selectedTaskIds.size === filteredAndSortedTasks.length && filteredAndSortedTasks.length > 0} onChange={handleSelectAll} className="h-5 w-5 rounded border-gray-500 text-primary focus:ring-primary" />
                        <label className="text-sm text-light-gray">Select All</label>
                    </div>
                )}
                {filteredAndSortedTasks.length === 0 ? (
                    <div className="text-center py-16 text-light-gray">No tasks found.</div>
                ) : (
                    <div className="space-y-2 py-2">
                        {filteredAndSortedTasks.map(task => (
                            <div key={task.id} className={`p-3 rounded-lg flex items-start gap-3 transition-colors ${selectedTaskIds.has(task.id) ? 'bg-primary/20' : 'bg-dark-gray'}`}>
                                <input type="checkbox" checked={selectedTaskIds.has(task.id)} onChange={() => handleSelectTask(task.id)} className="mt-1 h-5 w-5 rounded border-gray-500 text-primary focus:ring-primary flex-shrink-0" />
                                <div className="flex-grow cursor-pointer" onClick={() => {setEditingTask(task); setIsModalOpen(true);}}>
                                    <p className={`font-semibold ${task.isComplete ? 'line-through text-gray-500' : ''}`}>{task.title}</p>
                                    <p className={`text-xs mt-1 ${task.isComplete ? 'line-through text-gray-600' : 'text-light-gray'}`}>{new Date(task.dueDate.replace(/-/g, '/')).toLocaleDateString()}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${priorityColors[task.priority]}`}>{task.priority}</span>
                                    <button onClick={() => handleToggleComplete(task)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${task.isComplete ? 'bg-primary border-primary' : 'border-gray-500'}`} aria-label={`Mark task as ${task.isComplete ? 'incomplete' : 'complete'}`}>
                                        {task.isComplete && <svg xmlns="http://www.w.3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedTaskIds.size === 0 && (
                <button onClick={() => { setEditingTask(undefined); setIsModalOpen(true); }} className="absolute bottom-20 right-5 bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-transform transform hover:scale-110 active:scale-100 z-10" aria-label="Add new task">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
            )}
            
            {selectedTaskIds.size > 0 && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md p-4 z-20">
                    <div className="bg-field p-3 rounded-lg flex justify-between items-center shadow-lg animate-slideInUp">
                        <span className="text-sm font-semibold">{selectedTaskIds.size} selected</span>
                        <div className="flex gap-2">
                            <button onClick={handleBatchComplete} className="bg-green-600 text-white font-bold py-2 px-3 rounded-md text-xs">Mark Complete</button>
                            <button onClick={handleBatchDelete} className="bg-red-600 text-white font-bold py-2 px-3 rounded-md text-xs">Delete</button>
                        </div>
                    </div>
                </div>
            )}
            
            {isModalOpen && <TaskFormModal task={editingTask} onClose={() => setIsModalOpen(false)} onSave={handleSaveTask} />}
        </div>
    );
};

export default MechanicTasksScreen;