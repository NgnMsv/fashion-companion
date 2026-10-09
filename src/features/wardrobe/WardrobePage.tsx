import { useId, useState } from 'react'
import { useItems, useLoadSample } from '../../data/queries.tsx'
import { sampleWardrobe } from '../../data/sample.ts'
import {
  CATEGORIES,
  COLOR_FAMILIES,
  FORMALITY_LEVELS,
  SEASONS,
  type Item,
} from '../../engine/types.ts'
import { useI18n } from '../../i18n/index.tsx'
import {
  buttonClass,
  Dialog,
  EmptyState,
  ErrorState,
  eyebrowClass,
  inputClass,
  Skeleton,
} from '../../ui/controls.tsx'
import { ItemVisual } from '../../ui/ItemVisual.tsx'
import { filterItems, groupByCategory, hasActiveFilters, NO_FILTERS, type Filters } from './filter.ts'
import { ItemForm } from './ItemForm.tsx'

interface FilterSelectProps<T extends string | number> {
  label: string
  value: T | 'all'
  options: { value: T; label: string }[]
  onChange: (value: T | 'all') => void
}

function FilterSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: FilterSelectProps<T>) {
  const { t } = useI18n()
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-muted">
        {label}
      </label>
      <select
        id={id}
        value={String(value)}
        onChange={(event) => {
          const picked = options.find((option) => String(option.value) === event.target.value)
          onChange(picked ? picked.value : 'all')
        }}
        className={`${inputClass} mt-1 text-sm`}
      >
        <option value="all">{t('common.all')}</option>
        {options.map((option) => (
          <option key={option.value} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ItemCard({ item, onEdit }: { item: Item; onEdit: () => void }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={t('wardrobe.edit', { name: item.name })}
      className="group block w-full cursor-pointer rounded-2xl text-left"
    >
      <div className="relative">
        <ItemVisual
          item={item}
          className="transition-transform duration-300 group-hover:-translate-y-1"
        />
        {!item.available && (
          <span className="absolute top-2 left-2 rounded-full bg-fg px-2.5 py-1 text-xs font-semibold text-bg">
            {t('wardrobe.unavailable')}
          </span>
        )}
      </div>
      <span className="mt-2.5 block leading-snug font-medium">{item.name}</span>
      <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
        <span
          aria-hidden="true"
          className="size-3 rounded-full border border-fg/30"
          style={{ backgroundColor: item.color }}
        />
        {t(`kind.${item.kind}`)} · {t(`formality.${item.formality}`)}
      </span>
    </button>
  )
}

export function WardrobePage() {
  const { t } = useI18n()
  const items = useItems()
  const loadSample = useLoadSample()
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  /** The item being edited, 'new' while adding, or null when the dialog is closed. */
  const [editing, setEditing] = useState<Item | 'new' | null>(null)
  const searchId = useId()

  const all = items.data ?? []
  const shown = filterItems(all, filters)
  const filtering = hasActiveFilters(filters)

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrowClass} aria-live="polite">
            {filtering
              ? t('wardrobe.countOf', { shown: shown.length, total: all.length })
              : t(all.length === 1 ? 'wardrobe.count.one' : 'wardrobe.count.other', {
                  count: all.length,
                })}
          </p>
          <h1 tabIndex={-1} className="mt-2 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
            {t('wardrobe.title')}
          </h1>
        </div>
        <button type="button" onClick={() => setEditing('new')} className={buttonClass.primary}>
          <span aria-hidden="true">+</span> {t('wardrobe.add')}
        </button>
      </div>

      {items.isPending && (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          <Skeleton count={8} className="aspect-square" />
        </div>
      )}

      {items.isError && (
        <div className="mt-10">
          <ErrorState onRetry={() => void items.refetch()} />
        </div>
      )}

      {items.isSuccess && all.length === 0 && (
        <div className="mt-10">
          <EmptyState
            title={t('wardrobe.empty.title')}
            action={
              <>
                <button type="button" onClick={() => setEditing('new')} className={buttonClass.primary}>
                  {t('wardrobe.add')}
                </button>
                <button
                  type="button"
                  disabled={loadSample.isPending}
                  onClick={() => loadSample.mutate({ items: sampleWardrobe(t) })}
                  className={buttonClass.secondary}
                >
                  {t('about.sample')}
                </button>
              </>
            }
          >
            <p>{t('wardrobe.empty.body')}</p>
          </EmptyState>
        </div>
      )}

      {items.isSuccess && all.length > 0 && (
        <>
          <section
            aria-label={t('wardrobe.filters')}
            className="mt-8 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[1.6fr_repeat(4,1fr)]"
          >
            <div className="col-span-2 md:col-span-1">
              <label htmlFor={searchId} className="text-xs font-semibold text-muted">
                {t('wardrobe.search')}
              </label>
              <input
                id={searchId}
                type="search"
                value={filters.search}
                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                className={`${inputClass} mt-1 text-sm`}
              />
            </div>
            <FilterSelect
              label={t('wardrobe.filter.category')}
              value={filters.category}
              options={CATEGORIES.map((value) => ({ value, label: t(`category.${value}`) }))}
              onChange={(category) => setFilters({ ...filters, category })}
            />
            <FilterSelect
              label={t('wardrobe.filter.color')}
              value={filters.color}
              options={COLOR_FAMILIES.map((value) => ({ value, label: t(`color.${value}`) }))}
              onChange={(color) => setFilters({ ...filters, color })}
            />
            <FilterSelect
              label={t('wardrobe.filter.season')}
              value={filters.season}
              options={SEASONS.map((value) => ({ value, label: t(`season.${value}`) }))}
              onChange={(season) => setFilters({ ...filters, season })}
            />
            <FilterSelect
              label={t('wardrobe.filter.formality')}
              value={filters.formality}
              options={FORMALITY_LEVELS.map((value) => ({ value, label: t(`formality.${value}`) }))}
              onChange={(formality) => setFilters({ ...filters, formality })}
            />
          </section>

          {shown.length === 0 ? (
            <div className="mt-10">
              <EmptyState
                title={t('wardrobe.noResults.title')}
                action={
                  <button
                    type="button"
                    onClick={() => setFilters(NO_FILTERS)}
                    className={buttonClass.secondary}
                  >
                    {t('wardrobe.clearFilters')}
                  </button>
                }
              >
                <p>{t('wardrobe.noResults.body')}</p>
              </EmptyState>
            </div>
          ) : (
            groupByCategory(shown).map((group) => (
              <section key={group.category} className="mt-12">
                <h2 className="flex items-baseline gap-3 border-b border-fg pb-2 font-display text-2xl font-semibold tracking-tight">
                  {t(`category.${group.category}`)}
                  <span className="font-sans text-sm font-normal text-muted">
                    {group.items.length}
                  </span>
                </h2>
                <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <ItemCard item={item} onEdit={() => setEditing(item)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={t(editing === 'new' ? 'item.newTitle' : 'item.editTitle')}
      >
        {editing !== null && (
          <ItemForm
            key={editing === 'new' ? 'new' : editing.id}
            item={editing === 'new' ? null : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </>
  )
}
