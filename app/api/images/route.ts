import { createSupabaseAdminClient } from '../../../lib/supabase/admin.ts';
import { createSupabaseServerClient } from '../../../lib/supabase/server.ts';

export const dynamic = 'force-dynamic';
const SIGNED_URL_TTL_SECONDS = 600;

export async function GET() {
  try {
    const sessionClient = await createSupabaseServerClient();
    let { data: { user }, error: userError } = await sessionClient.auth.getUser();

    if (!user) {
      const signInResult = await sessionClient.auth.signInAnonymously();
      user = signInResult.data.user;
      userError = signInResult.error;
    }

    if (userError || !user) {
      console.error('[GET /api/images] anonymous auth failed', userError);
      return Response.json({ error: '사용자 세션을 만들지 못했습니다.' }, { status: 503 });
    }

    const storage = createSupabaseAdminClient().storage.from('game-images');
    const { data: objects, error: listError } = await storage.list('', {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (listError) throw listError;

    const paths = (objects ?? [])
      .filter(object => /\.(jpe?g|png|webp)$/i.test(object.name))
      .map(object => object.name);

    if (paths.length === 0) {
      return Response.json({ error: '사용 가능한 게임 이미지가 없습니다.' }, { status: 503 });
    }

    const { data: signedObjects, error: signError } = await storage.createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (signError) throw signError;

    return Response.json(
      { images: (signedObjects ?? []).map(object => object.signedUrl).filter(Boolean) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[GET /api/images]', error);
    return Response.json({ error: '게임 이미지를 불러오지 못했습니다.' }, { status: 500 });
  }
}

