import React from 'react';
import { Megaphone } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';
import { getVariant } from '../config/dashboardVariants';

const INDUSTRY_KEYS = ['architecture', 'interiors', 'construction', 'real_estate'];

// Announcements from the BeeBark team
const Official = () => {
  const { user } = useAuth();
  const industry = INDUSTRY_KEYS.find((i) => (user?.industries || []).includes(i)) || 'general';
  const v = getVariant(industry, user?.role === 'student' ? 'student' : 'professional');
  const posts = [
    { when: 'Pinned', text: v.official },
    { when: 'Getting started', text: 'Complete your profile and add one project. Profiles with work on them get noticed by clients, studios and recruiters far more often.' },
    { when: 'Tip', text: 'Connect with people you have worked with first: colleagues, classmates, clients and suppliers. A warm network grows faster.' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <TopBar />
      <main className="mt-16 p-4 sm:p-6 lg:ml-64 lg:p-8">
        <h1 className="font-display text-3xl font-black tracking-tight text-black">@BeeBark Official</h1>
        <p className="mt-2 text-slate-600">Announcements and tips from the BeeBark team.</p>
        <ul className="mt-6 max-w-2xl space-y-4">
          {posts.map((p) => (
            <li key={p.text} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-400"><Megaphone className="h-5 w-5 text-black" /></span>
              <div>
                <p className="font-semibold text-black">BeeBark Official <span className="font-normal text-slate-500">· {p.when}</span></p>
                <p className="mt-1 leading-relaxed text-slate-700">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
};

export default Official;
