# 음표 피자 & 쉼표 파이

주문서의 음표·쉼표 종류와 개수를 읽고, 재료를 눌러 담거나 접시로 끌어 놓아 완성하는 음악교육 게임입니다. 연습은 시간 제한 없이 진행하며, 도전과 러시에서 별·코인과 기록을 모읍니다.

[게임 열기](https://note-pizza-rest-pie-game.vercel.app/)

## 실행과 검증

정적 HTML·CSS·JavaScript로 동작하며 별도 빌드가 필요 없습니다. 정적 HTTP 서버로 이 디렉터리를 제공하면 됩니다.

Node.js 22 이상에서 규칙·저장·게임 진행·롤북 검사를 실행합니다.

```sh
node --test tests/integration.test.cjs tests/pizza-domain.test.cjs tests/pizza-save.test.cjs tests/rulebook.test.cjs
```

브라우저 검사는 Playwright와 Chromium이 필요합니다. 설치 후 실행할 수 있습니다.

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node --test tests/browser.test.cjs
```

기존 Playwright 설치는 PLAYWRIGHT_MODULE 환경 변수, 브라우저 실행 파일은 PLAYWRIGHT_CHROMIUM_EXECUTABLE 환경 변수로 지정할 수 있습니다. Playwright가 없을 때 브라우저 검사는 건너뛰었다고 표시합니다. PIZZA_BASE_URL을 지정하면 같은 검사로 배포된 주소를 확인할 수 있습니다. 이 검사는 자신의 브라우저 격리 환경에 테스트용 저장 기록을 생성합니다.

## 구성

- `js/app.js`는 게임 상태·화면·입력·소리와 단일 게임 시계를 연결합니다.
- `pizza-domain.js`는 진행 수량, 포장 가능성, 유한 주문 생성과 종류·개수 판정을 계산합니다.
- `js/pizza-save.js`는 기존 기록 보존, 저장 검증과 주문 복원을 담당합니다.
- `rulebook.js`는 같은 게임 상태와 일시정지 API를 전달받아 롤북을 표시합니다.
- `assets/drybrush/`는 첨부 드라이 브러시 그림의 기존 최적화 WebP입니다. 음표·쉼표와 조각 각도는 음악 데이터로 그립니다.
- 구현 기준과 검증 범위는 `docs/uiux-remaster/`에 있습니다.

## 기록과 이어하기

기존 `npizza.save.v1`은 백업을 남긴 뒤 `npizza.save.v2`로 옮깁니다. 원래 키는 유지됩니다. 안전한 주문 상태만 저장하며, 이어하기는 일시정지 상태로 시작합니다. 저장을 사용할 수 없는 환경에서도 플레이할 수 있습니다.

알 수 없는 미래 버전은 덮어쓰지 않습니다. 손상된 세션은 별과 코인 등 성취와 구분해 격리합니다. 성취와 주문 장부는 같은 저장 항목에서 갱신합니다. 기기 이전 시 브라우저 저장값을 안전하게 백업하고, 복구는 원본을 보존한 상태에서 수행해야 합니다.

실제 iOS·Android의 소리·주소창·safe-area와 학생 사용 관찰은 별도로 확인해야 합니다.
