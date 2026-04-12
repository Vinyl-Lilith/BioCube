// packages/frontend/src/components/charts/SensorChart.jsx
// Renders either a responsive LineChart or BarChart using Recharts.
// Receives the same data array from /api/sensors/export/chart.

import {
  ResponsiveContainer, LineChart, BarChart, Line, Bar,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';

// Format ISO timestamp for the X-axis label
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:00`;
}

// Down-sample to at most N points so the chart stays readable
function downsample(data, maxPoints = 120) {
  if (!data || data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}

const LINES = [
  { key: 'temperature',   color: 'var(--bc-accent)',    name: 'Temp (°C)' },
  { key: 'humidity',      color: 'var(--bc-warn)',       name: 'Humidity (%)' },
  { key: 'soilMoisture1', color: 'var(--bc-secondary)',  name: 'Soil 1 (%)' },
  { key: 'soilMoisture2', color: 'var(--bc-info)',       name: 'Soil 2 (%)' },
];

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bc-card2)', border: '1px solid var(--bc-border2)',
      borderRadius: 6, padding: '8px 12px',
      fontFamily: 'var(--bc-font-mono)', fontSize: 10,
    }}>
      <div style={{ color: 'var(--bc-text3)', marginBottom: 4 }}>{fmtTime(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {p.value != null ? p.value.toFixed(1) : '—'}
        </div>
      ))}
    </div>
  );
};

export default function SensorChart({ data = [], type = 'line' }) {
  if (!data.length) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--bc-font-mono)', fontSize: 11, color: 'var(--bc-text3)' }}>
        No data for selected range
      </div>
    );
  }

  const pts = downsample(data);

  const commonProps = {
    data: pts,
    margin: { top: 4, right: 8, left: -20, bottom: 0 },
  };

  const axisProps = {
    tick: { fontFamily: 'var(--bc-font-mono)', fontSize: 9, fill: 'var(--bc-text3)' },
    tickLine: false, axisLine: false,
  };

  return (
    <ResponsiveContainer width="100%" height={180}>
      {type === 'line' ? (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--bc-border)" />
          <XAxis dataKey="time" tickFormatter={fmtTime} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<CUSTOM_TOOLTIP />} />
          <Legend wrapperStyle={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9 }} />
          {LINES.map(l => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.name}
              stroke={l.color} strokeWidth={1.5} dot={false} connectNulls />
          ))}
        </LineChart>
      ) : (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--bc-border)" />
          <XAxis dataKey="time" tickFormatter={fmtTime} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<CUSTOM_TOOLTIP />} />
          <Legend wrapperStyle={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9 }} />
          {LINES.map(l => (
            <Bar key={l.key} dataKey={l.key} name={l.name} fill={l.color} opacity={0.8} radius={[2,2,0,0]} />
          ))}
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
