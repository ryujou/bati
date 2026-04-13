import type { Question } from '../types/quiz'
import type { AppLocale } from './types'

export function localizeQuestion(question: Question, _locale: AppLocale): Question {
  return question
}
