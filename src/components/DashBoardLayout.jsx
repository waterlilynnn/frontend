import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import API from '../config/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, PieChart, Pie, Cell, Legend, Line,
} from 'recharts';
import { Building2, Users, File, AlertTriangle } from 'lucide-react';

const HAULER_COLORS = {
  City: '#FFDE42', Barangay: '#2FA4D7', Accredited: '#612D53',
  Hazardous: '#E76F2E', Exempted: '#FF88BA', 'No Contract': '#DEDEDE',
};

const BARANGAY_COLORS = [
  '#CC5500','#FF8C00','#FFB347','#FFE0B2','#8B0000','#DC143C','#FF6B6B','#FFCCCC',
  '#4B0082','#8A2BE2','#D291BC','#E6E6FA','#006400','#228B22','#90EE90','#D0F0C0',
  '#B8860B','#FFD700','#FFFACD','#FFFFF0','#00008B','#4169E1','#87CEEB','#CCE5FF',
  '#FFB6C1','#FFE4E1','#FF69B4','#8B008B','#008080','#20B2AA','#AFEEEE','#E0FFF9',
  '#800000','#FF4500',
];

const P = { primary: '#0f6e53', dark: '#0a6045' };

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-black/[0.07] shadow-sm ${className}`}>{children}</div>
);

const ChartTitle = ({ title }) => (
  <div style={{ padding: '8px 12px 4px' }}>
    <p style={{ fontSize: 11, fontWeight: 600, color: '#0a6045', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{title}</p>
  </div>
);

const NoData = () => <div className="flex items-center justify-center h-full text-xs text-gray-300">No data yet</div>;

const GaugeChart = ({ passed, violation, notInspected }) => {
  const total = passed + violation + notInspected;
  if (total === 0) return <NoData />;
  const inspected    = passed + violation;
  const inspectedPct = total > 0 ? (inspected / total) * 100 : 0;
  const gaugeData = [
    { name: 'Inspected',     value: inspectedPct,       fill: P.primary },
    { name: 'Not Inspected', value: 100 - inspectedPct, fill: '#e5e7eb' },
  ];
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={gaugeData} cx="50%" cy="78%" startAngle={180} endAngle={0} innerRadius="48%" outerRadius="80%" dataKey="value" paddingAngle={2} cornerRadius={4}>
              {gaugeData.map((entry, index) => <Cell key={index} fill={entry.fill} stroke="white" strokeWidth={2} />)}
            </Pie>
            <Tooltip wrapperStyle={{ zIndex: 9999 }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              if (d?.name === 'Inspected') return <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px', fontSize:10 }}><p style={{ color:'#16a34a', margin:'0 0 2px', fontWeight:600 }}>✓ Passed: {passed}</p><p style={{ color:'#ef4444', margin:0, fontWeight:600 }}>⚠ Violation: {violation}</p></div>;
              return <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px', fontSize:10 }}><p style={{ color:'#6b7280', margin:0 }}>Not Inspected: {notInspected}</p></div>;
            }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position:'absolute', bottom:'16%', left:0, right:0, display:'flex', flexDirection:'column', alignItems:'center', pointerEvents:'none' }}>
          <span style={{ fontSize:22, fontWeight:700, color:P.primary, lineHeight:1 }}>{Math.round(inspectedPct)}%</span>
          <span style={{ fontSize:9, color:'#9ca3af', marginTop:2 }}>Inspected</span>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'center', gap:12, paddingBottom:4, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color:'#6b7280' }}><div style={{ width:8, height:8, borderRadius:'50%', background:P.primary }} />Inspected ({inspected})</div>
        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color:'#6b7280' }}><div style={{ width:8, height:8, borderRadius:'50%', background:'#e5e7eb' }} />Not yet ({notInspected})</div>
      </div>
    </div>
  );
};

const TopBusinessLinesChart = ({ data }) => {
  if (!data || data.length === 0) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={[...data].sort((b, a) => a.value - b.value)} margin={{ top: 5, right: 15, left: 0, bottom: 15 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="shortName" tick={{ fontSize: 6, fill: '#64748b' }} angle={-25} textAnchor="end" height={35} interval={0} />
        <YAxis tick={{ fontSize: 7, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip wrapperStyle={{ zIndex: 9999 }} content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          return <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:6, padding:'4px 8px', fontSize:9 }}><p style={{ fontWeight:600, color:'#374151', margin:'0 0 1px' }}>{payload[0].payload.fullName}</p><p style={{ fontWeight:700, color:'#10b981', margin:0 }}>{payload[0].value} businesses</p></div>;
        }} />
        <Line type="monotone" dataKey="value" stroke={P.primary} strokeWidth={2} dot={{ r:3, fill:P.primary, strokeWidth:1, stroke:'#fff' }} activeDot={{ r:5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }) => {
  if (pct < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  return <text x={cx + radius * Math.cos(-midAngle * RADIAN)} y={cy + radius * Math.sin(-midAngle * RADIAN)} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight="bold">{pct}%</text>;
};

const DonutTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:6, padding:'4px 8px', fontSize:9 }}><p style={{ fontWeight:600, color:'#374151', margin:'0 0 1px' }}>{d.name}</p><p style={{ fontWeight:700, color:d.payload?.fill, margin:0 }}>{d.value} ({d.payload?.pct}%)</p></div>;
};

const BarangayXTick = ({ x, y, payload }) => {
  const name = (payload.value || '').replace(/^(BARANGAY |BGY\.? )/i, '');
  return <g transform={`translate(${x},${y})`}><text x={0} y={0} dy={4} textAnchor="end" fill="#64748b" fontSize={7} transform="rotate(-40)">{name}</text></g>;
};

const DashboardLayout = ({ role = 'staff' }) => {
  const prefix = role === 'admin' ? 'Admin' : 'Staff';
  const { data: allBiz = [],     isLoading: bizL   } = useQuery({ queryKey: [`allBiz${prefix}Dash`],    queryFn: async () => (await API.get('/business-records/all')).data || [] });
  const { data: clrHistory = [], isLoading: clrL   } = useQuery({ queryKey: [`allClr${prefix}Dash`],    queryFn: async () => (await API.get('/clearance/history/all')).data || [] });
  const { data: staffList = [],  isLoading: staffL } = useQuery({ queryKey: [`staffList${prefix}Dash`], queryFn: async () => role === 'admin' ? (await API.get('/admin/staff')).data || [] : [], enabled: role === 'admin' });
  const { data: allInsp = [] }                        = useQuery({ queryKey: [`allInsp${prefix}Dash`],   queryFn: async () => (await API.get('/inspections/all')).data || [] });

  const isLoading = bizL || clrL || (role === 'admin' && staffL);

  const routePrefix = `/${role}`;

  const stats = useMemo(() => {
    const base = [
      { label: 'Total Businesses',  value: allBiz.length,                               href: `${routePrefix}/business`,    Icon: Building2,     bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700' },
      { label: 'Issued Clearances', value: clrHistory.filter(c => c.is_claimed).length,  href: `${routePrefix}/clearance`,   Icon: File,          bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-[#0f6e53]' },
      { label: 'With Violations',   value: allBiz.filter(b => b.has_violation).length,   href: `${routePrefix}/inspections`, Icon: AlertTriangle, bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700' },
    ];
    if (role === 'admin') base.splice(1, 0, { label: 'Staff Members', value: staffList.length, href: '/admin/staff', Icon: Users, bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' });
    return base;
  }, [allBiz, clrHistory, staffList, routePrefix]);

  const barangayData = useMemo(() => {
    const map = {};
    allBiz.forEach(b => { const k = b.location || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name)).map((item, i) => ({ ...item, fill: BARANGAY_COLORS[i % BARANGAY_COLORS.length] }));
  }, [allBiz]);

  const bizLineData = useMemo(() => {
    const map = {};
    allBiz.forEach(b => { const k = b.business_line || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ shortName: name.length > 12 ? name.slice(0, 10) + '…' : name, fullName: name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [allBiz]);

  const haulerData = useMemo(() => {
    const map = {};
    allBiz.forEach(b => { const k = b.hauler_type || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    const total = allBiz.length || 1;
    return Object.entries(map).map(([name, value]) => ({ name, value, fill: HAULER_COLORS[name] || '#94a3b8', pct: Math.round((value / total) * 100) }));
  }, [allBiz]);

  const inspectionStats = useMemo(() => {
    const ids          = new Set(allInsp.map(i => i.business_record_id));
    const passed       = allInsp.filter(i => i.status === 'PASSED').length;
    const violation    = allInsp.filter(i => i.status === 'WITH VIOLATION').length;
    const notInspected = allBiz.filter(b => !ids.has(b.id)).length;
    return { passed, violation, notInspected };
  }, [allBiz, allInsp]);

  if (isLoading) return <div className="flex justify-center items-center h-64"><div className="w-10 h-10 border-2 border-[#0f6e53] border-t-transparent rounded-full animate-spin" /></div>;

  const colCount = role === 'admin' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3';

  return (
    // Scrollable layout on all screens 
    <div className="space-y-4 pb-6">
      <h1 className="text-xl sm:text-2xl font-bold text-[#0a6045]">Dashboard</h1>

      {/* Stat cards */}
      <div className={`grid ${colCount} gap-3 sm:gap-4`}>
        {stats.map(({ label, value, href, Icon, bg, border, text }) => (
          <Link key={label} to={href}
            className={`bg-white rounded-xl border ${border} px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3 sm:gap-4 hover:shadow-md transition-all`}>
            <div className={`p-2 sm:p-2.5 rounded-xl ${bg} shrink-0`}>
              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${text}`} />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{value.toLocaleString()}</p>
              <p className="text-[10px] sm:text-[11px] font-medium text-gray-400 mt-0.5">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="flex flex-col h-56 sm:h-64">
          <ChartTitle title="Top Business Lines" />
          <div className="flex-1 px-2 pb-1 min-h-0"><TopBusinessLinesChart data={bizLineData} /></div>
        </Card>

        <Card className="flex flex-col h-56 sm:h-64">
          <ChartTitle title="Hauler Distribution" />
          <div className="flex-1 min-h-0">
            {haulerData.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={haulerData} cx="50%" cy="50%" innerRadius="25%" outerRadius="62%" paddingAngle={2} dataKey="value" labelLine={false} label={renderCustomLabel}>
                    {haulerData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="white" strokeWidth={1} />)}
                  </Pie>
                  <Tooltip wrapperStyle={{ zIndex: 9999 }} content={<DonutTip />} />
                  <Legend verticalAlign="bottom" layout="horizontal" iconType="circle" iconSize={5} wrapperStyle={{ fontSize: '7px', paddingTop: '2px' }} formatter={v => <span style={{ fontSize: 7, color: '#64748b' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="flex flex-col h-56 sm:h-64">
          <ChartTitle title="Inspection Status" />
          <div className="flex-1 px-1 pb-1 min-h-0">
            <GaugeChart passed={inspectionStats.passed} violation={inspectionStats.violation} notInspected={inspectionStats.notInspected} />
          </div>
        </Card>
      </div>

      {/* Barangay bar chart */}
      <Card className="flex flex-col h-64 sm:h-72">
        <ChartTitle title="Applications per Barangay" />
        <div className="flex-1 px-2 pb-1 min-h-0">
          {barangayData.length === 0 ? <NoData /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barangayData} margin={{ top: 6, right: 10, left: -10, bottom: 0 }} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={<BarangayXTick />} axisLine={false} tickLine={false} interval={0} height={70} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip wrapperStyle={{ zIndex: 9999 }} content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:6, padding:'4px 8px', fontSize:9 }}><p style={{ fontWeight:600, color:'#374151', margin:'0 0 1px' }}>{label}</p><p style={{ fontWeight:700, color:'#10b981', margin:0 }}>{payload[0]?.value} businesses</p></div>;
                }} cursor={{ fill: '#f0fdf4' }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]} barSize={16}>
                  {barangayData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DashboardLayout;
