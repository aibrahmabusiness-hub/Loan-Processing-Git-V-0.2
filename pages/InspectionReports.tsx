import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { FieldInspectionReport } from '../types';
import { exportToExcel, openOutlook } from '../utils/excelExport';
import { Plus, Download, Mail, X, Save } from 'lucide-react';
import { STATES, PAYMENT_STATUSES, INVOICE_STATUSES, BOB_REGIONS, OUR_REGIONS, ZONES } from '../constants';

export const InspectionReports: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [reports, setReports] = useState<FieldInspectionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Form State
  const initialFormState: Partial<FieldInspectionReport> = {
    date: new Date().toISOString().split('T')[0],
    loan_ac_no: '',
    customer_name: '',
    loan_amount: 0,
    location: '',
    bob_region: BOB_REGIONS[0],
    our_region: OUR_REGIONS[0],
    zone: ZONES[0],
    lar_remarks: 'YES',
    state: 'Karnataka',
    payment_status: 'Pending',
    invoice_status: 'Pending'
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchReports();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, statusFilter, profile]);

  const fetchReports = async () => {
    try {
      let query = supabase.from('field_inspection_reports').select('*').order('date', { ascending: false });

      if (!isAdmin && profile) {
        query = query.eq('created_by_user_id', profile.user_id);
      }

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
      if (statusFilter) query = query.eq('payment_status', statusFilter);

      const { data: reportData, error: reportError } = await query;
      if (reportError) throw reportError;

      // Fetch user names for "Created By" column
      const { data: userData } = await supabase.from('users_metadata').select('user_id, full_name');
      const userMap: Record<string, string> = {};
      userData?.forEach((u: any) => {
        userMap[u.user_id] = u.full_name;
      });

      // Map reports to include creator name
      const enhancedReports = (reportData || []).map((r: FieldInspectionReport) => ({
        ...r,
        creator_name: userMap[r.created_by_user_id] || 'Unknown'
      }));

      setReports(enhancedReports);
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const payload = { ...formData, created_by_user_id: profile.user_id };
    payload.loan_amount = Number(payload.loan_amount);

    if (!isEditing) {
        delete (payload as any).id;
        delete (payload as any).created_at;
    }

    try {
      const { error } = isEditing 
        ? await supabase.from('field_inspection_reports').update(payload).eq('id', formData.id)
        : await supabase.from('field_inspection_reports').insert([payload]);

      if (error) throw error;
      setShowModal(false);
      setFormData(initialFormState);
      fetchReports();
    } catch (err: any) {
      console.error('Supabase Error:', err);
      alert('Error saving report:\n' + (err.message || JSON.stringify(err)));
    }
  };

  const handleEdit = (report: FieldInspectionReport) => {
    setFormData(report);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleExport = () => {
    // Transform data to match exact Excel structure requirements
    const dataToExport = reports.map((r, index) => ({
      'SL.No': index + 1,
      'Date': new Date(r.date).toLocaleDateString('en-GB'),
      'Loan A/C No': r.loan_ac_no,
      'Name': r.customer_name,
      'Loan Amount': r.loan_amount,
      'Location': r.location,
      'BOB Region': r.bob_region,
      'Our Region': r.our_region,
      'LAR Remarks': r.lar_remarks,
      'Zone': r.zone,
      'State': r.state,
      'Payment Status': r.payment_status,
      'Invoice Status': r.invoice_status,
      'Created By': r.creator_name || 'System'
    }));

    exportToExcel(dataToExport, 'Inspection_Reports');
  };

  const handleEmail = () => {
    if (confirm("This will download the Excel file first. Please attach it manually in the Outlook window that opens next.")) {
      handleExport();
      setTimeout(() => {
        openOutlook(
          '', 
          'Field Inspection Report', 
          'Please find the attached Field Inspection Report.'
        );
      }, 1000);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Field Inspection Reports</h1>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button onClick={() => { setIsEditing(false); setFormData(initialFormState); setShowModal(true); }} className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus size={16} /> New Report
          </button>
          <button onClick={handleExport} className="bg-white border hover:bg-gray-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
            <Download size={16} /> Export
          </button>
          {isAdmin && (
            <button onClick={handleEmail} className="bg-white border hover:bg-gray-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
              <Mail size={16} /> Send Email
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase">From Date</label>
          <input type="date" className="w-full border rounded-lg p-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-blue-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase">To Date</label>
          <input type="date" className="w-full border rounded-lg p-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-blue-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase">Payment Status</label>
          <select className="w-full border rounded-lg p-2 text-sm mt-1 outline-none focus:ring-2 focus:ring-blue-500" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1"></div>
        { (startDate || endDate || statusFilter) && (
          <button onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter(''); }} className="text-sm text-red-500 hover:text-red-700 font-medium">
            Clear Filters
          </button>
        )}
      </div>

      {/* Table - Responsive */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm text-left whitespace-nowrap">
            <thead className="bg-gray-50 text-slate-500 font-medium border-b uppercase">
              <tr>
                <th className="px-3 py-3 border-r">SL.No</th>
                <th className="px-3 py-3 border-r">Date</th>
                <th className="px-3 py-3 border-r">Loan A/C No</th>
                <th className="px-3 py-3 border-r">Name</th>
                <th className="px-3 py-3 border-r">Loan Amount</th>
                <th className="px-3 py-3 border-r">Location</th>
                <th className="px-3 py-3 border-r">BOB Region</th>
                <th className="px-3 py-3 border-r">Our Region</th>
                <th className="px-3 py-3 border-r">LAR Remarks</th>
                <th className="px-3 py-3 border-r">Zone</th>
                <th className="px-3 py-3 border-r">State</th>
                <th className="px-3 py-3 border-r">Payment Status</th>
                <th className="px-3 py-3 border-r">Invoice Status</th>
                <th className="px-3 py-3 border-r">Created By</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={15} className="p-4 text-center">Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={15} className="p-4 text-center text-slate-500">No reports found.</td></tr>
              ) : (
                reports.map((report, index) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 border-r text-center text-slate-500">{index + 1}</td>
                    <td className="px-3 py-3 border-r">{new Date(report.date).toLocaleDateString('en-GB')}</td>
                    <td className="px-3 py-3 border-r font-mono text-slate-600">{report.loan_ac_no}</td>
                    <td className="px-3 py-3 border-r font-medium text-slate-900">{report.customer_name}</td>
                    <td className="px-3 py-3 border-r">₹{report.loan_amount.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-3 border-r">{report.location}</td>
                    <td className="px-3 py-3 border-r">{report.bob_region}</td>
                    <td className="px-3 py-3 border-r">{report.our_region}</td>
                    <td className="px-3 py-3 border-r">{report.lar_remarks}</td>
                    <td className="px-3 py-3 border-r">{report.zone}</td>
                    <td className="px-3 py-3 border-r">{report.state}</td>
                    <td className="px-3 py-3 border-r text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        report.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                        report.payment_status === 'Overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {report.payment_status}
                      </span>
                    </td>
                    <td className="px-3 py-3 border-r text-center">
                       <span className="text-xs font-medium text-slate-600">{report.invoice_status}</span>
                    </td>
                    <td className="px-3 py-3 border-r text-slate-500 text-xs">{report.creator_name}</td>
                    <td className="px-3 py-3 text-right sticky right-0 bg-white">
                      { (isAdmin || report.created_by_user_id === profile?.user_id) && (
                        <button onClick={() => handleEdit(report)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Edit</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">{isEditing ? 'Edit Report' : 'New Inspection Report'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                <input required type="date" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loan A/C No</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.loan_ac_no} onChange={e => setFormData({...formData, loan_ac_no: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Customer Name</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loan Amount (₹)</label>
                <input required type="number" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.loan_amount} onChange={e => setFormData({...formData, loan_amount: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">BOB Region</label>
                <select className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.bob_region} onChange={e => setFormData({...formData, bob_region: e.target.value})}>
                  {BOB_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Our Region</label>
                <select className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.our_region} onChange={e => setFormData({...formData, our_region: e.target.value})}>
                  {OUR_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Zone</label>
                <select className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})}>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">State</label>
                <select className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})}>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">LAR Remarks</label>
                <input type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.lar_remarks} onChange={e => setFormData({...formData, lar_remarks: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Status</label>
                <select className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.payment_status} onChange={e => setFormData({...formData, payment_status: e.target.value as any})}>
                  {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
               <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Invoice Status</label>
                <select className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.invoice_status} onChange={e => setFormData({...formData, invoice_status: e.target.value as any})}>
                  {INVOICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <div className="md:col-span-2 lg:col-span-3 pt-6 flex justify-end gap-3 border-t mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 border rounded-lg text-slate-700 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
                  <Save size={18} /> Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};