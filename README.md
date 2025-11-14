# kiosk

## 모두의 키오스크 - 지능 정보화로 달라진 생활 모습

React와 Vite를 사용한 키오스크 교육 게임입니다.

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## GitHub Pages 배포

### 1. GitHub 리포지토리 설정

1. GitHub에서 새 리포지토리를 생성합니다 (예: `kiosk`)
2. 리포지토리를 로컬에 클론합니다

### 2. 프로젝트 설정

이미 설정되어 있습니다:
- `vite.config.js`에 `base: '/kiosk/'` 설정 (리포지토리 이름에 맞게 수정)
- `package.json`에 `deploy` 스크립트 포함

### 3. 배포

```bash
# 배포 실행 (빌드 후 gh-pages 브랜치에 배포)
npm run deploy
```

### 4. GitHub Pages 활성화

1. GitHub 리포지토리로 이동
2. Settings → Pages
3. Source를 `gh-pages` 브랜치로 설정
4. Save 클릭

배포 후 몇 분 후에 `https://[사용자명].github.io/kiosk/`에서 접속할 수 있습니다.

### 주의사항

- `vite.config.js`의 `base` 경로를 리포지토리 이름에 맞게 수정해야 합니다
- 리포지토리 이름이 `kiosk`가 아니라면 `base: '/[리포지토리명]/'`로 변경하세요