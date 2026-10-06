import React from 'react';
import { toast } from 'sonner';
import { FiShare2, FiLink, FiMail } from 'react-icons/fi';
import { FaWhatsapp, FaLinkedin, FaXTwitter, FaFacebook } from 'react-icons/fa6';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from './ui/dropdown-menu';

// Absolute link for an in-app path
export const shareUrl = (path) => `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;

const copy = async (url) => {
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link copied');
  } catch {
    toast(url); // shows the link so it can be copied by hand
  }
};

/**
 * Share button with a menu: copy link, WhatsApp, LinkedIn, X, Facebook, email,
 * and the phone's own share sheet where available. `path` is an in-app path
 * like /profile/asha; `title` and `text` fill the message.
 */
const ShareMenu = ({ path, title, text = '', trigger, align = 'end', testId = 'share' }) => {
  const url = shareUrl(path);
  const message = [title, text].filter(Boolean).join(' – ');
  const open = (href) => window.open(href, '_blank', 'noopener,noreferrer,width=640,height=640');
  const native = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <button type="button" className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 transition" data-testid={testId}>
            <FiShare2 className="w-4 h-4" />Share
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => copy(url)} data-testid={`${testId}-copy`}><FiLink className="mr-2" />Copy link</DropdownMenuItem>
        {native && (
          <DropdownMenuItem onClick={() => navigator.share({ title, text: message, url }).catch(() => {})}><FiShare2 className="mr-2" />Share via…</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => open(`https://wa.me/?text=${encodeURIComponent(`${message}\n${url}`)}`)}><FaWhatsapp className="mr-2 text-green-600" />WhatsApp</DropdownMenuItem>
        <DropdownMenuItem onClick={() => open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)}><FaLinkedin className="mr-2 text-[#0A66C2]" />LinkedIn</DropdownMenuItem>
        <DropdownMenuItem onClick={() => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`)}><FaXTwitter className="mr-2" />X</DropdownMenuItem>
        <DropdownMenuItem onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}><FaFacebook className="mr-2 text-[#1877F2]" />Facebook</DropdownMenuItem>
        <DropdownMenuItem onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(title || 'On BeeBark')}&body=${encodeURIComponent(`${message}\n\n${url}`)}`; }}><FiMail className="mr-2" />Email</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareMenu;
