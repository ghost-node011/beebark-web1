import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { FiCheckCircle, FiTrendingUp, FiArrowRight, FiZap, FiCircle } from 'react-icons/fi';
import { API_URL } from '../config/api';
import { getCopy } from '../config/roleDomainCopy';

const timeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// Route the top suggestion to wherever it's actually actionable
const suggestionLink = (text = '', copy) => {
  const t = text.toLowerCase();
  if (t.includes('portfolio') || t.includes('photo')) return { to: '/portfolio', label: `Go to ${copy.domain === 'real_estate' ? 'Listings' : 'Portfolio'}` };
  if (t.includes('resume')) return { to: '/jobs', label: `Go to ${copy.jobsLabel}` };
  if (t.includes('connect') || t.includes('messag')) return { to: '/connections', label: `Go to ${copy.connectionsLabel}` };
  return null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [completion, setCompletion] = useState(null);
  const copy = getCopy(user);

  useEffect(() => {
    axios.get(`${API_URL}/api/profile/insights`)
      .then((res) => setInsights(res.data))
      .catch(() => setInsights(null))
      .finally(() => setLoadingInsights(false));

    axios.get(`${API_URL}/api/profile/completion`)
      .then((res) => setCompletion(res.data))
      .catch(() => setCompletion(null));
  }, []);

  const connectionCount = insights?.metrics?.connectionCount ?? (user?.connections?.length || 0);
  const topSuggestion = insights?.improvements?.[0];
  const topSuggestionLink = topSuggestion ? suggestionLink(topSuggestion, copy) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <TopBar />

      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        {completion && completion.percent < 100 && (
          <Link
            to="/profile"
            className="mb-6 block rounded-xl border border-yellow-200 bg-yellow-50 p-4 hover:bg-yellow-100 transition-colors"
            data-testid="dashboard-profile-completion"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm font-semibold text-black">Profile {completion.percent}% complete</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-700 shrink-0">
                Complete now<FiArrowRight />
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-yellow-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-yellow-400 transition-all"
                style={{ width: `${completion.percent}%` }}
              />
            </div>
            {completion.missing?.length > 0 && (
              <ul className="mt-3 space-y-1">
                {completion.missing.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <FiCircle className="text-slate-300 shrink-0" />{item}
                  </li>
                ))}
              </ul>
            )}
          </Link>
        )}

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">{timeGreeting()}, {user?.name}.</h1>
          <p className="text-slate-600">{insights?.greeting || copy.dashboardSubtitle}</p>
        </div>

        {!loadingInsights && topSuggestion && (
          <Card className="mb-6 bg-black text-white border-0">
            <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <FiZap className="text-yellow-400 mt-1 shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50 mb-1">Suggested next step</p>
                  <p className="font-medium">{topSuggestion}</p>
                </div>
              </div>
              {topSuggestionLink && (
                <Link to={topSuggestionLink.to} className="inline-flex items-center gap-2 bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg whitespace-nowrap hover:bg-yellow-500 transition">
                  {topSuggestionLink.label}<FiArrowRight />
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold mb-4">Your Analysis</h3>
                {loadingInsights ? (
                  <p className="text-sm text-slate-500">Analyzing your activity...</p>
                ) : (
                  <div className="space-y-6">
                    {insights?.wins?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">What's going well</p>
                        <ul className="space-y-2">
                          {insights.wins.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <FiCheckCircle className="text-green-500 mt-0.5 shrink-0" />{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {insights?.improvements?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700 mb-2">What to do better</p>
                        <ul className="space-y-2">
                          {insights.improvements.map((imp, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <FiTrendingUp className="text-yellow-500 mt-0.5 shrink-0" />{imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!insights && <p className="text-sm text-slate-500">Couldn't load your analysis right now.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold mb-4">Network Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Connections</span>
                    <span className="font-bold">{connectionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 capitalize">{copy.workNounPlural === 'work' ? 'Portfolio entries' : copy.workNounPlural}</span>
                    <span className="font-bold">{insights?.metrics?.portfolioCount ?? '—'}</span>
                  </div>
                  {typeof insights?.metrics?.resumeScore === 'number' && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Resume score</span>
                      <span className="font-bold">{insights.metrics.resumeScore}/100</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
