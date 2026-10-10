import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { FiVideo, FiCalendar, FiClock, FiUsers, FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';

const Meetings = () => {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [meetings, setMeetings] = useState([]);
  const [scheduleData, setScheduleData] = useState({
    title: '',
    scheduledTime: '',
    duration: '60',
    participants: []
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/meetings/list`);
      setMeetings(response.data.meetings || []);
    } catch (error) {
      console.error('Failed to load meetings');
    }
  };

  const handleStartMeeting = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/meetings/create`, {
        title: 'Instant Meeting',
        scheduledTime: new Date()
      });
      toast.success('Meeting started!');
      navigate(`/meeting-room/${response.data.meeting.meetingId}`);
    } catch (error) {
      console.error('Start meeting error:', error);
      toast.error('Failed to start meeting');
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/meetings/create`, scheduleData);
      toast.success('Meeting scheduled successfully!');
      setShowScheduleModal(false);
      fetchMeetings();
      setScheduleData({ title: '', scheduledTime: '', duration: '60', participants: [] });
    } catch (error) {
      console.error('Schedule meeting error:', error);
      toast.error('Failed to schedule meeting');
    }
  };

  const handleJoinMeeting = () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a meeting code');
      return;
    }
    navigate(`/meeting-room/${joinCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-black mb-4">Professional Video Meetings</h1>
            <p className="text-xl text-gray-600">for the Build Industry</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-xl border-2 border-gray-200 hover:shadow-2xl transition">
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FiVideo className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-4">Start a New Meeting</h3>
                  <p className="text-gray-600 mb-6">Start an instant meeting now</p>
                  <Button onClick={handleStartMeeting} className="w-full bg-[#16324F] hover:bg-[#0F2439] text-white py-6 text-lg font-semibold">
                    Start Meeting Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-2 border-yellow-400 hover:shadow-2xl transition">
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FiCalendar className="w-10 h-10 text-black" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-4">Schedule Meeting</h3>
                  <p className="text-gray-600 mb-6">Plan a meeting for later</p>
                  <Button onClick={() => setShowScheduleModal(true)} className="w-full bg-white hover:bg-gray-50 text-black border-2 border-yellow-400 py-6 text-lg font-semibold">
                    Schedule for Later
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-xl border-2 border-gray-200 mb-8">
            <CardContent className="pt-6 pb-6">
              <h3 className="text-xl font-bold text-black mb-4">Join a Meeting</h3>
              <div className="flex space-x-3">
                <Input
                  placeholder="Enter meeting code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="flex-1 text-lg border-2 border-gray-300"
                />
                <Button onClick={handleJoinMeeting} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>

          {meetings.length > 0 && (
            <Card className="shadow-xl">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold text-black mb-4">Upcoming Meetings</h3>
                <div className="space-y-3">
                  {meetings.map((meeting) => (
                    <div key={meeting._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                          <FiVideo className="w-6 h-6 text-black" />
                        </div>
                        <div>
                          <p className="font-semibold text-black">{meeting.title}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(meeting.scheduledTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button onClick={() => navigate(`/meeting-room/${meeting.meetingId}`)} size="sm" className="bg-[#16324F] text-white">
                        Join
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Schedule a Meeting</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleScheduleMeeting} className="space-y-6 mt-4">
            <div>
              <Label className="text-base font-semibold mb-2">Meeting Title</Label>
              <Input
                value={scheduleData.title}
                onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                placeholder="Enter meeting title"
                required
                className="border-2 border-yellow-400 focus:ring-[#245EA8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-base font-semibold mb-2 flex items-center">
                  <FiCalendar className="mr-2" /> Date
                </Label>
                <Input
                  type="date"
                  value={scheduleData.scheduledTime.split('T')[0]}
                  onChange={(e) => setScheduleData({ ...scheduleData, scheduledTime: e.target.value + 'T10:00' })}
                  required
                  className="border-2 border-gray-300"
                />
              </div>
              <div>
                <Label className="text-base font-semibold mb-2 flex items-center">
                  <FiClock className="mr-2" /> Time
                </Label>
                <Input
                  type="time"
                  required
                  className="border-2 border-gray-300"
                />
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold mb-2">Duration</Label>
              <Select value={scheduleData.duration} onValueChange={(value) => setScheduleData({ ...scheduleData, duration: value })}>
                <SelectTrigger className="border-2 border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base font-semibold mb-2 flex items-center">
                <FiUsers className="mr-2" /> Invite Participants
              </Label>
              <div className="flex space-x-2">
                <Input placeholder="Enter email addresses" className="flex-1 border-2 border-gray-300" />
                <Button type="button" className="bg-[#16324F] hover:bg-[#0F2439] text-white">
                  <FiPlus className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-[#16324F] hover:bg-[#0F2439] text-white py-6 text-lg font-semibold">
              Schedule Meeting
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Meetings;