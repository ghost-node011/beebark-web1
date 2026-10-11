import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FiHeart, FiMessageCircle, FiSend, FiTrash2 } from 'react-icons/fi';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { API_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const ago = (d) => {
  const mins = Math.round((Date.now() - new Date(d)) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  if (mins < 10080) return `${Math.round(mins / 1440)}d`;
  return new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' });
};

/**
 * Like and comment on a profile activity post. Signed-out visitors (public
 * /in/ links) are sent to sign in. `share` is the Share control to show last.
 */
const PostActions = ({ post, share }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [postAuthor, setPostAuthor] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const needSignIn = () => {
    if (user) return false;
    toast('Sign in to like and comment');
    navigate('/login');
    return true;
  };

  const toggleLike = async () => {
    if (needSignIn()) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      const { data } = await axios.post(`${API_URL}/api/posts/${post._id}/like`);
      setLiked(data.liked);
      setLikeCount(data.likes);
    } catch (error) {
      setLiked(!next);
      setLikeCount((n) => Math.max(0, n + (next ? -1 : 1)));
      toast.error(error.response?.data?.error || 'Could not like this post');
    }
  };

  const toggleComments = async () => {
    if (needSignIn()) return;
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      try {
        const { data } = await axios.get(`${API_URL}/api/posts/${post._id}/comments`);
        setComments(data.comments);
        setPostAuthor(String(data.postAuthor));
        setCommentCount(data.comments.length);
      } catch (error) {
        setComments([]);
        toast.error(error.response?.data?.error || 'Could not load comments');
      }
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/posts/${post._id}/comment`, { text: value });
      setComments(data.comments);
      setCommentCount(data.count);
      setText('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not post your comment');
    } finally {
      setSending(false);
    }
  };

  const remove = async (c) => {
    try {
      const { data } = await axios.delete(`${API_URL}/api/posts/${post._id}/comments/${c._id}`);
      setComments((list) => list.filter((x) => x._id !== c._id));
      setCommentCount(data.count);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not delete the comment');
    }
  };

  const me = String(user?._id || user?.id || '');

  return (
    <>
      <div className="mt-4 flex items-center gap-5 text-[15px] pf-muted">
        <button type="button" onClick={toggleLike} aria-pressed={liked} data-testid={`like-${post._id}`}
          className={`inline-flex items-center gap-1.5 transition hover:text-[#32281F] ${liked ? 'text-[#C2410C]' : ''}`}>
          <FiHeart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />{likeCount}
        </button>
        <button type="button" onClick={toggleComments} aria-expanded={open} data-testid={`comments-${post._id}`}
          className={`inline-flex items-center gap-1.5 transition hover:text-[#32281F] ${open ? 'text-[#32281F]' : ''}`}>
          <FiMessageCircle className="w-4 h-4" />{commentCount}
        </button>
        {share}
      </div>

      {open && (
        <div className="mt-4 border-t border-[#EFEBE6] pt-4" data-testid={`comment-thread-${post._id}`}>
          {comments === null ? (
            <p className="text-sm pf-muted">Loading comments…</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c._id} className="flex gap-3">
                  <Link to={`/profile/${c.author.username}`} className="shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={c.author.profilePic} alt="" />
                      <AvatarFallback className="bg-[#F2EFEC] text-xs text-[#32281F]">{c.author.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1 rounded-xl bg-[#F7F5F2] px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Link to={`/profile/${c.author.username}`} className="font-semibold text-[#1C1712] hover:underline">{c.author.name}</Link>
                      <span className="text-xs pf-muted">{ago(c.createdAt)}</span>
                      {(String(c.author._id) === me || postAuthor === me) && (
                        <button type="button" onClick={() => remove(c)} className="ml-auto p-0.5 pf-muted hover:text-red-600" aria-label="Delete comment"><FiTrash2 className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                    <p className="mt-0.5 whitespace-pre-line break-words text-[15px] text-[#3D342C]">{c.text}</p>
                  </div>
                </li>
              ))}
              {comments.length === 0 && <li className="text-sm pf-muted">No comments yet. Start the conversation.</li>}
            </ul>
          )}
          <form onSubmit={send} className="mt-3 flex items-center gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Add a comment…" data-testid={`comment-input-${post._id}`}
              className="h-10 min-w-0 flex-1 rounded-full border border-[#E6E1DB] bg-white px-4 text-[15px] outline-none focus:border-[#E0B93C]" />
            <button type="submit" disabled={!text.trim() || sending} aria-label="Post comment" data-testid={`comment-send-${post._id}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#32281F] text-white disabled:opacity-40">
              <FiSend className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default PostActions;
