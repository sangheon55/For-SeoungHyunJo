import test from 'node:test'
import assert from 'node:assert/strict'
import { getHayasakaSearchPresentation } from '../src/characters/hayasakaSearchState.js'

test('검색 전에는 하야사카가 중립 안내를 표시한다', () => {
  const presentation = getHayasakaSearchPresentation({ query: '   ', total: 0 })
  assert.equal(presentation.face, 'neutral')
})

test('검색 결과가 없으면 당황한 표정을 표시한다', () => {
  const presentation = getHayasakaSearchPresentation({ query: '없는 검색어', total: 0 })
  assert.equal(presentation.face, 'flustered')
  assert.match(presentation.text, /결과가 없/)
})

test('검색 결과가 있으면 개수와 함께 웃는 표정을 표시한다', () => {
  const presentation = getHayasakaSearchPresentation({ query: '한국사', total: 4 })
  assert.equal(presentation.face, 'smile')
  assert.match(presentation.text, /4건/)
})

test('검색 결과가 많으면 자신 있는 표정을 표시한다', () => {
  const presentation = getHayasakaSearchPresentation({ query: '공부', total: 10 })
  assert.equal(presentation.face, 'smug')
  assert.match(presentation.text, /10건/)
})
