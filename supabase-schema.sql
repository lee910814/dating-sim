-- ==========================================
-- Supabase SQL Editor에서 이 SQL을 실행하세요!
-- 기존 테이블이 있으면 user_id 컬럼만 추가됩니다.
-- ==========================================

-- 기존 테이블이 없을 경우 생성
create table if not exists game_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  stage int default 1,
  affinity int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references game_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default now()
);

-- 기존 테이블에 user_id 컬럼 추가 (이미 있으면 무시됨)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- RLS(Row Level Security) 설정
alter table game_sessions enable row level security;
alter table chat_messages enable row level security;

-- 기존 정책 삭제 (에러 방지)
drop policy if exists "Allow all on game_sessions" on game_sessions;
drop policy if exists "Allow all on chat_messages" on chat_messages;
drop policy if exists "Users manage own sessions" on game_sessions;
drop policy if exists "Users manage own messages" on chat_messages;

-- 🛡️ 보안 정책: 자기 데이터만 접근 가능
create policy "Users manage own sessions" on game_sessions
  for all using (
    user_id = auth.uid() OR user_id IS NULL
  ) with check (
    user_id = auth.uid() OR user_id IS NULL
  );

create policy "Users manage own messages" on chat_messages
  for all using (
    session_id IN (
      SELECT id FROM game_sessions WHERE user_id = auth.uid() OR user_id IS NULL
    )
  ) with check (
    session_id IN (
      SELECT id FROM game_sessions WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );
