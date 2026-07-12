-- Minion Match 게임 이미지 Storage private bucket 초안
-- 작성일: 2026-07-12
-- 적용 전제: 인증된 사용자에게 Next.js 서버가 짧은 만료 signed URL을 발급한다.
-- 업로드/수정/삭제 정책을 만들지 않으므로 일반 사용자는 파일을 변경할 수 없다.

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'game-images',
  'game-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- SELECT 정책도 의도적으로 생성하지 않는다.
-- Next.js 서버의 admin client만 허용된 경로에 대해 signed URL을 발급한다.
-- SUPABASE_SECRET_KEY는 서버에서만 사용하고 클라이언트 번들에 포함하지 않는다.

commit;

