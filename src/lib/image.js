// 이미지 업로드 헬퍼 — 웹에서 base64 + 압축으로 저장
// (Electron 파일 시스템 모드는 추후 IPC 추가 시 확장)

const DEFAULT_MAX_W = 1200
const DEFAULT_QUALITY = 0.72

// File → 압축된 dataURL
export function compressToDataUrl(file, maxW = DEFAULT_MAX_W, quality = DEFAULT_QUALITY) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('이미지 파일이 아닙니다'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('읽기 실패'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('이미지 디코드 실패'))
      img.onload = () => {
        const scale = img.width > maxW ? maxW / img.width : 1
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        // PNG는 텍스트 위주라 무손실 유지, 그 외는 JPEG로 압축
        const isPng = file.type === 'image/png'
        const out = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality)
        resolve(out)
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// 여러 File을 images 배열 항목으로 변환
export async function filesToImages(files) {
  const out = []
  for (const f of files) {
    try {
      const src = await compressToDataUrl(f)
      out.push({ kind: 'dataurl', src, name: f.name })
    } catch (e) {
      console.warn('이미지 변환 실패:', f.name, e)
    }
  }
  return out
}
