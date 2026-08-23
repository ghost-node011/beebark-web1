import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { INTENTS, INDUSTRIES } from '../config/onboarding';
import {
  FiMapPin, FiUserPlus, FiMessageCircle, FiEye, FiUsers,
  FiBriefcase, FiImage, FiZap, FiThumbsUp, FiThumbsDown, FiX,
  FiTarget, FiLayers, FiGlobe
} from 'react-icons/fi';

const ROLE_LABELS = { student: 'Student', professional: 'Professional', firm: 'Firm', recruiter: 'Recruiter', company: 'Firm' };
const labelsFrom = (values, options) => (values || []).map((v) => options.find((o) => o.value === v)?.label || v);

const StatCard = ({ icon: Icon, value, label }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
    <Icon className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
    <p className="text-xl font-bold text-black">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

const InfoBlock = ({ icon: Icon, label, values }) => {
  if (!values?.length) return null;
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        <Icon className="w-4 h-4" />{label}
      </p>
      <p className="text-sm text-black">{values.join(', ')}</p>
    </div>
  );
};

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: viewer } = useAuth();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [rating, setRating] = useState(null);
  const [ratingDismissed, setRatingDismissed] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/profile/public/${username}`)
      .then((res) => setData(res.data))
      .catch(() => setNotFound(true));
  }, [username]);

  useEffect(() => {
    if (!data || data.isOwnProfile) return;
    axios.get(`${API_URL}/api/profile/public/${username}/rating`)
      .then((res) => setRating(res.data))
      .catch(() => {});
  }, [data, username]);

  const isConnected = viewer?.connections?.some((c) => (c._id || c) === data?.user?._id) || false;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await axios.post(`${API_URL}/api/connections/send-request/${data.user._id}`);
      toast.success('Connection request sent');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not send request');
    } finally {
      setConnecting(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Profile not found.</p>
          <Link to="/dashboard" className="text-black font-semibold hover:underline">Back to BeeBark</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;
  }

  const { user } = data;
  const industryLabels = labelsFrom(user.industries, INDUSTRIES);
  const bio = user.bio || '';
  const bioIsLong = bio.length > 220;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
            <div
              className="h-40 sm:h-56 bg-gradient-to-br from-yellow-400 to-amber-500"
              style={user.coverPhoto ? { backgroundImage: `url(${user.coverPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            />
            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14">
                <Avatar className="w-28 h-28 border-4 border-white shadow-lg shrink-0">
                  <AvatarImage src={user.profilePic} />
                  <AvatarFallback className="bg-yellow-400 text-black text-3xl font-bold">{user.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 sm:pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-black">{user.name}</h1>
                    <Badge className="bg-slate-900 text-yellow-400 capitalize">{ROLE_LABELS[user.role] || 'Professional'}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  {(industryLabels.length > 0 || user.location) && (
                    <p className="text-sm text-gray-600 mt-1">
                      {industryLabels.join(' | ')}{industryLabels.length > 0 && user.location ? ' | ' : ''}{user.location}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                    {user.location && <span className="flex items-center gap-1"><FiMapPin className="w-4 h-4" />{user.location}</span>}
                    <span className="flex items-center gap-1"><FiUsers className="w-4 h-4" />{user.connectionCount} connections</span>
                  </div>
                </div>
                {!data.isOwnProfile && (
                  <div className="flex gap-2 sm:pb-1">
                    {isConnected ? (
                      <Button onClick={() => navigate(`/chat?with=${user._id}`)} className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold">
                        <FiMessageCircle className="mr-2" />Message
                      </Button>
                    ) : (
                      <Button onClick={handleConnect} disabled={connecting} className="bg-black hover:bg-gray-800 text-white">
                        <FiUserPlus className="mr-2" />{connecting ? 'Sending...' : 'Connect'}
                      </Button>
                    )}
                    <Link to={`/portfolio/${user.username}`} target="_blank">
                      <Button variant="outline"><FiImage className="mr-2" />Portfolio</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI rating — interactive, viewer-only */}
          {rating && !ratingDismissed && (
            <Card className="mt-4 border-2 border-yellow-200 bg-yellow-50">
              <CardContent className="pt-5 flex items-start gap-3">
                <FiZap className="text-yellow-500 mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-black">{rating.message}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-black" onClick={() => toast.success('Thanks for the feedback!')}>
                      <FiThumbsUp className="w-3.5 h-3.5" />Agree
                    </button>
                    <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-black" onClick={() => toast.success('Thanks for the feedback!')}>
                      <FiThumbsDown className="w-3.5 h-3.5" />Disagree
                    </button>
                  </div>
                </div>
                <button onClick={() => setRatingDismissed(true)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
              </CardContent>
            </Card>
          )}

          {/* Analytics — real numbers only */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <StatCard icon={FiEye} value={user.profileViews} label="Profile Views" />
            <StatCard icon={FiUsers} value={user.connectionCount} label="Connections" />
            <StatCard icon={FiImage} value={data.portfolioCount} label="Portfolio Entries" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Professional Identity */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold text-black mb-2">Professional Identity</h3>
                  {bio ? (
                    <>
                      <p className="text-gray-700 whitespace-pre-line">{bioIsLong && !bioExpanded ? `${bio.slice(0, 220)}…` : bio}</p>
                      {bioIsLong && (
                        <button onClick={() => setBioExpanded((e) => !e)} className="text-sm font-medium text-black hover:underline mt-1">
                          {bioExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </>
                  ) : <p className="text-gray-400">No bio yet</p>}

                  {(user.specialization?.length > 0 || user.projectTypeFocus?.length > 0 || user.markets?.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      <InfoBlock icon={FiTarget} label="Specialization" values={user.specialization} />
                      <InfoBlock icon={FiLayers} label="Project Type Focus" values={user.projectTypeFocus} />
                      <InfoBlock icon={FiGlobe} label="Markets" values={user.markets} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Portfolio preview */}
              {data.portfolioCount > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-black flex items-center"><FiImage className="mr-2" />Portfolio</h3>
                      <Link to={`/portfolio/${user.username}`} target="_blank" className="text-sm font-medium text-black hover:underline">
                        View all ({data.portfolioCount})
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {data.portfolioPreview.map((item) => (
                        <div key={item._id} className="rounded-lg overflow-hidden bg-gray-100 aspect-square">
                          {item.images?.[0] ? (
                            <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 p-2 text-center">{item.title}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Experience */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold text-black mb-3 flex items-center"><FiBriefcase className="mr-2" />Experience</h3>
                  {user.experience?.length > 0 ? (
                    <div className="space-y-4">
                      {user.experience.map((exp, idx) => (
                        <div key={idx} className="border-l-4 border-yellow-400 pl-4">
                          <h4 className="font-semibold text-black">{exp.title}</h4>
                          <p className="text-gray-700 text-sm">{exp.company}</p>
                          <p className="text-xs text-gray-500">{exp.duration}</p>
                          {exp.description && <p className="text-sm text-gray-600 mt-1">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400">No experience added yet</p>}
                </CardContent>
              </Card>

              {/* Associated Professionals — real connections */}
              {data.associatedProfessionals?.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-bold text-black mb-3">Associated Professionals</h3>
                    <div className="flex gap-4 overflow-x-auto pb-1">
                      {data.associatedProfessionals.map((p) => (
                        <Link key={p._id} to={`/profile/${p.username}`} className="flex flex-col items-center text-center w-20 shrink-0 hover:opacity-80">
                          <Avatar className="w-14 h-14">
                            <AvatarImage src={p.profilePic} />
                            <AvatarFallback className="bg-gray-200 text-black font-semibold">{p.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <p className="text-xs font-medium text-black mt-1 truncate w-full">{p.name}</p>
                          <p className="text-[10px] text-gray-500 truncate w-full capitalize">{ROLE_LABELS[p.role] || 'Professional'}</p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>

            <div className="space-y-6">
              {industryLabels.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-bold text-black mb-2">Industry</h3>
                    <div className="flex flex-wrap gap-2">
                      {industryLabels.map((l) => <Badge key={l} className="bg-slate-900 text-yellow-400">{l}</Badge>)}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-bold text-black mb-2">Skills</h3>
                  {user.skills?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.skills.map((s, i) => <Badge key={i} className="bg-yellow-500 text-gray-900">{s}</Badge>)}
                    </div>
                  ) : <p className="text-gray-400 text-sm">No skills added yet</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
