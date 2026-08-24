import React, { useState } from 'react';
import axios from 'axios';
import { FiZap, FiCheck, FiX } from 'react-icons/fi';
import { API_URL } from '../../config/api';

/**
 * Inline "Did you mean X?" AI correction chip. Call `check(text)` (e.g. on
 * blur of a text input) to fetch a suggestion; renders nothing until one is
 * available. `onAccept(correctedText)` applies it; the chip then also offers
 * any closely-related alternatives (e.g. "Photography" -> "Adobe Photoshop").
 */
const useSuggestChip = (context) => {
  const [suggestion, setSuggestion] = useState(null);
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(false);

  const check = async (text) => {
    if (!text?.trim()) return null;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/ai/suggest`, { text, context });
      setOriginal(text);
      if (res.data.changed || res.data.alternatives?.length > 0 || res.data.relevant === false) {
        setSuggestion(res.data);
      } else {
        setSuggestion(null);
      }
      return res.data;
    } catch (error) {
      setSuggestion(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => setSuggestion(null);

  return { suggestion, original, loading, check, dismiss };
};

const SuggestChip = ({ suggestion, onAccept, onAcceptAlternative, onDismiss }) => {
  if (!suggestion) return null;
  if (!suggestion.changed && !suggestion.alternatives?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2" data-testid="ai-suggest-chip">
      <FiZap className="text-yellow-500 shrink-0" />
      {suggestion.changed && (
        <button type="button" onClick={() => onAccept(suggestion.corrected)} className="inline-flex items-center gap-1 font-medium text-black hover:underline">
          Did you mean <span className="font-bold">{suggestion.corrected}</span>?
        </button>
      )}
      {suggestion.alternatives?.map((alt, i) => (
        <button key={i} type="button" onClick={() => onAcceptAlternative(alt)} className="inline-flex items-center gap-1 border border-gray-300 rounded-full px-2 py-0.5 hover:border-black transition">
          <FiCheck className="w-3 h-3" />{alt}
        </button>
      ))}
      <button type="button" onClick={onDismiss} className="ml-auto text-gray-400 hover:text-gray-600" aria-label="Dismiss">
        <FiX className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export { SuggestChip, useSuggestChip };
