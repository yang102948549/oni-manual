# Oni 감독 사용 설명서

Oni 감독(시험감독 자동 배정 프로그램) 구매자용 단계별 사용 설명서입니다. 단계마다 직접 눌러 볼 수 있는 연습 화면이 들어 있습니다.

- 페이지: https://yang102948549.github.io/oni-manual/
- 배포: `main` 브랜치 루트의 `index.html`을 GitHub Pages가 그대로 게시합니다.

## 고치고 다시 배포하기

1. `src/body.html`(본문·스타일)이나 `src/app.js`(연습 화면)를 고칩니다.
2. 빌드합니다. 처음 한 번은 `npm install`이 필요합니다.

   ```bash
   npm install
   npm run build
   ```

3. 바뀐 `index.html`과 `src/`를 커밋하고 푸시하면 1~2분 뒤 페이지에 반영됩니다.

`index.html`은 빌드 결과물이므로 직접 고치지 않습니다. 글꼴은 Pretendard Variable(SIL OFL 1.1)이며, 빌드할 때 페이지에 쓰인 글자만 남겨 HTML 안에 넣습니다.
