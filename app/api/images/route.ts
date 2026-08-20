import { createSupabaseAdminClient } from '../../../lib/supabase/admin.ts';
import { LOCAL_FALLBACK_IMAGES } from '../../../lib/game/localImages.ts';

export const dynamic = 'force-dynamic';

const STORAGE_BUCKET = 'game-images';
const SIGNED_URL_TTL_SECONDS = 600;
const LIST_PAGE_SIZE = 100;
const LIST_PAGE_LIMIT = 10;
const IMAGE_NAME_PATTERN = /\.(jpe?g|png|webp)$/i;

type ImageSource = 'storage' | 'local';

const respond = (images: string[], source: ImageSource, reason?: string) =>
  Response.json(
    { images, source, ...(reason ? { reason } : {}) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );

/** Storage 조회가 실패하거나 비어 있어도 게임은 시작할 수 있어야 하므로 로컬 이미지로 폴백한다. */
const respondWithFallback = (reason: string) => {
  console.error(`[GET /api/images] falling back to local images (${reason})`);
  if (LOCAL_FALLBACK_IMAGES.length === 0) {
    return Response.json(
      { error: '사용 가능한 게임 이미지가 없습니다.', reason },
      { status: 503 },
    );
  }
  return respond(LOCAL_FALLBACK_IMAGES, 'local', reason);
};

type Storage = ReturnType<ReturnType<typeof createSupabaseAdminClient>['storage']['from']>;

const listImagePaths = async (storage: Storage): Promise<string[]> => {
  const paths: string[] = [];

  for (let page = 0; page < LIST_PAGE_LIMIT; page += 1) {
    const { data: objects, error } = await storage.list('', {
      limit: LIST_PAGE_SIZE,
      offset: page * LIST_PAGE_SIZE,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;

    const names = objects ?? [];
    paths.push(...names.filter(object => IMAGE_NAME_PATTERN.test(object.name)).map(object => object.name));
    if (names.length < LIST_PAGE_SIZE) break;
  }

  return paths;
};

export async function GET() {
  // 이미지 목록/서명은 admin client(RLS 우회)로만 처리한다.
  // 익명 로그인은 인가에 쓰이지 않으면서 Supabase 익명 로그인 rate limit에 걸리면
  // 전체 요청을 503으로 실패시켰기 때문에 제거했다.
  try {
    const storage = createSupabaseAdminClient().storage.from(STORAGE_BUCKET);
    const paths = await listImagePaths(storage);
    if (paths.length === 0) {
      return respondWithFallback('storage_bucket_empty');
    }

    const { data: signedObjects, error: signError } = await storage.createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (signError) throw signError;

    const images = (signedObjects ?? []).map(object => object.signedUrl).filter(Boolean);
    if (images.length === 0) {
      return respondWithFallback('signed_url_empty');
    }

    return respond(images, 'storage');
  } catch (error) {
    console.error('[GET /api/images]', error);
    const reason = error instanceof Error ? `storage_error: ${error.message}` : 'storage_error';
    return respondWithFallback(reason);
  }
}
