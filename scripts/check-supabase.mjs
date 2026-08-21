// Supabase 연결 상태 점검 스크립트.
// /api/images, /api/scores가 실패할 때 어느 단계가 깨졌는지 실제 응답으로 확인한다.
// 사용법: node scripts/check-supabase.mjs   (.env 또는 .env.local 자동 로드)
// 주의: 키 값은 출력하지 않고 접두사만 표시한다.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const envFile of ['.env', '.env.local']) {
  try {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // Optional environment file.
  }
}

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const STORAGE_BUCKET = 'game-images';

const results = [];
const record = (step, ok, detail, hint) => {
  results.push({ step, ok, detail, hint });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? ` — ${detail}` : ''}`);
  if (!ok && hint) console.log(`      → ${hint}`);
};

const keyPreview = value => (value ? `${value.slice(0, 12)}… (${value.length}자)` : '없음');

console.log('== 환경변수 ==');
console.log(`SUPABASE_URL             : ${url ?? '없음'}`);
console.log(`SUPABASE_PUBLISHABLE_KEY : ${keyPreview(publishableKey)}`);
console.log(`SUPABASE_SECRET_KEY      : ${keyPreview(secretKey)}`);
console.log('');

if (!url || !publishableKey || !secretKey) {
  console.error('환경변수가 비어 있습니다. SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY를 설정한 뒤 다시 실행하세요.');
  process.exit(1);
}

console.log('== 점검 ==');

// 1. 프로젝트가 살아 있는지(일시 정지·잘못된 URL 확인)
try {
  const response = await fetch(`${url}/auth/v1/health`, { headers: { apikey: publishableKey } });
  const body = await response.text();
  record(
    'project reachable (/auth/v1/health)',
    response.ok,
    `HTTP ${response.status} ${body.slice(0, 120)}`,
    'URL 오타이거나 프로젝트가 일시 정지(paused) 상태일 수 있습니다. Supabase Dashboard에서 프로젝트 상태를 확인하세요.',
  );
} catch (error) {
  record('project reachable (/auth/v1/health)', false, error.message, 'SUPABASE_URL 값과 네트워크를 확인하세요.');
}

// 2. 익명 로그인 (POST /api/scores가 의존하는 단계)
const sessionClient = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: anonData, error: anonError } = await sessionClient.auth.signInAnonymously();
record(
  'anonymous sign-in',
  Boolean(anonData?.user) && !anonError,
  anonError ? `${anonError.status ?? ''} ${anonError.message}`.trim() : `user ${anonData.user.id}`,
  'Authentication → Providers → Anonymous 활성화 여부와 익명 로그인 rate limit(Authentication → Rate Limits)을 확인하세요. 키가 잘못되면 "Invalid API key"가 나옵니다.',
);

// 3. 익명 세션으로 점수 저장 경로 확인 (RLS 정책 확인)
if (anonData?.user) {
  const { error: profileError } = await sessionClient
    .from('profiles')
    .upsert({ id: anonData.user.id, nickname: 'diagcheck' });
  record(
    'profiles upsert (RLS)',
    !profileError,
    profileError ? `${profileError.code ?? ''} ${profileError.message}`.trim() : 'ok',
    '001_auth_profiles_scores.sql의 profiles 테이블과 insert/update 정책이 적용됐는지 확인하세요.',
  );

  const { error: scoreError } = await sessionClient
    .from('game_scores')
    .insert({ user_id: anonData.user.id, difficulty: 'EASY', moves: 6, time_taken: 1 });
  record(
    'game_scores insert (RLS)',
    !scoreError,
    scoreError ? `${scoreError.code ?? ''} ${scoreError.message}`.trim() : 'ok',
    '001_auth_profiles_scores.sql의 game_scores 테이블과 insert 정책이 적용됐는지 확인하세요.',
  );
}

// 4. 리더보드 조회 (GET /api/scores가 의존하는 단계)
const { error: readError } = await sessionClient
  .from('game_scores')
  .select('id, user_id, difficulty, moves, time_taken, created_at')
  .limit(1);
record(
  'game_scores select',
  !readError,
  readError ? `${readError.code ?? ''} ${readError.message}`.trim() : 'ok',
  'game_scores 테이블 존재 여부와 select 정책을 확인하세요.',
);

// 5. Storage (GET /api/images가 의존하는 단계)
const adminStorage = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage;

const { data: buckets, error: bucketError } = await adminStorage.listBuckets();
record(
  'storage listBuckets (secret key)',
  !bucketError,
  bucketError ? bucketError.message : `buckets: ${(buckets ?? []).map(bucket => bucket.name).join(', ') || '없음'}`,
  'SUPABASE_SECRET_KEY 값을 확인하세요. 새 API 키 체계로 전환했다면 sb_secret_… 키를, 레거시라면 service_role 키를 사용해야 합니다.',
);

const { data: objects, error: listError } = await adminStorage.from(STORAGE_BUCKET).list('', { limit: 5 });
record(
  `storage list "${STORAGE_BUCKET}"`,
  !listError,
  listError ? listError.message : `${objects?.length ?? 0}개 이상 조회됨`,
  `002_game_images_storage.sql로 ${STORAGE_BUCKET} bucket을 만들고 node scripts/upload-game-images.mjs로 이미지를 올렸는지 확인하세요.`,
);

console.log('');
const failed = results.filter(result => !result.ok);
if (failed.length === 0) {
  console.log('모든 점검 통과. 테스트로 남은 diagcheck 프로필과 점수 행은 필요하면 직접 삭제하세요.');
} else {
  console.log(`실패 ${failed.length}건: ${failed.map(result => result.step).join(', ')}`);
  console.log('모든 항목이 함께 실패하면 프로젝트 일시 정지·URL 오타·키 오류처럼 원인이 하나일 가능성이 높습니다.');
}
process.exit(failed.length === 0 ? 0 : 1);
