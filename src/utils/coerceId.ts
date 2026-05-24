import type { ID } from '../types'

export function coerceId(id: null | ID): null | ID {
  if (id === null || id === undefined) return null
  const n = Number(id)
  return Number.isInteger(n) && String(n) === id ? n : id
}
