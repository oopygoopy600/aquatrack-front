import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface print:bg-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-col lg:pl-72 print:pl-0">
        <Topbar onMenu={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
          <Outlet />
        </main>

        <footer className="mx-auto w-full max-w-[1500px] px-4 pb-6 sm:px-6 lg:px-8 print:hidden">
          <div className="flex flex-col gap-1 border-t border-slate-200/70 pt-4 text-[11px] text-navy-700/50 sm:flex-row sm:items-center sm:justify-between">
            <p>AquaTrack · Water Refilling Station Management &amp; Analytics</p>
            <p>
              Figures come from the <span className="font-semibold text-navy-700/70">simulated demo dataset</span>{' '}
              stored in PostgreSQL.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
