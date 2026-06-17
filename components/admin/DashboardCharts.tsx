import React, { useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend, RadialBarChart, RadialBar
} from 'recharts';

interface ChartProps {
    data: any[];
    title: string;
    subtitle?: string;
    type: 'area' | 'pie' | 'bar' | 'radial';
    dataKey?: string;
    categoryKey?: string;
    colors?: string[];
    height?: number;
    formatValue?: (value: number) => string;
}

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1A1A1A] border border-gray-700/50 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
                <p className="text-gray-400 text-xs mb-1 font-bold">{label}</p>
                {payload.map((entry: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                        {entry.color && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        )}
                        <span className="text-white font-bold">
                            {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
                        </span>
                    </div>
                ))}
                {payload[0]?.payload?.percentage !== undefined && (
                    <p className="text-[10px] text-gray-500 mt-1 font-bold tracking-wider">
                        {payload[0].payload.percentage.toFixed(1)}% of total
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const DashboardChart: React.FC<ChartProps> = ({
    data, title, subtitle, type, dataKey = 'value', categoryKey = 'name',
    colors = ['#FE7803', '#F97316', '#EA580C', '#C2410C', '#34D399', '#60A5FA'],
    height = 300, formatValue
}) => {
    const total = data.reduce((sum, d) => sum + (d[dataKey] || 0), 0);
    const dataWithPercentage = data.map(d => ({
        ...d,
        percentage: total > 0 ? (d[dataKey] / total) * 100 : 0
    }));

    const renderChart = () => {
        switch (type) {
            case 'area':
                return (
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`areaGrad-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                        <XAxis
                            dataKey={categoryKey}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 700 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 700 }}
                            dx={-10}
                            tickFormatter={(v) => formatValue ? formatValue(v) : v.toLocaleString()}
                        />
                        <Tooltip
                            content={<CustomTooltip formatter={formatValue} />}
                            cursor={{ stroke: '#4B5563', strokeWidth: 1, strokeDasharray: '5 5' }}
                        />
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={colors[0]}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#areaGrad-${title.replace(/\s/g, '')})`}
                            dot={{ fill: colors[0], stroke: '#1A1A1A', strokeWidth: 2, r: 4 }}
                            activeDot={{ fill: colors[0], stroke: '#fff', strokeWidth: 2, r: 6 }}
                        />
                    </AreaChart>
                );

            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={dataWithPercentage}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey={dataKey}
                            animationBegin={0}
                            animationDuration={1200}
                        >
                            {dataWithPercentage.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={colors[index % colors.length]}
                                    stroke="rgba(0,0,0,0)"
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip formatter={formatValue} />} />
                        <Legend
                            verticalAlign="bottom"
                            height={40}
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => (
                                <span className="text-gray-400 text-xs font-bold ml-1">{value}</span>
                            )}
                        />
                        {total > 0 && (
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                <tspan x="50%" dy="-0.5em" className="text-2xl font-black text-white" fill="white" fontSize="24" fontWeight="900">
                                    {total.toLocaleString()}
                                </tspan>
                                <tspan x="50%" dy="1.4em" fill="#6B7280" fontSize="10" fontWeight="700">
                                    Total
                                </tspan>
                            </text>
                        )}
                    </PieChart>
                );

            case 'bar':
                return (
                    <BarChart data={data} barSize={28} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                        <XAxis
                            dataKey={categoryKey}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 700 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 700 }}
                            dx={-10}
                            tickFormatter={(v) => formatValue ? formatValue(v) : v.toLocaleString()}
                        />
                        <Tooltip
                            content={<CustomTooltip formatter={formatValue} />}
                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        />
                        {data.map((_, index) => (
                            <Bar
                                key={`bar-${index}`}
                                dataKey={dataKey}
                                fill={colors[index % colors.length]}
                                radius={[6, 6, 0, 0]}
                                stackId="a"
                            />
                        ))}
                        {data.length <= 1 && (
                            <Bar dataKey={dataKey} fill={colors[0]} radius={[6, 6, 0, 0]} />
                        )}
                    </BarChart>
                );

            case 'radial':
                return (
                    <RadialBarChart
                        width={300}
                        height={280}
                        cx="50%"
                        cy="50%"
                        innerRadius="30%"
                        outerRadius="90%"
                        barSize={16}
                        data={dataWithPercentage}
                        startAngle={180}
                        endAngle={0}
                    >
                        <RadialBar
                            minAngle={15}
                            label={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }}
                            background={{ fill: 'rgba(255,255,255,0.05)' }}
                            clockWise
                            dataKey={dataKey}
                        >
                            {dataWithPercentage.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </RadialBar>
                        <Legend
                            verticalAlign="bottom"
                            height={40}
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => (
                                <span className="text-gray-400 text-xs font-bold ml-1">{value}</span>
                            )}
                        />
                        <Tooltip content={<CustomTooltip formatter={formatValue} />} />
                    </RadialBarChart>
                );

            default:
                return null;
        }
    };

    return (
        <div className="bg-[#1A1A1A]/60 backdrop-blur-xl border border-white/5 p-6 rounded-2xl flex flex-col h-full">
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white">{title}</h3>
                        {subtitle && <p className="text-sm text-gray-500 mt-1 font-medium">{subtitle}</p>}
                    </div>
                    {data.length > 0 && total > 0 && (
                        <div className="text-right">
                            <p className="text-xs text-gray-600 font-bold tracking-wider">TOTAL</p>
                            <p className="text-lg font-black text-white">
                                {formatValue ? formatValue(total) : total.toLocaleString()}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full flex items-center justify-center" style={{ minHeight: height }}>
                <ResponsiveContainer width="100%" height={height} minWidth={0}>
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DashboardChart;
