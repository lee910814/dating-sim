'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const supabase = createClient();

    try {
      if (isLogin) {
        // 로그인
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/game');
      } else {
        // 회원가입
        if (password.length < 6) {
          throw new Error('비밀번호는 6자 이상이어야 합니다.');
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccess('회원가입 성공! 이메일을 확인해주세요 📧');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '오류가 발생했습니다.';
      // 에러 메시지 한국어화
      if (errorMessage.includes('Invalid login')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (errorMessage.includes('already registered')) {
        setError('이미 가입된 이메일입니다.');
      } else {
        setError(errorMessage);
      }
    }

    setLoading(false);
  };

  const handleGuestPlay = () => {
    // 비회원 - localStorage에서 세션 데이터 삭제
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('session_stage_1');
    localStorage.removeItem('session_stage_2');
    localStorage.removeItem('session_stage_3');
    localStorage.removeItem('session_stage_4');
    router.push('/game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl max-w-md w-full border border-white/50">
        {/* 로고 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-pink-600 mb-2">🌸 AI 연애 시뮬레이션</h1>
          <p className="text-gray-500 text-sm">
            {isLogin ? '로그인하고 대화를 이어가세요!' : '회원가입하고 시작하세요!'}
          </p>
        </div>

        {/* 에러/성공 메시지 */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm text-center">
            ✅ {success}
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">📧 이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-pink-400
                         outline-none transition text-gray-700 bg-white/70"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-1">🔒 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? '비밀번호 입력' : '6자 이상 입력'}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-pink-400
                         outline-none transition text-gray-700 bg-white/70"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white bg-pink-500
                       hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed
                       shadow-lg shadow-pink-200"
          >
            {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
          </button>
        </form>

        {/* 로그인/회원가입 전환 */}
        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
            className="text-purple-500 hover:text-purple-700 text-sm font-bold transition"
          >
            {isLogin ? '계정이 없으신가요? 회원가입 →' : '이미 계정이 있으신가요? 로그인 →'}
          </button>
        </div>

        {/* 구분선 */}
        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-3 text-gray-400 text-xs">또는</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* 비회원 플레이 */}
        <button
          onClick={handleGuestPlay}
          className="w-full py-3 rounded-xl font-bold text-gray-500 border-2 border-gray-200
                     hover:bg-gray-50 hover:border-gray-300 transition"
        >
          🎮 비회원으로 체험하기
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">
          비회원은 대화 내용이 저장되지 않습니다
        </p>
      </div>
    </div>
  );
}
