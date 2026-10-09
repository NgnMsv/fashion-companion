import { usePhotoUrl } from '../data/queries.tsx'
import type { Item } from '../engine/types.ts'
import { useI18n } from '../i18n/index.tsx'
import { Garment } from './Garment.tsx'

/** The picture of an item: the user's photo if there is one, else a drawing. */
export function ItemVisual({ item, className = '' }: { item: Item; className?: string }) {
  const { t } = useI18n()
  const photoUrl = usePhotoUrl(item)

  return (
    <div
      className={`aspect-square overflow-hidden rounded-xl bg-tile ${
        item.available ? '' : 'opacity-45'
      } ${className}`}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={t('outfits.photoOf', { name: item.name })}
          className="size-full object-cover"
        />
      ) : (
        <Garment kind={item.kind} color={item.color} className="size-full p-[9%]" />
      )}
    </div>
  )
}
