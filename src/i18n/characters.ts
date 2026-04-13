import type { CharacterMatch } from '../types/quiz'
import type { AppLocale } from './types'

export function getLocalizedCharacterName(character: Pick<CharacterMatch, 'name'>, _locale: AppLocale) {
  return character.name
}

export function getLocalizedCharacterSeries(character: Pick<CharacterMatch, 'series'>, _locale: AppLocale) {
  return character.series
}
