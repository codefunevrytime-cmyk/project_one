import { useState, useEffect, useCallback } from 'react';
import { Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, Users, IndianRupee, Clock, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';

import { API_URL } from '../../config/api';

// ── Config ──────────────────────────────────────────────────────────────
// Matches the existing admin panel's Bearer-token pattern (see
// AdminEventRequests.jsx) and its established white/gold palette.
const API_BASE = `${API_URL}/analytics`;

const gold = '#a3760f';
const goldPale = '#f5efe0';
const ink = '#2a2420';
const inkMuted = '#8a8078';

function authHeaders() {
  const token = localStorage.getItem('adminToken'); // adjust key if yours differs
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json();
}

function StatCard({ icon: Icon, label, value, deltaPct, loading }) {
  const positive = deltaPct >= 0;
  return (
    <div style={{ background: '#fff', border: '1px solid #ece4d3', borderRadius: 10, padding: '18px 20px', flex: 1, minWidth: 180 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: goldPale, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={gold} strokeWidth={2} />
        </div>
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 600, color: positive ? '#4a7c3f' : '#b5482f' }}>
            {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(deltaPct)}%
          </div>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 650, color: ink, letterSpacing: '-0.02em', fontFamily: 'Georgia, serif' }}>
        {loading ? '—' : value}
      </div>
      <div style={{ fontSize: 12.5, color: inkMuted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Card({ title, subtitle, children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ece4d3', borderRadius: 10, padding: 20, ...style }}>
      <div style={{ fontSize: 14, fontWeight: 650, marginBottom: 2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: inkMuted, marginBottom: 12 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

export default function AnalyticsTab() {
  const [range, setRange] = useState('30d');
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [vendorUsage, setVendorUsage] = useState([]);
  const [serviceUsage, setServiceUsage] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, tr, fn, vu, su, ac] = await Promise.all([
        fetchJSON(`/overview?range=${range}`),
        fetchJSON(`/event-trend?range=${range}`),
        fetchJSON(`/funnel?range=${range}`),
        fetchJSON(`/vendor-usage?range=${range}&limit=6`),
        fetchJSON(`/service-usage?range=${range}`),
        fetchJSON(`/activity?limit=6`),
      ]);
      setOverview(ov);
      setTrend(tr);
      setFunnel(fn);
      setVendorUsage(vu);
      setServiceUsage(su);
      setActivity(ac);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const exportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Events created', overview?.events_created.value],
      ['Requests approved', overview?.requests_approved.value],
      ['New signups', overview?.new_signups.value],
      ['Revenue (INR)', overview?.revenue_rupees.value],
      [],
      ['Vendor', 'Total slots', 'Accepted', 'Revenue (INR)'],
      ...vendorUsage.map(v => [v.name, v.total_slots, v.accepted_slots, v.revenue_rupees]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `celeste-analytics-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const funnelMax = funnel[0]?.value || 1;
  const maxVendorSlots = Math.max(...vendorUsage.map(v => v.total_slots), 1);

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fdfcfa', minHeight: '100%', padding: 28, color: ink }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: gold, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
            Admin · Analytics
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 600, margin: 0 }}>Overview</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: goldPale, borderRadius: 8, padding: 3 }}>
            {['7d', '30d', '90d'].map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                border: 'none', background: range === r ? '#fff' : 'transparent',
                color: range === r ? gold : inkMuted, fontWeight: 600, fontSize: 13,
                padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                boxShadow: range === r ? '0 1px 3px rgba(163,118,15,0.15)' : 'none',
              }}>
                {r === '7d' ? 'Last 7 days' : r === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} style={{
            display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${gold}`,
            background: 'transparent', color: gold, fontWeight: 600, fontSize: 13,
            padding: '8px 14px', borderRadius: 8, cursor: 'pointer'
          }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fdecea', border: '1px solid #f3c6c1', color: '#a33', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          Couldn't load analytics: {error}. Check that the backend route is mounted and the admin token is valid.
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
        <StatCard icon={Calendar} label="Events created" value={overview?.events_created.value} deltaPct={overview?.events_created.delta_pct} loading={loading} />
        <StatCard icon={TrendingUp} label="Requests approved" value={overview?.requests_approved.value} deltaPct={overview?.requests_approved.delta_pct} loading={loading} />
        <StatCard icon={Users} label="New signups" value={overview?.new_signups.value} deltaPct={overview?.new_signups.delta_pct} loading={loading} />
        <StatCard icon={IndianRupee} label="Revenue" value={overview ? `₹${overview.revenue_rupees.value.toLocaleString('en-IN')}` : '—'} deltaPct={overview?.revenue_rupees.delta_pct} loading={loading} />
      </div>

      {/* Row: trend + funnel */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <Card title="Event volume" subtitle="Created vs. completed, last 6 months" style={{ flex: 2, minWidth: 320 }}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gold} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e9d8" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: inkMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: inkMuted }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #ece4d3', fontSize: 12.5 }} />
              <Area type="monotone" dataKey="created" stroke={gold} strokeWidth={2.2} fill="url(#gCreated)" name="Created" />
              <Line type="monotone" dataKey="completed" stroke="#c9a05a" strokeWidth={2} strokeDasharray="4 3" dot={false} name="Completed" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Booking funnel" subtitle="Requested → approved → confirmed" style={{ flex: 1, minWidth: 240 }}>
          {funnel.map(f => {
            const pct = Math.round((f.value / funnelMax) * 100);
            return (
              <div key={f.stage} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ color: ink, fontWeight: 500 }}>{f.stage}</span>
                  <span style={{ color: inkMuted }}>{f.value}</span>
                </div>
                <div style={{ background: goldPale, borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: gold, borderRadius: 6 }} />
                </div>
              </div>
            );
          })}
          {funnel.length > 0 && funnel[0].value > 0 && (
            <div style={{ fontSize: 12, color: inkMuted, marginTop: 8, paddingTop: 10, borderTop: '1px solid #f0e9d8' }}>
              {Math.round((funnel[2].value / funnel[0].value) * 100)}% overall conversion rate
            </div>
          )}
        </Card>
      </div>

      {/* Row: vendor usage + service usage — "which vendor/service is being used" */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <Card title="Top vendors" subtitle="By event slots attached, this period" style={{ flex: 1.4, minWidth: 320 }}>
          {vendorUsage.length === 0 && !loading && (
            <div style={{ fontSize: 13, color: inkMuted }}>No vendor activity in this range.</div>
          )}
          {vendorUsage.map(v => (
            <div key={v.vendor_id} style={{ marginBottom: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                <span style={{ color: ink, fontWeight: 550 }}>
                  {v.name} <span style={{ color: inkMuted, fontWeight: 400 }}>· {v.specialty}</span>
                </span>
                <span style={{ color: inkMuted }}>
                  {v.total_slots} slots · ₹{v.revenue_rupees.toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{ background: goldPale, borderRadius: 6, height: 8, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(v.accepted_slots / maxVendorSlots) * 100}%`, background: gold }} title="Accepted" />
                <div style={{ width: `${(v.pending_slots / maxVendorSlots) * 100}%`, background: '#dcb768' }} title="Pending" />
                <div style={{ width: `${(v.declined_slots / maxVendorSlots) * 100}%`, background: '#e8d0c3' }} title="Declined" />
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: inkMuted, marginTop: 10 }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: gold, borderRadius: 2, marginRight: 4 }} />Accepted</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#dcb768', borderRadius: 2, marginRight: 4 }} />Pending</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#e8d0c3', borderRadius: 2, marginRight: 4 }} />Declined</span>
          </div>
        </Card>

        <Card title="Service usage" subtitle="Most-booked service categories" style={{ flex: 1, minWidth: 260 }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={serviceUsage} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e9d8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: inkMuted }} axisLine={false} tickLine={false} />
              <YAxis dataKey="service_type" type="category" width={90} tick={{ fontSize: 11.5, fill: ink }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #ece4d3', fontSize: 12.5 }} />
              <Bar dataKey="total" fill={gold} radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent activity */}
      <Card title="Recent activity" subtitle="Latest requests, inquiries & reviews">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 10 }}>
          <Clock size={13} color={gold} />
        </div>
        {activity.length === 0 && !loading && (
          <div style={{ fontSize: 13, color: inkMuted }}>No recent activity.</div>
        )}
        {activity.map((a, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: i < activity.length - 1 ? '1px solid #f4efe4' : 'none' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 550, color: ink }}>{a.label}</div>
              <div style={{ fontSize: 12, color: inkMuted, marginTop: 1 }}>{a.detail}</div>
            </div>
            <div style={{ fontSize: 11.5, color: '#b0a693', whiteSpace: 'nowrap' }}>
              {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
