function replaceAllLiteral(value, needle, replacement) {
  if (typeof needle !== 'string' || needle === '') return value
  return value.split(needle).join(replacement)
}

export function redactText(input, options = {}) {
  let value = String(input ?? '')
  for (const [path, replacement] of [
    [options.sourceHome, '$DSH_HOME'],
    [options.labHome, '$REDUCER_LAB'],
    ...(options.paths ?? []),
  ]) {
    if (typeof path !== 'string' || path === '') continue
    value = replaceAllLiteral(value, path, replacement)
    value = replaceAllLiteral(value, path.replaceAll('\\', '/'), replacement)
  }

  // Reports are meant to be attached to public issues. Explicit roots above
  // retain useful labels; these fallbacks prevent an unrelated local path from
  // leaking through a link: dependency, file URL, or stack trace.
  value = value.replace(/file:\/\/\/(?!\$)(?:[A-Za-z]:\/|\/)[^\s)\]>'"]+/g, 'file:///<local-path>')
  value = value.replace(/(?<![A-Za-z0-9_$])(?:[A-Za-z]:[\\/])[^\s)\]>'"]+/g, '<local-path>')
  value = value.replace(/(?<![\/:A-Za-z0-9_$])\/(?![\/$])[^\s)\]>'"]+/g, '<local-path>')

  for (const pattern of [
    /\bsk-[A-Za-z0-9_-]{8,}\b/g,
    /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{8,}\b/g,
    /\bxox[baprs]-[A-Za-z0-9-]{8,}\b/g,
    /\bBearer\s+[A-Za-z0-9._~+\/-]{8,}/gi,
  ]) value = value.replace(pattern, '<redacted>')
  value = value.replace(
    /((?:API[_-]?KEY|TOKEN|SECRET|PASSWORD)\s*[=:]\s*)[^\s,;]+/gi,
    '$1<redacted>',
  )
  return value
}

export function redactValue(value, options = {}) {
  if (typeof value === 'string') return redactText(value, options)
  if (Array.isArray(value)) return value.map(item => redactValue(item, options))
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      /KEY|TOKEN|SECRET|PASSWORD/i.test(key) ? '<redacted>' : redactValue(item, options),
    ]))
  }
  return value
}
