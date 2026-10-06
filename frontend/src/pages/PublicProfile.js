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
import { InfoBlock } from '../components/profile/ProfileWidgets';
import { ProfileHero, ProfileTabs, VisibilityPill, PillFilter, PAGE_BG } from '../components/profile/ProfileShell';
import {
  FiUserPlus, FiMessageCircle, FiEye, FiUsers,
  FiBriefcase, FiImage, FiZap, FiThumbsUp, FiThumbsDown, FiX,
  FiTarget, FiLayers, FiGlobe, FiBookOpen, FiHeart, FiMessageSquare,
  FiMoreHorizontal, FiFlag, FiSlash, FiUserCheck, FiHome, FiCalendar, FiInfo, FiShare2
} from 'react-icons/fi';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import ReportDialog from '../components/ReportDialog';
import ShareMenu from '../components/ShareMenu';
import {
  sortExperience, AvailabilityChips, LanguagesList, BusinessDetails, PeopleStrip,
  Section, AnalyticsCards, ProjectGrid, ExperienceCard, ListingCards, JobRows, ContactInfoDialog
} from '../components/profile/ProfileSections';
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
  const [contactOpen, setContactOpen] = useState(false);
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
    // Keep the app frame while the profile loads, so the page doesn't flash
    return (
      <div className={`min-h-screen ${PAGE_BG}`}>
        <Sidebar />
        <TopBar />
        <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto animate-pulse space-y-4" aria-label="Loading profile">
            <div className="h-56 rounded-2xl bg-gray-200" />
            <div className="h-6 w-64 rounded bg-gray-200" />
            <div className="h-4 w-96 max-w-full rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  const { user } = data;
  const industryLabels = labelsFrom(user.industries, INDUSTRIES);
  const bio = user.bio || '';
  const bioIsLong = bio.length > 260;
  const showAnalytics = data.isOwnProfile || user.analyticsPublic;
  const showGallery = data.isOwnProfile || user.galleryPublic;
  const showActivity = data.isOwnProfile || user.activityPublic;
  const galleryCategories = [...new Set((data.portfolioPreview || []).map((i) => i.category).filter(Boolean))];
  const visibleGalleryItems = galleryCategory === 'All' ? data.portfolioPreview : (data.portfolioPreview || []).filter((i) => i.category === galleryCategory);

  const firstName = user.name?.split(' ')[0] || '';
  const tabs = [
    { id: 'section-overview', label: 'Overview' },
    { id: 'section-portfolio', label: 'Portfolio' },
    { id: 'section-experience', label: 'Experience' },
    { id: 'section-activity', label: 'Activity' },
    ...(data.listingCount ? [{ id: 'section-listings', label: 'Listings' }] : []),
    ...(data.openJobs?.length ? [{ id: 'section-hiring', label: 'Hiring' }] : [])
  ];
  const requestMeeting = () => navigate(`/chat?with=${user._id}&draft=${encodeURIComponent(`Hi ${firstName}, could we set up a meeting? Let me know a day and time that works for you.`)}`);

  return (
    <div className={`min-h-screen ${PAGE_BG}`}>
      <Sidebar />
      <TopBar />
      <div className="lg:ml-64 mt-16 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <ProfileHero
            coverPhoto={user.coverPhoto}
            profilePic={user.profilePic}
            name={user.name}
            roleLabel={ROLE_LABELS[user.role] || 'Professional'}
            headline={user.headline || personHeadline(user)}
            badges={<AvailabilityChips values={user.availability} />}
            pronouns={user.pronouns}
            location={user.location}
            yearsOfExperience={user.yearsOfExperience}
            connectionCount={user.connectionCount}
            socialLinks={user.socialLinks}
            onContactInfo={() => setContactOpen(true)}
            actions={
              data.isOwnProfile ? (
                <Link to="/profile"><Button className="bg-black text-white hover:bg-gray-800">Edit your profile</Button></Link>
              ) : (
                <>
                  {status === 'connected' ? (
                    <Button onClick={() => navigate(`/chat?with=${user._id}`)} className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold" data-testid="profile-message">
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
                    <Button onClick={handleConnect} disabled={connecting} className="bg-black hover:bg-gray-800 text-white" data-testid="profile-connect">
                      <FiUserPlus className="mr-2" />{connecting ? 'Sending...' : 'Connect'}
                    </Button>
                  )}
                  {status === 'connected' && (
                    <Button variant="outline" onClick={requestMeeting} data-testid="request-meeting"><FiCalendar className="mr-2" />Request meeting</Button>
                  )}
                  <ShareMenu path={`/profile/${user.username}`} title={`${user.name} on BeeBark`} text={user.headline || personHeadline(user)} align="start" testId="profile-share" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" data-testid="profile-more"><FiMoreHorizontal className="mr-1" />More</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      <DropdownMenuItem onClick={() => setContactOpen(true)}><FiInfo className="mr-2" />Contact info</DropdownMenuItem>
                      <DropdownMenuItem asChild><Link to={`/portfolio/${user.username}`} target="_blank"><FiImage className="mr-2" />Full portfolio</Link></DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setReportOpen(true)} data-testid="profile-report"><FiFlag className="mr-2" />Report profile</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBlock} className="text-red-600" data-testid="profile-block"><FiSlash className="mr-2" />Block {firstName}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )
            }
          />

          <ProfileTabs tabs={tabs} />

          {/* AI rating — interactive, viewer-only */}
          {rating && !ratingDismissed && (
            <Card className="border-2 border-yellow-200 bg-yellow-50 rounded-2xl">
              <CardContent className="pt-5 flex items-start gap-3">
                <FiZap className="text-yellow-500 mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-black">{rating.message}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {['agree', 'disagree'].map((v) => (
                      <button
                        key={v}
                        disabled={!!ratingFeedback}
                        onClick={() => { setRatingFeedback(v); toast.success('Thanks for the feedback!'); }}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition ${ratingFeedback === v ? 'bg-yellow-400 text-black font-semibold' : ratingFeedback ? 'text-gray-300 cursor-default' : 'text-gray-600 hover:bg-yellow-100 hover:text-black'}`}
                      >
                        {v === 'agree' ? <FiThumbsUp className="w-3.5 h-3.5" /> : <FiThumbsDown className="w-3.5 h-3.5" />}{v === 'agree' ? 'Agree' : 'Disagree'}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setRatingDismissed(true)} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss"><FiX /></button>
              </CardContent>
            </Card>
          )}

          <div id="section-overview" className="space-y-6 scroll-mt-32">
            {showAnalytics && (
              <Section title="Analytics" action={<VisibilityPill isPublic={user.analyticsPublic} editable={false} />}>
                <AnalyticsCards items={[
                  { icon: FiEye, value: (user.profileViews ?? 0).toLocaleString('en-IN'), label: 'Profile views' },
                  { icon: FiUsers, value: user.connectionCount, label: 'Connections' },
                  { icon: FiImage, value: data.portfolioCount, label: 'Projects' },
                  data.listingCount
                    ? { icon: FiHome, value: data.listingCount, label: 'Listings' }
                    : { icon: FiBriefcase, value: data.openJobs?.length || 0, label: 'Open jobs' }
                ]} />
              </Section>
            )}

            <Section title="Professional Identity">
              {bio ? (
                <>
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">{bioIsLong && !bioExpanded ? `${bio.slice(0, 260)}…` : bio}</p>
                  {bioIsLong && (
                    <button onClick={() => setBioExpanded((e) => !e)} className="text-sm font-semibold text-black hover:underline mt-1">
                      {bioExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </>
              ) : <p className="text-gray-400">No bio yet</p>}
              {(user.specialization?.length > 0 || user.projectTypeFocus?.length > 0 || user.markets?.length > 0 || industryLabels.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                  <InfoBlock icon={FiTarget} label="Specialization" values={user.specialization} />
                  <InfoBlock icon={FiLayers} label="Project Type Focus" values={user.projectTypeFocus} />
                  <InfoBlock icon={FiGlobe} label="Markets" values={user.markets} />
                  <InfoBlock icon={FiBriefcase} label="Industry" values={industryLabels} />
                </div>
              )}
            </Section>

            {user.business && (
              <Section title="Business"><BusinessDetails business={user.business} /></Section>
            )}

            {user.skills?.length > 0 && (
              <Section title="Skills">
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((s2, i) => <Badge key={i} className="bg-yellow-400 text-gray-900 hover:bg-yellow-400">{s2}</Badge>)}
                </div>
              </Section>
            )}
          </div>

          <Section
            id="section-portfolio"
            title="Portfolio"
            action={showGallery && galleryCategories.length > 0
              ? <div className="hidden md:block"><PillFilter options={['All', ...galleryCategories]} active={galleryCategory} onChange={setGalleryCategory} /></div>
              : <VisibilityPill isPublic={user.galleryPublic} editable={false} />}
          >
            {showGallery ? (
              <>
                {galleryCategories.length > 0 && <div className="md:hidden mb-4"><PillFilter options={['All', ...galleryCategories]} active={galleryCategory} onChange={setGalleryCategory} /></div>}
                {visibleGalleryItems?.length > 0
                  ? <ProjectGrid items={visibleGalleryItems} linkFor={(item) => `/portfolio/${user.username}?project=${item._id}`} />
                  : <p className="text-gray-400">Nothing here yet</p>}
                {data.portfolioCount > (visibleGalleryItems?.length || 0) && (
                  <Link to={`/portfolio/${user.username}`} target="_blank" className="inline-block mt-4 text-sm font-semibold text-black hover:underline">View all {data.portfolioCount} projects →</Link>
                )}
              </>
            ) : <p className="text-gray-400">{firstName}'s portfolio is private.</p>}
          </Section>

          <div id="section-experience" className="space-y-6 scroll-mt-32">
            <Section title="Experience">
              {user.experience?.length > 0 ? (
                <div className="space-y-3">
                  {sortExperience(user.experience).map((exp) => <ExperienceCard key={exp._index} exp={exp} />)}
                </div>
              ) : <p className="text-gray-400">No experience added yet</p>}
            </Section>

            {user.education?.length > 0 && (
              <Section title="Education">
                <div className="space-y-3">
                  {user.education.map((edu, idx) => (
                    <div key={idx} className="flex items-start gap-4 rounded-xl border border-gray-200 p-4 sm:p-5">
                      <div className="w-11 h-11 rounded-lg bg-[#F6F4EF] flex items-center justify-center shrink-0"><FiBookOpen className="w-5 h-5 text-gray-600" /></div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-black">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</h4>
                        <p className="text-gray-700 text-sm">{edu.school}</p>
                        <p className="text-xs text-gray-500">{edu.duration}</p>
                        {edu.description && <p className="text-sm text-gray-600 mt-1">{edu.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {user.languages?.length > 0 && (
              <Section title="Languages"><LanguagesList languages={user.languages} /></Section>
            )}

            {data.associatedProfessionals?.length > 0 && (
              <Section title="Associated Professionals"><PeopleStrip people={data.associatedProfessionals} /></Section>
            )}
          </div>

          <Section id="section-activity" title="Recent Activity" action={<VisibilityPill isPublic={user.activityPublic} editable={false} />}>
            {data.isOwnProfile ? (
              <p className="text-gray-400">Visit your own profile page to see your activity.</p>
            ) : showActivity ? (
              data.recentActivity?.length > 0 ? (
                <div className="space-y-3">
                  {data.recentActivity.map((post) => (
                    <div key={post._id} className="rounded-xl border border-gray-200 p-4 sm:p-5">
                      <p className="text-xs text-gray-500 mb-1">{new Date(post.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="text-gray-800 text-sm whitespace-pre-line">{post.content}</p>
                      {post.mediaUrl && <img src={post.mediaUrl} alt="" className="mt-3 rounded-lg max-h-64 object-cover" />}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><FiHeart className="w-3.5 h-3.5" />{post.likeCount}</span>
                        <span className="flex items-center gap-1"><FiMessageSquare className="w-3.5 h-3.5" />{post.commentCount}</span>
                        <ShareMenu path={`/profile/${user.username}`} title={`${user.name} on BeeBark`} text={post.content?.slice(0, 120)} align="start"
                          trigger={<button type="button" className="flex items-center gap-1 hover:text-black"><FiShare2 className="w-3.5 h-3.5" />Share</button>} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400">No activity yet.</p>
            ) : (
              <p className="text-gray-400">{firstName}'s activity is private.</p>
            )}
          </Section>

          {data.listingCount > 0 && (
            <Section id="section-listings" title="Listings">
              <ListingCards listings={data.listings} />
            </Section>
          )}

          {data.openJobs?.length > 0 && (
            <Section id="section-hiring" title={`Hiring · ${data.openJobs.length} open role${data.openJobs.length > 1 ? 's' : ''}`}>
              <JobRows jobs={data.openJobs} />
            </Section>
          )}
        </div>
      </div>
      <ContactInfoDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        name={user.name}
        username={user.username}
        contact={data.contact}
        socialLinks={user.socialLinks}
        hiddenReason={data.contactHiddenReason}
      />
      {!data.isOwnProfile && (
        <ReportDialog open={reportOpen} onOpenChange={setReportOpen} person={user} context="profile"
          onDone={({ blocked }) => { if (blocked) { refreshUser(); navigate('/connections'); } }} />
      )}
    </div>
  );
};

export default PublicProfile;
