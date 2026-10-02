import React from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';
import { ALL_NEWS, INDUSTRY_LABEL, unsplash } from '../config/dashboardVariants';

// BeeBark's own guidance for each industry; the user's industry is shown first.
const News = () => {
  const { user } = useAuth();
  const mine = user?.industries?.[0];
  const items = [...ALL_NEWS].sort((a, b) => (b.industry === mine) - (a.industry === mine));

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <TopBar />
      <main className="mt-16 p-4 sm:p-6 lg:ml-64 lg:p-8">
        <h1 className="font-display text-3xl font-black tracking-tight text-black">Industry News</h1>
        <p className="mt-2 text-slate-600">Practical guidance from the BeeBark team for your industry.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((n) => (
            <article key={n.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <img src={unsplash(n.image, 700)} alt="" className="h-44 w-full object-cover" />
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-yellow-700">{INDUSTRY_LABEL[n.industry]} · {n.tag}</p>
                <h2 className="font-display mt-2 text-lg font-bold leading-snug text-black">{n.title}</h2>
                <p className="mt-2 text-sm text-slate-500">BeeBark Insights</p>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
};

export default News;
