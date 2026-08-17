import assert from 'node:assert/strict'
import test from 'node:test'
import { redactText, redactValue } from '../src/redact.js'

test('redacts common secrets and diagnostic paths', () => {
  const fakeToken = ['sk', 'abcdefgh12345678'].join('-')
  const text = redactText(
    `home=C:\\Users\\me\\.dsh lab=C:\\Temp\\lab token=${fakeToken} Authorization: Bearer abcdefghijklmnop`,
    { sourceHome: 'C:\\Users\\me\\.dsh', labHome: 'C:\\Temp\\lab' },
  )
  assert.match(text, /\$DSH_HOME/)
  assert.match(text, /\$REDUCER_LAB/)
  assert.doesNotMatch(text, new RegExp(fakeToken.slice(0, 11)))
  assert.doesNotMatch(text, /abcdefghijklmnop/)
})

test('redacts values under secret-shaped keys', () => {
  assert.deepEqual(redactValue({ apiKey: 'anything', nested: { ok: 'yes' } }), {
    apiKey: '<redacted>',
    nested: { ok: 'yes' },
  })
})

test('redacts unrelated absolute paths in public reports', () => {
  const text = redactText([
    'link:D:/work/private/plugin-a',
    'at file:///C:/Users/alice/project/index.js:12:3',
    'at /Users/alice/project/index.js:12:3',
    'at file:///$DSH_NODE_MODULES/@deepseek-ai/dsh/lib/bin.js:1:1',
    'ready at http://127.0.0.1:3080/',
  ].join('\n'))

  assert.doesNotMatch(text, /alice|D:\/work|C:\/Users|\/Users\//)
  assert.match(text, /file:\/\/\/\$DSH_NODE_MODULES/)
  assert.match(text, /http:\/\/127\.0\.0\.1:3080\//)
})
