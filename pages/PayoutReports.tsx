import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { PayoutReport } from '../types';
import { exportToExcel, openOutlook } from '../utils/excelExport';
import { Plus, Download, Mail, X, Save } from 'lucide-react';
import { OUR_REGIONS } from '../constants';

export const PayoutReports: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [reports, setReports] = useState<PayoutReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Default to current month YYYY-MM
  const initialFormState: Partial<PayoutReport> = {
    month: new Date().toISOString().slice(0, 7), 
    customer_name: '',
    location: '',
    financier: '',
    our_region: OUR_REGIONS[0],
    loan_amount: 0,
    payout_percentage: 0,
    amount_paid: 0,
    less_tds: 0,
    nett_amount: 0,
    beneficiary_name: '',
    account_no: '',
    ifsc_code: '',
    bank_name: '',
    pan_no: '',
    sm_name: '',
    contact_no: '',
    mail_sent: '',
    payment_status: 'Pending'
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchReports = async () => {
    try {
      let query = supabase.from('payout_reports').select('*');
      if (!isAdmin && profile) {
        query = query.eq('created_by_user_id', profile.user_id);
      }
      const { data: reportData, error: reportError } = await query;
      if (reportError) throw reportError;

      // Fetch user names for "Created By" column
      const { data: userData } = await supabase.from('users_metadata').select('user_id, full_name');
      const userMap: Record<string, string> = {};
      userData?.forEach((u: any) => {
        userMap[u.user_id] = u.full_name;
      });

      // Map reports to include creator name
      const enhancedReports = (reportData || []).map((r: PayoutReport) => ({
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

  const calculateAmounts = (updatedData: Partial<PayoutReport>) => {
     // Simple auto-calculation logic
     const amt = Number(updatedData.loan_amount || 0);
     const pct = Number(updatedData.payout_percentage || 0);
     const paid = (amt * pct) / 100;
     const tds = paid * 0.1; // Assuming 10% TDS default logic
     const nett = paid - tds;

     return {
         ...updatedData,
         amount_paid: paid,
         less_tds: tds,
         nett_amount: nett
     };
  };

  const handleInputChange = (field: keyof PayoutReport, value: any) => {
      const newData = { ...formData, [field]: value };
      if (['loan_amount', 'payout_percentage'].includes(field)) {
          setFormData(calculateAmounts(newData));
      } else {
          setFormData(newData);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const payload = { ...formData, created_by_user_id: profile.user_id };

    if (!isEditing) {
        delete (payload as any).id;
        delete (payload as any).created_at;
    }

    try {
      const { error } = isEditing 
        ? await supabase.from('payout_reports').update(payload).eq('id', formData.id)
        : await supabase.from('payout_reports').insert([payload]);

      if (error) throw error;
      setShowModal(false);
      fetchReports();
    } catch (err: any) {
      console.error(err);
      alert('Error saving report:\n' + (err.message || JSON.stringify(err)));
    }
  };

  const handleEdit = (report: PayoutReport) => {
    setFormData(report);
    setIsEditing(true);
    setShowModal(true);
  };

  const getMonthName = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + '-01'); // Append day to make it valid date
    return date.toLocaleString('default', { month: 'short' });
  };

  const handleExport = () => {
    // Transform data to match exact Excel structure requirements
    const dataToExport = reports.map((r, index) => ({
      'Sr No': index + 1,
      'Name': r.customer_name,
      'Month': getMonthName(r.month),
      'Location': r.location,
      'Financier': r.financier,
      'Our Region': r.our_region,
      'Loan Amount': r.loan_amount,
      'Payout %': r.payout_percentage + '%',
      'Amount paid': r.amount_paid,
      'less TDS': r.less_tds,
      'Nett': r.nett_amount,
      'Name as per Bank Account Holder 1': r.beneficiary_name,
      'A/C No': r.account_no,
      'IFSC': r.ifsc_code,
      'Bank': r.bank_name,
      'PAN': r.pan_no,
      'SM NAME': r.sm_name,
      'CUSTOMER CONTACT NO.': r.contact_no,
      'Mail sent to Accounts/Paid': r.mail_sent,
      'Payment status': r.payment_status,
      'Created By': r.creator_name || 'System'
    }));

    exportToExcel(dataToExport, 'Payout_Reports');
  };

  const handleEmail = () => {
    if (confirm("This will download the Excel file first. Please attach it manually in the Outlook window that opens next.")) {
      handleExport();
      setTimeout(() => openOutlook('', 'Payout Report', 'Attached is the payout report.'), 1000);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Payout Reports</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setIsEditing(false); setFormData(initialFormState); setShowModal(true); }} className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <Plus size={16} /> New Payout
          </button>
          <button onClick={handleExport} className="bg-white border hover:bg-gray-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <Download size={16} /> Export
          </button>
           {isAdmin && (
            <button onClick={handleEmail} className="bg-white border hover:bg-gray-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
              <Mail size={16} /> Send Email
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-gray-50 text-slate-500 font-medium border-b uppercase">
              <tr>
                <th className="px-3 py-3 border-r">Sr No</th>
                <th className="px-3 py-3 border-r">Name</th>
                <th className="px-3 py-3 border-r">Month</th>
                <th className="px-3 py-3 border-r">Location</th>
                <th className="px-3 py-3 border-r">Financier</th>
                <th className="px-3 py-3 border-r">Our Region</th>
                <th className="px-3 py-3 border-r">Loan Amount</th>
                <th className="px-3 py-3 border-r">Payout %</th>
                <th className="px-3 py-3 border-r">Amount paid</th>
                <th className="px-3 py-3 border-r lowercase">less TDS</th>
                <th className="px-3 py-3 border-r">Nett</th>
                <th className="px-3 py-3 border-r">Name as per Bank Account Holder 1</th>
                <th className="px-3 py-3 border-r">A/C No</th>
                <th className="px-3 py-3 border-r">IFSC</th>
                <th className="px-3 py-3 border-r">Bank</th>
                <th className="px-3 py-3 border-r">PAN</th>
                <th className="px-3 py-3 border-r">SM NAME</th>
                <th className="px-3 py-3 border-r">CUSTOMER CONTACT NO.</th>
                <th className="px-3 py-3 border-r">Mail sent to Accounts/Paid</th>
                <th className="px-3 py-3 border-r">Payment status</th>
                <th className="px-3 py-3 border-r">Created By</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
               {loading ? (
                <tr><td colSpan={22} className="p-4 text-center">Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={22} className="p-4 text-center text-slate-500">No data found.</td></tr>
              ) : (
                reports.map((report, index) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 border-r text-center">{index + 1}</td>
                    <td className="px-3 py-2 border-r font-medium text-slate-800 uppercase">{report.customer_name}</td>
                    <td className="px-3 py-2 border-r text-red-500 font-medium">{getMonthName(report.month)}</td>
                    <td className="px-3 py-2 border-r uppercase">{report.location}</td>
                    <td className="px-3 py-2 border-r uppercase">{report.financier}</td>
                    <td className="px-3 py-2 border-r uppercase">{report.our_region}</td>
                    <td className="px-3 py-2 border-r">₹{report.loan_amount?.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 border-r">{report.payout_percentage}%</td>
                    <td className="px-3 py-2 border-r">{report.amount_paid?.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 border-r text-red-600">{report.less_tds?.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 border-r font-bold text-green-700">{report.nett_amount?.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 border-r uppercase">{report.beneficiary_name}</td>
                    <td className="px-3 py-2 border-r font-mono text-xs">{report.account_no}</td>
                    <td className="px-3 py-2 border-r font-mono text-xs uppercase">{report.ifsc_code}</td>
                    <td className="px-3 py-2 border-r uppercase">{report.bank_name}</td>
                    <td className="px-3 py-2 border-r uppercase">{report.pan_no}</td>
                    <td className="px-3 py-2 border-r uppercase">{report.sm_name}</td>
                    <td className="px-3 py-2 border-r">{report.contact_no}</td>
                    <td className="px-3 py-2 border-r uppercase font-medium">{report.mail_sent}</td>
                    <td className="px-3 py-2 border-r uppercase font-medium text-blue-800">{report.payment_status}</td>
                    <td className="px-3 py-2 border-r text-xs text-slate-500">{report.creator_name}</td>
                    <td className="px-3 py-2 text-right sticky right-0 bg-white shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.1)]">
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

       {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">{isEditing ? 'Edit Payout' : 'New Payout'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Basic Details */}
              <div className="lg:col-span-3 pb-2 border-b mb-2 text-slate-500 font-semibold text-xs uppercase tracking-wider">Basic Info</div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Month</label>
                <input required type="month" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.month} onChange={e => handleInputChange('month', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.customer_name} onChange={e => handleInputChange('customer_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.location} onChange={e => handleInputChange('location', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Financier</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.financier} onChange={e => handleInputChange('financier', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Our Region</label>
                <select className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.our_region} onChange={e => handleInputChange('our_region', e.target.value)}>
                    {OUR_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Financials */}
              <div className="lg:col-span-3 pb-2 border-b mt-4 mb-2 text-slate-500 font-semibold text-xs uppercase tracking-wider">Financials</div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loan Amount (₹)</label>
                <input required type="number" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.loan_amount} onChange={e => handleInputChange('loan_amount', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payout %</label>
                <input required type="number" step="0.01" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.payout_percentage} onChange={e => handleInputChange('payout_percentage', Number(e.target.value))} />
              </div>
              <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-blue-50 p-2 rounded-lg border border-blue-100 flex flex-col justify-center">
                 <div className="flex justify-between text-xs text-slate-600"><span>Paid:</span> <span>{formData.amount_paid?.toFixed(2)}</span></div>
                 <div className="flex justify-between text-xs text-red-500"><span>TDS (10%):</span> <span>-{formData.less_tds?.toFixed(2)}</span></div>
                 <div className="flex justify-between text-sm font-bold text-green-700 mt-1 border-t border-blue-200 pt-1"><span>Nett:</span> <span>₹{formData.nett_amount?.toLocaleString('en-IN')}</span></div>
              </div>

              {/* Bank Details */}
              <div className="lg:col-span-3 pb-2 border-b mt-4 mb-2 text-slate-500 font-semibold text-xs uppercase tracking-wider">Bank Details</div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name as per Bank Account Holder 1</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.beneficiary_name} onChange={e => handleInputChange('beneficiary_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">A/C No</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.account_no} onChange={e => handleInputChange('account_no', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">IFSC</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.ifsc_code} onChange={e => handleInputChange('ifsc_code', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bank</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.bank_name} onChange={e => handleInputChange('bank_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">PAN</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.pan_no} onChange={e => handleInputChange('pan_no', e.target.value)} />
              </div>

              {/* Other Info */}
              <div className="lg:col-span-3 pb-2 border-b mt-4 mb-2 text-slate-500 font-semibold text-xs uppercase tracking-wider">Additional Info</div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SM NAME</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.sm_name} onChange={e => handleInputChange('sm_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CUSTOMER CONTACT NO.</label>
                <input required type="text" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.contact_no} onChange={e => handleInputChange('contact_no', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mail sent to Accounts/Paid</label>
                <input type="text" placeholder="e.g. SENT ON 07-01-2025" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.mail_sent} onChange={e => handleInputChange('mail_sent', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment status</label>
                <input type="text" placeholder="e.g. PAID ON 07-01-2025" className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500" value={formData.payment_status} onChange={e => handleInputChange('payment_status', e.target.value)} />
              </div>

              <div className="lg:col-span-3 pt-6 flex justify-end gap-3 border-t mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
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