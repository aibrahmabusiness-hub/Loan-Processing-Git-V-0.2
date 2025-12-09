import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { UserPlus, Trash2 } from 'lucide-react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('FIELD_AGENT');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    // We query our public users_metadata table
    const { data } = await supabase.from('users_metadata').select('*');
    if (data) setUsers(data as UserProfile[]);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // CRITICAL FIX: Create a temporary client that does NOT persist the session.
      // This prevents the Admin from being logged out when creating a new user.
      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // 1. Create Auth User using the temp client
      const { data, error } = await tempClient.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            full_name: newUserName, // This is passed to the trigger
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // 2. The trigger in SQL creates the metadata row. 
        // We wait briefly and then ensure the Role is set correctly if it differs from default.
        if (newUserRole !== 'FIELD_AGENT') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await supabase.from('users_metadata').update({ 
                role: newUserRole 
            }).eq('user_id', data.user.id);
        }
        
        setShowModal(false);
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserName('');
        fetchUsers();
        alert('User created successfully!');
      }
    } catch (err: any) {
      alert('Error creating user: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <button onClick={() => setShowModal(true)} className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-slate-500 font-medium border-b">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr> : 
               users.map(u => (
                <tr key={u.user_id}>
                  <td className="px-4 py-3 font-medium">{u.full_name || 'No Name'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-green-600 font-medium">{u.status}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-red-500 hover:text-red-700 opacity-50 cursor-not-allowed" title="Delete disabled in demo"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <input required type="text" placeholder="Full Name" className="w-full border rounded p-2" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
              <input required type="email" placeholder="Email" className="w-full border rounded p-2" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
              <input required type="password" placeholder="Password" className="w-full border rounded p-2" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
              <select className="w-full border rounded p-2" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                <option value="FIELD_AGENT">Field Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
              <div className="flex justify-end gap-2 mt-4">
                 <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                 <button type="submit" className="px-4 py-2 bg-primary text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};