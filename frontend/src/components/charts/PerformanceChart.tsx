import {
CartesianGrid,
Legend,
Line,
LineChart,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis,
} from 'recharts';
import { PerformanceChart as PerformanceChartType } from '../../types';

interface PerformanceChartProps {
  data: PerformanceChartType;
  height?: number;
}

export function PerformanceChart({ data, height = 250 }: PerformanceChartProps) {
  if (!data?.labels?.length || !data?.on_time_rates?.length) {
    return (
      <div className="flex items-center justify-center h-[250px] text-gray-400">
        No performance data available
      </div>
    );
  }

  const chartData = data.labels.map((label, index) => ({
    label,
    rate: data.on_time_rates[index],
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          {/* Updated grid lines to ultra-faint dashed lines #EEF0F5 */}
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F5" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#8E95A5', fontSize: 12 }}
            axisLine={{ stroke: '#EEF0F5' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#8E95A5', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #EEF0F5',
              borderRadius: '12px',
              boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.04)',
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'On-Time Rate']}
            labelFormatter={(label) => `Week of ${label}`}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          {/* Vibrant high-contrast line in vibrant purple #7C3AED */}
          <Line
            type="monotone"
            dataKey="rate"
            name="On-Time Rate"
            stroke="#7C3AED"
            strokeWidth={3}
            dot={{ fill: '#7C3AED', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
