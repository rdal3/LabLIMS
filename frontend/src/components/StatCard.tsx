import React from 'react';

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ComponentType<{ size?: number }>;
    color: 'blue' | 'slate' | 'amber' | 'emerald';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        slate: 'bg-slate-50 text-slate-600 border-slate-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200'
    };

    const iconColorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        slate: 'bg-slate-100 text-slate-600',
        amber: 'bg-amber-100 text-amber-600',
        emerald: 'bg-emerald-100 text-emerald-600'
    };

    return (
        <div className={`${colorClasses[color]} border-2 rounded-xl p-6 transition-all hover:shadow-lg`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide opacity-70">{title}</p>
                    <p className="text-4xl font-extrabold mt-2">{value}</p>
                </div>
                <div className={`${iconColorClasses[color]} p-4 rounded-xl`}>
                    <Icon size={32} />
                </div>
            </div>
        </div>
    );
};

export default StatCard;
