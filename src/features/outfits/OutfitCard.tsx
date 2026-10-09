import { useId, useState } from 'react'
import type { Recommendation } from '../../engine/recommend.ts'
import type { Context } from '../../engine/tree.ts'
import { piecesOf } from '../../engine/types.ts'
import { useI18n } from '../../i18n/index.tsx'
import { buttonClass, eyebrowClass } from '../../ui/controls.tsx'
import { ItemVisual } from '../../ui/ItemVisual.tsx'
import { WhyPanel } from './WhyPanel.tsx'

interface OutfitCardProps {
  number: number
  recommendation: Recommendation
  context: Context
  saved: boolean
  onToggleSaved: () => void
  onHide: () => void
}

export function OutfitCard({
  number,
  recommendation,
  context,
  saved,
  onToggleSaved,
  onHide,
}: OutfitCardProps) {
  const { t } = useI18n()
  const [whyOpen, setWhyOpen] = useState(false)
  const titleId = useId()
  const panelId = useId()

  const { outfit, evaluation } = recommendation
  const pieces = piecesOf(outfit)
  const { leaf } = evaluation

  return (
    <article
      aria-labelledby={titleId}
      className="animate-rise overflow-hidden rounded-3xl border border-line bg-surface"
      style={{ animationDelay: `${(number - 1) * 70}ms` }}
    >
      <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center md:gap-10">
        <ul className={`grid gap-2.5 ${pieces.length === 4 ? 'grid-cols-2' : 'grid-cols-3 md:grid-cols-2'}`}>
          {pieces.map((piece, index) => (
            <li
              key={piece.id}
              className={pieces.length === 3 && index === 0 ? 'md:col-span-2 md:mx-auto md:w-1/2' : ''}
            >
              <ItemVisual item={piece} />
            </li>
          ))}
        </ul>

        <div>
          <p className={`${eyebrowClass} flex flex-wrap items-center gap-3`}>
            {t('outfits.look', { number: String(number).padStart(2, '0') })}
            <span
              className={`rounded-full px-2.5 py-1 tracking-wider ${
                leaf.verdict === 'great' ? 'bg-good text-bg' : 'border border-fg/40 text-fg'
              }`}
            >
              {t(`verdict.${leaf.verdict}`)}
            </span>
          </p>
          <h2
            id={titleId}
            className="mt-3 font-display text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
          >
            {t(`leaf.${leaf.id}`)}
          </h2>
          <p className="mt-2 text-pretty text-muted">{t(`leaf.${leaf.id}.body`)}</p>

          <ul className="mt-5 divide-y divide-line border-y border-line">
            {pieces.map((piece) => (
              <li key={piece.id} className="flex items-baseline justify-between gap-4 py-2">
                <span className="font-medium">{piece.name}</span>
                <span className="shrink-0 text-sm text-muted">{t(`kind.${piece.kind}`)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              aria-expanded={whyOpen}
              aria-controls={panelId}
              onClick={() => setWhyOpen((open) => !open)}
              className={buttonClass.primary}
            >
              {t('outfits.why')}
              <span aria-hidden="true" className={`transition-transform ${whyOpen ? 'rotate-180' : ''}`}>
                ↓
              </span>
            </button>
            <button
              type="button"
              aria-pressed={saved}
              onClick={onToggleSaved}
              className={buttonClass.secondary}
            >
              <span aria-hidden="true">{saved ? '★' : '☆'}</span>
              {t(saved ? 'outfits.saved' : 'outfits.save')}
            </button>
            <button type="button" onClick={onHide} className={buttonClass.quiet}>
              {t('outfits.hide')}
            </button>
          </div>
        </div>
      </div>

      {whyOpen && <WhyPanel id={panelId} evaluation={evaluation} context={context} />}
    </article>
  )
}
