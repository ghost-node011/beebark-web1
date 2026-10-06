import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FiCheck, FiPlus } from 'react-icons/fi';
import { Button } from './ui/button';
import { API_URL } from '../config/api';

// 950 -> "950", 1,240 -> "1.2K", 15,000 -> "15K", 2,300,000 -> "2.3M"
export const formatCount = (n) => {
  const num = Number(n) || 0;
  const short = (v, unit) => `${(Math.round(v * 10) / 10).toString().replace(/\.0$/, '')}${unit}`;
  if (num < 1000) return String(num);
  if (num < 999950) return short(num / 1000, 'K');
  return short(num / 1000000, 'M');
};

export const followersLabel = (n) => `${formatCount(n)} follower${Number(n) === 1 ? '' : 's'}`;

/**
 * Follow or unfollow someone with an optimistic update. `onChange` gets
 * { isFollowing, followerCount } right away, then the server's count, or the
 * previous values again if the request fails.
 */
export const toggleFollow = async ({ userId, name, isFollowing, followerCount = 0, onChange }) => {
  const next = !isFollowing;
  onChange?.({ isFollowing: next, followerCount: Math.max(0, followerCount + (next ? 1 : -1)) });
  try {
    const { data } = next
      ? await axios.post(`${API_URL}/api/follow/${userId}`)
      : await axios.delete(`${API_URL}/api/follow/${userId}`);
    onChange?.({ isFollowing: data.following, followerCount: data.followerCount });
    if (!next && name) toast.success(`You unfollowed ${name}`);
    return true;
  } catch (error) {
    onChange?.({ isFollowing, followerCount });
    toast.error(error.response?.data?.error || (next ? 'Could not follow' : 'Could not unfollow'));
    return false;
  }
};

/** LinkedIn-style Follow / Following toggle; "Following" reads "Unfollow" on hover. */
const FollowButton = ({ userId, name, isFollowing, followerCount, onChange, className = '', size = 'sm', label = 'Follow' }) => {
  const [busy, setBusy] = useState(false);

  const onClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return; // ignore double clicks while the request is in flight
    setBusy(true);
    await toggleFollow({ userId, name, isFollowing, followerCount, onChange });
    setBusy(false);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={onClick}
      aria-pressed={!!isFollowing}
      aria-label={isFollowing ? `Unfollow ${name || ''}`.trim() : `Follow ${name || ''}`.trim()}
      className={`group/follow rounded-full font-semibold ${isFollowing
        ? 'border-gray-300 text-gray-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600'
        : 'border-gray-300 text-gray-800 hover:border-black hover:bg-gray-50 hover:text-black'} ${className}`}
      data-testid={`follow-${userId}`}
    >
      {isFollowing ? (
        <>
          <span className="inline-flex items-center gap-1.5 group-hover/follow:hidden"><FiCheck />Following</span>
          <span className="hidden items-center gap-1.5 group-hover/follow:inline-flex">Unfollow</span>
        </>
      ) : (
        <span className="inline-flex items-center gap-1.5"><FiPlus />{label}</span>
      )}
    </Button>
  );
};

export default FollowButton;
