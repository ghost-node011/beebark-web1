import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FiCalendar, FiCheckCircle, FiTrendingUp } from 'react-icons/fi';
import { API_URL } from '../config/api';

const timeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const Dashboard = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/profile/insights`)
      .then((res) => setInsights(res.data))
      .catch(() => setInsights(null))
      .finally(() => setLoadingInsights(false));
  }, []);

  const connectionCount = insights?.metrics?.connectionCount ?? (user?.connections?.length || 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <TopBar />

      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">{timeGreeting()}, {user?.name}.</h1>
          <p className="text-slate-600">{insights?.greeting || "Here's what's happening with your network today."}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="card-yellow">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 max-w-[140px] gap-4">
                  <Button className="btn-black flex-col h-24">
                    <FiCalendar className="w-6 h-6 mb-2" />
                    <span>Schedule</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

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

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold mb-4">Upcoming Events</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <FiCalendar className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-semibold">Design Workshop</span>
                    </div>
                    <p className="text-xs text-slate-600">Wed 20 Sept, Online</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold mb-4">Network Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Connections</span>
                    <span className="font-bold">{connectionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Portfolio entries</span>
                    <span className="font-bold">{insights?.metrics?.portfolioCount ?? '—'}</span>
                  </div>
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
