import { useMemo, useState } from 'react'
import { useItems, useOutfitMarks, useSetOutfitMark } from '../../data/queries.tsx'
import { recommend, seasonOf } from '../../engine/recommend.ts'
import type { Context } from '../../engine/tree.ts'
import {
  CATEGORIES,
  categoryOf,
  OCCASIONS,
  SEASONS,
  type Item,
  type Occasion,
  type Preferences,
  type Season,
} from '../../engine/types.ts'
import { useI18n } from '../../i18n/index.tsx'
import { Link, ROUTES } from '../../lib/router.tsx'
import {
  buttonClass,
  ChoiceGroup,
  EmptyState,
  ErrorState,
  eyebrowClass,
  Skeleton,
} from '../../ui/controls.tsx'
import { ItemVisual } from '../../ui/ItemVisual.tsx'
import { OutfitCard } from './OutfitCard.tsx'

interface OutfitsPageProps {
  preferences: Preferences
  /** Today's date; passed in so tests can fix the season. */
  today?: Date
}

export function OutfitsPage({ preferences, today }: OutfitsPageProps) {
  const { t, list } = useI18n()
  const items = useItems()
  const marks = useOutfitMarks()
  const setMark = useSetOutfitMark()

  const [occasion, setOccasion] = useState<Occasion>(preferences.occasions[0] ?? 'everyday')
  const [season, setSeason] = useState<Season>(() => seasonOf(today ?? new Date()))
  const [seed, setSeed] = useState(0)
  /** The outfit removed last, so "Undo" can bring it back. */
  const [lastHidden, setLastHidden] = useState<string | null>(null)

  const context: Context = useMemo(
    () => ({ request: { occasion, season }, preferences }),
    [occasion, season, preferences],
  )

  const result = useMemo(() => {
    if (!items.data || !marks.data) return null
    const hidden = new Set(
      Object.entries(marks.data)
        .filter(([, mark]) => mark === 'hidden')
        .map(([key]) => key),
    )
    return recommend({ items: items.data, preferences, request: context.request, hidden, seed })
  }, [items.data, marks.data, preferences, context.request, seed])

  const hiddenKeys = Object.entries(marks.data ?? {})
    .filter(([, mark]) => mark === 'hidden')
    .map(([key]) => key)

  return (
    <>
      <p className={eyebrowClass}>
        {t(`occasion.${occasion}`)} · {t(`season.${season}`)}
      </p>
      <h1 tabIndex={-1} className="mt-2 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
        {t('outfits.title')}
      </h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <ChoiceGroup
          legend={t('outfits.occasion')}
          type="single"
          choices={OCCASIONS.map((value) => ({ value, label: t(`occasion.${value}`) }))}
          selected={[occasion]}
          onChange={([next]) => next && setOccasion(next)}
        />
        <ChoiceGroup
          legend={t('outfits.season')}
          type="single"
          choices={SEASONS.map((value) => ({ value, label: t(`season.${value}`) }))}
          selected={[season]}
          onChange={([next]) => next && setSeason(next)}
        />
        <button
          type="button"
          onClick={() => setSeed((current) => current + 1)}
          disabled={result?.status !== 'ok'}
          className={buttonClass.secondary}
        >
          <span aria-hidden="true">↻</span> {t('outfits.shuffle')}
        </button>
      </div>

      {/* Announces the result of changing a control, and offers Undo after a removal. */}
      <div aria-live="polite" className="mt-6 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        {result?.status === 'ok' && (
          <p>
            {t(
              result.recommendations.length === 1 ? 'outfits.summary.one' : 'outfits.summary.other',
              { count: result.recommendations.length, considered: result.considered },
            )}
          </p>
        )}
        {lastHidden && (
          <p className="font-medium text-fg">
            {t('outfits.hidden')}{' '}
            <button
              type="button"
              className="cursor-pointer underline underline-offset-4"
              onClick={() => {
                setMark.mutate({ key: lastHidden, mark: null })
                setLastHidden(null)
              }}
            >
              {t('outfits.undo')}
            </button>
          </p>
        )}
      </div>

      <div className="mt-4 space-y-6">
        {(items.isPending || marks.isPending) && <Skeleton count={2} className="h-80" />}

        {(items.isError || marks.isError) && (
          <ErrorState
            onRetry={() => {
              void items.refetch()
              void marks.refetch()
            }}
          />
        )}

        {result?.status === 'missing-pieces' && (
          <EmptyState
            title={t(
              (items.data?.length ?? 0) === 0 ? 'outfits.empty.title' : 'outfits.missing.title',
            )}
            action={
              <Link to={ROUTES.wardrobe} className={buttonClass.primary}>
                {t('outfits.empty.add')}
              </Link>
            }
          >
            <p>
              {(items.data?.length ?? 0) === 0
                ? t('outfits.empty.body')
                : t('outfits.missing.body', {
                    missing: list(result.missing.map((category) => t(`category.one.${category}`))),
                  })}
            </p>
          </EmptyState>
        )}

        {result?.status === 'no-match' && (
          <EmptyState
            title={t('outfits.noMatch.title')}
            action={
              result.dismissed > 0 ? (
                <button
                  type="button"
                  className={buttonClass.secondary}
                  onClick={() => {
                    for (const key of hiddenKeys) setMark.mutate({ key, mark: null })
                    setLastHidden(null)
                  }}
                >
                  {t('outfits.noMatch.restore')}
                </button>
              ) : undefined
            }
          >
            <p>
              {t('outfits.noMatch.body', {
                considered: result.considered,
                occasion: t(`occasion.${occasion}`),
                season: t(`season.${season}`),
              })}
            </p>
            <ul className="mt-3 space-y-1 font-medium text-fg">
              {result.rejections.map(({ leaf, count }) => (
                <li key={leaf}>
                  {t('outfits.noMatch.reason', { count, reason: t(`leaf.${leaf}`) })}
                </li>
              ))}
            </ul>
            {result.dismissed > 0 && (
              <p className="mt-3">{t('outfits.noMatch.dismissed', { count: result.dismissed })}</p>
            )}
            <p className="mt-3">{t('outfits.noMatch.tip')}</p>
          </EmptyState>
        )}

        {result?.status === 'ok' &&
          result.recommendations.map((recommendation, index) => (
            <OutfitCard
              // The seed is part of the key so "Shuffle" replays the entrance animation.
              key={`${seed}-${recommendation.key}`}
              number={index + 1}
              recommendation={recommendation}
              context={context}
              saved={marks.data?.[recommendation.key] === 'saved'}
              onToggleSaved={() =>
                setMark.mutate({
                  key: recommendation.key,
                  mark: marks.data?.[recommendation.key] === 'saved' ? null : 'saved',
                })
              }
              onHide={() => {
                setMark.mutate({ key: recommendation.key, mark: 'hidden' })
                setLastHidden(recommendation.key)
              }}
            />
          ))}
      </div>

      <SavedOutfits
        items={items.data ?? []}
        savedKeys={Object.entries(marks.data ?? {})
          .filter(([, mark]) => mark === 'saved')
          .map(([key]) => key)}
        onRemove={(key) => setMark.mutate({ key, mark: null })}
      />
    </>
  )
}

interface SavedOutfitsProps {
  items: Item[]
  savedKeys: string[]
  onRemove: (key: string) => void
}

function SavedOutfits({ items, savedKeys, onRemove }: SavedOutfitsProps) {
  const { t, list } = useI18n()
  const byId = new Map(items.map((item) => [item.id, item]))

  // A saved look is stored as the ids of its pieces; pieces deleted since are skipped.
  const saved = savedKeys
    .map((key) => ({
      key,
      pieces: key
        .split('+')
        .map((id) => byId.get(id))
        .filter((piece): piece is Item => piece !== undefined)
        // Shown in wearing order: outerwear, top, bottom, shoes.
        .sort((a, b) => CATEGORIES.indexOf(categoryOf(a)) - CATEGORIES.indexOf(categoryOf(b))),
    }))
    .filter((look) => look.pieces.length >= 3)

  return (
    <section aria-labelledby="saved-title" className="mt-16">
      <h2
        id="saved-title"
        className="border-b border-fg pb-2 font-display text-2xl font-semibold tracking-tight"
      >
        {t('outfits.savedTitle')}
      </h2>
      {saved.length === 0 ? (
        <p className="mt-4 text-muted">{t('outfits.savedEmpty')}</p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map(({ key, pieces }) => (
            <li key={key} className="rounded-2xl border border-line bg-surface p-4">
              <div className="grid grid-cols-4 gap-1.5">
                {pieces.map((piece) => (
                  <ItemVisual key={piece.id} item={piece} />
                ))}
              </div>
              <p className="mt-3 text-sm text-pretty">{list(pieces.map((piece) => piece.name))}</p>
              <button
                type="button"
                onClick={() => onRemove(key)}
                className={`${buttonClass.quiet} mt-1 -ml-5`}
              >
                {t('outfits.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
