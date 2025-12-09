import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend 
} from 'recharts';
import { 
  FileText, IndianRupee, AlertCircle, CheckCircle, 
  Calendar, MapPin, Filter, TrendingUp, Building2, DollarSign
} from 'lucide-react';
import { BOB_REGIONS } from '../constants';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Dashboard: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'INSPECTION' | 'PAYOUT'>('INSPECTION');
  const [loading, setLoading] = useState(true);

  // Raw Data
  const [rawInspections, setRawInspections] = useState<any[]>([]);
  const [rawPayouts, setRawPayouts] = useState<any[]>([]);

  // Filters
  const [filterRegion, setFilterRegion] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Processed Stats
  const [stats, setStats] = useState({
    totalInspections: 0,
    inspectionVolume: 0,
    pendingReports: 0,
    positiveRemarks: 0,
    
    totalPayoutAmount: 0,
    totalNettPaid: 0,
    tdsDeducted: 0,
    pendingPayouts: 0
  });

  // Chart Data
  const [trendData, setTrendData] = useState<any[]>([]);
  const [regionData, setRegionData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [financierData, setFinancierData] = useState<any[]>([]);

  useEffect(() => {
    fetchBaseData();
  }, [profile]);

  useEffect(() => {
    processData();
  }, [rawInspections, rawPayouts, activeTab, filterRegion, startDate, endDate]);

  const fetchBaseData = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      let inspQuery = supabase.from('field_inspection_reports').select('*');
      let payQuery = supabase.from('payout_reports').select('*');

      if (!isAdmin) {
        inspQuery = inspQuery.eq('created_by_user_id', profile.user_id);
        payQuery = payQuery.eq('created_by_user_id', profile.user_id);
      }

      const [inspRes, payRes] = await Promise.all([inspQuery, payQuery]);
      
      if (inspRes.data) setRawInspections(inspRes.data);
      if (payRes.data) setRawPayouts(payRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processData = () => {
    // 1. Filter Data
    let filteredInspections = rawInspections;
    let filteredPayouts = rawPayouts;

    if (filterRegion) {
      filteredInspections = filteredInspections.filter(i => i.bob_region === filterRegion || i.our_region === filterRegion);
      filteredPayouts = filteredPayouts.filter(p => p.our_region === filterRegion);
    }
    if (startDate) {
      filteredInspections = filteredInspections.filter(i => i.date >= startDate);
      filteredPayouts = filteredPayouts.filter(p => (p.month + '-01') >= startDate);
    }
    if (endDate) {
      filteredInspections = filteredInspections.filter(i => i.date <= endDate);
      filteredPayouts = filteredPayouts.filter(p => (p.month + '-01') <= endDate);
    }

    // 2. Calculate KPIs
    const totalInspVol = filteredInspections.reduce((sum, i) => sum + (Number(i.loan_amount) || 0), 0);
    const positiveCount = filteredInspections.filter(i => i.lar_remarks?.toLowerCase().includes('yes') || i.lar_remarks?.toLowerCase().includes('positive')).length;
    
    const totalPayoutAmt = filteredPayouts.reduce((sum, p) => sum + (Number(p.loan_amount) || 0), 0);
    const totalNett = filteredPayouts.reduce((sum, p) => sum + (Number(p.nett_amount) || 0), 0);
    const totalTDS = filteredPayouts.reduce((sum, p) => sum + (Number(p.less_tds) || 0), 0);

    setStats({
      totalInspections: filteredInspections.length,
      inspectionVolume: totalInspVol,
      pendingReports: filteredInspections.filter(i => i.invoice_status === 'Pending').length,
      positiveRemarks: positiveCount,

      totalPayoutAmount: totalPayoutAmt,
      totalNettPaid: totalNett,
      tdsDeducted: totalTDS,
      pendingPayouts: filteredPayouts.filter(p => p.payment_status === 'Pending').length
    });

    // 3. Prepare Chart Data based on Active Tab
    if (activeTab === 'INSPECTION') {
      // Trend: Inspections by Date
      const dateMap: any = {};
      filteredInspections.forEach(i => {
        const d = new Date(i.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        dateMap[d] = (dateMap[d] || 0) + 1;
      });
      setTrendData(Object.keys(dateMap).map(k => ({ name: k, count: dateMap[k] })));

      // Bar: Volume by Region
      const regMap: any = {};
      filteredInspections.forEach(i => {
        const r = i.bob_region || 'Unknown';
        regMap[r] = (regMap[r] || 0) + (Number(i.loan_amount) || 0);
      });
      setRegionData(Object.keys(regMap).slice(0, 8).map(k => ({ name: k.replace(' REGION', ''), value: regMap[k] })));

      // Pie: Status
      const statusCounts = {
        'Cleared': filteredInspections.filter(i => i.invoice_status === 'Cleared').length,
        'Raised': filteredInspections.filter(i => i.invoice_status === 'Raised').length,
        'Pending': filteredInspections.filter(i => i.invoice_status === 'Pending').length,
      };
      setStatusData(Object.keys(statusCounts).map(k => ({ name: k, value: (statusCounts as any)[k] })));

    } else {
      // PAYOUT LOGIC
      
      // Trend: Payouts by Month
      const monthMap: any = {};
      filteredPayouts.forEach(p => {
        const m = p.month; // YYYY-MM
        monthMap[m] = (monthMap[m] || 0) + (Number(p.nett_amount) || 0);
      });
      setTrendData(Object.keys(monthMap).sort().map(k => ({ name: k, amount: monthMap[k] })));

      // Bar: By Financier
      const finMap: any = {};
      filteredPayouts.forEach(p => {
        const f = p.financier || 'Other';
        finMap[f] = (finMap[f] || 0) + (Number(p.nett_amount) || 0);
      });
      setFinancierData(Object.keys(finMap).map(k => ({ name: k, amount: finMap[k] })));

      // Pie: Payment Status
      const payStatusMap = {
        'Paid': filteredPayouts.filter(p => p.payment_status && p.payment_status.toLowerCase().includes('paid')).length,
        'Pending': filteredPayouts.filter(p => !p.payment_status || p.payment_status === 'Pending').length
      };
      setStatusData(Object.keys(payStatusMap).map(k => ({ name: k, value: (payStatusMap as any)[k] })));
    }
  };

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const KPI = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        {sub && <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">{sub}</span>}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        <p className="text-sm text-slate-500 font-medium mt-1">{title}</p>
      </div>
    </div>
  );

  if (loading) return <div className="p-8 flex justify-center text-slate-500">Loading Dashboard Analytics...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Smart Filters */}
      <div className="bg-white p-4 rounded-xl border shadow-sm sticky top-0 z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Operational Overview</h1>
            <p className="text-xs text-slate-500">Real-time insights across all regions</p>
          </div>
          
          {/* Smart Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
             <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2 text-sm w-full md:w-auto">
                <Filter className="h-4 w-4 text-slate-400" />
                <select 
                  className="bg-transparent outline-none text-slate-700 w-full"
                  value={filterRegion}
                  onChange={e => setFilterRegion(e.target.value)}
                >
                  <option value="">All Regions</option>
                  {BOB_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
             </div>
             
             <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2 text-sm w-full md:w-auto">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input 
                  type="date" 
                  className="bg-transparent outline-none text-slate-700 w-28"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <span className="text-slate-300">to</span>
                <input 
                  type="date" 
                  className="bg-transparent outline-none text-slate-700 w-28"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
             </div>
             
             {(filterRegion || startDate || endDate) && (
                <button 
                  onClick={() => { setFilterRegion(''); setStartDate(''); setEndDate(''); }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap px-2"
                >
                  Clear
                </button>
             )}
          </div>
        </div>

        {/* Dashboard Toggle Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-full md:w-auto inline-flex">
          <button
            onClick={() => setActiveTab('INSPECTION')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'INSPECTION' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={16} /> Inspection Report
          </button>
          <button
            onClick={() => setActiveTab('PAYOUT')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'PAYOUT' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <IndianRupee size={16} /> Payout Analytics
          </button>
        </div>
      </div>

      {/* INSPECTION DASHBOARD */}
      {activeTab === 'INSPECTION' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI title="Total Cases" value={stats.totalInspections} icon={FileText} color="bg-blue-500 text-blue-500" />
            <KPI title="Total Loan Volume" value={formatINR(stats.inspectionVolume)} icon={TrendingUp} color="bg-green-500 text-green-500" />
            <KPI title="Pending Invoices" value={stats.pendingReports} icon={AlertCircle} color="bg-orange-500 text-orange-500" />
            <KPI title="Positive Reports" value={stats.positiveRemarks} sub={`${((stats.positiveRemarks/stats.totalInspections)*100 || 0).toFixed(0)}% Rate`} icon={CheckCircle} color="bg-teal-500 text-teal-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Daily Trend */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Inspection Trend</h3>
              <div className="h-[300px] w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Regional Volume */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Loan Volume by Region</h3>
              <div className="h-[300px] w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fill: '#64748b', fontSize: 11}} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      formatter={(value: any) => formatINR(value)}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
             {/* Chart 3: Invoice Status */}
             <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Invoice Status Distribution</h3>
              <div className="h-[300px] w-full min-h-[300px] flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYOUT DASHBOARD */}
      {activeTab === 'PAYOUT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI title="Total Payout Value" value={formatINR(stats.totalNettPaid)} icon={IndianRupee} color="bg-emerald-500 text-emerald-500" />
            <KPI title="TDS Deducted" value={formatINR(stats.tdsDeducted)} icon={FileText} color="bg-red-500 text-red-500" />
            <KPI title="Gross Loan Amount" value={formatINR(stats.totalPayoutAmount)} icon={DollarSign} color="bg-blue-500 text-blue-500" />
            <KPI title="Pending Payments" value={stats.pendingPayouts} icon={AlertCircle} color="bg-orange-500 text-orange-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Chart: Monthly Payout Trend */}
             <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Monthly Payout Trend</h3>
              <div className="h-[300px] w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip formatter={(value: any) => formatINR(value)} />
                    <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart: Financier Breakdown */}
             <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Payouts by Financier</h3>
              <div className="h-[300px] w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financierData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} interval={0} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip formatter={(value: any) => formatINR(value)} />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart: Payment Status */}
            <div className="bg-white p-6 rounded-xl border shadow-sm lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Payment Status Overview</h3>
              <div className="flex flex-col md:flex-row items-center justify-around h-[300px]">
                 <div className="w-full md:w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="middle" align="right" layout="vertical" />
                      </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="w-full md:w-1/2 flex flex-col gap-4 p-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                       <p className="text-sm text-green-600 font-bold">Total Paid Cases</p>
                       <p className="text-2xl font-bold text-slate-800">{statusData.find(d => d.name === 'Paid')?.value || 0}</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                       <p className="text-sm text-orange-600 font-bold">Total Pending Cases</p>
                       <p className="text-2xl font-bold text-slate-800">{statusData.find(d => d.name === 'Pending')?.value || 0}</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};