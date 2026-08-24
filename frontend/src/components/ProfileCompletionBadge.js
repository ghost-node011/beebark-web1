import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from './ui/dropdown-menu';
import { FiCheckCircle, FiCircle } from 'react-icons/fi';
import { API_URL } from '../config/api';

/**
 * Persistent "profile X% complete" indicator — rendered once in TopBar, so
 * it's visible on every authenticated page, not just the profile itself.
 */
const ProfileCompletionBadge = () => {
  const navigate = useNavigate();
  const [completion, setCompletion] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/profile/completion`)
      .then((res) => setCompletion(res.data))
      .catch(() => setCompletion(null));
  }, []);

  if (!completion || completion.percent >= 100) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-yellow-300 bg-yellow-50 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-100 transition"
          aria-label={`Profile ${completion.percent}% complete`}
          data-testid="profile-completion-badge"
        >
          <span className="relative w-4 h-4 shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 -rotate-90">
              <circle cx="12" cy="12" r="10" fill="none" stroke="#e5e7eb" strokeWidth="4" />
              <circle
                cx="12" cy="12" r="10" fill="none" stroke="#facc15" strokeWidth="4"
                strokeDasharray={`${(completion.percent / 100) * 62.8} 62.8`}
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="hidden sm:inline">Profile {completion.percent}% complete</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-3 py-2">
          <p className="text-sm font-semibold text-black mb-1">Finish setting up your profile</p>
          <p className="text-xs text-gray-500 mb-2">A complete profile gets more job matches and connections.</p>
          <ul className="space-y-1.5">
            {completion.missing.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-gray-700">
                <FiCircle className="text-gray-300 shrink-0" />{item}
              </li>
            ))}
          </ul>
        </div>
        <DropdownMenuItem onClick={() => navigate('/profile')} className="text-yellow-700 font-medium">
          <FiCheckCircle className="mr-2" />Complete my profile
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileCompletionBadge;
