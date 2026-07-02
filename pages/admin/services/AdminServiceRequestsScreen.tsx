import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../../context/DatabaseContext';
import { ServiceRequest, ServiceProvider, ServicePricing } from '../../../types';
import { FaEdit, FaEye, FaSearch } from 'react-icons/fa';

export const AdminServiceRequestsScreen: React.FC = () => {
    const { db, updateServiceRequestStatus } = useDatabase();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    
    const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Modal state
    const [newStatus, setNewStatus] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const requests = db?.serviceRequests || [];
    
    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const matchesSearch = 
                req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.serviceName?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests, searchTerm, statusFilter]);

    const handleOpenModal = (request: ServiceRequest) => {
        setSelectedRequest(request);
        setNewStatus(request.status);
        setNotes('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRequest(null);
    };

    const handleSave = async () => {
        if (!selectedRequest) return;
        setIsSaving(true);
        try {
            await updateServiceRequestStatus(selectedRequest.id, newStatus, notes);
            handleCloseModal();
        } catch (error) {
            console.error('Failed to update request:', error);
            alert('Failed to update status');
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Service Requests</h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
                <div className="p-4 border-b flex gap-4">
                    <div className="flex-1 relative">
                        <span className="absolute left-3 top-3 text-gray-400"><FaSearch /></span>
                        <input
                            type="text"
                            placeholder="Search requests..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">ID / Date</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Service</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRequests.map(req => (
                                <tr key={req.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-sm text-gray-900">{req.id.slice(0, 8)}...</div>
                                        <div className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">{req.customerName || 'Unknown'}</td>
                                    <td className="px-6 py-4 text-sm">{req.serviceName || 'Unknown'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleOpenModal(req)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            <FaEdit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No requests found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manage Modal */}
            {isModalOpen && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="text-lg font-bold">Manage Request</h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="request-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    id="request-status" name="request-status"
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            
                            <div>
                                <label htmlFor="request-note" className="block text-sm font-medium text-gray-700 mb-1">Add Note (Optional)</label>
                                <textarea
                                    id="request-note" name="request-note"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    rows={3}
                                    placeholder="Leave a note about this status update..."
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-100 text-sm font-medium"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminServiceRequestsScreen;
