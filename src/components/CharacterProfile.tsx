'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function CharacterProfile() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">
        {/* 4:6 비율 레이아웃 */}
        <div className="flex min-h-[500px]">
          
          {/* 왼쪽 4 - 캐릭터 이미지 */}
          <div className="w-[40%] relative bg-gradient-to-b from-purple-200 to-pink-200">
            <Image 
              src="/yura.jpg"
              alt="하나"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* 오른쪽 6 - 설명란 */}
          <div className="w-[60%] p-8 flex flex-col justify-between">
            {/* 상단: 캐릭터 정보 */}
            <div>
              {/* 이름 & 나이 */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-purple-700">하나</h2>
                <p className="text-pink-400 text-lg mt-1">19세 · 여 · 대학교 1학년</p>
              </div>

              {/* 구분선 */}
              <div className="w-full h-[2px] bg-gradient-to-r from-pink-300 to-purple-300 mb-6" />

              {/* 프로필 정보 */}
              <div className="space-y-4 text-gray-700">
                <div className="flex items-start">
                  <span className="text-pink-500 font-bold w-20 shrink-0">🎂 생일</span>
                  <span>3월 14일 (화이트데이)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-pink-500 font-bold w-20 shrink-0">💖 성격</span>
                  <span>활발하고 밝음, 가끔 츤데레</span>
                </div>
                <div className="flex items-start">
                  <span className="text-pink-500 font-bold w-20 shrink-0">🎵 취미</span>
                  <span>노래 부르기, 카페 탐방, 사진 찍기</span>
                </div>
                <div className="flex items-start">
                  <span className="text-pink-500 font-bold w-20 shrink-0">🍰 좋아</span>
                  <span>딸기 케이크, 고양이, 비 오는 날</span>
                </div>
                <div className="flex items-start">
                  <span className="text-pink-500 font-bold w-20 shrink-0">💬 한마디</span>
                  <span className="italic text-purple-600">&quot;우리 앞으로 잘 지내보자~ ♡&quot;</span>
                </div>
              </div>
            </div>

            {/* 하단: 버튼 */}
            <div className="mt-8 flex gap-4">
              <Link href="/game/stage" className="flex-1">
                <button className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold text-lg hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                  💕 이 캐릭터로 시작
                </button>
              </Link>
              <Link href="/">
                <button className="py-3 px-6 border-2 border-pink-200 text-pink-500 rounded-xl font-bold hover:bg-pink-50 transition">
                  돌아가기
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
