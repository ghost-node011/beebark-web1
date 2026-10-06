import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { INDUSTRIES } from '../config/onboarding';
import { ProfileHero, ProfileTabs, VisibilityPill, PillFilter, PAGE_BG, heroBtn } from '../components/profile/ProfileShell';
import {
  FiUserPlus, FiMessageCircle, FiEye, FiZap, FiThumbsUp, FiThumbsDown, FiX, FiTarget, FiLayers, FiGlobe,
  FiBookOpen, FiFlag, FiSlash, FiUserCheck, FiCalendar, FiInfo, FiShare2, FiChevronDown,
  FiBookmark, FiFolder, FiCheck, FiPlus, FiImage, FiLink
} from 'react-icons/fi';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../components/ui/dropdown-menu';
import ReportDialog from '../components/ReportDialog';
import ShareMenu from '../components/ShareMenu';
import BeeLoader from '../components/BeeLoader';
import {
  sortExperience, AvailabilityChips, LanguagesList, BusinessDetails, PeopleGrid, Section, AnalyticsCards,
  ProjectGrid, ExperienceCard, ListingCards, JobRows, ContactInfoDialog, InfoTiles, ReadMore, ActivityCards
} from '../components/profile/ProfileSections';
import { personHeadline } from '../utils/personHeadline';

const ROLE_LABELS = { student: 'Student', professional: 'Professional', firm: 'Firm', recruiter: 'Recruiter', company: 'Firm' };
const labelsFrom = (values, options) => (values || []).map((v) => options.find((o) => o.value === v)?.label || v);
const trend = (pct) => (pct > 0 ? `+${pct}% this week` : pct < 0 ? `${pct}% this week` : 'Same as last week');

/**
 * Someone's profile, in the reference design. `open` is the public version at
 * /in/:username: no sign-in needed, actions invite the visitor to join.
 */
const PublicProfile = ({ open = false }) => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: me, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [rating, setRating] = useState(null);
  const [ratingDismissed, setRatingDismissed] = useState(false);
  const [ratingFeedback, setRatingFeedback] = useState(null);
  const [galleryCategory, setGalleryCategory] = useState('All');
  const [reportOpen, setReportOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [applyingId, setApplyingId] = useState(null);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    axios.get(`${API_URL}/api/profile/${open ? 'open' : 'public'}/${username}`)
      .then((res) => {
        setData(res.data);
        setStatus(res.data.connectionStatus);
        setFollowing(res.data.isFollowing);
        setFollowerCount(res.data.user.followerCount || 0);
      })
      .catch(() => setNotFound(true));
  }, [username, open]);

  useEffect(() => {
    if (open || !data || data.isOwnProfile) return;
    axios.get(`${API_URL}/api/profile/public/${username}/rating`, { silent: true }).then((res) => setRating(res.data)).catch(() => {});
  }, [data, username, open]);

  const galleryCategories = useMemo(() => [...new Set((data?.portfolioPreview || []).map((i) => i.category).filter(Boolean))], [data]);

  // Signed-in people opening a public link get the full in-app profile
  if (open && me) return <Navigate to={`/profile/${username}`} replace />;

  const join = () => navigate(`/register?next=${encodeURIComponent(`/profile/${username}`)}`);

  const handleConnect = async () => {
    if (open) return join();
    setConnecting(true);
    try {
      const res = status === 'received'
        ? await axios.post(`${API_URL}/api/connections/accept-request/${data.user._id}`)
        : await axios.post(`${API_URL}/api/connections/send-request/${data.user._id}`);
      const connected = status === 'received' || res.data?.connected;
      setStatus(connected ? 'connected' : 'sent');
      if (connected && !following) { setFollowing(true); setFollowerCount((n) => n + 1); }
      toast.success(connected ? `You're now connected with ${data.user.name.split(' ')[0]}` : 'Connection request sent');
      refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not send request');
    } finally {
      setConnecting(false);
    }
  };

  const toggleFollow = async () => {
    if (open) return join();
    const next = !following;
    setFollowing(next);
    setFollowerCount((n) => n + (next ? 1 : -1));
    try {
      const res = next ? await axios.post(`${API_URL}/api/follow/${data.user._id}`) : await axios.delete(`${API_URL}/api/follow/${data.user._id}`);
      setFollowerCount(res.data.followerCount);
      if (next) toast.success(`Following ${data.user.name.split(' ')[0]}`);
    } catch (error) {
      setFollowing(!next);
      setFollowerCount((n) => n + (next ? -1 : 1));
      toast.error(error.response?.data?.error || 'Could not update');
    }
  };

  const requestMeeting = () => {
    if (open) return join();
    axios.post(`${API_URL}/api/profile/${data.user._id}/event`, { type: 'meeting' }, { silent: true }).catch(() => {});
    const first = data.user.name.split(' ')[0];
    navigate(`/chat?with=${data.user._id}&draft=${encodeURIComponent(`Hi ${first}, could we set up a meeting? Let me know a day and time that works for you.`)}`);
  };

  const apply = async (job) => {
    if (open) return join();
    setApplyingId(job._id);
    try {
      await axios.post(`${API_URL}/api/jobs/${job._id}/apply`);
      setData((d) => ({ ...d, openJobs: d.openJobs.map((j) => (j._id === job._id ? { ...j, hasApplied: true } : j)) }));
      toast.success(`Applied for ${job.title}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not apply');
    } finally {
      setApplyingId(null);
    }
  };

  const handleBlock = async () => {
    if (!window.confirm(`Block ${data.user.name}? They won't be able to find you, message you or connect with you, and your connection will be removed.`)) return;
    try {
      await axios.post(`${API_URL}/api/account/block/${data.user._id}`);
      toast.success(`${data.user.name} is blocked. You can unblock them in Settings.`);
      refreshUser();
      navigate('/connections', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not block');
    }
  };

  // A plain function (not a component) so the page isn't rebuilt on every update
  const frame = (children) => (
    <div className={`min-h-screen ${PAGE_BG}`}>
      {open ? <OpenHeader username={username} /> : (<><Sidebar /><TopBar /></>)}
      <div className={open ? 'pt-16' : 'lg:ml-64 mt-16'}><div className="p-4 sm:p-6 lg:p-8">{children}</div></div>
    </div>
  );

  if (notFound) {
    return (
      frame(
        <div className="flex min-h-[60vh] items-center justify-center text-center">
          <div>
            <p className="pf-serif text-2xl text-[#2b2622]">This profile isn't available</p>
            <p className="mt-2 pf-muted">It may be private, or the link may be wrong.</p>
            <Link to={open ? '/' : '/dashboard'} className="mt-5 inline-block font-semibold text-[#2b2622] hover:underline">Back to BeeBark</Link>
          </div>
        </div>
      )
    );
  }
  if (!data) {
    return frame(<div className="flex min-h-[60vh] items-center justify-center"><BeeLoader size="section" label="Opening the profile" /></div>);
  }

  const { user, analytics } = data;
  const firstName = user.name?.split(' ')[0] || '';
  const industryLabels = labelsFrom(user.industries, INDUSTRIES);
  const showAnalytics = Boolean(analytics);
  const showGallery = data.portfolioPreview.length > 0 || data.isOwnProfile || user.galleryPublic;
  const showActivity = data.isOwnProfile || user.activityPublic;
  const visibleGalleryItems = galleryCategory === 'All' ? data.portfolioPreview : data.portfolioPreview.filter((i) => i.category === galleryCategory);
  const tabs = [
    { id: 'section-overview', label: 'Overview' },
    { id: 'section-portfolio', label: 'Portfolio' },
    { id: 'section-experience', label: 'Experience' },
    { id: 'section-activity', label: 'Activity' },
    ...(data.listingCount ? [{ id: 'section-listings', label: 'Listings' }] : []),
    ...(data.openJobs?.length ? [{ id: 'section-hiring', label: 'Hiring' }] : [])
  ];
  const projectLink = (item) => `/portfolio/${user.username}?project=${item._id}`;

  const connectButton = status === 'connected' ? null
    : status === 'sent' ? <button type="button" disabled className={heroBtn.dark}><FiCheck className="w-5 h-5" />Pending</button>
    : status === 'received' ? <button type="button" onClick={handleConnect} disabled={connecting} className={heroBtn.dark} data-testid="accept-request"><FiUserCheck className="w-5 h-5" />{connecting ? 'Accepting…' : 'Accept'}</button>
    : <button type="button" onClick={handleConnect} disabled={connecting} className={heroBtn.dark} data-testid="profile-connect"><FiUserPlus className="w-5 h-5" />{connecting ? 'Sending…' : 'Connect'}</button>;

  const actions = data.isOwnProfile ? (
    <>
      <Link to="/profile" className={heroBtn.dark}>Edit your profile</Link>
      <ShareMenu path={`/in/${user.username}`} title={`${user.name} on BeeBark`} text={user.headline || personHeadline(user)} align="start" testId="profile-share"
        trigger={<button type="button" className={heroBtn.outline} data-testid="profile-share"><FiShare2 className="w-5 h-5" />Share profile</button>} />
    </>
  ) : (
    <>
      {connectButton}
      <button type="button" onClick={() => (open ? join() : status === 'connected' ? navigate(`/chat?with=${user._id}`) : toast(`Connect with ${firstName} to send a message`))} className={heroBtn.honey} data-testid="profile-message">
        <FiMessageCircle className="w-5 h-5" />Message
      </button>
      <button type="button" onClick={requestMeeting} className={heroBtn.outline} data-testid="request-meeting"><FiCalendar className="w-5 h-5" />Request Meeting</button>
      <button type="button" onClick={toggleFollow} className={`${heroBtn.outline} group`} data-testid="profile-follow" aria-pressed={following}>
        {following ? <><FiCheck className="w-5 h-5" /><span className="group-hover:hidden">Following</span><span className="hidden group-hover:inline">Unfollow</span></> : <><FiPlus className="w-5 h-5" />Follow</>}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={heroBtn.ghost} data-testid="profile-more"><FiChevronDown className="w-4 h-4" />More</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => setContactOpen(true)}><FiInfo className="mr-2" />Contact info</DropdownMenuItem>
          <DropdownMenuItem asChild><Link to={`/portfolio/${user.username}`} target="_blank"><FiImage className="mr-2" />Full portfolio</Link></DropdownMenuItem>
          <ShareMenu path={`/in/${user.username}`} title={`${user.name} on BeeBark`} text={user.headline || personHeadline(user)} align="start"
            trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid="profile-share"><FiShare2 className="mr-2" />Share profile</DropdownMenuItem>} />
          {!open && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setReportOpen(true)} data-testid="profile-report"><FiFlag className="mr-2" />Report profile</DropdownMenuItem>
              <DropdownMenuItem onClick={handleBlock} className="text-red-600" data-testid="profile-block"><FiSlash className="mr-2" />Block {firstName}</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return frame(
    <>
        <ProfileHero
          coverPhoto={user.coverPhoto}
          profilePic={user.profilePic}
          name={user.name}
          roleLabel={ROLE_LABELS[user.role] || 'Professional'}
          headline={user.headline || personHeadline(user)}
          badges={user.badges}
          pronouns={user.pronouns}
          location={user.location}
          yearsOfExperience={user.yearsOfExperience}
          connectionCount={user.connectionCount}
          followerCount={followerCount}
          socialLinks={user.socialLinks}
          onContactInfo={() => setContactOpen(true)}
          actions={actions}
        />
        {user.availability?.length > 0 && <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-2 mb-4"><AvailabilityChips values={user.availability} /></div>}

        <ProfileTabs tabs={tabs} />
      <div className="max-w-6xl mx-auto mt-6 sm:mt-8 space-y-6 sm:space-y-8">

        {rating && !ratingDismissed && (
          <Card className="border-2 border-yellow-200 bg-yellow-50 rounded-2xl">
            <CardContent className="pt-5 flex items-start gap-3">
              <FiZap className="text-yellow-500 mt-1 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-black">{rating.message}</p>
                <div className="flex items-center gap-2 mt-3">
                  {['agree', 'disagree'].map((v) => (
                    <button key={v} disabled={!!ratingFeedback} onClick={() => { setRatingFeedback(v); toast.success('Thanks for the feedback!'); }}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition ${ratingFeedback === v ? 'bg-yellow-400 text-black font-semibold' : ratingFeedback ? 'text-gray-300 cursor-default' : 'text-gray-600 hover:bg-yellow-100 hover:text-black'}`}>
                      {v === 'agree' ? <FiThumbsUp className="w-3.5 h-3.5" /> : <FiThumbsDown className="w-3.5 h-3.5" />}{v === 'agree' ? 'Agree' : 'Disagree'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setRatingDismissed(true)} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss"><FiX /></button>
            </CardContent>
          </Card>
        )}

        <div id="section-overview" className="space-y-6 sm:space-y-8 scroll-mt-36">
          {showAnalytics && (
            <Section title="Analytics" action={<VisibilityPill isPublic={user.analyticsPublic} editable={false} />}>
              <AnalyticsCards items={[
                { icon: FiEye, value: analytics.viewsWeek.toLocaleString('en-IN'), label: 'Profile Views', note: trend(analytics.viewsChange) },
                { icon: FiBookmark, value: analytics.saves.toLocaleString('en-IN'), label: 'Project Saves', note: 'All time' },
                { icon: FiCalendar, value: analytics.meetingsMonth.toLocaleString('en-IN'), label: 'Meeting Requests', note: 'This month' },
                { icon: FiMessageCircle, value: analytics.enquiriesMonth.toLocaleString('en-IN'), label: 'Enquiries', note: 'This month' }
              ]} />
            </Section>
          )}

          <Section title="Professional Identity">
            {user.bio ? <ReadMore text={user.bio} /> : <p className="pf-muted">No bio yet</p>}
            <InfoTiles items={[
              { icon: FiTarget, label: 'Specialization', value: user.specialization },
              { icon: FiLayers, label: 'Project Type Focus', value: user.projectTypeFocus },
              { icon: FiGlobe, label: 'Markets', value: user.markets },
              { icon: FiFolder, label: 'Active Projects', value: user.activeProjects },
              ...(user.markets?.length ? [] : [{ icon: FiGlobe, label: 'Industry', value: industryLabels }])
            ]} />
          </Section>

          {user.business && <Section title="Business"><BusinessDetails business={user.business} /></Section>}

          {user.skills?.length > 0 && (
            <Section title="Skills">
              <div className="flex flex-wrap gap-2">
                {user.skills.map((s2, i) => <Badge key={i} className="rounded-full bg-[#f6f3ef] px-3.5 py-1.5 text-sm font-medium text-[#2b2622] hover:bg-[#f6f3ef]">{s2}</Badge>)}
              </div>
            </Section>
          )}
        </div>

        <Section
          id="section-portfolio"
          title="Portfolio"
          action={galleryCategories.length > 0 ? <div className="hidden md:block"><PillFilter options={['All', ...galleryCategories]} active={galleryCategory} onChange={setGalleryCategory} /></div> : null}
        >
          {showGallery ? (
            <>
              {galleryCategories.length > 0 && <div className="md:hidden mb-4"><PillFilter options={['All', ...galleryCategories]} active={galleryCategory} onChange={setGalleryCategory} /></div>}
              {visibleGalleryItems.length > 0 ? <ProjectGrid items={visibleGalleryItems} linkFor={projectLink} /> : <p className="pf-muted">Nothing here yet</p>}
              {data.portfolioCount > visibleGalleryItems.length && (
                <Link to={`/portfolio/${user.username}`} target="_blank" className="inline-block mt-5 text-[15px] font-semibold text-[#2b2622] hover:underline">View all {data.portfolioCount} projects →</Link>
              )}
            </>
          ) : <p className="pf-muted">{firstName}'s portfolio is private.</p>}
        </Section>

        <div id="section-experience" className="space-y-6 sm:space-y-8 scroll-mt-36">
          <Section title="Experience">
            {user.experience?.length > 0 ? (
              <div className="space-y-4">{sortExperience(user.experience).map((exp) => <ExperienceCard key={exp._index} exp={exp} />)}</div>
            ) : <p className="pf-muted">No experience added yet</p>}
          </Section>

          {user.education?.length > 0 && (
            <Section title="Education">
              <div className="space-y-4">
                {user.education.map((edu, idx) => (
                  <div key={idx} className="flex items-start gap-4 rounded-2xl border border-[#e8e2da] p-5 sm:p-6">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl pf-soft flex items-center justify-center shrink-0"><FiBookOpen className="w-6 h-6 text-[#3a322b]" /></div>
                    <div className="min-w-0">
                      <p className="pf-serif text-lg sm:text-xl font-semibold text-[#2b2622]">{edu.school}</p>
                      <p className="text-[16px] pf-muted">{[edu.degree, edu.field].filter(Boolean).join(', ')}</p>
                      {edu.duration && <p className="mt-1 text-[15px] pf-muted">{edu.duration}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {data.associatedProfessionals?.length > 0 && (
            <Section title="Associated Professionals"><PeopleGrid people={data.associatedProfessionals} /></Section>
          )}

          {user.languages?.length > 0 && <Section title="Languages"><LanguagesList languages={user.languages} /></Section>}
        </div>

        <Section id="section-activity" title="Recent Activity" action={!showActivity ? <VisibilityPill isPublic={false} editable={false} /> : null}>
          {showActivity ? (
            data.recentActivity?.length > 0 ? (
              <ActivityCards
                posts={data.recentActivity}
                renderShare={(post) => (
                  <ShareMenu path={`/in/${user.username}`} title={post.title || `${user.name} on BeeBark`} text={post.content?.slice(0, 140)} align="start"
                    trigger={<button type="button" className="inline-flex items-center gap-1.5 hover:text-[#2b2622]"><FiShare2 className="w-4 h-4" />Share</button>} />
                )}
              />
            ) : <p className="pf-muted">No activity yet.</p>
          ) : <p className="pf-muted">{firstName}'s activity is private.</p>}
        </Section>

        {data.listingCount > 0 && (
          <Section id="section-listings" title="Property Listings"><ListingCards listings={data.listings} /></Section>
        )}

        {data.openJobs?.length > 0 && (
          <Section id="section-hiring" title="Open Positions"><JobRows jobs={data.openJobs} onApply={apply} applyingId={applyingId} own={data.isOwnProfile} /></Section>
        )}

        {open && (
          <div className="pf-card p-8 text-center">
            <p className="pf-serif text-2xl text-[#2b2622]">See more of {firstName}'s work on BeeBark</p>
            <p className="mt-2 pf-muted">Join to connect, message and follow architects, designers and builders.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to={`/register?next=${encodeURIComponent(`/profile/${username}`)}`} className={heroBtn.dark}>Join BeeBark</Link>
              <Link to={`/login?next=${encodeURIComponent(`/profile/${username}`)}`} className={heroBtn.outline}>Sign in</Link>
            </div>
          </div>
        )}
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
      {!open && !data.isOwnProfile && (
        <ReportDialog open={reportOpen} onOpenChange={setReportOpen} person={user} context="profile"
          onDone={({ blocked }) => { if (blocked) { refreshUser(); navigate('/connections', { replace: true }); } }} />
      )}
    </>
  );
};

// Slim top bar for the public profile (visitors who aren't signed in)
const OpenHeader = ({ username }) => (
  <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-[#ebe6df] bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-8">
      <Link to="/" className="flex items-center gap-2">
        <img src="/image.png" alt="" className="h-8 w-8 object-contain" />
        <span className="pf-serif text-xl font-bold text-[#2b2622]">Bee<span className="text-[#E0A21A]">Bark</span></span>
      </Link>
      <div className="flex items-center gap-2">
        <Link to={`/login?next=${encodeURIComponent(`/profile/${username}`)}`} className="rounded-lg px-4 py-2 text-sm font-medium text-[#2b2622] hover:bg-[#f6f3ef]">Sign in</Link>
        <Link to={`/register?next=${encodeURIComponent(`/profile/${username}`)}`} className="rounded-lg bg-[#2b2622] px-4 py-2 text-sm font-semibold text-white hover:bg-black">Join now</Link>
      </div>
    </div>
  </header>
);

// Exported for the copy-link card on your own profile
export const publicProfileUrl = (username) => `${window.location.origin}/in/${username}`;
export const CopyPublicLink = ({ username }) => (
  <button type="button" onClick={() => navigator.clipboard?.writeText(publicProfileUrl(username)).then(() => toast.success('Link copied'), () => toast(publicProfileUrl(username)))}
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2b2622] hover:underline"><FiLink className="w-4 h-4" />Copy link</button>
);

export default PublicProfile;
