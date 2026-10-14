import React from 'react';
import { toast } from 'sonner';
import { FiCopy, FiMail, FiShare2, FiUserPlus } from 'react-icons/fi';
import { FaWhatsapp, FaLinkedin } from 'react-icons/fa6';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '../context/AuthContext';
import { shareUrl } from './ShareMenu';

/** Invite people to join BeeBark: a sign-up link to copy or share. */
const InviteDialog = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const link = shareUrl(user?.username ? `/register?ref=${encodeURIComponent(user.username)}` : '/register');
  const message = `Join me on BeeBark, the professional network for architecture, interiors, real estate and construction. Show your work, find opportunities and connect: ${link}`;
  const openWin = (href) => window.open(href, '_blank', 'noopener,noreferrer,width=640,height=640');
  const copy = () => navigator.clipboard?.writeText(link).then(() => toast.success('Invite link copied'), () => toast(link));
  const native = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const btn = 'flex flex-col items-center gap-1.5 rounded-xl border border-[#E6E1DB] bg-white px-2 py-3 text-xs font-medium text-[#32281F] hover:border-[#E0B93C] hover:bg-[#FFFBEF]';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md overflow-hidden" data-testid="invite-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FiUserPlus className="text-[#C9A227]" />Invite to BeeBark</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-sm text-gray-500">Invite colleagues, clients and classmates. They get their own profile and portfolio, and you can connect once they join.</p>
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[#E6E1DB] bg-[#FAF8F5] p-2 pl-3">
          <span className="min-w-0 flex-1 truncate text-sm text-[#3D342C]" data-testid="invite-link">{link.replace(/^https?:\/\//, '')}</span>
          <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#32281F] px-3 py-2 text-sm font-semibold text-white hover:bg-[#221A14]" data-testid="invite-copy">
            <FiCopy className="h-4 w-4" />Copy
          </button>
        </div>
        <div className={`grid min-w-0 gap-2 ${native ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
          <button type="button" className={btn} onClick={() => openWin(`https://wa.me/?text=${encodeURIComponent(message)}`)}><FaWhatsapp className="h-5 w-5 text-[#25D366]" />WhatsApp</button>
          <button type="button" className={btn} onClick={() => openWin(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`)}><FaLinkedin className="h-5 w-5 text-[#0A66C2]" />LinkedIn</button>
          <button type="button" className={btn} onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent('Join me on BeeBark')}&body=${encodeURIComponent(message)}`; }}><FiMail className="h-5 w-5" />Email</button>
          {native && <button type="button" className={btn} onClick={() => navigator.share({ title: 'Join me on BeeBark', text: message, url: link }).catch(() => {})}><FiShare2 className="h-5 w-5" />More</button>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteDialog;
