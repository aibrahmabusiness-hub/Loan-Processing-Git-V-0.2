import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const [details, setDetails] = useState({
    id: '',
    company_name: '',
    address: '',
    contact_email: '',
    logo_url: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch the single row (limit 1)
    supabase.from('header_details').select('*').limit(1).single()
      .then(({ data }) => {
        if (data) setDetails(data);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let error;
    
    if (details.id) {
        // Update existing
        const { error: err } = await supabase
            .from('header_details')
            .update({
                company_name: details.company_name,
                address: details.address,
                contact_email: details.contact_email,
                logo_url: details.logo_url
            })
            .eq('id', details.id);
        error = err;
    } else {
        // Create new
        const { error: err, data } = await supabase
            .from('header_details')
            .insert([{
                company_name: details.company_name,
                address: details.address,
                contact_email: details.contact_email,
                logo_url: details.logo_url
            }])
            .select()
            .single();
        if (data) setDetails(data);
        error = err;
    }

    setLoading(false);
    
    if (error) {
        alert('Error saving settings: ' + error.message);
    } else {
        alert('Settings Saved');
        window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">System Settings</h1>
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
            <input className="w-full border rounded-lg p-2.5" value={details.company_name} onChange={e => setDetails({...details, company_name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea className="w-full border rounded-lg p-2.5" rows={3} value={details.address} onChange={e => setDetails({...details, address: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
            <input className="w-full border rounded-lg p-2.5" type="email" value={details.contact_email} onChange={e => setDetails({...details, contact_email: e.target.value})} />
          </div>
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
             <input className="w-full border rounded-lg p-2.5" type="text" placeholder="https://..." value={details.logo_url} onChange={e => setDetails({...details, logo_url: e.target.value})} />
             <p className="text-xs text-slate-400 mt-1">Provide a direct link to an image.</p>
          </div>
          <button disabled={loading} type="submit" className="w-full bg-primary text-white py-2 rounded-lg flex justify-center items-center gap-2 hover:bg-blue-700">
             <Save size={18} /> {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
};