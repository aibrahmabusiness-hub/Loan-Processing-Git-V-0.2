import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileCheck, 
  Banknote, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Building2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { HeaderDetails } from '../types';

export const Layout: React.FC = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const [headerInfo, setHeaderInfo] = useState<HeaderDetails | null>(null);

  useEffect(() => {
    // Fetch header details for logo/company name
    const fetchHeader = async () => {
      const { data } = await supabase.from('header_details').select('*').single();
      if (data) setHeaderInfo(data);
    };
    fetchHeader();
  }, []);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Inspections', icon: FileCheck, path: '/inspections' },
    { label: 'Payouts', icon: Banknote, path: '/payouts' },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Users', icon: Users, path: '/users' });
    navItems.push({ label: 'Settings', icon: Settings, path: '/settings' });
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b z-20 px-4 py-3 flex justify-between items-center h-16">
        <div className="flex items-center gap-2 font-bold text-primary truncate">
           {headerInfo?.logo_url ? (
             <img src={headerInfo.logo_url} alt="Logo" className="h-8 w-8 object-contain" />
           ) : (
             <Building2 className="h-6 w-6" />
           )}
           <span className="truncate">{headerInfo?.company_name || 'Loan System'}</span>
        </div>
        <button onClick={toggleSidebar} className="p-2 text-gray-600">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar - Desktop & Mobile Drawer */}
      <aside 
        className={`
          fixed md:relative z-30 h-full w-64 bg-white border-r shadow-sm transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 flex flex-col justify-between pt-16 md:pt-0
        `}
      >
        <div>
          <div className="hidden md:flex items-center gap-3 px-6 h-16 border-b">
            <div className="bg-blue-100 p-1.5 rounded-lg">
               {headerInfo?.logo_url ? (
                 <img src={headerInfo.logo_url} alt="Logo" className="h-6 w-6 object-contain" />
               ) : (
                 <Building2 className="h-6 w-6 text-primary" />
               )}
            </div>
            <span className="font-bold text-slate-800 text-sm">{headerInfo?.company_name || 'Loan Agency'}</span>
          </div>

          <div className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-primary border border-blue-100' 
                      : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'}
                  `}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-blue-200 flex items-center justify-center text-primary font-bold">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{profile?.full_name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{profile?.role.replace('_', ' ').toLowerCase()}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0 relative w-full">
        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-10 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
