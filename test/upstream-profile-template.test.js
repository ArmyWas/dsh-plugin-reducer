import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeWebProfileTemplate } from '../scripts/profile-template-contract.mjs'

describe('normalizeWebProfileTemplate', () => {
  it('accepts the legacy array template', () => {
    assert.deepEqual(normalizeWebProfileTemplate(['base', 'web']), {
      templateShape: 'array',
      bundles: ['base', 'web'],
      patchReload: undefined,
    })
  })

  it('accepts the historical object template with a reload policy', () => {
    assert.deepEqual(normalizeWebProfileTemplate({
      bundles: ['base', 'web'],
      patchReload: 'live',
    }), {
      templateShape: 'object',
      bundles: ['base', 'web'],
      patchReload: 'live',
    })
  })

  it('accepts the current object template without a reload policy', () => {
    assert.deepEqual(normalizeWebProfileTemplate({ bundles: ['base', 'web'] }), {
      templateShape: 'object',
      bundles: ['base', 'web'],
      patchReload: undefined,
    })
  })

  it('rejects a missing or non-string bundle list', () => {
    assert.throws(() => normalizeWebProfileTemplate({}), /string bundles/)
    assert.throws(() => normalizeWebProfileTemplate({ bundles: ['base', 1] }), /string bundles/)
  })

  it('rejects a present but invalid reload policy', () => {
    assert.throws(
      () => normalizeWebProfileTemplate({ bundles: ['base'], patchReload: undefined }),
      /must be live or startup/,
    )
    assert.throws(
      () => normalizeWebProfileTemplate({ bundles: ['base'], patchReload: 'later' }),
      /must be live or startup/,
    )
  })
})
