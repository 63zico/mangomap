# MANGOMAP 웹버전

이 프로젝트는 Expo Web으로 MANGOMAP 웹버전을 만들 수 있습니다.

## 개발 중 확인

```powershell
npm.cmd run web
```

## 웹 빌드 만들기

```powershell
npm.cmd run build
```

빌드 결과는 `dist` 폴더에 생성됩니다.

## 빌드된 웹버전 미리보기

```powershell
npm.cmd run preview:web
```

기본 주소는 `http://127.0.0.1:4173/`입니다. 해당 포트가 사용 중이면 다음 포트로 자동 실행됩니다.

## 배포

Vercel 배포는 이미 `vercel.json` 기준으로 준비되어 있습니다.

- Build Command: `npm run build`
- Output Directory: `dist`
- SPA 라우팅: 모든 경로를 `index.html`로 연결
