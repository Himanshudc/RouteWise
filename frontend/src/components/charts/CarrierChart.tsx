import {
Bar,
BarChart,
CartesianGrid,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis,
} from 'recharts';
import { CarrierPerformanceChart as CarrierPerformanceChartType } from '../../types';

interface CarrierChartProps {
  data: CarrierPerformanceChartType;
  height?: number;
}

export function CarrierChart({ data, height = 250 }: CarrierChartProps) {
  if (!data?.data?.length) {
    return (
      <div className="flex items-center justify-center h-[250px] text-gray-400">
        No carrier data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data.data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          {/* Ultra-faint grid lines */}
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F5" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 'dataMax + 10']}
            tick={{ fill: '#8E95A5', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={160}
            tick={{ fill: '#0F172A', fontSize: 12, fontWeight: 500 }}
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
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Delay Rate']}
          />
          {/* Coral red delay rate bars with clean rounded corners */}
          <Bar
            dataKey="value"
            name="Delay Rate"
            fill="#EF4444"
            radius={[0, 6, 6, 0]}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
