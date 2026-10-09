import { useEffect, useId, useMemo, useState } from 'react'
import { useDeleteItem, usePhotoUrl, useSaveItem } from '../../data/queries.tsx'
import { newId } from '../../data/repository.ts'
import { colorFamily } from '../../engine/color.ts'
import {
  CATEGORIES,
  FORMALITY_LEVELS,
  KIND_LIST,
  KINDS,
  SEASONS,
  type Item,
} from '../../engine/types.ts'
import { useI18n } from '../../i18n/index.tsx'
import { buttonClass, ChoiceGroup, inputClass } from '../../ui/controls.tsx'
import { Garment } from '../../ui/Garment.tsx'
import { PALETTE } from '../palette.ts'
import { processPhoto } from './photo.ts'

function blankItem(): Item {
  return {
    id: newId(),
    name: '',
    kind: 'tshirt',
    color: '#f7f5f0',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    formality: 2,
    available: true,
    hasPhoto: false,
  }
}

interface ItemFormProps {
  /** The item to edit, or null to add a new one. */
  item: Item | null
  onDone: () => void
}

export function ItemForm({ item, onDone }: ItemFormProps) {
  const { t } = useI18n()
  const saveItem = useSaveItem()
  const deleteItem = useDeleteItem()

  const [draft, setDraft] = useState<Item>(() => item ?? blankItem())
  // undefined: photo untouched, Blob: new photo, null: photo removed
  const [photo, setPhoto] = useState<Blob | null | undefined>(undefined)
  const [photoError, setPhotoError] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const nameId = useId()
  const nameErrorId = useId()
  const kindId = useId()
  const colorId = useId()
  const photoId = useId()
  const availableId = useId()
  const availableHintId = useId()

  const storedPhotoUrl = usePhotoUrl(draft)
  const newPhotoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => {
    return () => {
      if (newPhotoUrl) URL.revokeObjectURL(newPhotoUrl)
    }
  }, [newPhotoUrl])
  const previewUrl = photo === null ? null : (newPhotoUrl ?? storedPhotoUrl)

  const nameMissing = draft.name.trim() === ''
  const seasonsMissing = draft.seasons.length === 0

  async function choosePhoto(file: File | undefined) {
    if (!file) return
    try {
      const processed = await processPhoto(file)
      setPhoto(processed.blob)
      setPhotoError(false)
      setDraft((current) => ({ ...current, color: processed.color }))
    } catch {
      setPhotoError(true)
    }
  }

  function submit() {
    setSubmitted(true)
    if (nameMissing || seasonsMissing) return
    saveItem.mutate(
      { item: { ...draft, name: draft.name.trim() }, photo },
      { onSuccess: onDone },
    )
  }

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div>
        <label htmlFor={nameId} className="text-sm font-semibold">
          {t('item.name')}
        </label>
        <input
          id={nameId}
          type="text"
          autoComplete="off"
          value={draft.name}
          placeholder={t('item.namePlaceholder')}
          aria-invalid={submitted && nameMissing}
          aria-describedby={submitted && nameMissing ? nameErrorId : undefined}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          className={`${inputClass} mt-2`}
        />
        {submitted && nameMissing && (
          <p id={nameErrorId} role="alert" className="mt-2 text-sm font-medium text-accent">
            {t('item.nameRequired')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-[1fr_5.5rem] items-end gap-4">
        <div>
          <label htmlFor={kindId} className="text-sm font-semibold">
            {t('item.kind')}
          </label>
          <select
            id={kindId}
            value={draft.kind}
            onChange={(event) => {
              const kind = KIND_LIST.find((candidate) => candidate === event.target.value)
              if (kind) setDraft({ ...draft, kind })
            }}
            className={`${inputClass} mt-2`}
          >
            {CATEGORIES.map((category) => (
              <optgroup key={category} label={t(`category.${category}`)}>
                {KIND_LIST.filter((kind) => KINDS[kind] === category).map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`kind.${kind}`)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="rounded-xl bg-tile">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={t('item.photoPreview')}
              className="aspect-square w-full rounded-xl object-cover"
            />
          ) : (
            <Garment kind={draft.kind} color={draft.color} className="p-1.5" />
          )}
        </div>
      </div>

      <div>
        <ChoiceGroup
          legend={`${t('item.color')}: ${t(`color.${colorFamily(draft.color)}`)}`}
          type="single"
          choices={PALETTE.map(({ family, hex }) => ({
            value: hex,
            label: t(`color.${family}`),
            swatch: hex,
          }))}
          selected={[draft.color]}
          onChange={([color]) => color && setDraft({ ...draft, color })}
        />
        <div className="mt-3 flex items-center gap-3">
          <input
            id={colorId}
            type="color"
            value={draft.color}
            onChange={(event) => setDraft({ ...draft, color: event.target.value })}
            className="size-11 cursor-pointer rounded-lg border border-fg/30 bg-surface p-1"
          />
          <label htmlFor={colorId} className="text-sm">
            {t('item.customColor')}
          </label>
        </div>
      </div>

      <ChoiceGroup
        legend={t('item.seasons')}
        type="multiple"
        choices={SEASONS.map((season) => ({ value: season, label: t(`season.${season}`) }))}
        selected={draft.seasons}
        onChange={(seasons) => setDraft({ ...draft, seasons })}
        error={submitted && seasonsMissing ? t('item.seasonsRequired') : undefined}
      />

      <ChoiceGroup
        legend={t('item.formality')}
        type="single"
        choices={FORMALITY_LEVELS.map((level) => ({ value: level, label: t(`formality.${level}`) }))}
        selected={[draft.formality]}
        onChange={([formality]) => formality && setDraft({ ...draft, formality })}
      />

      <div>
        <p className="text-sm font-semibold">{t('item.photo')}</p>
        <p className="mt-1 text-sm text-muted">{t('item.photoHint')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label
            htmlFor={photoId}
            className={`${buttonClass.secondary} focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-accent`}
          >
            {t('item.photoChoose')}
            <input
              id={photoId}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                void choosePhoto(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
          {previewUrl && (
            <button type="button" onClick={() => setPhoto(null)} className={buttonClass.quiet}>
              {t('item.photoRemove')}
            </button>
          )}
        </div>
        {photoError && (
          <p role="alert" className="mt-2 text-sm font-medium text-accent">
            {t('item.photoError')}
          </p>
        )}
      </div>

      <div className="flex items-start gap-3">
        <input
          id={availableId}
          type="checkbox"
          checked={draft.available}
          aria-describedby={availableHintId}
          onChange={(event) => setDraft({ ...draft, available: event.target.checked })}
          className="mt-1 size-5 cursor-pointer accent-(--fg)"
        />
        <div>
          <label htmlFor={availableId} className="block cursor-pointer text-sm font-semibold">
            {t('item.available')}
          </label>
          <p id={availableHintId} className="text-sm text-muted">
            {t('item.availableHint')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        {item && !confirmingDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className={buttonClass.danger}
          >
            {t('common.delete')}
          </button>
        )}
        {item && confirmingDelete && (
          <div role="group" aria-label={t('item.deleteConfirm')} className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{t('item.deleteConfirm')}</span>
            <button
              type="button"
              autoFocus
              onClick={() => deleteItem.mutate(item.id, { onSuccess: onDone })}
              className={buttonClass.danger}
            >
              {t('item.deleteYes')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className={buttonClass.quiet}
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onDone} className={buttonClass.quiet}>
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={saveItem.isPending} className={buttonClass.primary}>
            {t('common.save')}
          </button>
        </div>
      </div>
    </form>
  )
}
