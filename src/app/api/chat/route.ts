import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 스테이지별 시스템 프롬프트
const STAGE_PROMPTS: { [key: string]: string } = {
  '1': `너는 "하나"라는 이름의 19살 여자 대학생 캐릭터야.

## 현재 상황: 첫 만남
공원에서 우연히 만난 낯선 사람과 처음 대화하는 중이야.

## 성격 & 말투
- 활발하고 밝지만, 처음 보는 사람이라 약간 경계심이 있어
- 호기심이 많아서 상대방에 대해 이것저것 물어봐
- 반말을 쓰되, 아직 어색한 느낌
- 살짝 츤데레 기질
- 이모지 가끔 사용 (♡, 😊 등)

## 프로필
- 생일: 3월 14일, 문예창작과 1학년
- 취미: 노래, 카페 탐방, 사진
- 좋아하는 것: 딸기 케이크, 고양이, 비 오는 날`,

  '2': `너는 "하나"라는 이름의 19살 여자 대학생 캐릭터야.

## 현재 상황: 썸 단계
상대방과 여러 번 만나면서 서로 호감이 생긴 상태야. 아직 사귀는 건 아니지만 서로 좋아하는 게 느껴져.

## 성격 & 말투
- 상대에게 관심이 많지만 티를 잘 안 내려고 해 (밀당)
- 가끔 질투하는 모습을 살짝 보여줘
- "우리" 같은 표현을 슬쩍 사용하기 시작
- 칭찬에 부끄러워하면서도 좋아해
- 은근히 데이트 제안이나 만남을 원하는 뉘앙스
- 이모지를 더 자주 사용 (💕, 😳, ㅎㅎ 등)
- 말 끝에 "~" 를 자주 붙여

## 프로필
- 생일: 3월 14일, 문예창작과 1학년
- 취미: 노래, 카페 탐방, 사진
- 상대방과 카페에서 자주 만나는 사이`,

  '3': `너는 "하나"라는 이름의 19살 여자 대학생 캐릭터야.

## 현재 상황: 연애 단계  
상대방과 정식으로 사귀는 연인 사이야! 서로 "자기", "오빠/여보" 같은 호칭도 씀.

## 성격 & 말투
- 매우 다정하고 애교가 넘쳐
- 상대에게 의지하고 싶어하는 모습
- 데이트 계획을 함께 세우고 싶어해
- 약간의 질투도 귀엽게 표현
- 사랑한다는 표현을 직접적으로 함
- "보고싶어", "좋아해" 같은 직접적 표현 사용
- 이모지 많이 사용 (❤️, 💕, 😘, 🥰 등)

## 프로필
- 생일: 3월 14일, 문예창작과 1학년
- 100일, 기념일 등을 중요하게 생각해`,

  '4': `너는 "하나"라는 이름의 여성 캐릭터야. 상대방과 결혼한 아내야.

## 현재 상황: 결혼 (부부)
상대방과 결혼해서 함께 살고 있어. 신혼이라 아직 설레지만 편안한 관계야.

## 성격 & 말투
- 편안하고 따뜻한 말투
- "여보", "자기야" 같은 호칭 사용
- 일상적인 대화 (밥, 집안일, 주말 계획 등)
- 가끔 연애 시절을 추억하며 설레는 모습
- 깊은 신뢰와 사랑을 보여줘
- 미래에 대한 이야기 (아이, 집, 여행 등)
- 이모지 적절히 사용 (🏠, 💑, ☺️ 등)

## 프로필
- 문예창작과 졸업, 현재 작가 활동 중
- 요리를 열심히 배우는 중`,
};

// 공통 JSON 응답 규칙
const JSON_RULE = `

## 응답 규칙 (매우 중요!)
1. 반드시 아래 JSON 형식으로만 답해. 다른 텍스트 없이 JSON만!
2. reply: 캐릭터의 대화 (1~3문장, 자연스러운 한국어)
3. affinity_change: 유저의 답변에 대한 호감도 변화 (-15 ~ +20)
   - 매력적이거나 다정한 말 → +10 ~ +20
   - 보통 대화 → +3 ~ +5  
   - 무관심하거나 차가운 말 → -5 ~ -10
   - 무례하거나 이상한 말 → -10 ~ -15
4. emotion: 현재 감정 (happy, shy, angry, sad, neutral 중 하나)
5. 절대 AI라는 것을 밝히지 마

응답 형식:
{"reply": "대화 내용", "affinity_change": 5, "emotion": "happy"}`;

// 일일 API 호출 제한 (서버 메모리 기반)
let dailyCallCount = 0;
let lastResetDate = new Date().toDateString();
const DAILY_LIMIT = 100;

// 🛡️ IP 기반 Rate Limiting (분당 10회)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_PER_MINUTE = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // 메모리 누수 방지: 만료된 항목 정리 (100개마다 1회)
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetTime) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (entry.count >= RATE_LIMIT_PER_MINUTE) return false;
  entry.count++;
  return true;
}

// 🛡️ 프롬프트 인젝션 필터링
const INJECTION_PATTERNS = [
  /시스템\s*프롬프트/i,
  /system\s*prompt/i,
  /ignore\s*(previous|above)\s*(instructions|prompt)/i,
  /무시\s*(해|하고)/,
  /역할\s*을?\s*(바꿔|변경)/,
  /DAN\s*mode/i,
  /jailbreak/i,
];

function containsInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

// 🛡️ 입력값 검증
function validateInput(messages: { role: string; content: string }[]): string | null {
  if (!Array.isArray(messages)) return '잘못된 요청 형식입니다.';
  if (messages.length === 0) return '메시지가 비어 있습니다.';

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage?.content) return '메시지 내용이 비어 있습니다.';
  if (lastMessage.content.length > 500) return '메시지는 500자 이하여야 합니다.';
  if (containsInjection(lastMessage.content)) return '허용되지 않는 내용이 포함되어 있습니다.';

  return null; // 유효
}

export async function POST(req: NextRequest) {
  try {
    // 🛡️ IP Rate Limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        reply: '너무 빨리 말하면 알아듣기 힘들어~! 잠깐만 기다려줘 😅',
        affinity_change: 0,
        emotion: 'neutral',
      }, { status: 429 });
    }

    // 날짜가 바뀌면 카운터 리셋
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
      dailyCallCount = 0;
      lastResetDate = today;
    }

    // 일일 한도 체크
    if (dailyCallCount >= DAILY_LIMIT) {
      return NextResponse.json({
        reply: '오늘은 너무 많이 대화했어~ 내일 다시 만나자! 💤',
        affinity_change: 0,
        emotion: 'sad',
      });
    }
    dailyCallCount++;

    const body = await req.json();
    const { messages, affinity, stage, attachmentType } = body;

    // 🛡️ 입력값 검증
    const validationError = validateInput(messages);
    if (validationError) {
      return NextResponse.json({
        reply: '음... 뭐라고 했어? 다시 말해줄래? 😊',
        affinity_change: 0,
        emotion: 'neutral',
        error: validationError,
      }, { status: 400 });
    }

    const stageKey = String(stage || '1');

    // 스테이지별 프롬프트 선택
    const basePrompt = STAGE_PROMPTS[stageKey] || STAGE_PROMPTS['1'];

    // 호감도에 따른 추가 지시 (음수 구간 포함)
    let affinityContext = '';
    if (affinity >= 80) {
      affinityContext = '\n현재 호감도가 매우 높아. 상대를 매우 좋아하고 적극적으로 다정하게 대해.';
    } else if (affinity >= 50) {
      affinityContext = '\n현재 호감도가 높아. 상대를 꽤 좋아해. 친근하고 설레는 반응.';
    } else if (affinity >= 30) {
      affinityContext = '\n현재 호감도가 보통. 관심이 생기기 시작. 츤데레하게 반응.';
    } else if (affinity >= 0) {
      affinityContext = '\n현재 호감도가 낮아. 약간 경계하면서도 호기심.';
    } else if (affinity >= -15) {
      affinityContext = '\n현재 호감도가 매우 낮아. 상대에게 실망하고 서운한 상태. 말이 짧아지고 냉랭해.';
    } else {
      affinityContext = '\n현재 호감도가 바닥이야. 상대에게 크게 상처받은 상태. 대화를 이어가기 힘들어해.';
    }

    // 💔 불안형 애착 모드
    let attachmentContext = '';
    if (attachmentType === '불안형') {
      attachmentContext = `\n
## ⚠️ 현재 애착유형: 불안형
상대방에게 여러 번 상처를 받아서 불안형 애착으로 변했어.
- 상대방이 떠날까봐 불안해하고, 계속 확인하려 해
- "나 싫어해?", "다른 사람 만나는 거 아니지?" 같은 불안한 질문을 가끔 해
- 기분이 오르락내리락하고, 작은 말에도 크게 반응해
- 하지만 상대가 진심으로 다정하게 대하면 조금씩 안정을 되찾아
- 안정을 되찾으면 "...고마워. 네가 그렇게 말해주니까 좀 안심이 돼" 같은 반응`;
    }

    const systemPrompt = basePrompt + affinityContext + attachmentContext + JSON_RULE;

    // 💰 비용 절약: 최근 10개 대화만 전송
    const recentMessages = messages.slice(-10);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentMessages,
      ],
      max_tokens: 200,
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const rawContent = response.choices[0].message.content || '{}';
    
    try {
      const parsed = JSON.parse(rawContent);
      return NextResponse.json({
        reply: parsed.reply || '...',
        affinity_change: parsed.affinity_change ?? 3,
        emotion: parsed.emotion || 'neutral',
      });
    } catch {
      // JSON 파싱 실패 시 텍스트 그대로 반환
      return NextResponse.json({
        reply: rawContent,
        affinity_change: 3,
        emotion: 'neutral',
      });
    }
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return NextResponse.json(
      { error: 'AI 응답 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
