'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface StatsChartsProps {
  booksByYear: { year: number; count: number }[];
  ratingDist: { rating: number; count: number }[];
  topAuthors: { author: string; count: number }[];
}

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  fontSize: 13,
  backgroundColor: 'var(--surface)',
  color: 'var(--foreground)',
};

const gridStroke = 'var(--border)';
const tickStyle = { fontSize: 12, fill: 'var(--muted)' };

export function StatsCharts({ booksByYear, ratingDist, topAuthors }: StatsChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Books per year */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
          Books read per year
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={booksByYear} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="year" tick={tickStyle} stroke={gridStroke} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} stroke={gridStroke} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--primary)', opacity: 0.08 }} />
            <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Books" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Rating distribution */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
          My ratings
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={ratingDist} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="rating"
              tickFormatter={(v) => '★'.repeat(v)}
              tick={tickStyle}
              stroke={gridStroke}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={tickStyle} stroke={gridStroke} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'var(--primary)', opacity: 0.08 }}
              formatter={(v) => [v, 'Books']}
              labelFormatter={(l) => `${l} stars`}
            />
            <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Books" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top authors */}
      <div className="bg-surface rounded-2xl border border-border p-6 lg:col-span-2">
        <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
          Most-read authors
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(200, topAuthors.length * 36)}>
          <BarChart data={topAuthors} layout="vertical" barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
            <XAxis type="number" tick={tickStyle} stroke={gridStroke} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              dataKey="author"
              type="category"
              width={160}
              tick={tickStyle}
              stroke={gridStroke}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'var(--primary)', opacity: 0.08 }}
              formatter={(v) => [v, 'Books']}
            />
            <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} name="Books" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
