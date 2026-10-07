import React from 'react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

/**
 * The right input for a screening question. `value` is always a string:
 * "Yes"/"No" for yes_no, digits for number, the chosen option for single_choice.
 */
const QuestionInput = ({ question, value, onChange, invalid, testId }) => {
  const v = value ?? '';
  const ring = invalid ? 'border-red-400 focus-visible:ring-red-300' : 'border-[#e2dbd2]';

  if (question.type === 'yes_no' || question.type === 'single_choice') {
    const options = question.type === 'yes_no' ? ['Yes', 'No'] : (question.options || []);
    return (
      <div role="radiogroup" aria-label={question.text} className={`flex flex-wrap gap-2 ${question.type === 'single_choice' ? 'flex-col sm:flex-row' : ''}`} data-testid={testId}>
        {options.map((opt) => {
          const on = v === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(opt)}
              data-testid={testId ? `${testId}-${opt}` : undefined}
              className={`text-left rounded-full border px-4 py-1.5 text-sm transition ${on ? 'bg-[#2b2622] border-[#2b2622] text-white' : `bg-white text-[#2b2622] hover:border-[#2b2622] ${invalid ? 'border-red-400' : 'border-[#e2dbd2]'}`}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'long_text') {
    return (
      <Textarea value={v} onChange={(e) => onChange(e.target.value)} maxLength={2000} className={`min-h-24 bg-white ${ring}`} data-testid={testId} aria-invalid={invalid || undefined} />
    );
  }

  if (question.type === 'number') {
    return (
      <Input
        type="text"
        inputMode="decimal"
        value={v}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        maxLength={10}
        placeholder="e.g. 2"
        className={`max-w-[10rem] bg-white ${ring}`}
        data-testid={testId}
        aria-invalid={invalid || undefined}
      />
    );
  }

  return (
    <Input value={v} onChange={(e) => onChange(e.target.value)} maxLength={300} className={`bg-white ${ring}`} data-testid={testId} aria-invalid={invalid || undefined} />
  );
};

export default QuestionInput;
