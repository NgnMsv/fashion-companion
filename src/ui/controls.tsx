import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useI18n } from '../i18n/index.tsx'

/* Shared interface pieces: buttons, choice pills, dialog, page states. */

const buttonBase =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export const buttonClass = {
  primary: `${buttonBase} bg-fg text-bg hover:bg-accent hover:text-accent-fg`,
  secondary: `${buttonBase} border border-fg/40 text-fg hover:border-fg hover:bg-fg/5`,
  quiet: `${buttonBase} text-fg underline decoration-fg/30 underline-offset-4 hover:decoration-fg`,
  danger: `${buttonBase} border border-accent text-accent hover:bg-accent hover:text-accent-fg`,
} as const

export const eyebrowClass = 'text-xs font-semibold tracking-[0.18em] text-muted uppercase'

export const inputClass =
  'min-h-11 w-full rounded-lg border border-fg/30 bg-surface px-3 text-base text-fg placeholder:text-muted/80'

interface Choice<T extends string | number> {
  value: T
  label: string
  hint?: string
  /** A colour dot shown before the label. */
  swatch?: string
}

interface ChoiceGroupProps<T extends string | number> {
  legend: string
  hint?: string
  /** One answer (radio buttons) or several (checkboxes). */
  type: 'single' | 'multiple'
  choices: Choice<T>[]
  selected: T[]
  onChange: (selected: T[]) => void
  /** Larger pills with the hint on its own line. */
  size?: 'regular' | 'large'
  /** Hide the legend visually (it stays available to screen readers). */
  hideLegend?: boolean
  error?: string
}

/**
 * A group of pill-shaped choices. Underneath they are native radio buttons
 * or checkboxes, so keyboard and screen-reader behaviour comes for free.
 */
export function ChoiceGroup<T extends string | number>({
  legend,
  hint,
  type,
  choices,
  selected,
  onChange,
  size = 'regular',
  hideLegend = false,
  error,
}: ChoiceGroupProps<T>) {
  const name = useId()
  const hintId = useId()
  const errorId = useId()

  function toggle(value: T) {
    if (type === 'single') onChange([value])
    else if (selected.includes(value)) onChange(selected.filter((entry) => entry !== value))
    else onChange([...selected, value])
  }

  return (
    <fieldset aria-describedby={[hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined}>
      <legend className={hideLegend ? 'sr-only' : 'text-sm font-semibold'}>{legend}</legend>
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className={`mt-3 flex flex-wrap ${size === 'large' ? 'gap-3' : 'gap-2'}`}>
        {choices.map((choice) => (
          <label key={choice.value} className={size === 'large' ? 'w-full sm:w-auto sm:flex-1' : ''}>
            <input
              type={type === 'single' ? 'radio' : 'checkbox'}
              name={name}
              checked={selected.includes(choice.value)}
              onChange={() => toggle(choice.value)}
              className="peer sr-only"
            />
            <span
              className={`flex cursor-pointer items-center gap-2 border border-fg/30 bg-surface transition-colors peer-checked:border-fg peer-checked:bg-fg peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent hover:border-fg ${
                size === 'large'
                  ? 'min-h-20 flex-col items-start justify-center gap-0.5 rounded-2xl px-5 py-3'
                  : 'min-h-11 rounded-full px-4 text-sm font-medium'
              }`}
            >
              {choice.swatch && (
                <span
                  aria-hidden="true"
                  className="size-4 shrink-0 rounded-full border border-black/25 ring-1 ring-white/40"
                  style={{ backgroundColor: choice.swatch }}
                />
              )}
              <span className={size === 'large' ? 'font-display text-xl font-semibold' : ''}>
                {choice.label}
              </span>
              {choice.hint && <span className="text-sm opacity-80">{choice.hint}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-accent">
          {error}
        </p>
      )}
    </fieldset>
  )
}

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** A modal built on the native <dialog>: focus trap and Escape come built in. */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (event.target === ref.current) onClose()
      }}
      className="m-auto max-h-[92dvh] w-[min(100%-1.5rem,34rem)] rounded-3xl border border-line bg-bg p-0 text-fg open:animate-fade"
    >
      {open && (
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="font-display text-3xl font-semibold tracking-tight">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="-mt-1 -mr-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-2xl leading-none hover:bg-fg/10"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  )
}

interface StateProps {
  title: string
  children?: ReactNode
  action?: ReactNode
}

/** A friendly panel for "nothing here" situations. */
export function EmptyState({ title, children, action }: StateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-fg/30 px-6 py-12 text-center">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-balance">{title}</h2>
      {children && <div className="mx-auto mt-3 max-w-md text-pretty text-muted">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <div role="alert" className="rounded-3xl border border-accent px-6 py-10 text-center">
      <h2 className="font-display text-3xl font-semibold tracking-tight">{t('error.title')}</h2>
      <p className="mx-auto mt-3 max-w-md text-muted">{t('error.body')}</p>
      <button type="button" onClick={onRetry} className={`${buttonClass.secondary} mt-6`}>
        {t('common.retry')}
      </button>
    </div>
  )
}

/** Grey placeholder blocks shown while data loads. */
export function Skeleton({ count, className }: { count: number; className: string }) {
  const { t } = useI18n()
  return (
    <div role="status" aria-label={t('app.loading')} className="contents">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`animate-pulse rounded-2xl bg-tile ${className}`} />
      ))}
    </div>
  )
}
