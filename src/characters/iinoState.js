export function getIinoPresentation({ total, done, isToday }) {
  if (!isToday) {
    return {
      face: 'neutral',
      text: '선택한 날짜의 계획을 확인 중이시군요. 빠진 일정이 없는지 차례대로 살펴보세요.',
      inner: '(미리 점검하는 습관은 좋은 태도예요.)',
    }
  }

  if (total === 0) {
    return {
      face: 'serious',
      text: '오늘 할 일이 아직 비어 있어요. 해야 할 일을 먼저 적어 두는 것이 원칙입니다.',
      inner: '(잔소리하려는 게 아니라, 계획이 없으면 시작하기 어려우니까요.)',
    }
  }

  if (done === total) {
    return {
      face: 'smile',
      text: `오늘 계획 ${total}개를 모두 완료하셨네요. 아주 성실하게 지키셨어요.`,
      inner: '(이 정도로 해내셨으면… 칭찬해도 괜찮겠죠.)',
    }
  }

  if (done === 0) {
    return {
      face: 'serious',
      text: `오늘 계획은 ${total}개입니다. 순서를 정했으면 첫 번째 항목부터 바로 시작해 주세요.`,
      inner: '(시작만 하시면 분명 끝까지 하실 수 있을 텐데.)',
    }
  }

  return {
    face: 'neutral',
    text: `${total}개 중 ${done}개를 완료했습니다. 남은 ${total - done}개도 하나씩 정확하게 끝내세요.`,
    inner: '(꾸준히 진행하고 계시네요. 조금만 더 힘내세요.)',
  }
}
