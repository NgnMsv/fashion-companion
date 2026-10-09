import { useEffect, useRef, useState } from 'react'
import { useLoadSample, useSavePreferences } from '../../data/queries.tsx'
import { SAMPLE_PREFERENCES, sampleWardrobe } from '../../data/sample.ts'
import type { Preferences } from '../../engine/types.ts'
import { useI18n } from '../../i18n/index.tsx'
import { buttonClass, eyebrowClass } from '../../ui/controls.tsx'
import { Garment } from '../../ui/Garment.tsx'
import { ColorsField, OccasionsField, StyleField } from './PreferenceFields.tsx'

const STEPS = 3

/** First-run screen: a short pitch, then either onboarding or sample data. */
export function Welcome() {
  const { t } = useI18n()
  const [started, setStarted] = useState(false)
  const loadSample = useLoadSample()

  if (started) return <Onboarding onBack={() => setStarted(false)} />

  return (
    <div className="grid items-center gap-10 py-4 md:grid-cols-[1.1fr_0.9fr] md:py-12">
      <div>
        <p className={eyebrowClass}>{t('welcome.eyebrow')}</p>
        <h1 className="mt-4 font-display text-5xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          {t('welcome.title')}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-pretty text-muted">{t('welcome.body')}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => setStarted(true)} className={buttonClass.primary}>
            {t('welcome.start')}
          </button>
          <button
            type="button"
            disabled={loadSample.isPending}
            onClick={() =>
              loadSample.mutate({ items: sampleWardrobe(t), preferences: SAMPLE_PREFERENCES })
            }
            className={buttonClass.secondary}
          >
            {t('welcome.sample')}
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">{t('welcome.sampleHint')}</p>
        <p className="mt-8 text-sm text-muted">{t('welcome.privacy')}</p>
      </div>

      {/* A decorative preview of what an outfit looks like in the app. */}
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 md:rotate-2">
        <div className="animate-rise rounded-3xl bg-tile p-5">
          <Garment kind="coat" color="#c9a87c" />
        </div>
        <div className="animate-rise rounded-3xl bg-tile p-5 [animation-delay:80ms] md:translate-y-8">
          <Garment kind="sweater" color="#2f6b4f" />
        </div>
        <div className="animate-rise rounded-3xl bg-tile p-5 [animation-delay:160ms]">
          <Garment kind="jeans" color="#3f5f8a" />
        </div>
        <div className="animate-rise rounded-3xl bg-tile p-5 [animation-delay:240ms] md:translate-y-8">
          <Garment kind="boots" color="#5a3a22" />
        </div>
      </div>
    </div>
  )
}

function Onboarding({ onBack }: { onBack: () => void }) {
  const { t } = useI18n()
  const savePreferences = useSavePreferences()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Preferences>({
    style: 'classic',
    favoriteColors: [],
    occasions: ['everyday'],
  })
  const [error, setError] = useState<string>()

  // Move focus to the new step so keyboard and screen-reader users follow along.
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [step])

  function next() {
    if (step < STEPS - 1) {
      setStep(step + 1)
    } else if (draft.occasions.length === 0) {
      setError(t('onboarding.needOccasion'))
    } else {
      savePreferences.mutate(draft)
    }
  }

  return (
    <form
      className="mx-auto max-w-2xl py-4 md:py-10"
      onSubmit={(event) => {
        event.preventDefault()
        next()
      }}
    >
      <h1 ref={heading} tabIndex={-1} className={eyebrowClass}>
        {t('onboarding.step', { current: step + 1, total: STEPS })}
      </h1>
      <div
        aria-hidden="true"
        className="mt-3 grid h-1 grid-cols-3 gap-1.5"
      >
        {Array.from({ length: STEPS }, (_, index) => (
          <span
            key={index}
            className={`rounded-full transition-colors ${index <= step ? 'bg-fg' : 'bg-fg/15'}`}
          />
        ))}
      </div>

      <div key={step} className="mt-10 animate-rise [&_legend]:font-display [&_legend]:text-4xl [&_legend]:leading-tight [&_legend]:font-semibold [&_legend]:tracking-tight">
        {step === 0 && (
          <StyleField value={draft.style} onChange={(style) => setDraft({ ...draft, style })} />
        )}
        {step === 1 && (
          <ColorsField
            value={draft.favoriteColors}
            onChange={(favoriteColors) => setDraft({ ...draft, favoriteColors })}
          />
        )}
        {step === 2 && (
          <OccasionsField
            value={draft.occasions}
            error={error}
            onChange={(occasions) => {
              setError(undefined)
              setDraft({ ...draft, occasions })
            }}
          />
        )}
      </div>

      <div className="mt-10 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => (step === 0 ? onBack() : setStep(step - 1))}
          className={buttonClass.quiet}
        >
          {t('common.back')}
        </button>
        <button type="submit" disabled={savePreferences.isPending} className={buttonClass.primary}>
          {t(step === STEPS - 1 ? 'onboarding.finish' : 'common.next')}
        </button>
      </div>
    </form>
  )
}
