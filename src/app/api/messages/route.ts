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

// POST: 메시지 저장 (인증 필수)
export async function POST(req: NextRequest) {
  const { supabase, user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId, role, content } = body;

  // 입력값 검증
  if (!sessionId || !role || !content) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }
  if (!['user', 'assistant'].includes(role)) {
    return NextResponse.json({ error: '잘못된 role입니다.' }, { status: 400 });
  }
  if (typeof content !== 'string' || content.length > 2000) {
    return NextResponse.json({ error: '메시지가 너무 깁니다.' }, { status: 400 });
  }

  // 본인 세션인지 확인
  const { data: session } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('Message save error:', error);
    return NextResponse.json({ error: '메시지 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
