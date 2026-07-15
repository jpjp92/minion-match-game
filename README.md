# 🍌 Minion Match

미니언 이미지로 같은 그림의 카드를 찾는 반응형 메모리 게임입니다. Next.js App Router로 구현했으며, Supabase의 익명 인증·PostgreSQL·private Storage를 이용해 이미지와 리더보드를 관리합니다.

![Minion Match 게임 이미지](public/images/27.jpg)

## 목차

- [주요 기능](#주요-기능)
- [빠른 시작](#빠른-시작)
- [게임 방식](#게임-방식)
- [기술 구성](#기술-구성)
- [시스템 구조](#시스템-구조)
- [Supabase 초기 설정](#supabase-초기-설정)
- [개발 및 검증](#개발-및-검증)
- [배포](#배포)

## 주요 기능

- 닉네임 기반의 게스트 플레이
- EASY 6쌍(12장), NORMAL 8쌍(16장) 난이도
- 게임 시작 전 5초 카드 미리보기
- 3D 카드 플립과 정답·오답 피드백
- 이동 횟수, 플레이 시간, 난이도별 개인 최고 기록
- 이동 횟수 오름차순, 플레이 시간 오름차순 리더보드
- 게임 종료 후 재시작, Hall of Fame 확인, 메뉴 복귀
- 모바일 Safari와 Chrome을 고려한 반응형 UI

## 빠른 시작

### 요구 사항

- Node.js 20 이상
- npm
- Anonymous Sign-Ins이 활성화된 Supabase 프로젝트

### 1. 프로젝트 설치

```bash
git clone https://github.com/jpjp92/minion-match-game.git
cd minion-match-game
npm install
```

### 2. 환경변수 설정

프로젝트 루트에 `.env.local`을 생성합니다.

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

Supabase 테이블과 Storage가 아직 준비되지 않았다면 [Supabase 초기 설정](#supabase-초기-설정)을 먼저 진행합니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. Storage에 게임 이미지가 없거나 `/api/images`가 실패하면 게임 시작 버튼이 활성화되지 않습니다.

## 게임 방식

1. 2~12자 닉네임을 입력합니다. `Anonymous`는 사용할 수 없습니다.
2. EASY 또는 NORMAL 난이도를 선택합니다.
3. 5초 동안 카드 위치를 확인합니다.
4. 카드를 두 장씩 뒤집어 같은 이미지의 쌍을 찾습니다.
5. 모든 쌍을 찾으면 기록이 자동으로 저장됩니다.

닉네임, 난이도별 개인 최고 기록, 리더보드 캐시는 브라우저 `localStorage`에도 저장됩니다. Supabase 점수 API가 일시적으로 실패하면 로컬 캐시를 사용합니다.

## 기술 구성

| 영역 | 기술 | 용도 |
|---|---|---|
| Frontend | Next.js 16, React 19, TypeScript | App Router 기반 게임 UI |
| Styling | Tailwind CSS 4, CSS 3D Transform | 카드 애니메이션과 반응형 레이아웃 |
| API | Next.js Route Handlers | 이미지 URL 발급과 점수 조회·저장 |
| Auth | Supabase Anonymous Sign-Ins, SSR | 쿠키 기반 익명 사용자 세션 |
| Data | Supabase PostgreSQL, RLS | 프로필과 게임 점수 저장 |
| Images | Supabase private Storage | 10분 만료 signed URL로 게임 이미지 제공 |
| Test | Vitest, Testing Library, jsdom | 게임 로직과 주요 UI 검증 |
| Deploy | Vercel | Next.js 애플리케이션 배포 |

## 시스템 구조

```text
Browser
  ├─ GET /api/images
  │    └─ Anonymous Auth 확인 → private Storage 조회 → signed URL 반환
  └─ GET/POST /api/scores
       └─ Anonymous Auth 확인 → profiles/game_scores 조회 및 저장
```

### API

| Method | Endpoint | 설명 |
|---|---|---|
| `GET` | `/api/images` | `game-images` bucket의 이미지 signed URL 목록 반환 |
| `GET` | `/api/scores` | 이동 횟수·플레이 시간순 상위 100건 반환 |
| `POST` | `/api/scores` | 닉네임과 점수를 검증한 뒤 프로필·기록 저장 |

### 디렉터리

```text
app/
  api/images/route.ts       # private Storage 이미지 URL 발급
  api/scores/route.ts       # 리더보드 조회·점수 저장
  globals.css               # 전역 스타일
  layout.tsx                # 메타데이터와 viewport
  page.tsx                  # 애플리케이션 진입점
components/                 # 카드, 시작, 결과, 리더보드 UI
lib/game/                   # 난이도 설정과 점수 입력 검증
lib/supabase/               # Supabase SSR·admin client
utils/                      # 보드 생성, 이미지 로드·preload
public/images/              # Storage에 올릴 원본 이미지
scripts/                    # Storage 이미지 업로드 스크립트
docs/
  plans/                    # 개발·변경 계획
  sql/                      # DB, RLS, Storage 구성 SQL
  logs/                     # 일자별 개발·검증 기록
```

## Supabase 초기 설정

### 1. 익명 인증 활성화

Supabase Dashboard의 **Authentication → Providers → Anonymous**에서 Anonymous Sign-Ins를 활성화합니다. 화면에서는 닉네임을 입력받지만, 내부적으로는 익명 사용자 UUID로 프로필과 점수를 연결합니다.

### 2. Database·RLS·Storage 구성

Supabase SQL Editor에서 다음 파일을 순서대로 실행합니다.

1. [`docs/sql/001_auth_profiles_scores.sql`](docs/sql/001_auth_profiles_scores.sql)
2. [`docs/sql/002_game_images_storage.sql`](docs/sql/002_game_images_storage.sql)

| 파일 | 생성 내용 |
|---|---|
| `001_auth_profiles_scores.sql` | `profiles`, `game_scores`, 인덱스, RLS 정책 |
| `002_game_images_storage.sql` | 5MB 제한의 private `game-images` bucket, JPEG·PNG·WebP 정책 |

### 3. 게임 이미지 업로드

```bash
node scripts/upload-game-images.mjs
```

`public/images` 내의 JPEG·PNG·WebP 파일을 `game-images` bucket에 올립니다. 동일한 이름의 파일이 이미 있으면 건너뛹니다.

### 환경변수와 보안 경계

| 환경변수 | 사용 위치 | 설명 |
|---|---|---|
| `SUPABASE_URL` | Server | Supabase 프로젝트 URL |
| `SUPABASE_PUBLISHABLE_KEY` | Server | 쿠키 기반 Auth·RLS 요청 |
| `SUPABASE_SECRET_KEY` | Server only | private Storage 목록 조회·signed URL 발급 |

- 현재 구조에서는 세 변수 모두 `NEXT_PUBLIC_` 접두사를 사용하지 않습니다.
- `SUPABASE_SECRET_KEY`는 `server-only` 모듈에서만 사용하며 클라이언트 번들에 포함하면 안 됩니다.
- 실제 키 값은 Git, README, 개발 로그에 기록하지 않습니다.
- RLS는 다른 사용자의 프로필과 점수 수정을 제한합니다.
- signed URL은 영구 공개 URL을 막지만, 브라우저에 표시된 이미지의 복사까지 방지하지는 않습니다.
- 점수는 서버에서 허용 범위를 검증하지만, 현재 구조는 완전한 치팅 방지를 보장하지 않습니다.

## 개발 및 검증

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm test` | Vitest 테스트 실행 |
| `npm run typecheck` | TypeScript 정적 검사 |
| `npm run build` | 프로덕션 빌드 생성 |
| `npm start` | 생성된 프로덕션 빌드 실행 |

변경 후에는 다음 순서로 검증하는 것을 권장합니다.

```bash
npm test
npm run typecheck
npm run build
```

## 배포

Vercel 프로젝트의 **Settings → Environment Variables**에 아래 변수를 등록한 뒤 배포합니다.

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

Production, Preview, Development 중 필요한 환경에 각각 적용하고, secret key가 빌드 로그나 클라이언트 코드에 포함되지 않았는지 확인합니다.

## 문서

- [문서 관리 규칙](docs/README.md)
- [Next.js·Supabase 전환 계획](docs/plans/PLAN_NEXT_SUPABASE_전환.md)
- [UI 리디자인 계획](docs/plans/PLAN_UI_리디자인.md)
- [2026-07-12 개발 로그](docs/logs/DEV_20260712.md)
