import { colorFamily } from '../../engine/color.ts'
import {
  CATEGORIES,
  categoryOf,
  type Category,
  type ColorFamily,
  type Formality,
  type Item,
  type Season,
} from '../../engine/types.ts'

export interface Filters {
  search: string
  category: Category | 'all'
  color: ColorFamily | 'all'
  season: Season | 'all'
  formality: Formality | 'all'
}

export const NO_FILTERS: Filters = {
  search: '',
  category: 'all',
  color: 'all',
  season: 'all',
  formality: 'all',
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.category !== 'all' ||
    filters.color !== 'all' ||
    filters.season !== 'all' ||
    filters.formality !== 'all'
  )
}

export function filterItems(items: Item[], filters: Filters): Item[] {
  const search = filters.search.trim().toLowerCase()
  return items.filter(
    (item) =>
      (search === '' || item.name.toLowerCase().includes(search)) &&
      (filters.category === 'all' || categoryOf(item) === filters.category) &&
      (filters.color === 'all' || colorFamily(item.color) === filters.color) &&
      (filters.season === 'all' || item.seasons.includes(filters.season)) &&
      (filters.formality === 'all' || item.formality === filters.formality),
  )
}

/** Groups items by category, in wearing order, each group sorted by name. */
export function groupByCategory(items: Item[]): { category: Category; items: Item[] }[] {
  return CATEGORIES.map((category) => ({
    category,
    items: items
      .filter((item) => categoryOf(item) === category)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.items.length > 0)
}
