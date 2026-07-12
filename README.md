# 🍌 Minion Match

미니언 이미지를 활용한 카드 짝 맞추기 게임입니다. Next.js App Router에서 실행되며, 사용자 프로필과 점수는 Supabase PostgreSQL에, 게임 이미지는 private Storage bucket에 저장합니다.

![Minion Match](https://raw.githubusercontent.com/jpjp92/minion-match-game/main/public/images/27.jpg)

## 주요 기능

- 닉네임을 필수로 등록한 뒤 난이도를 선택하는 시작 화면
- EASY 6쌍(12장), NORMAL 8쌍(16장)
- 게임 시작 전 5초 카드 미리보기
- 빠른 3D 카드 플립과 정답·오답 피드백
- 완료 후 Play Again, Hall of Fame, Back to Menu 흐름
- 이동 횟수 우선, 플레이 시간 차순위 기준 리더보드
- 상위 7위 기본 표시와 8위 이하 내부 스크롤
- Supabase 익명 Auth 세션과 사용자별 프로필·점수 저장
- private Storage 이미지와 10분 만료 signed URL
- iPhone Safari와 모바일 Chrome을 고려한 반응형 화면

## 사용자 흐름

```text
첫 화면 진입
  ↓
게임 이미지와 리더보드 로드
  ↓
닉네임 입력(2~12자, Anonymous 사용 불가)
  ↓
EASY 또는 NORMAL 선택
  ↓
선택한 카드 이미지 preload
  ↓
5초 미리보기
  ↓
카드 짝 맞추기
  ↓
Mission Complete 및 점수 자동 저장
  ├─ Play Again
  ├─ Hall of Fame
  └─ Back to Menu
```

닉네임과 개인 최고 기록은 브라우저 `localStorage`에 기억합니다. Supabase API를 사용할 수 없을 때 리더보드는 로컬 캐시를 표시하지만, 게임 이미지 API가 실패하면 게임 시작은 비활성화됩니다.

## 서버·데이터 흐름

### 이미지 로딩

1. 브라우저가 `GET /api/images`를 요청합니다.
2. Next.js 서버가 Supabase 쿠키 세션을 확인하고, 세션이 없으면 익명 Auth 사용자를 생성합니다.
3. 서버 전용 admin client가 `game-images` private bucket의 이미지 목록을 조회합니다.
4. 서버가 10분 만료 signed URL을 생성해 브라우저에 전달합니다.
5. 브라우저가 이미지를 preload한 뒤 게임 보드를 생성합니다.

### 점수 저장

1. 게임 완료 후 브라우저가 닉네임, 난이도, 이동 횟수, 시간을 `POST /api/scores`로 보냅니다.
2. Route Handler가 닉네임과 난이도별 점수 범위를 검증합니다.
3. Supabase 쿠키 세션의 사용자 UUID로 `profiles`를 생성하거나 갱신합니다.
4. 같은 UUID로 `game_scores`에 점수를 저장합니다.
5. 저장된 점수 ID를 응답하고 리더보드에 즉시 반영합니다.

### 리더보드 조회

`GET /api/scores`는 점수를 이동 횟수 오름차순, 플레이 시간 오름차순으로 최대 100건 조회합니다. 프로필이 존재하는 점수만 닉네임과 결합해 반환하고, 화면에서는 EASY와 NORMAL을 구분해 표시합니다.

## 기술 구성

| 영역 | 기술 및 역할 |
|---|---|
| Web | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind CSS 4, CSS 3D transform, 반응형 레이아웃 |
| API | Next.js Route Handler (`/api/images`, `/api/scores`) |
| Auth | Supabase Anonymous Sign-Ins, SSR 쿠키 세션 |
| Database | Supabase PostgreSQL, `profiles`, `game_scores`, RLS |
| Storage | Supabase private bucket `game-images`, signed URL |
| Test | Vitest, Testing Library, jsdom |
| Deploy | Vercel |

## 디렉터리 구조

```text
app/
  api/images/route.ts       # private Storage signed URL 발급
  api/scores/route.ts       # 리더보드 조회 및 점수 저장
  globals.css               # Tailwind 및 전역·모바일 배경
  layout.tsx                # metadata와 viewport 설정
  page.tsx                  # 게임 진입 페이지
components/                 # 카드, 시작, 결과, 리더보드 UI
lib/game/                   # 난이도 설정과 점수 검증
lib/supabase/               # 쿠키 세션 client와 server-only admin client
scripts/                    # Storage 이미지 업로드 스크립트
docs/
  plans/                    # 전체 개발 계획
  sql/                      # DB, RLS, Storage 구성 SQL
  logs/                     # 일자별 개발 및 검증 기록
```

## 로컬 실행

요구 사항은 Node.js 20 이상과 npm입니다.

```bash
git clone https://github.com/jpjp92/minion-match-game.git
cd minion-match-game
npm install
```

프로젝트 루트에 `.env.local`을 만들고 다음 환경변수를 설정합니다.

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

이후 개발 서버를 실행합니다.

```bash
npm run dev
```

기본 주소는 `http://localhost:3000`입니다.

## Supabase 초기 구성

### 1. Auth 활성화

Supabase Dashboard에서 `Authentication → Providers → Anonymous`를 활성화합니다. 화면에서는 닉네임 입력이 필수지만 내부적으로는 사용자와 점수를 안정적으로 연결하기 위해 익명 Auth UUID를 사용합니다.

### 2. 테이블과 RLS 구성

Supabase SQL Editor에서 다음 파일을 순서대로 실행합니다.

1. [`docs/sql/001_auth_profiles_scores.sql`](docs/sql/001_auth_profiles_scores.sql)
2. [`docs/sql/002_game_images_storage.sql`](docs/sql/002_game_images_storage.sql)

첫 번째 SQL은 `profiles`, `game_scores`, 인덱스와 RLS 정책을 생성합니다. 두 번째 SQL은 5MB 제한 및 JPEG·PNG·WebP만 허용하는 private `game-images` bucket을 생성합니다.

### 3. 이미지 업로드

`public/images`의 게임 이미지를 Storage에 최초 업로드합니다.

```bash
node scripts/upload-game-images.mjs
```

동일한 파일이 이미 존재하면 건너뜁니다. 업로드·수정·삭제 권한은 일반 사용자에게 공개하지 않습니다.

## 환경변수와 보안 경계

| 환경변수 | 사용 위치 | 설명 |
|---|---|---|
| `SUPABASE_URL` | Next.js 서버 | Supabase 프로젝트 URL |
| `SUPABASE_PUBLISHABLE_KEY` | Next.js 서버 | 쿠키 기반 Auth와 RLS 요청 |
| `SUPABASE_SECRET_KEY` | 서버 전용 | private Storage 목록 조회와 signed URL 생성 |

- 세 환경변수 모두 현재 구조에서는 `NEXT_PUBLIC_` 접두사를 사용하지 않습니다.
- `SUPABASE_SECRET_KEY`는 `server-only` 모듈에서만 사용하며 브라우저 번들에 포함하면 안 됩니다.
- 실제 키 값은 Git, README, 개발 로그에 기록하지 않습니다.
- URL과 publishable key는 본래 공개 가능한 식별 정보지만, 현재 앱은 서버 Route Handler를 통해서만 사용합니다.
- RLS는 다른 사용자 명의의 프로필·점수 쓰기를 제한합니다.
- private bucket과 signed URL은 영구 공개 URL을 막지만, 브라우저에 표시된 이미지의 복사까지 완전히 방지하지는 않습니다.
- 현재 점수는 클라이언트 플레이 결과를 범위 검증해 저장하므로 완전한 치팅 방지 구조는 아닙니다.

## Vercel 배포

Vercel 프로젝트의 Settings → Environment Variables에 다음 값을 등록합니다.

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

Production, Preview, Development 중 필요한 환경에 각각 적용한 뒤 재배포합니다. secret key가 빌드 로그나 클라이언트 코드에 포함되지 않았는지 확인합니다.

## 검증 명령

```bash
npm test
npm run typecheck
npm run build
```

현재 기준으로 컴포넌트·게임 로직·입력 검증을 포함한 테스트 22개와 TypeScript 검사, Next.js 프로덕션 빌드가 통과합니다.

## 문서

- [문서 관리 규칙](docs/README.md)
- [Next.js 및 Supabase 전환 계획](docs/plans/PLAN_NEXT_SUPABASE_전환.md)
- [UI 리디자인 계획](docs/plans/PLAN_UI_리디자인.md)
- [2026-07-12 개발 로그](docs/logs/DEV_20260712.md)

문서 규칙에 따라 계획은 `docs/plans/PLAN_계획내용.md`, SQL은 `docs/sql/`, 일자별 개발 기록은 `docs/logs/DEV_YYYYMMDD.md`에서 관리합니다.
