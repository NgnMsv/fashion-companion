import { TREE, type Context, type Evaluation } from '../../engine/tree.ts'
import { useI18n } from '../../i18n/index.tsx'
import { eyebrowClass } from '../../ui/controls.tsx'
import { answerDetail, questionText } from './explain.ts'
import { TreeDiagram } from './TreeDiagram.tsx'

interface WhyPanelProps {
  id: string
  evaluation: Evaluation
  context: Context
}

/**
 * "Why this outfit?": the questions the decision tree asked about this
 * outfit, the answer to each, and the verdict they led to.
 */
export function WhyPanel({ id, evaluation, context }: WhyPanelProps) {
  const i18n = useI18n()
  const { t } = i18n
  const { steps, leaf } = evaluation

  return (
    <section id={id} aria-label={t('why.title')} className="animate-rise border-t border-line p-5 sm:p-7">
      <h3 className="font-display text-2xl font-semibold tracking-tight">{t('why.title')}</h3>
      <p className="mt-1 text-sm text-muted">
        {t(steps.length === 1 ? 'why.intro.one' : 'why.intro.other', { count: steps.length })}
      </p>

      {/* The trail: one stop per question, joined by a line down the left. */}
      <ol className="mt-6">
        {steps.map((step, index) => (
          <li key={step.question} className="relative pb-6 pl-12">
            <span aria-hidden="true" className="absolute top-8 bottom-0 left-[0.95rem] w-px bg-fg/25" />
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 flex size-8 items-center justify-center rounded-full border border-fg/40 bg-bg text-xs font-semibold"
            >
              {index + 1}
            </span>
            <p className="font-medium text-pretty">
              {questionText(step.question, context, i18n)}{' '}
              <span
                className={`ml-1 inline-block rounded-full px-2.5 py-0.5 align-middle text-xs font-bold tracking-wider uppercase ${
                  step.answer ? 'bg-good text-bg' : 'bg-fg/15 text-fg'
                }`}
              >
                {t(step.answer ? 'common.yes' : 'common.no')}
              </span>
            </p>
            <p className="mt-1 text-sm text-pretty text-muted">{answerDetail(step, context, i18n)}</p>
          </li>
        ))}

        <li className="relative pl-12">
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 flex size-8 items-center justify-center rounded-full bg-fg text-bg"
          >
            ✓
          </span>
          <div className="rounded-2xl bg-fg p-4 text-bg">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-80">
              {t('why.result')} · {t(`verdict.${leaf.verdict}`)}
            </p>
            <p className="mt-1 font-display text-xl font-semibold">{t(`leaf.${leaf.id}`)}</p>
            <p className="mt-1 text-sm text-pretty opacity-90">{t(`leaf.${leaf.id}.body`)}</p>
            <p className="mt-2 text-xs opacity-80">{t('why.score', { score: leaf.score })}</p>
          </div>
        </li>
      </ol>

      <details className="group mt-6 rounded-2xl border border-line">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold marker:content-none">
          <span aria-hidden="true" className="mr-2 transition-transform group-open:rotate-90">
            ›
          </span>
          {t('why.fullTree')}
        </summary>
        <div className="border-t border-line p-4">
          <p className={`${eyebrowClass} mb-4`}>{t('why.fullTreeHint')}</p>
          <TreeDiagram tree={TREE} context={context} steps={steps} />
        </div>
      </details>
    </section>
  )
}
