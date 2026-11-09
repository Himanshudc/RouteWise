import { Bar,BarChart,CartesianGrid,Cell,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts';
import { RiskDistributionChart as RiskDistributionChartType } from '../../types';

interface RiskChartProps {
  data: RiskDistributionChartType;
  height?: number;
}

const RISK_COLORS = {
  HIGH: '#EF4444',    // Coral red
  MEDIUM: '#F59E0B',  // Amber
  LOW: '#10B981',     // Emerald
};

export function RiskChart({ data, height = 180 }: RiskChartProps) {
  if (!data?.data?.length) {
    return (
      <div className="flex items-center justify-center h-[180px] text-gray-400">
        No risk data available
      </div>
    );
  }

  const categories = (['LOW', 'MEDIUM', 'HIGH'] as const).map((label) => ({
    label,
    value: data.data.find((item) => item.label.toUpperCase() === label)?.value ?? 0,
  }));

  return (
    <div className="w-full">
      <ul className="mb-2 grid grid-cols-3 gap-2 text-center text-sm">
        {categories.map(({ label, value }) => (
          <li key={label} className="rounded-md bg-gray-50 py-2">
            <span className="font-semibold" style={{ color: RISK_COLORS[label] }}>{value}</span>
            <span className="ml-2 text-gray-600">{label}</span>
          </li>
        ))}
      </ul>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={categories} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          {/* Ultra-faint grid lines */}
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F5" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#8E95A5', fontSize: 12 }}
            axisLine={{ stroke: '#EEF0F5' }}
            tickLine={false}
          />
          <YAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: '#8E95A5', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #EEF0F5',
              borderRadius: '12px',
              boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.04)',
            }}
            formatter={(value: number) => [value, 'Shipments']}
          />
          <Bar
            dataKey="value"
            name="Count"
            radius={[6, 6, 0, 0]}
            maxBarSize={45}
          >
            {categories.map((item) => (
              <Cell key={item.label} fill={RISK_COLORS[item.label]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
