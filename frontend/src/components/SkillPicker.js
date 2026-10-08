import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { AutocompleteInput } from './AutocompleteInput';
import { Button } from './ui/button';

// Popular skills for the built-environment industry, shown as one-tap chips
export const SUGGESTED_SKILLS = [
  'AutoCAD', 'Revit', 'SketchUp', 'Rhino', 'Lumion', 'V-Ray', 'Enscape', '3ds Max', 'Photoshop',
  'BIM', 'ArchiCAD', 'Working Drawings', 'Space Planning', 'Interior Design', 'Sustainable Design',
  'Site Supervision', 'Estimation', 'Quantity Surveying', 'STAAD Pro', 'ETABS', 'Primavera', 'MS Project',
  'Project Management', 'Landscape Design', 'Urban Design', 'Real Estate Sales', 'Negotiation', 'Client Handling'
];

/**
 * Search-as-you-type skill input with suggested skills underneath (like LinkedIn).
 * `skills` is the current list; `onAdd(skill)` adds one.
 */
const SkillPicker = ({ skills = [], onAdd, max = 50, inputClassName = '', testId = 'skill-input', onBlur }) => {
  const [text, setText] = useState('');
  const has = (s) => skills.some((x) => x.toLowerCase() === s.toLowerCase());
  const add = (value) => {
    const v = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!v) return;
    if (has(v)) { setText(''); return; }
    if (skills.length >= max) return;
    onAdd(v);
    setText('');
  };
  const suggestions = SUGGESTED_SKILLS.filter((s) => !has(s)).slice(0, 15);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <AutocompleteInput
          field="skill"
          wrapperClassName="flex-1"
          className={inputClassName}
          value={text}
          onChange={setText}
          onPick={add}
          onBlur={onBlur}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(text); } }}
          placeholder="Search skills, e.g. Revit"
          data-testid={testId}
        />
        <Button type="button" onClick={() => add(text)} disabled={!text.trim()} className="bg-yellow-400 hover:bg-yellow-500 text-black shrink-0" data-testid="add-skill-button">Add</Button>
      </div>
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Suggested skills</p>
          <div className="flex flex-wrap gap-2" data-testid="skill-suggestions">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => add(s)}
                className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-black hover:text-black transition">
                <FiPlus className="w-3 h-3" />{s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillPicker;
