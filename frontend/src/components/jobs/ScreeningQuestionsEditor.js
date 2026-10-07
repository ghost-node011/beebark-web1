import React from 'react';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FiArrowUp, FiArrowDown, FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import { QUESTION_TYPES, MAX_QUESTIONS } from './jobUtils';

let keySeq = 0;
export const newQuestionKey = () => `q-${Date.now()}-${keySeq++}`;

const EDUCATION_OPTIONS = ['Diploma', "Bachelor's", "Master's", 'Doctorate'];

// LinkedIn-style quick-add chips
const QUICK_ADDS = [
  {
    kind: 'experience',
    label: 'Years of experience',
    make: ({ skills }) => ({
      type: 'number',
      text: skills?.[0]
        ? `How many years of experience do you have with ${skills[0]}?`
        : 'How many years of experience do you have with AutoCAD?'
    })
  },
  {
    kind: 'relocation',
    label: 'Relocation',
    make: ({ location }) => ({ type: 'yes_no', text: `Are you willing to relocate to ${location?.trim() || 'the job location'}?` })
  },
  { kind: 'notice', label: 'Notice period', make: () => ({ type: 'short_text', text: 'What is your notice period?' }) },
  { kind: 'salary', label: 'Expected salary', make: () => ({ type: 'short_text', text: 'What is your expected salary?' }) },
  { kind: 'portfolio', label: 'Portfolio link', make: () => ({ type: 'short_text', text: 'Please share a link to your portfolio' }) },
  {
    kind: 'education',
    label: 'Education',
    make: () => ({ type: 'single_choice', text: 'What is your highest level of education?', options: [...EDUCATION_OPTIONS] })
  },
  { kind: 'custom', label: 'Custom question', make: () => ({ type: 'short_text', text: '' }) }
];

const idealPlaceholder = (type) => ({
  yes_no: 'e.g. Yes',
  number: 'e.g. at least 2',
  single_choice: "e.g. Bachelor's",
  short_text: 'Optional',
  long_text: 'Optional'
}[type] || 'Optional');

/** Screening questions section of the post/edit job form. */
const ScreeningQuestionsEditor = ({ questions, onChange, skills, location }) => {
  const full = questions.length >= MAX_QUESTIONS;

  const add = (quick) => {
    if (full) return;
    onChange([...questions, { key: newQuestionKey(), options: [], required: true, idealAnswer: '', ...quick.make({ skills, location }) }]);
  };
  const update = (i, patch) => onChange(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const remove = (i) => onChange(questions.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const setType = (i, type) => {
    const q = questions[i];
    update(i, { type, options: type === 'single_choice' ? (q.options?.length ? q.options : ['', '']) : [] });
  };

  return (
    <div className="rounded-2xl border border-[#ebe6df] bg-[#FBFAF8] p-3 sm:p-4" data-testid="job-form-questions">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-[#2b2622]">Screening questions</p>
        <p className="text-xs text-[#7a7067]">{questions.length}/{MAX_QUESTIONS}</p>
      </div>
      <p className="text-xs text-[#7a7067] mt-1">Ask applicants a few things up front. Answers are shown with each application.</p>

      <div className="flex flex-wrap gap-2 mt-3">
        {QUICK_ADDS.map((quick) => (
          <button
            key={quick.kind}
            type="button"
            disabled={full}
            onClick={() => add(quick)}
            data-testid={`add-question-${quick.kind}`}
            className="inline-flex items-center gap-1 rounded-full border border-[#e2dbd2] bg-white px-3 py-1 text-xs font-medium text-[#2b2622] hover:border-[#F2B21B] hover:bg-[#FFF8E6] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FiPlus className="w-3 h-3" />{quick.label}
          </button>
        ))}
      </div>

      {questions.length > 0 && (
        <ol className="space-y-3 mt-4">
          {questions.map((q, i) => (
            <li key={q.key || q._id || i} className="rounded-xl border border-[#ebe6df] bg-white p-3">
              <div className="flex items-start gap-2">
                <span className="mt-2 text-xs font-semibold text-[#7a7067] w-4 shrink-0">{i + 1}.</span>
                <div className="flex-1 min-w-0 space-y-2">
                  <Input
                    value={q.text}
                    onChange={(e) => update(i, { text: e.target.value })}
                    maxLength={300}
                    placeholder="Type your question"
                    autoFocus={!q.text && !q._id}
                    data-testid={`question-text-${i}`}
                  />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Select value={q.type} onValueChange={(t) => setType(i, t)}>
                      <SelectTrigger className="h-9 w-[11rem]" data-testid={`question-type-${i}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUESTION_TYPES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2 text-sm text-[#2b2622]">
                      <Switch checked={!!q.required} onCheckedChange={(c) => update(i, { required: c })} data-testid={`question-required-${i}`} />
                      Required
                    </label>
                  </div>

                  {q.type === 'single_choice' && (
                    <div className="space-y-2">
                      {(q.options || []).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full border border-[#c9c0b5] shrink-0" />
                          <Input
                            value={opt}
                            onChange={(e) => update(i, { options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })}
                            maxLength={100}
                            placeholder={`Option ${oi + 1}`}
                            className="h-9"
                            data-testid={`question-option-${i}-${oi}`}
                          />
                          <button type="button" onClick={() => update(i, { options: q.options.filter((_, k) => k !== oi) })} className="p-1.5 text-[#7a7067] hover:text-red-600" aria-label="Remove option">
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {(q.options || []).length < 10 && (
                        <button type="button" onClick={() => update(i, { options: [...(q.options || []), ''] })} className="text-xs font-medium text-[#2b2622] underline underline-offset-2">
                          + Add option
                        </button>
                      )}
                    </div>
                  )}

                  <Input
                    value={q.idealAnswer || ''}
                    onChange={(e) => update(i, { idealAnswer: e.target.value })}
                    maxLength={200}
                    placeholder={`Ideal answer (${idealPlaceholder(q.type)})`}
                    className="h-9 text-sm"
                    aria-label="Ideal answer"
                    data-testid={`question-ideal-${i}`}
                  />
                </div>
                <div className="flex flex-col items-center shrink-0">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 text-[#7a7067] hover:text-[#2b2622] disabled:opacity-30" aria-label="Move up"><FiArrowUp className="w-4 h-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === questions.length - 1} className="p-1.5 text-[#7a7067] hover:text-[#2b2622] disabled:opacity-30" aria-label="Move down"><FiArrowDown className="w-4 h-4" /></button>
                  <button type="button" onClick={() => remove(i)} className="p-1.5 text-[#7a7067] hover:text-red-600" aria-label="Remove question" data-testid={`question-remove-${i}`}><FiTrash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

// Problems that should block saving, or '' if the questions are fine
export const questionsError = (questions) => {
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    if (!q.text?.trim()) return `Question ${i + 1} is empty — type it or remove it`;
    if (q.type === 'single_choice' && (q.options || []).filter((o) => o.trim()).length < 2) {
      return `Question ${i + 1} needs at least two options`;
    }
  }
  return '';
};

// Shape the backend expects (existing questions keep their _id)
export const questionsPayload = (questions) => questions.map((q) => ({
  ...(q._id ? { _id: q._id } : {}),
  text: q.text.trim(),
  type: q.type,
  options: q.type === 'single_choice' ? q.options.map((o) => o.trim()).filter(Boolean) : [],
  required: !!q.required,
  idealAnswer: (q.idealAnswer || '').trim()
}));

export default ScreeningQuestionsEditor;
