import React, { useMemo } from 'react';
import { useDatabase } from '../../../context/DatabaseContext';
import { FaWrench, FaClipboardList, FaUsers, FaMoneyBillWave } from 'react-icons/fa';

export const AdminServicesDashboardScreen: React.FC = () => {
    const { db } = useDatabase();

    const stats = useMemo(() => {
        if (!db) return null;
        const totalServices = db.appServices?.length || 0;
        const totalRequests = db.serviceRequests?.length || 0;
        const pendingRequests = db.serviceRequests?.filter(r => r.status === 'Pending').length || 0;
        const totalProviders = db.serviceProviders?.length || 0;

        return { totalServices, totalRequests, pendingRequests, totalProviders };
    }, [db]);

    if (!db || !stats) {
        return <div className="p-6 text-gray-500">Loading dashboard...</div>;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Services Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full mr-4">
                        <FaWrench size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Services</p>
                        <p className="text-2xl font-bold">{stats.totalServices}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full mr-4">
                        <FaClipboardList size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Pending Requests</p>
                        <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 bg-green-100 text-green-600 rounded-full mr-4">
                        <FaClipboardList size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Requests</p>
                        <p className="text-2xl font-bold">{stats.totalRequests}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-full mr-4">
                        <FaUsers size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Service Providers</p>
                        <p className="text-2xl font-bold">{stats.totalProviders}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                {db.serviceActivityLogs && db.serviceActivityLogs.length > 0 ? (
                    <div className="space-y-4">
                        {db.serviceActivityLogs.slice(0, 10).map(log => (
                            <div key={log.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                <div>
                                    <p className="text-sm font-medium">Request {log.requestId}</p>
                                    <p className="text-xs text-gray-500">
                                        Status changed to <span className="font-semibold text-gray-700">{log.statusTo}</span>
                                        {log.notes && ` - ${log.notes}`}
                                    </p>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {new Date(log.updatedAt).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No recent activity.</p>
                )}
            </div>
        </div>
    );
};

export default AdminServicesDashboardScreen;
