import { validateScoreInput } from '../../../lib/game/validation.ts';
import { createSupabaseServerClient } from '../../../lib/supabase/server.ts';
import { StageError, reasonOf } from '../../../lib/apiError.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: scores, error: scoresError } = await supabase
      .from('game_scores')
      .select('id, user_id, difficulty, moves, time_taken, created_at')
      .order('moves', { ascending: true })
      .order('time_taken', { ascending: true })
      .limit(100);
    if (scoresError) throw new StageError('scores_query_failed', scoresError);

    const userIds = [...new Set((scores ?? []).map(score => score.user_id))];
    const { data: profiles, error: profilesError } = userIds.length > 0
      ? await supabase.from('profiles').select('id, nickname').in('id', userIds)
      : { data: [], error: null };
    if (profilesError) throw new StageError('profiles_query_failed', profilesError);

    const names = new Map((profiles ?? []).map(profile => [profile.id, profile.nickname]));
    return Response.json((scores ?? []).filter(score => names.has(score.user_id)).map(score => ({
      id: score.id,
      player_name: names.get(score.user_id),
      difficulty: score.difficulty,
      moves: score.moves,
      time_taken: score.time_taken,
      created_at: score.created_at,
    })));
  } catch (error) {
    console.error('[GET /api/scores]', error);
    return Response.json({ error: '리더보드를 불러오지 못했습니다.', reason: reasonOf(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const validation = validateScoreInput(await request.json());
    if (validation.success === false) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    let { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user) {
      const signInResult = await supabase.auth.signInAnonymously();
      user = signInResult.data.user;
      userError = signInResult.error;
    }

    if (userError || !user) {
      console.error('[POST /api/scores] anonymous auth failed', userError);
      return Response.json(
        { error: '사용자 세션을 만들지 못했습니다.', reason: 'anonymous_auth_failed' },
        { status: 503 },
      );
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, nickname: validation.data.player_name });
    if (profileError) throw new StageError('profile_upsert_failed', profileError);

    const { data, error } = await supabase
      .from('game_scores')
      .insert({
        user_id: user.id,
        difficulty: validation.data.difficulty,
        moves: validation.data.moves,
        time_taken: validation.data.time_taken,
      })
      .select('id, difficulty, moves, time_taken, created_at')
      .single();
    if (error) throw new StageError('score_insert_failed', error);
    return Response.json({
      ...data,
      player_name: validation.data.player_name,
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/scores]', error);
    return Response.json({ error: '점수를 저장하지 못했습니다.', reason: reasonOf(error) }, { status: 500 });
  }
}
