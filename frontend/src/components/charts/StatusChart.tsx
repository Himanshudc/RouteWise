import { Cell,Pie,PieChart,ResponsiveContainer,Tooltip } from 'recharts';
import { ChartDataPoint } from '../../types';

interface StatusChartProps {
  data: ChartDataPoint[];
  height?: number;
}

const COLORS = ['#10b981', '#3b82f6', '#64748b', '#ef4444', '#f59e0b', '#8b5cf6'];

export function StatusChart({ data, height = 250 }: StatusChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            nameKey="label"
            label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
            labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
            style={{ fontSize: '11px' }}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [value, 'shipments']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
