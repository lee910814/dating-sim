'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function CharacterIntro() {
  const [showCharacter, setShowCharacter] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  // 자기소개 텍스트
  const introText = "안녕! 나는 하나야~ ♡   처음 보는 얼굴이네? 반가워!\n나랑 같이 이야기 나눌래?";

  useEffect(() => {
    // 페이지 로드 시 캐릭터 등장
    const characterTimer = setTimeout(() => {
      setShowCharacter(true);
    }, 500);

    // 캐릭터 등장 후 말풍선 표시
    const bubbleTimer = setTimeout(() => {
      setShowSpeechBubble(true);
    }, 1500);

    return () => {
      clearTimeout(characterTimer);
      clearTimeout(bubbleTimer);
    };
  }, []);

  // 타이핑 효과
  useEffect(() => {
    if (showSpeechBubble && displayedText.length < introText.length) {
      const typingTimer = setTimeout(() => {
        setDisplayedText(introText.slice(0, displayedText.length + 1));
      }, 80); // 타이핑 속도 (ms)
      return () => clearTimeout(typingTimer);
    }
  }, [showSpeechBubble, displayedText, introText]);

return (
    <div className="relative min-h-screen flex items-center justify-start overflow-hidden">
      {/* 1. 배경 이미지 (school.jpg) */}
      <div className="absolute inset-0 -z-10">
        <Image 
          src="/school.jpg" // public 폴더의 학교 배경
          alt="School Background"
          fill // 화면을 꽉 채웁니다
          className="object-cover"
          priority
        />
        {/* 배경을 살짝 어둡게 해서 캐릭터가 돋보이게 합니다 */}
        <div className="absolute inset-0 bg-black/20" /> 
      </div>

      {/* 2. 캐릭터 이미지 (yura.jpg) */}
      <div className={`ml-10 md:ml-20 transition-all duration-1000 ${showCharacter ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'}`}>
        <Image 
          src="/yura.jpg" 
          alt="Character"
          width={450} // 비주얼 노벨 스타일을 위해 조금 더 크게 키웠습니다
          height={650}
          className="drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)]" // 캐릭터 그림자 효과
        />
      </div>

 

      {/* 말풍선 - 캐릭터 오른쪽 */}
      {showSpeechBubble && (
        <div 
          className={`ml-6 md:ml-10 max-w-sm transition-all duration-500 ${
            showSpeechBubble ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          <div className="relative bg-white p-6 rounded-3xl shadow-xl border-2 border-pink-200">
            {/* 말풍선 꼬리 (왼쪽 방향) */}
            <div 
              className="absolute left-[-12px] top-1/2 -translate-y-1/2 
                         border-t-[12px] border-t-transparent 
                         border-r-[16px] border-r-white 
                         border-b-[12px] border-b-transparent"
            />
            <div 
              className="absolute left-[-15px] top-1/2 -translate-y-1/2 
                         border-t-[12px] border-t-transparent 
                         border-r-[16px] border-r-pink-200 
                         border-b-[12px] border-b-transparent
                         -z-10"
            />
            
            {/* 타이핑되는 텍스트 */}
            <p className="text-lg text-gray-800 whitespace-pre-line leading-relaxed min-h-[80px]">
              {displayedText}
              <span className="animate-pulse text-pink-400">|</span>
            </p>
          </div>

          {/* 다음 버튼 - 타이핑 완료 후 표시 */}
          {displayedText.length === introText.length && (
            <button 
              className="mt-4 w-full py-3 bg-gradient-to-r from-pink-400 to-pink-500 
                         text-white rounded-full font-bold text-lg
                         hover:from-pink-500 hover:to-pink-600 
                         transition-all shadow-lg hover:shadow-xl
                         animate-pulse"
            >
              대화 시작하기 💬
            </button>
          )}
        </div>
      )}
    </div>
  );
}
