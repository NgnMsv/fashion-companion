import {
  OCCASIONS,
  STYLES,
  type ColorFamily,
  type Occasion,
  type Style,
} from '../../engine/types.ts'
import { useI18n } from '../../i18n/index.tsx'
import { ChoiceGroup } from '../../ui/controls.tsx'
import { PALETTE } from '../palette.ts'

/* The three preference questions, shared by onboarding and "My style". */

export function StyleField({ value, onChange }: { value: Style; onChange: (v: Style) => void }) {
  const { t } = useI18n()
  return (
    <ChoiceGroup
      legend={t('onboarding.styleTitle')}
      hint={t('onboarding.styleHint')}
      type="single"
      size="large"
      choices={STYLES.map((style) => ({
        value: style,
        label: t(`style.${style}`),
        hint: t(`style.${style}.hint`),
      }))}
      selected={[value]}
      onChange={([next]) => next && onChange(next)}
    />
  )
}

export function ColorsField({
  value,
  onChange,
}: {
  value: ColorFamily[]
  onChange: (v: ColorFamily[]) => void
}) {
  const { t } = useI18n()
  return (
    <ChoiceGroup
      legend={t('onboarding.colorsTitle')}
      hint={t('onboarding.colorsHint')}
      type="multiple"
      choices={PALETTE.map(({ family, hex }) => ({
        value: family,
        label: t(`color.${family}`),
        swatch: hex,
      }))}
      selected={value}
      onChange={onChange}
    />
  )
}

export function OccasionsField({
  value,
  onChange,
  error,
}: {
  value: Occasion[]
  onChange: (v: Occasion[]) => void
  error?: string
}) {
  const { t } = useI18n()
  return (
    <ChoiceGroup
      legend={t('onboarding.occasionsTitle')}
      hint={t('onboarding.occasionsHint')}
      type="multiple"
      choices={OCCASIONS.map((occasion) => ({ value: occasion, label: t(`occasion.${occasion}`) }))}
      selected={value}
      onChange={onChange}
      error={error}
    />
  )
}
