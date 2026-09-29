import assert from 'node:assert/strict'

/**
 * Normalize every Web profile-template shape shipped by app-boot so the canary
 * can test the generated manifest instead of assuming one historical API shape.
 */
export function normalizeWebProfileTemplate(template) {
  const templateShape = Array.isArray(template) ? 'array' : 'object'
  const bundles = templateShape === 'array' ? template : template?.bundles

  assert.ok(
    Array.isArray(bundles) && bundles.every((bundle) => typeof bundle === 'string'),
    'app-boot next must expose string bundles for the web profile template',
  )

  if (templateShape === 'array') {
    return { templateShape, bundles, patchReload: undefined }
  }

  const hasPatchReload = Object.prototype.hasOwnProperty.call(template, 'patchReload')
  if (!hasPatchReload) {
    return { templateShape, bundles, patchReload: undefined }
  }

  const patchReload = template.patchReload
  assert.ok(
    patchReload === 'live' || patchReload === 'startup',
    'an exposed patchReload policy must be live or startup',
  )
  return { templateShape, bundles, patchReload }
}
