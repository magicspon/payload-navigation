export function coerceRelId(id: null | string | undefined): null | number | string {
  if (id === null || id === undefined || id === '') return null
  const n = Number(id)
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : id
}
