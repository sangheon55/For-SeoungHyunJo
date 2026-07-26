export function getHayasakaSearchPresentation({ query = '', total = 0 } = {}) {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return {
      face: 'neutral',
      text: '찾으시는 게 있으면 말씀하세요.',
      inner: '(메모부터 오답노트까지 한 번에 확인하면 되겠네.)',
    }
  }

  if (total === 0) {
    return {
      face: 'flustered',
      text: '검색 결과가 없네요. 다른 단어로 다시 찾아볼까요?',
      inner: '(철자나 비슷한 표현도 확인해 봐야겠어.)',
    }
  }

  if (total >= 10) {
    return {
      face: 'smug',
      text: `관련 자료를 ${total}건 찾았어요. 이 정도는 금방이죠.`,
      inner: '(필요한 것만 골라 드리면 되겠네.)',
    }
  }

  return {
    face: 'smile',
    text: `관련 자료를 ${total}건 찾았어요.`,
    inner: '(원하는 자료가 여기 있으면 좋겠는데.)',
  }
}
