import { describe, expect, it } from 'vitest'
import { de } from './de.ts'
import { en, type MessageKey } from './en.ts'
import { translate } from './index.tsx'

const keys = Object.keys(en) as MessageKey[]
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

describe('translations', () => {
  it('has a non-empty German text for every English key', () => {
    expect(Object.keys(de).sort()).toEqual([...keys].sort())
    for (const key of keys) expect(de[key].trim()).not.toBe('')
  })

  it('uses the same placeholders in both languages', () => {
    for (const key of keys) {
      expect(placeholders(de[key]), key).toEqual(placeholders(en[key]))
    }
  })
})

describe('translate', () => {
  it('fills in placeholders', () => {
    expect(translate('en', 'outfits.look', { number: '02' })).toBe('Look 02')
    expect(translate('de', 'onboarding.step', { current: 1, total: 3 })).toBe('Schritt 1 von 3')
  })

  it('leaves a placeholder visible when its value is missing', () => {
    expect(translate('en', 'outfits.look')).toBe('Look {number}')
  })
})
