'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const stages = [
  { id: 1, name: '첫 만남', icon: '💕', requiredAffinity: 0 },
  { id: 2, name: '썸', icon: '💗', requiredAffinity: 100 },
  { id: 3, name: '연애', icon: '❤️', requiredAffinity: 200 },
  { id: 4, name: '결혼', icon: '💍', requiredAffinity: 300 },
];

export default function StageSelect() {
  const router = useRouter();
  const [totalAffinity, setTotalAffinity] = useState(0);
  const [previousAffinity, setPreviousAffinity] = useState(0);
  const [unlockingStageId, setUnlockingStageId] = useState<number | null>(null);
  const [showUnlockEffect, setShowUnlockEffect] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const isFirstRender = useRef(true);

  // 인증 상태 체크 + 호감도 불러오기
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsGuest(!user);

      const saved = localStorage.getItem('totalAffinity');
      const prevSaved = localStorage.getItem('previousAffinity');

      const current = saved ? Number(saved) : 0;
      const prev = prevSaved ? Number(prevSaved) : 0;

      setTotalAffinity(current);
      setPreviousAffinity(prev);

      // 새로 해금된 스테이지가 있는지 확인
      if (isFirstRender.current && current > prev) {
        const newlyUnlocked = stages.find(
          s => current >= s.requiredAffinity && prev < s.requiredAffinity && s.requiredAffinity > 0
        );

        if (newlyUnlocked) {
          setTimeout(() => {
            setUnlockingStageId(newlyUnlocked.id);
            setShowUnlockEffect(true);
            setTimeout(() => {
              setShowUnlockEffect(false);
              setUnlockingStageId(null);
              localStorage.setItem('previousAffinity', String(current));
              setPreviousAffinity(current);
            }, 3000);
          }, 500);
        } else {
          localStorage.setItem('previousAffinity', String(current));
        }
        isFirstRender.current = false;
      }
    };
    init();
  }, []);

  const handleStageClick = (stage: typeof stages[0]) => {
    const isUnlocked = totalAffinity >= stage.requiredAffinity;
    if (!isUnlocked || unlockingStageId) return;

    // 비회원은 썸(2단계)까지만
    if (isGuest && stage.id > 2) {
      setShowLoginModal(true);
      return;
    }

    router.push(`/game/play?stage=${stage.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 flex flex-col items-center justify-center p-4">
      {/* 타이틀 */}
      <h1 className="text-2xl font-bold text-pink-600 mb-1">🌸 스테이지 선택</h1>
      <p className="text-gray-500 text-sm mb-2">플레이할 스테이지를 선택해주세요</p>
      <p className="text-purple-500 text-xs mb-6">누적 호감도: {totalAffinity}</p>

      {/* 스테이지 버튼들 */}
      <div className="flex flex-col items-center space-y-4 w-full max-w-[300px]">
        {stages.map((stage) => {
          const isUnlocked = totalAffinity >= stage.requiredAffinity;
          const isUnlocking = unlockingStageId === stage.id;

          return (
            <div key={stage.id} className="relative w-[60%]">
              {/* 자물쇠 깨지는 효과 */}
              {isUnlocking && showUnlockEffect && (
                <>
                  {/* 빛 퍼지는 효과 */}
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-32 rounded-full bg-yellow-300/60 animate-ping" />
                  </div>
                  {/* 깨진 자물쇠 파편 */}
                  <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none overflow-visible">
                    <span className="absolute text-3xl animate-[fly-left_1s_ease-out_forwards]">🔓</span>
                    <span className="absolute text-xl animate-[fly-top-right_1s_ease-out_forwards] opacity-80">✨</span>
                    <span className="absolute text-xl animate-[fly-top-left_1s_ease-out_forwards] opacity-80">✨</span>
                    <span className="absolute text-lg animate-[fly-bottom-right_1s_ease-out_forwards] opacity-60">💫</span>
                    <span className="absolute text-lg animate-[fly-bottom-left_1s_ease-out_forwards] opacity-60">⭐</span>
                  </div>
                  {/* UNLOCKED 텍스트 */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                    <span className="text-yellow-500 font-black text-lg animate-bounce drop-shadow-lg">
                      ✨ UNLOCKED! ✨
                    </span>
                  </div>
                </>
              )}

              <button
                onClick={() => handleStageClick(stage)}
                disabled={!isUnlocked || !!unlockingStageId}
                className={`w-full py-[15px] px-6 rounded-xl font-bold text-lg
                           border-2 shadow-md transition-all duration-500 ease-out
                           ${isUnlocking
                             ? 'bg-yellow-100 text-pink-600 border-yellow-400 scale-110 shadow-xl shadow-yellow-300/50'
                             : isUnlocked
                               ? 'bg-white/70 backdrop-blur-sm text-pink-600 border-pink-200 hover:shadow-lg hover:bg-white/90 hover:scale-105 cursor-pointer'
                               : 'bg-gray-200/70 text-gray-400 border-gray-300 cursor-not-allowed'
                           }`}
              >
                {isUnlocking ? (
                  <>
                    <span className="mr-2">{stage.icon}</span>
                    {stage.name}
                  </>
                ) : isUnlocked ? (
                  <>
                    <span className="mr-2">{stage.icon}</span>
                    {stage.name}
                  </>
                ) : (
                  <>
                    <span className="mr-2">🔒</span>
                    {stage.name}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* 뒤로가기 버튼 */}
      <Link href="/game" className="mt-6">
        <button className="text-gray-400 hover:text-gray-600 text-sm transition">
          ← 캐릭터 선택으로 돌아가기
        </button>
      </Link>

      {/* 커스텀 애니메이션 CSS */}
      <style jsx>{`
        @keyframes fly-left {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-60px, -30px) scale(1.5) rotate(-30deg); opacity: 0; }
        }
        @keyframes fly-top-right {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(50px, -50px) scale(0.5); opacity: 0; }
        }
        @keyframes fly-top-left {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50px, -50px) scale(0.5); opacity: 0; }
        }
        @keyframes fly-bottom-right {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(40px, 40px) scale(0.3); opacity: 0; }
        }
        @keyframes fly-bottom-left {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-40px, 40px) scale(0.3); opacity: 0; }
        }
      `}</style>

      {/* 비회원 안내 */}
      {isGuest && (
        <p className="mt-4 text-xs text-gray-400">
          👤 비회원 모드 · 썸 단계까지 체험 가능 ·{' '}
          <button onClick={() => router.push('/login')} className="text-purple-500 hover:underline font-bold">
            로그인하기
          </button>
        </p>
      )}

      {/* 로그인 유도 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-purple-600 mb-2">회원 전용 콘텐츠</h2>
            <p className="text-gray-600 mb-6">
              연애 · 결혼 단계는 회원만 이용할 수 있어요!<br/>
              <span className="text-sm text-gray-400">회원가입하면 대화 내용도 저장됩니다 💾</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLoginModal(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition"
              >
                닫기
              </button>
              <button
                onClick={() => router.push('/login')}
                className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600 transition shadow-lg shadow-purple-200"
              >
                로그인 / 회원가입
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}