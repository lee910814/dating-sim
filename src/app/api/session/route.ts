import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 서버에서 인증된 유저 가져오기
async function getAuthUser(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// 에러 응답 (DB 정보 노출 방지)
function safeError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

// GET: 세션 조회 (인증 필수)
export async function GET(req: NextRequest) {
  const { supabase, user } = await getAuthUser(req);
  if (!user) return safeError(401, '로그인이 필요합니다.');

  const sessionId = req.nextUrl.searchParams.get('id');

  if (sessionId) {
    // 특정 세션 조회 (본인 세션만)
    const { data: session, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (error || !session) return safeError(404, '세션을 찾을 수 없습니다.');

    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    return NextResponse.json({ session, messages });
  }

  // 본인 세션 목록
  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(10);

  return NextResponse.json({ sessions });
}

// POST: 새 세션 생성 (인증 필수, user_id 연동)
export async function POST(req: NextRequest) {
  const { supabase, user } = await getAuthUser(req);
  if (!user) return safeError(401, '로그인이 필요합니다.');

  const body = await req.json();
  const stage = Number(body.stage) || 1;

  // 스테이지 범위 검증
  if (stage < 1 || stage > 4) return safeError(400, '잘못된 스테이지입니다.');

  const { data, error } = await supabase
    .from('game_sessions')
    .insert({ stage, affinity: 0, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error('Session creation error:', error);
    return safeError(500, '세션 생성에 실패했습니다.');
  }

  return NextResponse.json({ session: data });
}

// PATCH: 세션 호감도 업데이트 (본인 세션만)
export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getAuthUser(req);
  if (!user) return safeError(401, '로그인이 필요합니다.');

  const body = await req.json();
  const { sessionId, affinity } = body;

  // 입력값 검증
  if (!sessionId || typeof affinity !== 'number') {
    return safeError(400, '잘못된 요청입니다.');
  }
  if (affinity < 0 || affinity > 100) {
    return safeError(400, '호감도는 0~100 사이여야 합니다.');
  }

  // 본인 세션만 수정 가능
  const { error } = await supabase
    .from('game_sessions')
    .update({ affinity, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Affinity update error:', error);
    return safeError(500, '호감도 업데이트에 실패했습니다.');
  }

  return NextResponse.json({ success: true });
}
