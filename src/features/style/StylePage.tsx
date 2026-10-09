import { useState } from 'react'
import { useSavePreferences } from '../../data/queries.tsx'
import type { Preferences } from '../../engine/types.ts'
import { useI18n } from '../../i18n/index.tsx'
import { buttonClass } from '../../ui/controls.tsx'
import { ColorsField, OccasionsField, StyleField } from '../onboarding/PreferenceFields.tsx'

/** Lets the user change the answers given during onboarding. */
export function StylePage({ preferences }: { preferences: Preferences }) {
  const { t } = useI18n()
  const savePreferences = useSavePreferences()
  const [draft, setDraft] = useState(preferences)
  const [error, setError] = useState<string>()
  const [saved, setSaved] = useState(false)

  function change(next: Preferences) {
    setDraft(next)
    setSaved(false)
    setError(undefined)
  }

  return (
    <form
      className="max-w-3xl"
      onSubmit={(event) => {
        event.preventDefault()
        if (draft.occasions.length === 0) {
          setError(t('onboarding.needOccasion'))
          return
        }
        savePreferences.mutate(draft, { onSuccess: () => setSaved(true) })
      }}
    >
      <h1 tabIndex={-1} className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">
        {t('stylePage.title')}
      </h1>
      <p className="mt-4 text-lg text-muted">{t('stylePage.intro')}</p>

      <div className="mt-10 space-y-10 [&_legend]:font-display [&_legend]:text-2xl [&_legend]:font-semibold [&_legend]:tracking-tight">
        <StyleField value={draft.style} onChange={(style) => change({ ...draft, style })} />
        <ColorsField
          value={draft.favoriteColors}
          onChange={(favoriteColors) => change({ ...draft, favoriteColors })}
        />
        <OccasionsField
          value={draft.occasions}
          error={error}
          onChange={(occasions) => change({ ...draft, occasions })}
        />
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={savePreferences.isPending} className={buttonClass.primary}>
          {t('common.save')}
        </button>
        <p role="status" className="text-sm font-medium text-good">
          {saved ? t('stylePage.saved') : ''}
        </p>
      </div>
    </form>
  )
}
