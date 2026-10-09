import type { Context, Step, TreeNode } from '../../engine/tree.ts'
import { useI18n } from '../../i18n/index.tsx'
import { questionText, type Wording } from './explain.ts'

interface TreeDiagramProps {
  tree: TreeNode
  context: Context
  /** The answers of one outfit. Its path through the tree is highlighted. */
  steps?: Step[]
  /** Overrides how question texts are worded (the About page leaves the occasion open). */
  wording?: Wording
}

/** The whole decision tree as nested lists, with one path optionally highlighted. */
export function TreeDiagram({ tree, context, steps, wording }: TreeDiagramProps) {
  const i18n = useI18n()
  return (
    <div className="overflow-x-auto pb-2 text-sm">
      <Node node={tree} context={context} remaining={steps ?? null} wording={wording ?? i18n} />
    </div>
  )
}

interface NodeProps {
  node: TreeNode
  context: Context
  /** The answers still ahead on the highlighted path; null when off the path. */
  remaining: Step[] | null
  wording: Wording
}

function Node({ node, context, remaining, wording }: NodeProps) {
  const { t } = useI18n()
  const onPath = remaining !== null

  if (node.type === 'leaf') {
    return (
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 ${
          onPath ? 'bg-fg font-semibold text-bg' : 'border border-fg/25 text-muted'
        }`}
      >
        {t(`verdict.${node.verdict}`)}: {t(`leaf.${node.id}`)}
        {onPath && <span className="sr-only"> {t('why.taken')}</span>}
      </span>
    )
  }

  const answer = remaining?.[0]?.answer
  const rest = remaining?.slice(1) ?? null

  return (
    <div className="min-w-64">
      <p className={onPath ? 'font-semibold' : 'text-muted'}>
        {questionText(node.id, context, wording)}
        {onPath && <span className="sr-only"> {t('why.taken')}</span>}
      </p>
      <ul className="mt-1.5 ml-1.5 space-y-1.5 border-l border-fg/25 pl-4">
        {([true, false] as const).map((branch) => (
          <li key={String(branch)}>
            <span
              className={`mr-2 text-xs font-semibold tracking-wider uppercase ${
                answer === branch ? 'text-accent' : 'text-muted'
              }`}
            >
              {t(branch ? 'why.ifYes' : 'why.ifNo')}
            </span>
            <Node
              node={branch ? node.yes : node.no}
              context={context}
              remaining={answer === branch ? rest : null}
              wording={wording}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
