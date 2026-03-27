import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import API from '../../config/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const ACCENT = {
  navy:    { border: 'border-l-blue-900',    text: 'text-blue-900'    },
  emerald: { border: 'border-l-emerald-600', text: 'text-emerald-600' },
  amber:  { border: 'border-l-amber-500',  text: 'text-amber-500'  },
  red:     { border: 'border-l-red-600',     text: 'text-red-600'     },
};

const PALETTE = {
  lightest: '#cee8cc',
  light:    '#bfdcba',
  mid:      '#a0c09e',
  dark:     '#89ae86',
  darkest:  '#72986f',
};

const HAULER_PALETTE = {
  City:         PALETTE.darkest,
  Barangay:     PALETTE.dark,
  Accredited:   PALETTE.mid,
  Hazardous:    PALETTE.light,
  Exempted:     PALETTE.lightest,
  'No Contract':PALETTE.mid,
};

const PIE_COLORS = [PALETTE.darkest, PALETTE.light];

const BARANGAY_SHADES = [
  '#72986f','#7ea07b','#89ae86','#94bc91','#a0c09e',
  '#aac8a7','#b4cfb0','#bfdcba','#c8e2c4','#cee8cc',
  '#c5e3c3','#bcdeba','#b3d9b1','#a9d3a7','#9fce9e',
  '#95c894','#8bc28a','#82bc80','#78b677','#6eb06d',
  '#67a866','#6fb36e','#77be76','#7fc97f','#86d287',
  '#72986f','#7ea07b','#89ae86','#94bc91','#a0c09e',
  '#aac8a7','#b4cfb0','#bfdcba','#c8e2c4',
];

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700">{payload[0]?.payload?.fullName || payload[0]?.payload?.name}</p>
      <p className="font-medium" style={{ color: PALETTE.darkest }}>{payload[0]?.value}</p>
    </div>
  );
};

const AdminDashboard = () => {
  const { data: allBiz = [],     isLoading: bizLoading   } = useQuery({ queryKey: ['allBizAdminDash'],    queryFn: async () => (await API.get('/business-records/all')).data || []        });
  const { data: clrHistory = [],  isLoading: clrLoading   } = useQuery({ queryKey: ['allClrAdminDash'],    queryFn: async () => (await API.get('/clearance/history/all')).data || []      });
  const { data: staffList = [],   isLoading: staffLoading } = useQuery({ queryKey: ['staffListAdminDash'], queryFn: async () => (await API.get('/admin/staff')).data || []               });

  const { data: allInspections = [] } = useQuery({
    queryKey: ['allInspAdminDash', allBiz.length],
    queryFn: async () => {
      if (!allBiz.length) return [];
      const biz = allBiz.slice(0, 300);
      const results = await Promise.allSettled(biz.map(b => API.get(`/inspections/business/${b.id}`)));
      return results.flatMap((r, i) =>
        r.status === 'fulfilled' ? r.value.data.map(insp => ({ ...insp, business_id: biz[i].id })) : []
      );
    },
    enabled: allBiz.length > 0,
  });

  const isLoading = bizLoading || clrLoading || staffLoading;

  const issuedClearances = clrHistory.filter(c => c.is_claimed);
  const withViolations   = allBiz.filter(b => b.has_violation);

  const stats = [
    { label: 'Total Businesses',   value: allBiz.length,           href: '/admin/business',                             accent: 'navy'    },
    { label: 'Staff Members',      value: staffList.length,         href: '/admin/staff',                                accent: 'amber'  },
    { label: 'Issued Clearances',  value: issuedClearances.length,  href: '/admin/reports?tab=clearances&filter=issued', accent: 'emerald' },
    { label: 'With Violations',    value: withViolations.length,    href: '/admin/reports?tab=violations',               accent: 'red'     },
  ];

  const bizLineChartData = useMemo(() => {
    const map = {};
    allBiz.forEach(b => { const bl = b.business_line || 'Unknown'; map[bl] = (map[bl] || 0) + 1; });
    return Object.entries(map)
      .map(([name, value]) => ({
        name: name.length > 12 ? name.slice(0, 12) + '…' : name,
        fullName: name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [allBiz]);

  const haulerChartData = useMemo(() => {
    const map = {};
    allBiz.forEach(b => { const h = b.hauler_type || 'Unknown'; map[h] = (map[h] || 0) + 1; });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, fill: HAULER_PALETTE[name] || PALETTE.mid }))
      .sort((a, b) => b.value - a.value);
  }, [allBiz]);

  const barangayPieData = useMemo(() => {
    const map = {};
    allBiz.forEach(b => { const loc = b.location || 'Unknown'; map[loc] = (map[loc] || 0) + 1; });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allBiz]);

  const inspPieData = useMemo(() => {
    const passed   = allInspections.filter(i => i.status === 'PASSED').length;
    const violated = allInspections.filter(i => i.status === 'WITH VIOLATION').length;
    if (!passed && !violated) return [];
    return [{ name: 'Passed', value: passed }, { name: 'With Violation', value: violated }];
  }, [allInspections]);

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
    </div>
  );

  // chart card dimensions
  const CHART_H = 300;

  return (
    <div className="space-y-8 pb-12">
      <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {stats.map(({ label, value, href, accent }) => {
          const { border, text } = ACCENT[accent] ?? ACCENT.emerald;
          return (
            <Link key={label} to={href}
              className={`group bg-white rounded-xl border border-gray-100 border-l-4 ${border} shadow-sm p-5 hover:shadow-md transition-all`}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
              <p className={`text-3xl font-bold ${text} group-hover:opacity-80 transition-opacity`}>{value}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Top Business Lines <span className="text-gray-300 font-normal normal-case">(top 10)</span>
          </p>
          {bizLineChartData.length === 0
            ? <div className="flex items-center justify-center text-gray-300 text-sm" style={{ height: CHART_H }}>No data</div>
            : (
              <ResponsiveContainer width="100%" height={CHART_H}>
                <BarChart data={bizLineChartData} margin={{ top: 4, right: 8, left: -16, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" fill={PALETTE.darkest} radius={[4, 4, 0, 0]}>
                    {haulerChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Hauler Distribution</p>
          {haulerChartData.length === 0
            ? <div className="flex items-center justify-center text-gray-300 text-sm" style={{ height: CHART_H }}>No data</div>
            : (
              <ResponsiveContainer width="100%" height={CHART_H}>
                <BarChart data={haulerChartData} margin={{ top: 4, right: 8, left: -16, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {haulerChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Applications per Barangay
            <span className="text-gray-300 font-normal normal-case ml-1">({barangayPieData.length} barangays)</span>
          </p>
          {barangayPieData.length === 0
            ? <div className="flex items-center justify-center text-gray-300 text-sm" style={{ height: CHART_H }}>No data</div>
            : (
              <ResponsiveContainer width="100%" height={CHART_H}>
                <PieChart>
                  <Pie
                    data={barangayPieData}
                    cx="50%" cy="42%"
                    innerRadius={55}
                    outerRadius={95}
                    dataKey="value"
                    paddingAngle={1}
                  >
                    {barangayPieData.map((_, i) => (
                      <Cell key={i} fill={BARANGAY_SHADES[i % BARANGAY_SHADES.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v} businesses`, name]} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 9, color: '#6B7280', paddingTop: 6, maxHeight: 64, overflowY: 'auto' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Inspection Results</p>
          {inspPieData.length === 0
            ? <div className="flex items-center justify-center text-gray-300 text-sm" style={{ height: CHART_H }}>No inspection data yet</div>
            : (
              <ResponsiveContainer width="100%" height={CHART_H}>
                <PieChart>
                  <Pie
                    data={inspPieData}
                    cx="50%" cy="42%"
                    innerRadius={55}
                    outerRadius={95}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {inspPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v} inspections`, name]} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 12, color: '#6B7280', paddingTop: 6 }}
                    formatter={(value, entry) => (
                      <span style={{ fontSize: 12, color: '#374151' }}>
                        {value} — {entry.payload.value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;