import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { FiCalendar } from 'react-icons/fi';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    connections: 0,
    posts: 0,
    messages: 0
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <TopBar />
      
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-slate-600">Here's what's happening with your network today.</p>
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
                <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg">
                      <Avatar>
                        <AvatarFallback className="bg-yellow-400 text-black">U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">New connection request</p>
                        <p className="text-xs text-slate-500">2 hours ago</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                    <span className="font-bold">{stats.connections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Posts</span>
                    <span className="font-bold">{stats.posts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Messages</span>
                    <span className="font-bold">{stats.messages}</span>
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