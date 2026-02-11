'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 스테이지별 테마 설정
const stageThemes: { [key: string]: {
  name: string;
  bgImage: string | null;
  bgGradient: string;
  dialogBg: string;
  dialogBorder: string;
  nameBg: string;
  accentColor: string;
  barColors: string[];
  firstMessage: string;
}} = {
  '1': {
    name: '첫 만남',
    bgImage: '/park.png',
    bgGradient: '',
    dialogBg: 'bg-purple-900/80',
    dialogBorder: 'border-purple-500',
    nameBg: 'bg-purple-600',
    accentColor: 'text-purple-300',
    barColors: ['bg-blue-400', 'bg-purple-500', 'bg-pink-500', 'bg-red-500'],
    firstMessage: '(공원에서 우연히 만났다. 먼저 인사해줘)',
  },
  '2': {
    name: '썸',
    bgImage: null,
    bgGradient: 'bg-gradient-to-b from-pink-300 via-rose-200 to-orange-100',
    dialogBg: 'bg-rose-900/80',
    dialogBorder: 'border-pink-400',
    nameBg: 'bg-pink-500',
    accentColor: 'text-pink-300',
    barColors: ['bg-pink-300', 'bg-pink-400', 'bg-pink-500', 'bg-rose-500'],
    firstMessage: '(카페에서 약속을 잡고 만났다. 반갑게 인사해줘. 서로 호감이 있는 상태야)',
  },
  '3': {
    name: '연애',
    bgImage: null,
    bgGradient: 'bg-gradient-to-b from-indigo-900 via-purple-800 to-pink-700',
    dialogBg: 'bg-indigo-950/85',
    dialogBorder: 'border-red-400',
    nameBg: 'bg-red-500',
    accentColor: 'text-red-300',
    barColors: ['bg-purple-400', 'bg-red-400', 'bg-red-500', 'bg-rose-600'],
    firstMessage: '(연인인 상대가 데이트하러 왔다. 다정하게 반겨줘)',
  },
  '4': {
    name: '결혼',
    bgImage: null,
    bgGradient: 'bg-gradient-to-b from-amber-100 via-orange-50 to-yellow-50',
    dialogBg: 'bg-amber-900/80',
    dialogBorder: 'border-amber-400',
    nameBg: 'bg-amber-600',
    accentColor: 'text-amber-300',
    barColors: ['bg-amber-300', 'bg-amber-400', 'bg-amber-500', 'bg-yellow-500'],
    firstMessage: '(집에서 퇴근한 남편이 돌아왔다. 반갑게 맞이해줘)',
  },
};

export default function VisualNovelChat() {
  const searchParams = useSearchParams();
  const stage = searchParams.get('stage') || '1';
  const theme = stageThemes[stage] || stageThemes['1'];

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentAIMessage, setCurrentAIMessage] = useState('');
  const [userInput, setUserInput] = useState('');
  const [affinity, setAffinity] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [affinityPopup, setAffinityPopup] = useState<{ value: number; show: boolean }>({ value: 0, show: false });
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isGuest, setIsGuest] = useState(true);
  const [showStageUp, setShowStageUp] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  // 위기 이벤트 상태
  const [negativeStreak, setNegativeStreak] = useState(0);
  const [showCrisisEvent, setShowCrisisEvent] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [attachmentType, setAttachmentType] = useState<'안정형' | '불안형'>('안정형');
  const inputRef = useRef<HTMLInputElement>(null);

  // 호감도 바 색상 (음수 구간 포함)
  const getAffinityColor = () => {
    if (affinity < 0) return 'bg-gray-600';
    const colors = theme.barColors;
    if (affinity >= 80) return colors[3];
    if (affinity >= 50) return colors[2];
    if (affinity >= 30) return colors[1];
    return colors[0];
  };

  // 애착 유형 업데이트
  const updateAttachment = (newAffinity: number) => {
    if (newAffinity < 0) {
      setAttachmentType('불안형');
    } else {
      setAttachmentType('안정형');
    }
  };

  // 호감도 변동 팝업
  const showAffinityChange = (change: number) => {
    setAffinityPopup({ value: change, show: true });
    setTimeout(() => setAffinityPopup({ value: 0, show: false }), 1500);
  };

  // 타이핑 효과
  useEffect(() => {
    if (isTyping && displayedText.length < currentAIMessage.length) {
      const timer = setTimeout(() => {
        setDisplayedText(currentAIMessage.slice(0, displayedText.length + 1));
      }, 50);
      return () => clearTimeout(timer);
    } else if (isTyping && displayedText.length === currentAIMessage.length && currentAIMessage.length > 0) {
      setIsTyping(false);
      setTimeout(() => {
        setShowInput(true);
        inputRef.current?.focus();
      }, 500);
    }
  }, [displayedText, isTyping, currentAIMessage]);

  // DB에 메시지 저장 (회원만)
  const saveMessage = async (sId: string, role: string, content: string) => {
    if (sId === 'temp' || sId === 'guest') return;
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sId, role, content }),
      });
    } catch (err) {
      console.error('메시지 저장 실패:', err);
    }
  };

  // DB에 호감도 업데이트 (회원만)
  const updateAffinity = async (sId: string, newAffinity: number) => {
    if (sId === 'temp' || sId === 'guest') return;
    try {
      await fetch('/api/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sId, affinity: newAffinity }),
      });
    } catch (err) {
      console.error('호감도 업데이트 실패:', err);
    }
  };

  // 세션 초기화 (회원/비회원 분기)
  useEffect(() => {
    const initSession = async () => {
      try {
        // 🔐 인증 체크
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // 비회원: DB 저장 없이 시작
          setIsGuest(true);
          setSessionId('guest');
          setIsLoading(false);
          sendToAI([], 'guest', true);
          return;
        }

        // 회원: DB에서 세션 불러오기
        setIsGuest(false);
        const sessionKey = `session_stage_${stage}`;
        const savedSessionId = localStorage.getItem(sessionKey);

        if (savedSessionId) {
          const res = await fetch(`/api/session?id=${savedSessionId}`);
          const data = await res.json();

          if (data.session && data.messages) {
            setSessionId(savedSessionId);
            setAffinity(data.session.affinity || 0);

            const history: ChatMessage[] = data.messages.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }));

            if (history.length > 0) {
              setChatHistory(history);
              const lastAI = [...history].reverse().find(m => m.role === 'assistant');
              if (lastAI) {
                setCurrentAIMessage(lastAI.content);
                setDisplayedText(lastAI.content);
                setShowInput(true);
              }
              setIsLoading(false);
              return;
            }
          }
        }

        // 새 세션 생성 (회원)
        const res = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: Number(stage) }),
        });
        const data = await res.json();

        if (data.session && data.session.id) {
          const newSessionId = data.session.id;
          setSessionId(newSessionId);
          localStorage.setItem(sessionKey, newSessionId);
          setIsLoading(false);
          sendToAI([], newSessionId, true);
        } else {
          console.error('세션 생성 실패:', data.error || data);
          setIsLoading(false);
          sendToAI([], 'guest', true);
        }
      } catch (err) {
        console.error('세션 초기화 실패:', err);
        setIsLoading(false);
        sendToAI([], 'guest', true);
      }
    };

    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // AI에게 메시지 전송
  const sendToAI = async (messages: ChatMessage[], sId: string, isFirstMessage = false) => {
    setIsWaiting(true);
    setShowInput(false);

    const apiMessages = isFirstMessage
      ? [{ role: 'user' as const, content: theme.firstMessage }]
      : messages;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, affinity, stage, attachmentType }),
      });

      const data = await res.json();

      if (data.reply) {
        const aiMessage: ChatMessage = { role: 'assistant', content: data.reply };

        if (isFirstMessage) {
          setChatHistory([aiMessage]);
        } else {
          setChatHistory(prev => [...prev, aiMessage]);
        }

        // DB에 저장
        await saveMessage(sId, 'assistant', data.reply);

        // 타이핑 효과 시작
        setCurrentAIMessage(data.reply);
        setDisplayedText('');
        setIsTyping(true);

        // 감정 업데이트
        setCurrentEmotion(data.emotion || 'neutral');

        // 호감도 변동 (AI 판단 기반) — 음수 허용 (-50 ~ 100)
        const change = data.affinity_change ?? 3;
        const newAffinity = Math.max(-50, Math.min(100, affinity + change));
        setAffinity(newAffinity);
        showAffinityChange(change);
        updateAttachment(newAffinity);
        await updateAffinity(sId, newAffinity);

        // 💔 위기 이벤트: 연속 음수 체크
        if (change < 0) {
          const newStreak = negativeStreak + 1;
          setNegativeStreak(newStreak);
          if (newStreak >= 3 && !showCrisisEvent) {
            setTimeout(() => setShowCrisisEvent(true), 1500);
          }
        } else {
          setNegativeStreak(0);
        }

        // 💀 게임 오버: 호감도 -30 이하
        if (newAffinity <= -30) {
          setTimeout(() => setShowGameOver(true), 1500);
        }

        // 누적 호감도 (스테이지 해금용)
        if (change > 0) {
          const savedTotal = Number(localStorage.getItem('totalAffinity') || '0');
          localStorage.setItem('totalAffinity', String(savedTotal + change));
        }

        // 🎯 호감도 100 도달 시 자동 스테이지 전환
        if (newAffinity >= 100 && Number(stage) < 4) {
          setTimeout(() => {
            setShowStageUp(true);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setCurrentAIMessage('어... 잠깐 멍하게 있었어. 다시 말해줄래?');
      setDisplayedText('');
      setIsTyping(true);
    }

    setIsWaiting(false);
  };

  // 다음 스테이지로 이동
  const handleNextStage = () => {
    const nextStage = Number(stage) + 1;
    // 비회원은 썸(2)까지만
    if (isGuest && nextStage > 2) {
      setShowLoginPrompt(true);
      return;
    }
    window.location.href = `/game/play?stage=${nextStage}`;
  };

  // 유저 메시지 전송
  const handleSend = useCallback(() => {
    if (!userInput.trim() || isWaiting || isTyping) return;

    const userMessage: ChatMessage = { role: 'user', content: userInput };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    setUserInput('');
    setShowInput(false);

    if (sessionId && !isGuest) saveMessage(sessionId, 'user', userInput);
    sendToAI(newHistory, sessionId || 'guest');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInput, isWaiting, isTyping, chatHistory, sessionId, affinity]);

  // Enter 키로 전송
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // 감정에 따른 이모지
  const emotionEmoji: { [key: string]: string } = {
    happy: '😊', shy: '😳', angry: '😤', sad: '😢', neutral: '😐',
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <span className="text-white text-xl animate-pulse">대화를 불러오는 중... 💭</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden select-none">
      {/* 배경 */}
      {theme.bgImage ? (
        <Image src={theme.bgImage} alt="배경" fill className="object-cover" priority />
      ) : (
        <div className={`absolute inset-0 ${theme.bgGradient}`} />
      )}

      {/* 비회원 안내 - 우측 상단 */}
      {isGuest && (
        <div className="absolute top-4 right-4 z-30">
          <span className="bg-gray-800/70 text-gray-300 text-xs px-3 py-1 rounded-full backdrop-blur-sm">
            👤 비회원 · 대화 저장되지 않음
          </span>
        </div>
      )}

      {/* 호감도 바 - 왼쪽 상단 */}
      <div className="absolute top-4 left-4 z-30 w-[250px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white text-sm font-bold drop-shadow-lg">
            {affinity < 0 ? '💔' : '💖'} 호감도
          </span>
          <span className={`text-sm font-bold drop-shadow-lg ${affinity < 0 ? 'text-red-400' : 'text-white'}`}>
            {affinity}/100
          </span>
          {/* 감정 이모지 */}
          <span className="text-lg">{emotionEmoji[currentEmotion] || '😐'}</span>
          {/* 애착유형 뱃지 */}
          {attachmentType === '불안형' && (
            <span className="bg-red-500/80 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse font-bold">
              불안형
            </span>
          )}
        </div>
        {/* 위기 경고 */}
        {negativeStreak >= 2 && !showCrisisEvent && (
          <div className="text-red-400 text-xs mb-1 animate-pulse font-bold">
            ⚠️ 하나가 불안해하고 있어...
          </div>
        )}
        <div className="w-full h-4 bg-gray-800/60 rounded-full overflow-hidden border border-white/30">
          <div
            className={`h-full ${getAffinityColor()} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${Math.max(0, affinity)}%` }}
          />
        </div>
        {/* 스테이지 표시 */}
        <div className="mt-1">
          <span className="text-white/70 text-xs drop-shadow-lg">📍 {theme.name}</span>
        </div>
      </div>

      {/* 호감도 변동 팝업 */}
      {affinityPopup.show && (
        <div className={`absolute top-20 left-[230px] z-40 text-2xl font-bold animate-bounce
          ${affinityPopup.value >= 0 ? 'text-green-400' : 'text-red-400'}`}
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
        >
          {affinityPopup.value >= 0 ? `+${affinityPopup.value} ♡` : `${affinityPopup.value} 💔`}
        </div>
      )}

      {/* 캐릭터 - 가운데 배치 (감정별 애니메이션) */}
      <div className={`absolute bottom-[170px] left-1/2 -translate-x-1/2 z-10 transition-all duration-500
        ${currentEmotion === 'happy' ? 'animate-char-happy' : ''}
        ${currentEmotion === 'shy' ? 'animate-char-shy' : ''}
        ${currentEmotion === 'angry' ? 'animate-char-angry' : ''}
        ${currentEmotion === 'sad' ? 'animate-char-sad' : ''}
        ${currentEmotion === 'neutral' ? 'animate-char-idle' : ''}
      `}>
        <Image
          src="/yuranuggi.png"
          alt="하나"
          width={500}
          height={680}
          className="drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] object-contain"
        />
        {/* 감정 이펙트 오버레이 */}
        {currentEmotion === 'happy' && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-3xl animate-bounce inline-block">✨</span>
            <span className="text-2xl animate-bounce inline-block delay-100">💕</span>
            <span className="text-3xl animate-bounce inline-block delay-200">✨</span>
          </div>
        )}
        {currentEmotion === 'shy' && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-4xl animate-pulse">💗</span>
          </div>
        )}
        {currentEmotion === 'angry' && (
          <div className="absolute -top-2 right-1/4 pointer-events-none">
            <span className="text-3xl animate-ping">💢</span>
          </div>
        )}
        {currentEmotion === 'sad' && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 pointer-events-none opacity-70">
            <span className="text-3xl animate-pulse">💧</span>
          </div>
        )}
      </div>

      {/* 대화상자 - 하단 고정 */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className={`${theme.dialogBg} backdrop-blur-sm border-t-4 ${theme.dialogBorder} px-8 py-5 min-h-[180px] flex flex-col`}>
          {/* 캐릭터 이름 */}
          <div className="ml-[100px] mb-2">
            <span className={`inline-block ${theme.nameBg} px-4 py-1 rounded text-white font-bold text-xl`}>
              하나
            </span>
          </div>

          {/* AI 대화 텍스트 */}
          <p className="ml-[100px] text-white text-[22px] whitespace-pre-line leading-relaxed text-left flex-1">
            {isWaiting && !isTyping ? (
              <span className={`${theme.accentColor} animate-pulse`}>생각하는 중...</span>
            ) : (
              <>
                {displayedText}
                {isTyping && <span className="animate-pulse text-pink-300">|</span>}
              </>
            )}
          </p>

          {/* 유저 입력창 */}
          {showInput && (
            <div className="ml-[100px] mt-2 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="대화를 입력하세요..."
                className="flex-1 px-4 py-2 rounded-xl bg-white/90 text-gray-800
                           text-base outline-none border-2 border-purple-300
                           focus:border-pink-400 transition placeholder-gray-400"
              />
              <button
                onClick={handleSend}
                disabled={!userInput.trim()}
                className="px-5 py-2 bg-pink-500 text-white rounded-xl font-bold
                           hover:bg-pink-600 transition disabled:opacity-50"
              >
                전송
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🎯 스테이지 전환 모달 */}
      {showStageUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-bounce-in">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-pink-600 mb-2">호감도 MAX!</h2>
            <p className="text-gray-600 mb-6">
              하나와의 관계가 더 깊어졌어요!<br/>
              <span className="font-bold text-purple-600">
                다음 단계: {stageThemes[String(Number(stage) + 1)]?.name || '완료'}
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStageUp(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500
                           font-bold hover:bg-gray-50 transition"
              >
                더 대화하기
              </button>
              <button
                onClick={handleNextStage}
                className="flex-1 py-3 rounded-xl bg-pink-500 text-white font-bold
                           hover:bg-pink-600 transition shadow-lg shadow-pink-200"
              >
                다음 단계로 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔐 비회원 로그인 유도 모달 */}
      {showLoginPrompt && (
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
                onClick={() => setShowLoginPrompt(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500
                           font-bold hover:bg-gray-50 transition"
              >
                닫기
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-bold
                           hover:bg-purple-600 transition shadow-lg shadow-purple-200"
              >
                로그인 / 회원가입
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💔 위기 이벤트 모달 */}
      {showCrisisEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl border border-red-500/30">
            <div className="text-5xl mb-4 animate-pulse">💔</div>
            <h2 className="text-2xl font-bold text-red-400 mb-3">위기...</h2>
            <p className="text-gray-300 mb-2 text-lg">
              하나가 고개를 돌렸다...
            </p>
            <p className="text-white mb-6 text-xl font-bold italic">
              &quot;...우리 이만 그만 볼까.&quot;
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowCrisisEvent(false);
                  setNegativeStreak(0);
                  const newAffinity = Math.min(100, affinity + 10);
                  setAffinity(newAffinity);
                  updateAttachment(newAffinity);
                  showAffinityChange(10);
                  setCurrentEmotion('shy');
                  setCurrentAIMessage('...진짜? 미안하다고 하면 다 괜찮은 거 아닌데... 근데 네가 그렇게 말하니까 좀 풀리네. 바보.');
                  setDisplayedText('');
                  setIsTyping(true);
                }}
                className="w-full py-3 rounded-xl bg-pink-500 text-white font-bold
                           hover:bg-pink-600 transition shadow-lg shadow-pink-200/20"
              >
                💕 미안해, 진심이 아니었어 (+10)
              </button>
              <button
                onClick={() => {
                  setShowCrisisEvent(false);
                  setNegativeStreak(0);
                  const newAffinity = Math.max(-50, affinity - 20);
                  setAffinity(newAffinity);
                  updateAttachment(newAffinity);
                  showAffinityChange(-20);
                  setCurrentEmotion('sad');
                  setCurrentAIMessage('...그래. 알겠어. 나도 더 이상 어떻게 해야 할지 모르겠어.');
                  setDisplayedText('');
                  setIsTyping(true);
                  if (newAffinity <= -30) {
                    setTimeout(() => setShowGameOver(true), 2000);
                  }
                }}
                className="w-full py-3 rounded-xl border-2 border-gray-600 text-gray-300 font-bold
                           hover:bg-gray-700 transition"
              >
                😐 알겠어, 네 맘대로 해 (-20)
              </button>
              <button
                onClick={() => {
                  setShowCrisisEvent(false);
                  setNegativeStreak(0);
                  const newAffinity = Math.min(100, affinity + 20);
                  setAffinity(newAffinity);
                  updateAttachment(newAffinity);
                  showAffinityChange(20);
                  setCurrentEmotion('happy');
                  setCurrentAIMessage('...!! 갑자기 그런 말 하면... 심장이 터질 것 같잖아... 바보 바보 바보!! 💕');
                  setDisplayedText('');
                  setIsTyping(true);
                }}
                className="w-full py-3 rounded-xl bg-red-500 text-white font-bold
                           hover:bg-red-600 transition shadow-lg shadow-red-200/20"
              >
                ❤️ 잠깐! 사실 너한테 하고 싶은 말이 있어 (+20)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💀 게임 오버 */}
      {showGameOver && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-lg">
          <div className="text-center max-w-md mx-4">
            <div className="text-6xl mb-6 animate-pulse">💀</div>
            <h2 className="text-3xl font-bold text-red-500 mb-4">Game Over</h2>
            <p className="text-gray-400 mb-2 text-lg">
              하나가 떠났습니다...
            </p>
            <p className="text-gray-500 mb-8 text-sm italic">
              &quot;더 이상은 힘들어... 안녕.&quot;
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowGameOver(false);
                  setAffinity(20);
                  setNegativeStreak(0);
                  setAttachmentType('안정형');
                  setChatHistory([]);
                  setCurrentAIMessage('');
                  setDisplayedText('');
                  sendToAI([], sessionId || 'guest', true);
                }}
                className="px-6 py-3 rounded-xl bg-pink-500 text-white font-bold
                           hover:bg-pink-600 transition"
              >
                🔄 처음부터 다시 시작
              </button>
              <button
                onClick={() => window.location.href = '/game'}
                className="px-6 py-3 rounded-xl border-2 border-gray-600 text-gray-400 font-bold
                           hover:bg-gray-800 transition"
              >
                🏠 스테이지 선택
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
