import { useState, type ReactNode } from 'react'
import { useClearAll, useLoadSample } from '../../data/queries.tsx'
import { SAMPLE_PREFERENCES, sampleWardrobe } from '../../data/sample.ts'
import { TREE, type Context } from '../../engine/tree.ts'
import type { Preferences } from '../../engine/types.ts'
import { useI18n } from '../../i18n/index.tsx'
import { navigate, ROUTES } from '../../lib/router.tsx'
import { buttonClass } from '../../ui/controls.tsx'
import { TreeDiagram } from '../outfits/TreeDiagram.tsx'

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-fg py-8 md:grid-cols-[14rem_1fr] md:gap-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="max-w-2xl space-y-4 text-pretty">{children}</div>
    </section>
  )
}

/** A button that asks "are you sure?" in place before doing something destructive. */
function ConfirmButton({
  label,
  question,
  confirmLabel,
  onConfirm,
}: {
  label: string
  question: string
  confirmLabel: string
  onConfirm: () => void
}) {
  const { t } = useI18n()
  const [asking, setAsking] = useState(false)

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={buttonClass.secondary}>
        {label}
      </button>
    )
  }
  return (
    <div role="group" aria-label={question} className="rounded-2xl border border-accent p-4">
      <p className="font-medium">{question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          autoFocus
          className={buttonClass.danger}
          onClick={() => {
            setAsking(false)
            onConfirm()
          }}
        >
          {confirmLabel}
        </button>
        <button type="button" onClick={() => setAsking(false)} className={buttonClass.quiet}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}

export function AboutPage({ preferences }: { preferences: Preferences | null }) {
  const i18n = useI18n()
  const { t } = i18n
  const clearAll = useClearAll()
  const loadSample = useLoadSample()

  // The tree is shown in general terms here, so the occasion and season are left open.
  const context: Context = {
    request: { occasion: 'everyday', season: 'spring' },
    preferences: preferences ?? SAMPLE_PREFERENCES,
  }
  const generic = { ...i18n, t: genericT(t) }

  return (
    <>
      <h1 tabIndex={-1} className="max-w-3xl font-display text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
        {t('about.title')}
      </h1>
      <p className="mt-4 mb-10 max-w-2xl text-lg text-muted">{t('app.tagline')}</p>

      <Block title={t('about.how.title')}>
        <p>{t('about.how.body')}</p>
      </Block>

      <Block title={t('about.tree.title')}>
        <TreeDiagram tree={TREE} context={context} wording={generic} />
      </Block>

      <Block title={t('about.privacy.title')}>
        <p>{t('about.privacy.body')}</p>
        <div className="flex flex-col items-start gap-3">
          <ConfirmButton
            label={t('about.sample')}
            question={t('about.sampleConfirm')}
            confirmLabel={t('about.sampleYes')}
            onConfirm={() =>
              loadSample.mutate(
                { items: sampleWardrobe(t), preferences: preferences ?? SAMPLE_PREFERENCES },
                { onSuccess: () => navigate(ROUTES.outfits) },
              )
            }
          />
          <ConfirmButton
            label={t('about.reset')}
            question={t('about.resetConfirm')}
            confirmLabel={t('about.resetYes')}
            onConfirm={() => clearAll.mutate(undefined, { onSuccess: () => navigate(ROUTES.outfits) })}
          />
        </div>
      </Block>
    </>
  )
}

/** Replaces the occasion and season in question texts with "…". */
function genericT(t: ReturnType<typeof useI18n>['t']): ReturnType<typeof useI18n>['t'] {
  return (key, params) => t(key, { ...params, occasion: '…', season: '…' })
}
