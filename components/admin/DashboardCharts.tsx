import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

interface ChartProps {
    data: any[];
    title: string;
    subtitle?: string;
    type: 'area' | 'pie' | 'bar';
    dataKey?: string;
    categoryKey?: string;
    colors?: string[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1A1A1A] border border-gray-700 p-3 rounded-lg shadow-xl">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className="text-white font-bold text-sm">
                    {payload[0].value.toLocaleString()}
                </p>
            </div>
        );
    }
    return null;
};

const DashboardChart: React.FC<ChartProps> = ({ data, title, subtitle, type, dataKey = 'value', categoryKey = 'name', colors = ['#FE7803', '#F97316', '#EA580C', '#C2410C'] }) => {
    return (
        <div className="bg-[#1A1A1A]/60 backdrop-blur-xl border border-white/5 p-6 rounded-2xl flex flex-col">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>

            <div className="w-full" style={{ minHeight: 300, height: 300 }}>
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                    {type === 'area' ? (
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey={categoryKey} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dx={-10} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4B5563', strokeWidth: 1, strokeDasharray: '5 5' }} />
                            <Area
                                type="monotone"
                                dataKey={dataKey}
                                stroke={colors[0]}
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    ) : type === 'pie' ? (
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey={dataKey}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="rgba(0,0,0,0)" />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value) => <span className="text-gray-400 text-sm ml-2">{value}</span>}
                            />
                        </PieChart>
                    ) : (
                        <BarChart data={data} barSize={20}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey={categoryKey} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dx={-10} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Bar dataKey={dataKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DashboardChart;
