import React from 'react';
import { Switch } from '../../ui/switch';

export const TEMPLATE_GROUPS = ['Architecture', 'Interiors', 'Creative', 'Construction & suppliers'];

// Entries without `group`/`modes` are portfolio templates in the Architecture group
export const templateGroup = (t) => t.group || 'Architecture';
export const templateModes = (t) => (Array.isArray(t.modes) && t.modes.length ? t.modes : ['portfolio']);
export const templatesFor = (themes, mode) => themes.filter((t) => templateModes(t).includes(mode));

export const ModeToggle = ({ mode, onChange }) => (
  <div>
    <p className="mb-2 text-sm font-semibold text-black">What are you showing?</p>
    <div className="grid grid-cols-2 rounded-xl border border-gray-200 bg-gray-50 p-1" role="radiogroup" aria-label="Portfolio type">
      {[['portfolio', 'Portfolio'], ['catalogue', 'Product catalogue']].map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={mode === key}
          onClick={() => mode !== key && onChange(key)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === key ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
          data-testid={`pf-mode-${key}`}
        >
          {label}
        </button>
      ))}
    </div>
    <p className="mt-1.5 text-xs text-gray-500">
      {mode === 'catalogue' ? 'Show products with prices, specs and an enquiry button.' : 'Show your projects and the story behind them.'}
    </p>
  </div>
);

// A tiny page sketch in the template's own colours
const MiniPreview = ({ swatches, fallback, image, headingFont }) => {
  const [bg, fg, accent] = swatches && swatches.length >= 2 ? swatches : [fallback.background, fallback.textColor, fallback.accent];
  return (
    <div className="relative h-24 overflow-hidden p-2" style={{ backgroundColor: bg }} aria-hidden="true">
      <div className="flex items-center justify-between">
        <span className="text-[13px] leading-none" style={{ color: fg, fontFamily: headingFont }}>Aa</span>
        <span className="h-1.5 w-6 rounded-full" style={{ backgroundColor: accent || fg, opacity: accent ? 1 : 0.4 }} />
      </div>
      <div className="mt-2 grid grid-cols-[3fr_2fr] gap-1.5">
        {image ? (
          <img src={image} alt="" className="h-12 w-full rounded-sm object-cover" />
        ) : (
          <span className="h-12 rounded-sm" style={{ backgroundColor: fg, opacity: 0.18 }} />
        )}
        <span className="space-y-1">
          <span className="block h-1.5 rounded-full" style={{ backgroundColor: fg, opacity: 0.7 }} />
          <span className="block h-1.5 w-3/4 rounded-full" style={{ backgroundColor: fg, opacity: 0.35 }} />
          <span className="block h-1.5 w-1/2 rounded-full" style={{ backgroundColor: accent || fg, opacity: accent ? 0.9 : 0.35 }} />
        </span>
      </div>
    </div>
  );
};

export const TemplateGallery = ({ themes, mode, theme, onSelect, paletteDefaults, firstImage, headingFont }) => {
  const available = templatesFor(themes, mode);
  const groups = [...TEMPLATE_GROUPS, ...new Set(available.map(templateGroup).filter((g) => !TEMPLATE_GROUPS.includes(g)))]
    .map((group) => ({ group, list: available.filter((t) => templateGroup(t) === group) }))
    .filter((g) => g.list.length);
  const currentHidden = !available.some((t) => t.key === theme);
  return (
    <div data-testid="pf-template-gallery">
      <p className="mb-3 text-sm font-semibold text-black">Template</p>
      {currentHidden && available.length > 0 && (
        <p className="mb-3 rounded-lg bg-yellow-50 p-2 text-xs text-gray-700">Your current template isn't made for this mode. Pick one below.</p>
      )}
      {available.length === 0 && <p className="text-sm text-gray-500">No templates for this mode yet.</p>}
      <div className="space-y-5">
        {groups.map(({ group, list }) => (
          <div key={group}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{group}</p>
            <div className="grid grid-cols-2 gap-3">
              {list.map((t) => {
                const fallback = paletteDefaults[t.key] || paletteDefaults.editorial || { background: '#FAF9F6', textColor: '#111111' };
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => onSelect(t.key)}
                    aria-pressed={theme === t.key}
                    className={`min-w-0 overflow-hidden rounded-xl border-2 text-left transition ${theme === t.key ? 'border-yellow-400' : 'border-gray-200 hover:border-gray-300'}`}
                    data-testid={`theme-${t.key}`}
                  >
                    <MiniPreview swatches={t.swatches} fallback={fallback} image={firstImage} headingFont={headingFont} />
                    <div className="p-2">
                      <p className="truncate text-sm font-semibold text-black">{t.label}</p>
                      <p className="line-clamp-2 text-xs text-gray-500">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PageToggles = ({ showCv, showContact, onChange }) => (
  <div className="space-y-3" data-testid="pf-pages">
    <p className="text-sm font-semibold text-black">Pages</p>
    {[
      ['showCv', showCv, 'Show CV page', 'Your experience, education and skills from your profile', 'pf-show-cv'],
      ['showContact', showContact, 'Show contact page', 'How to reach you, at the end of your portfolio', 'pf-show-contact']
    ].map(([key, value, label, help, testId]) => (
      <label key={key} className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm text-black">{label}</span>
          <span className="block text-xs text-gray-500">{help}</span>
        </span>
        <Switch checked={value} onCheckedChange={(checked) => onChange({ [key]: checked })} data-testid={testId} aria-label={label} />
      </label>
    ))}
  </div>
);
