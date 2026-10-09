import type { Context, QuestionId, Step } from '../../engine/tree.ts'
import type { MessageKey, Params, Translate } from '../../i18n/index.tsx'

/*
 * Turns the engine's raw answers into sentences. The engine only records
 * facts (which question, yes or no, which pieces and colours); the wording
 * lives here and in the translation files.
 */

export interface Wording {
  t: Translate
  list: (items: string[]) => string
}

/** The values a question's text may refer to. */
function baseParams(context: Context, { t }: Wording): Params {
  return {
    occasion: t(`occasion.${context.request.occasion}`),
    season: t(`season.${context.request.season}`),
    style: t(`style.${context.preferences.style}`),
  }
}

export function questionText(id: QuestionId, context: Context, wording: Wording): string {
  return wording.t(`q.${id}`, baseParams(context, wording))
}

/** The sentence under a question that says what the answer was based on. */
export function answerDetail(step: Step, context: Context, wording: Wording): string {
  const { t, list } = wording
  const pieces = step.facts.pieces ?? []
  const colors = (step.facts.colors ?? []).map((family) => t(`color.${family}`))
  const key: MessageKey = `q.${step.question}.${step.answer ? 'yes' : 'no'}`

  return t(key, {
    ...baseParams(context, wording),
    pieces: list(pieces),
    colors: list(colors),
    a: pieces[0] ?? '',
    b: pieces[1] ?? '',
  })
}
