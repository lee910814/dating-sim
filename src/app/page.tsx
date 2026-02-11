'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
        <h1 className="text-3xl font-bold text-pink-600 mb-4">
          🌸 AI 연애 시뮬레이션
        </h1>
        <p className="text-gray-600 mb-8">
          당신만의 특별한 캐릭터와 대화를 나누고<br/>
          두근거리는 호감도를 쌓아보세요!
        </p>
        
        {/* 로그인 상태 표시 */}
        {!loading && (
          <div className="mb-6">
            {user ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-green-600 font-bold">✅ {user.email}</span>
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 text-xs transition">
                  (로그아웃)
                </button>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">비회원 상태 · 대화가 저장되지 않습니다</p>
            )}
          </div>
        )}

        <div className="space-y-6">
          <Link href="/game" className="mb-[5px]">
            <button className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition mb-4" >
              {user ? '게임 시작하기' : '🎮 비회원으로 체험하기'}
            </button>
          </Link>

          {user ? (
            <button className="w-full border-2 border-pink-200 text-pink-500 py-3 rounded-xl font-bold hover:bg-pink-50 transition">
              불러오기
            </button>
          ) : (
            <Link href="/login">
              <button className="w-full border-2 border-purple-200 text-purple-500 py-3 rounded-xl font-bold hover:bg-purple-50 transition">
                🔐 로그인 / 회원가입
              </button>
            </Link>
          )}
        </div>
        
        <p className="mt-6 text-xs text-gray-400">
          {user ? '회원님의 대화 내용은 안전하게 저장됩니다 🔒' : '회원가입 시 대화 내용이 저장됩니다'}
        </p>
      </div>
    </div>
  );
}