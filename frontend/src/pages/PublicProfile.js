import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { INDUSTRIES } from '../config/onboarding';
import { StatCard, InfoBlock } from '../components/profile/ProfileWidgets';
import { ProfileHero, VisibilityPill, PillFilter, PAGE_BG } from '../components/profile/ProfileShell';
import {
  FiUserPlus, FiMessageCircle, FiEye, FiUsers,
  FiBriefcase, FiImage, FiZap, FiThumbsUp, FiThumbsDown, FiX,
  FiTarget, FiLayers, FiGlobe, FiBookOpen, FiHeart, FiMessageSquare,
  FiMoreHorizontal, FiFlag, FiSlash, FiUserCheck, FiHome
} from 'react-icons/fi';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../components/ui/dropdown-menu';
import ReportDialog from '../components/ReportDialog';
import { ExperienceItem, sortExperience, AvailabilityChips, LanguagesList, BusinessDetails, PeopleStrip } from '../components/profile/ProfileSections';
import { personHeadline } from '../utils/personHeadline';

const ROLE_LABELS = { student: 'Student', professional: 'Professional', firm: 'Firm', recruiter: 'Recruiter', company: 'Firm' };
const labelsFrom = (values, options) => (values || []).map((v) => options.find((o) => o.value === v)?.label || v);

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [rating, setRating] = useState(null);
  const [ratingDismissed, setRatingDismissed] = useState(false);
  const [ratingFeedback, setRatingFeedback] = useState(null); // 'agree' | 'disagree' | null
  const [galleryCategory, setGalleryCategory] = useState('All');

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

  const [status, setStatus] = useState(null); // connected | sent | received | none, from the server
  const [reportOpen, setReportOpen] = useState(false);
  useEffect(() => { setStatus(data?.connectionStatus || null); }, [data]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = status === 'received'
        ? await axios.post(`${API_URL}/api/connections/accept-request/${data.user._id}`)
        : await axios.post(`${API_URL}/api/connections/send-request/${data.user._id}`);
      const connected = status === 'received' || res.data?.connected;
      setStatus(connected ? 'connected' : 'sent');
      toast.success(connected ? `You're now connected with ${data.user.name.split(' ')[0]}` : 'Connection request sent');
      refreshUser(); // keeps viewer.connections / sentRequests current elsewhere
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not send request');
    } finally {
      setConnecting(false);
    }
  };

  const handleBlock = async () => {
    if (!window.confirm(`Block ${data.user.name}? They won't be able to find you, message you or connect with you, and your connection will be removed.`)) return;
    try {
      await axios.post(`${API_URL}/api/account/block/${data.user._id}`);
      toast.success(`${data.user.name} is blocked. You can unblock them in Settings.`);
      refreshUser();
      navigate('/connections');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not block');
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
  const showAnalytics = data.isOwnProfile || user.analyticsPublic;
  const showGallery = data.isOwnProfile || user.galleryPublic;
  const showActivity = data.isOwnProfile || user.activityPublic;
  const galleryCategories = [...new Set((data.portfolioPreview || []).map((i) => i.category).filter(Boolean))];
  const visibleGalleryItems = galleryCategory === 'All' ? data.portfolioPreview : (data.portfolioPreview || []).filter((i) => i.category === galleryCategory);

  return (
    <div className={`min-h-screen ${PAGE_BG}`}>
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <ProfileHero
            coverPhoto={user.coverPhoto}
            profilePic={user.profilePic}
            name={user.name}
            username={user.username}
            roleLabel={ROLE_LABELS[user.role] || 'Professional'}
            subtitle={personHeadline(user)}
            badges={<AvailabilityChips values={user.availability} />}
            pronouns={user.pronouns}
            location={user.location}
            connectionCount={user.connectionCount}
            actions={
              !data.isOwnProfile && (
                <>
                  {status === 'connected' ? (
                    <Button onClick={() => navigate(`/chat?with=${user._id}`)} className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold">
                      <FiMessageCircle className="mr-2" />Message
                    </Button>
                  ) : status === 'sent' ? (
                    <Button disabled className="bg-gray-200 text-gray-500 cursor-default">
                      <FiUserPlus className="mr-2" />Requested
                    </Button>
                  ) : status === 'received' ? (
                    <Button onClick={handleConnect} disabled={connecting} className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold" data-testid="accept-request">
                      <FiUserCheck className="mr-2" />{connecting ? 'Accepting...' : 'Accept request'}
                    </Button>
                  ) : (
                    <Button onClick={handleConnect} disabled={connecting} className="bg-black hover:bg-gray-800 text-white">
                      <FiUserPlus className="mr-2" />{connecting ? 'Sending...' : 'Connect'}
                    </Button>
                  )}
                  <Link to={`/portfolio/${user.username}`} target="_blank">
                    <Button variant="outline"><FiImage className="mr-2" />Portfolio</Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="More options" data-testid="profile-more"><FiMoreHorizontal /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setReportOpen(true)} data-testid="profile-report"><FiFlag className="mr-2" />Report</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBlock} className="text-red-600" data-testid="profile-block"><FiSlash className="mr-2" />Block</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )
            }
          />

          {/* AI rating — interactive, viewer-only */}
          {rating && !ratingDismissed && (
            <Card className="border-2 border-yellow-200 bg-yellow-50">
              <CardContent className="pt-5 flex items-start gap-3">
                <FiZap className="text-yellow-500 mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-black">{rating.message}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      disabled={!!ratingFeedback}
                      onClick={() => { setRatingFeedback('agree'); toast.success('Thanks for the feedback!'); }}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition ${
                        ratingFeedback === 'agree'
                          ? 'bg-yellow-400 text-black font-semibold'
                          : ratingFeedback
                            ? 'text-gray-300 cursor-default'
                            : 'text-gray-600 hover:bg-yellow-100 hover:text-black'
                      }`}
                    >
                      <FiThumbsUp className="w-3.5 h-3.5" />Agree
                    </button>
                    <button
                      disabled={!!ratingFeedback}
                      onClick={() => { setRatingFeedback('disagree'); toast.success('Thanks for the feedback!'); }}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition ${
                        ratingFeedback === 'disagree'
                          ? 'bg-yellow-400 text-black font-semibold'
                          : ratingFeedback
                            ? 'text-gray-300 cursor-default'
                            : 'text-gray-600 hover:bg-yellow-100 hover:text-black'
                      }`}
                    >
                      <FiThumbsDown className="w-3.5 h-3.5" />Disagree
                    </button>
                  </div>
                </div>
                <button onClick={() => setRatingDismissed(true)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
              </CardContent>
            </Card>
          )}

          <div id="section-overview" className="space-y-6 scroll-mt-24">
              {showAnalytics && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 font-serif">Analytics</h3>
                    <VisibilityPill isPublic={user.analyticsPublic} editable={false} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <StatCard icon={FiEye} value={user.profileViews ?? 0} label="Profile Views" />
                    <StatCard icon={FiUsers} value={user.connectionCount} label="Connections" />
                    <StatCard icon={FiImage} value={data.portfolioCount} label="Work Gallery Entries" />
                  </div>
                </Card>
              )}

              <Card className="p-6">
                <h3 className="text-lg font-bold text-black mb-2 font-serif">Professional Identity</h3>
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
              </Card>

              {user.business && (
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-black mb-3 flex items-center font-serif"><FiHome className="mr-2" />Business</h3>
                  <BusinessDetails business={user.business} />
                </Card>
              )}

              {industryLabels.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-bold text-black mb-2 font-serif">Industry</h3>
                  <div className="flex flex-wrap gap-2">
                    {industryLabels.map((l) => <Badge key={l} className="bg-slate-900 text-yellow-400">{l}</Badge>)}
                  </div>
                </Card>
              )}

              <Card className="p-6">
                <h3 className="font-bold text-black mb-2 font-serif">Skills</h3>
                {user.skills?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((s, i) => <Badge key={i} className="bg-yellow-500 text-gray-900">{s}</Badge>)}
                  </div>
                ) : <p className="text-gray-400 text-sm">No skills added yet</p>}
              </Card>
          </div>

          <div id="section-portfolio" className="space-y-6 scroll-mt-24">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3 gap-2">
                <h3 className="text-lg font-bold text-black flex items-center font-serif"><FiImage className="mr-2" />Work Gallery</h3>
                <div className="flex items-center gap-3 shrink-0">
                  <VisibilityPill isPublic={user.galleryPublic} editable={false} />
                  {showGallery && (
                    <Link to={`/portfolio/${user.username}`} target="_blank" className="text-sm font-medium text-black hover:underline whitespace-nowrap">
                      View full portfolio ({data.portfolioCount})
                    </Link>
                  )}
                </div>
              </div>
              {showGallery ? (
                <>
                  {galleryCategories.length > 0 && (
                    <div className="mb-3">
                      <PillFilter options={['All', ...galleryCategories]} active={galleryCategory} onChange={setGalleryCategory} />
                    </div>
                  )}
                  {visibleGalleryItems?.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {visibleGalleryItems.map((item) => (
                        <div key={item._id} className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square">
                          {item.images?.[0] ? (
                            <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 p-2 text-center">{item.title}</div>
                          )}
                          {item.category && (
                            <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wide bg-yellow-400 text-black px-1.5 py-0.5 rounded-full">{item.category}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400">Nothing here yet</p>}
                </>
              ) : <p className="text-gray-400">This member's Work Gallery is private.</p>}
            </Card>
          </div>

          <div id="section-experience" className="space-y-6 scroll-mt-24">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-black mb-3 flex items-center font-serif"><FiBriefcase className="mr-2" />Experience</h3>
                {user.experience?.length > 0 ? (
                  <div className="space-y-4">
                    {sortExperience(user.experience).map((exp) => (
                      <div key={exp._index} className="border-l-4 border-yellow-400 pl-4">
                        <ExperienceItem exp={exp} />
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-400">No experience added yet</p>}
              </Card>

              {user.education?.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-black mb-3 flex items-center font-serif"><FiBookOpen className="mr-2" />Education</h3>
                  <div className="space-y-4">
                    {user.education.map((edu, idx) => (
                      <div key={idx} className="border-l-4 border-yellow-400 pl-4">
                        <h4 className="font-semibold text-black">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</h4>
                        <p className="text-gray-700 text-sm">{edu.school}</p>
                        <p className="text-xs text-gray-500">{edu.duration}</p>
                        {edu.description && <p className="text-sm text-gray-600 mt-1">{edu.description}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {user.languages?.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-black mb-3 flex items-center font-serif"><FiGlobe className="mr-2" />Languages</h3>
                  <LanguagesList languages={user.languages} />
                </Card>
              )}
          </div>

          <div id="section-activity" className="space-y-6 scroll-mt-24">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <h3 className="text-lg font-bold text-black font-serif">Recent Activity</h3>
                  <VisibilityPill isPublic={user.activityPublic} editable={false} />
                </div>
                {data.isOwnProfile ? (
                  <p className="text-gray-400">Visit your own profile page to see your activity.</p>
                ) : showActivity ? (
                  data.recentActivity?.length > 0 ? (
                    <div className="space-y-3">
                      {data.recentActivity.map((post) => (
                        <div key={post._id} className="border border-gray-100 rounded-lg p-4">
                          <p className="text-gray-800 text-sm">{post.content}</p>
                          {post.mediaUrl && <img src={post.mediaUrl} alt="" className="mt-2 rounded-lg max-h-48 object-cover" />}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><FiHeart className="w-3.5 h-3.5" />{post.likeCount}</span>
                            <span className="flex items-center gap-1"><FiMessageSquare className="w-3.5 h-3.5" />{post.commentCount}</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400">No activity yet.</p>
                ) : (
                  <p className="text-gray-400">This member's activity is private.</p>
                )}
              </Card>

              {data.associatedProfessionals?.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-black mb-3 font-serif">Associated Professionals</h3>
                  <PeopleStrip people={data.associatedProfessionals} />
                </Card>
              )}
          </div>
        </div>
      </div>
      {!data.isOwnProfile && (
        <ReportDialog open={reportOpen} onOpenChange={setReportOpen} person={user} context="profile"
          onDone={({ blocked }) => { if (blocked) { refreshUser(); navigate('/connections'); } }} />
      )}
    </div>
  );
};

export default PublicProfile;
