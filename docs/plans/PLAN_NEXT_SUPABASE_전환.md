# Next.js 및 Supabase 전환 계획

작성일: 2026-07-12  
상태: 진행 중 — DB 테이블, RLS 정책, Storage bucket 구성 완료

## 목표

- Vite 기반 React SPA를 Next.js App Router로 전환한다.
- Supabase Auth로 사용자를 식별한다.
- 사용자 프로필과 게임 점수를 Supabase PostgreSQL에 저장한다.
- 게임 이미지를 Supabase Storage private bucket에서 관리한다.
- RLS로 사용자 데이터와 점수 등록 권한을 보호한다.
- 기존 게임 UI와 플레이 흐름을 유지한다.

## 비목표

- 이번 전환에서 관리자 화면은 구현하지 않는다.
- 기존 닉네임 기반 점수를 신규 인증 사용자에게 자동 귀속하지 않는다.
- 서버 검증이 가능한 완전한 치팅 방지 시스템은 1차 전환 범위에 포함하지 않는다.

## 현재 구조와 우선 수정 사항

- `App.tsx`에 게임 상태, 타이머, 리더보드, 저장 로직이 집중되어 있다.
- 초기 렌더링에서 `localStorage`를 직접 읽으므로 Next.js 서버 렌더링과 충돌할 수 있다.
- 메뉴 복귀 시 게임 타이머가 즉시 정리되지 않는다.
- 기존 점수 API는 사용자 인증 없이 요청 값을 그대로 저장한다.
- 리더보드는 난이도를 합쳐 100건 조회한 후 클라이언트에서 구분한다.
- 로컬 이미지가 있음에도 GitHub API와 raw URL에 의존한다.
- Tailwind CDN과 HTML import map을 사용하고 있어 Next.js 빌드 구성으로 이전해야 한다.

## 목표 디렉터리 구조

```text
app/
  layout.tsx
  page.tsx
  globals.css
  auth/callback/route.ts
  api/scores/route.ts
components/
  game/game-client.tsx
  game/game-board.tsx
  game/game-card.tsx
  leaderboard.tsx
lib/
  game/board.ts
  game/reducer.ts
  game/validation.ts
  supabase/client.ts
  supabase/server.ts
  supabase/admin.ts
  storage/game-images.ts
supabase/
  migrations/
docs/
  plans/
  sql/
  logs/
```

## 환경변수 정책

로컬 값은 `.env.local`, 배포 값은 Vercel Environment Variables에서 관리한다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

- URL과 publishable key는 Supabase 브라우저 클라이언트에서 사용한다.
- publishable key의 데이터 권한은 RLS로 제한한다.
- secret key는 RLS를 우회하므로 관리자·마이그레이션 등 서버 전용 코드에만 사용한다.
- 일반 로그인, 프로필 수정, 본인 점수 등록에는 secret key를 사용하지 않는다.
- 실제 환경변수 값은 Git과 문서에 기록하지 않는다.

## 데이터 모델

### `profiles`

- `auth.users.id`와 동일한 UUID를 기본키로 사용한다.
- 닉네임과 생성·수정 시간을 저장한다.
- 사용자는 본인의 프로필만 생성하고 수정할 수 있다.

### `game_scores`

- `user_id`로 `auth.users`와 연결한다.
- 난이도, 이동 횟수, 플레이 시간을 저장한다.
- 사용자는 본인의 점수만 등록할 수 있다.
- 리더보드 조회는 공개하되 수정과 삭제는 일반 사용자에게 허용하지 않는다.

초기 SQL 초안은 `docs/sql/001_auth_profiles_scores.sql`에서 관리한다.

적용 상태: 2026-07-12 Supabase 프로젝트에 적용 및 객체 검증 완료.

## 이미지 Storage 정책

게임 이미지는 `game-images` private bucket에 저장하는 방향으로 구성한다.

- 브라우저에 Storage public URL을 직접 제공하지 않는다.
- 로그인 사용자가 게임을 시작하면 Next.js 서버가 해당 게임에 필요한 이미지의 짧은 만료 signed URL만 발급한다.
- signed URL 발급 Route Handler는 사용자 세션, 허용된 이미지 경로, 난이도별 이미지 수를 검증한다.
- 이미지 업로드, 교체, 삭제는 일반 사용자에게 허용하지 않고 관리자 작업으로만 수행한다.
- 허용 MIME type은 JPEG, PNG, WebP로 제한하고 파일 크기 제한을 둔다.
- 버킷 전체 파일 목록과 원본 경로 manifest는 서버에서만 관리한다.

private bucket은 무단 목록 조회와 영구 public URL 접근을 막지만, 화면에 표시된 이미지는 브라우저 메모리와 네트워크 응답을 통해 사용자가 복사할 수 있다. 따라서 이 구성의 목적은 완전한 복제 방지가 아니라 접근 범위 제한, URL 만료, 원본 목록 비공개화다.

Storage 생성 SQL은 `docs/sql/002_game_images_storage.sql`에서 관리한다.

적용 상태: 2026-07-12 `game-images` private bucket 생성 및 제한 설정 검증 완료.

## 단계별 실행 계획

### 1단계: 기존 게임 안정화

- 게임 상태와 화면 컴포넌트를 분리한다.
- 타이머와 timeout을 게임 종료, 재시작, 메뉴 복귀 시 정리한다.
- 점수 중복 제출 방지 상태를 추가한다.
- 닉네임과 점수 요청의 런타임 검증을 추가한다.
- 보드 생성, 승리 판정, 점수 정렬 단위 테스트를 추가한다.

완료 조건:

- 기존 Vite 빌드와 타입 검사가 통과한다.
- 핵심 게임 로직 테스트가 통과한다.
- 기존 데스크톱·모바일 게임 흐름이 유지된다.

진행 상태: 2026-07-12 완료. 타이머 정리, 점수 중복 제출 방지, 서버 입력 검증, 난이도 설정 분리와 핵심 단위 테스트를 적용했다.

### 2단계: Next.js App Router 전환

- Next.js, ESLint, Tailwind 빌드 의존성을 구성한다.
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`를 생성한다.
- 게임 인터랙션 영역만 Client Component로 둔다.
- `localStorage` 접근을 hydration 이후 또는 별도 client hook으로 이동한다.
- Vercel 함수를 `app/api/scores/route.ts` Route Handler로 이전한다.
- Google Fonts를 `next/font`로 전환한다.
- 이미지는 `public/images`와 `next/image`를 사용하도록 변경한다.
- Vite 진입 파일, import map, Tailwind CDN을 제거한다.

완료 조건:

- `next dev`에서 전체 게임 흐름이 동작한다.
- `next build`와 lint가 통과한다.
- hydration 오류가 발생하지 않는다.

진행 상태: 2026-07-12 완료. Next.js 16 App Router, Tailwind 빌드, Route Handler로 전환했고 production build와 홈/API 런타임 응답을 확인했다.

### 3단계: Supabase Auth 및 DB 적용

- `@supabase/ssr` 기반 browser/server client를 구성한다.
- 인증 방식은 초기 구현 전에 익명 Auth 또는 이메일 로그인을 최종 결정한다.
- `profiles`, `game_scores`, 인덱스, RLS 정책을 적용한다.
- 인증 사용자의 UUID를 점수 `user_id`로 저장한다.
- 리더보드는 난이도별 서버 쿼리로 조회한다.
- secret key 사용 모듈에는 `server-only` 경계를 적용한다.
- `game-images` private bucket을 만들고 기존 이미지를 업로드한다.
- 인증 사용자에게 선택된 이미지의 단기 signed URL을 발급하는 서버 API를 구현한다.
- 기존 GitHub API 및 raw image URL 의존성을 제거한다.

완료 조건:

- 비로그인 사용자와 다른 사용자의 프로필 변경 및 점수 위조 등록이 RLS로 거부된다.
- 로그인 사용자는 본인 프로필과 점수를 정상 저장할 수 있다.
- EASY와 NORMAL 리더보드가 독립적으로 정렬·조회된다.
- 비로그인 사용자는 private 게임 이미지와 signed URL 발급 API에 접근할 수 없다.

진행 상태: 2026-07-12 완료. Anonymous Sign-Ins, 쿠키 세션, 신규 `game_scores`/`profiles`, private Storage 이미지 26개, signed URL, 점수 저장과 리더보드 반영을 E2E로 검증했다.

### 4단계: 기존 데이터 처리

- 기존 `minion_scores`를 읽기 전용 legacy 데이터로 보존한다.
- 기존 데이터에 인증 UUID가 없으므로 닉네임만으로 신규 사용자에게 귀속하지 않는다.
- 필요하면 시스템 소유 legacy 사용자로 이전하는 별도 SQL을 작성한다.

완료 조건:

- 신규 점수와 기존 점수를 구분할 수 있다.
- 데이터 이전 전후 건수 검증 결과가 개발 로그에 기록된다.

### 5단계: 운영 검증

- 점수 API rate limit과 idempotency를 검토한다.
- Route Handler 입력 검증 및 오류 응답 테스트를 작성한다.
- RLS 허용·차단 케이스를 통합 테스트한다.
- 게임 시작부터 점수 저장까지 E2E 테스트를 추가한다.
- Vercel Preview에서 모바일과 데스크톱 UI를 확인한다.

완료 조건:

- 빌드, 타입 검사, lint, 단위 테스트, E2E 테스트가 통과한다.
- 배포 환경에 secret key가 클라이언트 번들로 노출되지 않는다.

## 주요 위험과 대응

### 클라이언트 점수 조작

인증과 RLS는 다른 사용자로 저장하는 행위는 막지만 사용자가 자신의 `moves`와 `time_taken`을 조작하는 것은 완전히 막지 못한다.

1차 대응:

- 서버 입력 범위 검증
- 사용자별 요청 제한
- 비정상 기록 표시 또는 차단

경쟁성이 중요해질 경우 `game_sessions`를 추가해 서버가 보드 seed와 시작 시간을 발급하고 카드 선택 로그를 검증한다.

### secret key 노출

- `NEXT_PUBLIC_` 접두사를 사용하지 않는다.
- admin client를 별도 파일로 격리하고 `server-only`를 사용한다.
- 로그와 오류 응답에 키를 포함하지 않는다.
- 노출이 의심되면 즉시 키를 폐기하고 재발급한다.

### signed URL 재공유

- signed URL은 만료 전까지 URL을 아는 사람이 사용할 수 있으므로 수명을 짧게 설정한다.
- URL 발급 API에 인증, 입력 검증, rate limit을 적용한다.
- 응답과 URL을 애플리케이션 로그에 기록하지 않는다.
- 완전한 이미지 유출 방지는 불가능하다는 점을 보안 전제로 둔다.

## 권장 작업 순서

1. 기존 게임 안정화
2. Next.js 전환
3. Auth 방식 확정 및 Supabase SQL 검토
4. DB/RLS 적용
5. 기존 데이터 처리
6. 운영 및 보안 검증

## 레퍼런스 검토: `ref/minion-puzzle`

검토일: 2026-07-12

### 반영할 내용

- 난이도별 규칙을 객체 설정으로 관리한다. 카드 쌍 수, 최소 이동 횟수, 허용 시간 범위를 한 곳에서 정의한다.
- 게임 시작 시 타이머와 이동 횟수를 명시적으로 초기화하고, 난이도 변경 중 게임 처리 규칙을 정한다.
- 성공, 실패, 저장 오류를 공통 toast 컴포넌트로 안내한다.
- 리더보드와 닉네임 모달에 ESC 닫기, 배경 클릭 닫기, body scroll lock을 적용한다.
- 모바일 터치 환경에서 카드 선택 영역과 피드백 애니메이션을 별도로 검증한다.
- 이미지 업로드 전에 해상도, 비율, 용량을 정규화한다. 레퍼런스 원본은 약 176KB~904KB, 최대 2560×2560이므로 게임용 WebP 또는 최적화 JPEG 파생본을 생성하는 방안을 포함한다.
- 이미지 메타데이터에 표시 순서, 활성 상태, 대체 텍스트를 관리하는 방안을 검토한다.

### 선택적으로 검토할 내용

- 현재 EASY/NORMAL 외에 HARD 난이도를 추가할지는 실제 플레이 테스트 후 결정한다.
- 통합 점수 공식을 도입할 경우 계산식은 서버의 단일 함수에서 관리하고 난이도별 리더보드와 함께 검증한다.
- 사용자의 이미지 선택 기능은 메모리 매칭의 랜덤성과 private Storage 접근 범위에 영향을 주므로 기본 범위에는 포함하지 않는다.

### 반영하지 않을 내용

- 클라이언트에서 계산한 종합 점수를 그대로 DB에 저장하는 방식
- 인증 사용자 ID 없이 닉네임 문자열만 점수에 저장하는 방식
- 필드 존재 여부만 확인하고 숫자 범위와 난이도를 검증하지 않는 API
- Supabase 연결 상태와 내부 오류 메시지를 외부에 그대로 반환하는 테스트 API
- 시작할 때마다 저장된 닉네임을 삭제하는 흐름
- HTML inline 이벤트와 별도 스크립트에서 동일 이벤트를 중복 연결하는 방식
- 고정 300px 보드와 직접 DOM 조작 중심 구조

### 현재 계획에 미치는 영향

- `lib/game/config.ts`에 난이도별 설정을 추가한다.
- toast, modal, loading, saving 상태를 공통 UI 패턴으로 정의한다.
- Storage 업로드 절차에 이미지 리사이즈, 압축, MIME 검증을 추가한다.
- 점수 산정이 필요하면 요청 값으로 받지 않고 서버에서 moves, time, difficulty를 기준으로 계산한다.
- 레퍼런스 코드는 구현 소스로 복사하지 않고 동작 요구사항과 UX 참고 자료로만 사용한다.
