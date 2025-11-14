import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Volume2, CreditCard, Smartphone, Award, Clock, ShoppingCart, X, Check, Bot, Home, Package, Utensils, Zap, QrCode, LogOut, XCircle, ChevronsRight, Loader2, VolumeX, Volume1 } from 'lucide-react';

// --- Gemini API 설정 ---
const GEMINI_API_KEY = ""; // 캔버스 환경에서 자동으로 제공됩니다.
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
// --- Gemini API 설정 끝 ---

// --- Audio Settings ---
const BEEP_FREQUENCY = 440; // Hz
const CLICK_DURATION = 0.05; // seconds

// 재시도 로직을 포함한 fetch 헬퍼 함수
const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                if (response.status === 429 && i < retries - 1) {
                    const delay = Math.pow(2, i) * 1000;
                    // console.log(`Rate limit exceeded, retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
        }
    }
};

// 모바일 간편결제 옵션
const SIMPLE_PAY_OPTIONS = [
    { id: 'samsung-pay', name: '삼성페이', icon: '📱' },
    { id: 'naver-pay', name: '네이버페이', icon: '💚' },
    { id: 'apple-pay', name: '애플페이', icon: '' },
    { id: 'lpay', name: 'L.Pay', icon: '🔵' },
];

// 멤버십 할인 옵션
const MEMBERSHIP_OPTIONS = [
    { id: 't-membership', name: 'T-멤버십', discount: 2000 },
    { id: 'kt-membership', name: 'KT-멤버십', discount: 1500 },
    { id: 'c-point', name: '카드 포인트', discount: 1000 },
];

// 난이도 설정
const DIFFICULTY_SETTINGS = {
  easy: { name: "초보", count: 6, time: 50 },
  medium: { name: "중수", count: 8, time: 40 },
  hard: { name: "마스터", count: 10, time: 30 },
};

// 결제 수단 정의 (ID 기반으로 이름을 찾기 위함)
const PAYMENT_METHODS_DATA = [
  { id: 'card', name: '신용카드', icon: '💳', desc: '신용/체크카드' },
  { id: 'samsung', name: '모바일 간편결제', icon: '📱', desc: '삼성/네이버 등 간편결제' }, 
  { id: 'kakao', name: '큐알 결제', icon: '💛', desc: '카카오/지역 화폐 QR' },
  // { id: 'zeropay', name: '지역 상품권', icon: '0️⃣', desc: '제로페이/지역사랑상품권' }, // 요청에 따라 제거
  { id: 'membership', name: '멤버십 할인', icon: '⭐', desc: 'M포인트 및 쿠폰' },
];

const getPaymentNameById = (id) => PAYMENT_METHODS_DATA.find(m => m.id === id)?.name || id;

// --- 고객 데이터 (총 15명) ---
const ALL_CUSTOMERS_DATA = [
    // 15명의 고객 시나리오 정의 (중략)
    {
      id: 1, customer: '할머니', icon: '👵',
      requirement: `큰 글씨 모드로 시그니처 한우 버거 세트를 주문해주세요 (단, 웨지 감자와 탄산음료는 L 사이즈 필수, 선호 결제: ${getPaymentNameById('card')})`,
      correctMode: 'elderly', targetOrder: ['시그니처 한우 버거 세트'], 
      budget: 12000, story: '할머니가 손자와 함께 드실 세트 메뉴를 주문하러 오셨어요. 양이 많은 L 사이즈로 바꾸셔야 해요!',
      preferredPayment: 'card', preferredDining: 'in', // 매장 식사 선호
    },
    {
      id: 2, customer: '직장인', icon: '👔',
      requirement: `일반 모드로 클래식 비프 버거 세트를 빠르게 주문하고 순살 너겟(6조각)을 추가해주세요. (포장, 선호 결제: ${getPaymentNameById('samsung')})`,
      correctMode: 'normal', targetOrder: ['클래식 비프 버거 세트', '순살 너겟(6조각)'],
      budget: 15000, story: '점심시간이 짧은 직장인이 서둘러 주문하러 왔어요. 세트에 너겟을 추가하고 포장해야 합니다.',
      preferredPayment: 'samsung', preferredDining: 'out', // 포장 선호
    },
    {
      id: 3, customer: '시각장애인', icon: '🦯',
      requirement: `음성 안내로 아이스 블랙커피와 사과 파이를 주문해주세요 (매장 식사, 선호 결제: ${getPaymentNameById('card')})`,
      correctMode: 'voice', targetOrder: ['아이스 블랙커피', '사과 파이'],
      budget: 7000, story: '시각장애가 있는 손님이 음성 안내가 필요해요.',
      preferredPayment: 'card', preferredDining: 'in', 
    },
    {
      id: 4, customer: '외국인', icon: '🌍',
      requirement: `큰 글씨로 어린이 행복 세트와 저지방 우유를 주문해주세요 (포장, 선호 결제: ${getPaymentNameById('samsung')})`,
      correctMode: 'elderly', targetOrder: ['어린이 행복 세트', '저지방 우유'], 
      budget: 8000, story: '한국어가 서툰 외국인이 어린이 메뉴를 찾고 있어요.',
      preferredPayment: 'samsung', preferredDining: 'out', 
    },
    {
      id: 5, customer: '단골손님', icon: '⭐',
      requirement: `음성 안내로 더블 패티 버거 세트를 주문하고 모짜렐라 스틱과 오레오 아이스크림을 추가해주세요 (매장 식사, 선호 결제: ${getPaymentNameById('membership')})`,
      correctMode: 'voice', targetOrder: ['더블 패티 버거 세트', '모짜렐라 스틱', '오레오 아이스크림'],
      budget: 20000, story: '단골 손님이 멤버십 혜택을 받으려고 해요.',
      preferredPayment: 'membership', preferredDining: 'in', 
    },
    {
      id: 6, customer: '운동선수', icon: '🏃',
      requirement: `일반 모드로 더블 패티 버거 단품, 순살 너겟(10조각), 생수, 코울슬로 샐러드를 주문해주세요 (매장 식사, 선호 결제: ${getPaymentNameById('card')})`,
      correctMode: 'normal', targetOrder: ['더블 패티 버거', '순살 너겟(10조각)', '생수', '코울슬로 샐러드'], 
      budget: 22000, story: '운동 후 단백질 위주로 주문하러 왔어요.',
      preferredPayment: 'card', preferredDining: 'in', 
    },
    {
      id: 7, customer: '알뜰 주부', icon: '🛍️',
      requirement: `큰 글씨로 아침 콤보 버거 세트를 주문해주세요 (포장, 선호 결제: ${getPaymentNameById('kakao')})`, // 선호 결제를 QR(kakao)로 변경
      correctMode: 'elderly', targetOrder: ['아침 콤보 버거 세트'], 
      budget: 6000, story: '오전에 저렴한 아침 세트를 포장하러 왔어요. 지역 상품권 결제를 선호해요.',
      preferredPayment: 'kakao', preferredDining: 'out', 
    },
    {
      id: 8, customer: '청소년', icon: '🧑‍🤝‍🧑',
      requirement: `일반 모드로 미니 치즈 버거 3개와 탄산음료(L) 3개를 주문해주세요 (매장 식사, 선호 결제: ${getPaymentNameById('kakao')})`,
      correctMode: 'normal', targetOrder: ['미니 치즈 버거', '미니 치즈 버거', '미니 치즈 버거', '탄산음료(L)', '탄산음료(L)', '탄산음료(L)'], 
      budget: 25000, story: '친구들과 나눠 먹을 버거와 음료를 대량 주문해요.',
      preferredPayment: 'kakao', preferredDining: 'in', 
    },
    {
      id: 9, customer: '유모차 손님', icon: '👶',
      requirement: `큰 글씨로 통새우 버거 세트를 주문해주세요 (단, 아이 때문에 매장 식사 필수, 선호 결제: ${getPaymentNameById('card')})`,
      correctMode: 'elderly', targetOrder: ['통새우 버거 세트'], 
      budget: 10000, story: '아이와 함께 매장에서 식사할 예정입니다.',
      preferredPayment: 'card', preferredDining: 'in', 
    },
    {
      id: 10, customer: '야근 직장인', icon: '🌙',
      requirement: `음성 안내로 트리플 치즈 버거 단품과 아이스 블랙커피, 초코 케이크를 주문해주세요 (포장, 선호 결제: ${getPaymentNameById('samsung')})`,
      correctMode: 'voice', targetOrder: ['트리플 치즈 버거', '아이스 블랙커피', '초코 케이크'], 
      budget: 16000, story: '야근 중이라 야식과 커피를 포장해야 합니다.',
      preferredPayment: 'samsung', preferredDining: 'out', 
    },
    {
      id: 11, customer: '배달원', icon: '🏍️',
      requirement: `일반 모드로 달콤 불고기 버거와 웨지 감자(M)를 빠르게 주문해주세요 (포장, 선호 결제: ${getPaymentNameById('samsung')})`,
      correctMode: 'normal', targetOrder: ['달콤 불고기 버거', '웨지 감자(M)'], 
      budget: 8000, story: '빠르게 주문해서 다시 배달을 가야 해요.',
      preferredPayment: 'samsung', preferredDining: 'out', 
    },
    {
      id: 12, customer: '민감 손님', icon: '😠',
      requirement: `음성 안내로 시그니처 한우 버거 단품을 주문해주세요 (추가 옵션 변경은 하지 마세요, 선호 결제: ${getPaymentNameById('card')})`,
      correctMode: 'voice', targetOrder: ['시그니처 한우 버거'], 
      budget: 10000, story: '정해진 메뉴 외에 복잡한 옵션 변경을 원하지 않아요.',
      preferredPayment: 'card', preferredDining: 'in', 
    },
    {
      id: 13, customer: '학생 커플', icon: '👩‍❤️‍👨',
      requirement: `일반 모드로 매콤 치킨 버거 세트와 오레오 아이스크림을 주문해주세요 (매장 식사, 선호 결제: ${getPaymentNameById('kakao')})`,
      correctMode: 'normal', targetOrder: ['매콤 치킨 버거 세트', '오레오 아이스크림'], 
      budget: 15000, story: '데이트 중 간단히 식사하고 디저트를 추가해요.',
      preferredPayment: 'kakao', preferredDining: 'in', 
    },
    {
      id: 14, customer: '커피 애호가', icon: '☕',
      requirement: `음성 안내로 카페 라떼와 사과 파이를 주문해주세요 (포장, 선호 결제: ${getPaymentNameById('membership')})`,
      correctMode: 'voice', targetOrder: ['카페 라떼', '사과 파이'], 
      budget: 8500, story: '멤버십 할인을 받아 커피와 디저트를 포장하려 해요.',
      preferredPayment: 'membership', preferredDining: 'out', 
    },
    {
      id: 15, customer: '등산객', icon: '⛰️',
      requirement: `큰 글씨로 생수 2개와 해시 포테이토 2개를 주문해주세요 (포장, 선호 결제: ${getPaymentNameById('kakao')})`, // 선호 결제를 QR(kakao)로 변경
      correctMode: 'elderly', targetOrder: ['생수', '생수', '해시 포테이토', '해시 포테이토'], 
      budget: 10000, story: '등산 후 갈증 해소와 간편한 간식이 필요해요.',
      preferredPayment: 'kakao', preferredDining: 'out', 
    },
];

// Fisher-Yates shuffle
const shuffle = (array) => {
    let currentIndex = array.length, randomIndex;
    let newArray = [...array];
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [newArray[currentIndex], newArray[randomIndex]] = [
        newArray[randomIndex], newArray[currentIndex]
      ];
    }
    return newArray;
};

// 메뉴 데이터 (중략)
const setMenuItems = [
    { id: 26, name: '시그니처 한우 버거 세트', price: 9000, emoji: '🍔🍟🥤', desc: '한우 패티 시그니처', isSet: true, components: { side: '웨지 감자(M)', drink: '탄산음료(M)' } },
    { id: 27, name: '매콤 치킨 버거 세트', price: 9500, emoji: '🍔🍟🥤', desc: '매콤한 통살 치킨', isSet: true, components: { side: '웨지 감자(M)', drink: '탄산음료(M)' } },
    { id: 28, name: '클래식 비프 버거 세트', price: 8800, emoji: '🍔🍟🥤', desc: '옛날식 수제 패티', isSet: true, components: { side: '웨지 감자(M)', drink: '탄산음료(M)' } },
    { id: 29, name: '더블 패티 버거 세트', price: 9400, emoji: '🍔🍟🥤', desc: '패티 2장, 볼륨 만점', isSet: true, components: { side: '웨지 감자(M)', drink: '탄산음료(M)' } },
    { id: 30, name: '어린이 행복 세트', price: 4800, emoji: '🎁', desc: '장난감 포함 어린이용', isSet: true, components: { side: '해시 포테이토', drink: '저지방 우유' } },
    { id: 31, name: '불고기 특선 버거 세트', price: 8000, emoji: '🍔🍟🥤', desc: '달콤한 불고기 맛', isSet: true, components: { side: '웨지 감자(M)', drink: '탄산음료(M)' } },
    { id: 32, name: '통새우 버거 세트', price: 9200, emoji: '🍤🍟🥤', desc: '바삭한 통새우 패티', isSet: true, components: { side: '웨지 감자(M)', drink: '탄산음료(M)' } },
    { id: 33, name: '트리플 치즈 버거 세트', price: 9900, emoji: '🧀🍟🥤', desc: '치즈 3장, 풍부한 맛', isSet: true, components: { side: '웨지 감자(M)', drink: '탄산음료(M)' } },
    { id: 34, name: '아침 콤보 버거 세트', price: 5500, emoji: '🍳🥤', desc: '에그 머핀과 커피', isSet: true, components: { side: '해시 포테이토', drink: '아이스 블랙커피' } },
];

const menuItems = {
    set: setMenuItems,
    burger: [
      { id: 1, name: '시그니처 한우 버거', price: 6500, emoji: '🍔', desc: '한우 패티, 풍성한 야채' },
      { id: 2, name: '매콤 치킨 버거', price: 7000, emoji: '🍔', desc: '바삭하고 매운 치킨' },
      { id: 3, name: '클래식 비프 버거', price: 8500, emoji: '🍔', desc: '프리미엄 수제 스타일' },
      { id: 4, name: '더블 패티 버거', price: 9000, emoji: '🍔', desc: '고기 맛이 두 배' },
      { id: 5, name: '스파이시 치킨 버거', price: 6000, emoji: '🍗', desc: '매콤한 닭가슴살' },
      { id: 6, name: '달콤 불고기 버거', price: 4500, emoji: '🍔', desc: '한국인 선호 소스' },
      { id: 7, name: '미니 치즈 버거', price: 4000, emoji: '🧀', desc: '작은 사이즈 치즈 버거' },
      { id: 35, name: '통새우 버거', price: 7500, emoji: '🍤', desc: '통새우살이 씹히는' }, 
      { id: 36, name: '트리플 치즈 버거', price: 8800, emoji: '🧀', desc: '진한 체다와 모짜렐라' }, 
      { id: 37, name: '에그 불고기 버거', price: 5200, emoji: '🍔🍳', desc: '계란 토핑 추가' }, 
      { id: 38, name: '베이컨 토마토 버거', price: 8200, emoji: '🥓🍅', desc: '베이컨과 토마토의 조화' }, 
      { id: 39, name: '순살 치킨 버거', price: 5800, emoji: '🍗', desc: '담백한 순살 패티' }, 
      { id: 55, name: '트러플 머쉬룸 버거', price: 9500, emoji: '🍄', desc: '트러플 향 버섯 풍미' },
      { id: 56, name: '하와이안 버거', price: 8700, emoji: '🍍', desc: '파인애플 추가' },
      { id: 57, name: '치킨 스낵랩', price: 3500, emoji: '🌯', desc: '간단한 스낵' },
    ],
    side: [
      { id: 8, name: '웨지 감자(L)', price: 2800, emoji: '🍟', desc: '라지 사이즈' },
      { id: 9, name: '웨지 감자(M)', price: 2300, emoji: '🍟', desc: '미디엄 사이즈' },
      { id: 10, name: '순살 너겟(6조각)', price: 3500, emoji: '🍗', desc: '바삭한 치킨 너겟' },
      { id: 11, name: '순살 너겟(10조각)', price: 5200, emoji: '🍗', desc: '넉넉한 10조각' },
      { id: 12, name: '모짜렐라 스틱', price: 2500, emoji: '🧀', desc: '고소한 치즈' },
      { id: 13, name: '치킨 윙(4조각)', price: 3800, emoji: '🍗', desc: '매콤한 닭 날개' },
      { id: 14, name: '해시 포테이토', price: 1800, emoji: '🥔', desc: '바삭한 감자 해시' },
      { id: 40, name: '양파링 튀김', price: 3000, emoji: '🧅', desc: '바삭한 양파 튀김' }, 
      { id: 41, name: '코울슬로 샐러드', price: 3500, emoji: '🥗', desc: '신선한 양배추 샐러드' }, 
      { id: 42, name: '미니 샐러드', price: 3200, emoji: '🥗', desc: '가볍게 즐기는 샐러드' }, 
      { id: 43, name: '고구마 튀김', price: 2700, emoji: '🍠', desc: '달콤한 고구마' }, 
      { id: 44, name: '콘 샐러드', price: 2900, emoji: '🌽', desc: '옥수수 콘 샐러드' }, 
      { id: 58, name: '프리미엄 샐러드', price: 5500, emoji: '🥗', desc: '닭가슴살 추가' },
      { id: 59, name: '치즈 소스', price: 800, emoji: '🧀', desc: '딥 소스' },
      { id: 60, name: '스위트 칠리 소스', price: 700, emoji: '🌶️', desc: '딥 소스' },
    ],
    drink: [
      { id: 15, name: '탄산음료(L)', price: 2300, emoji: '🥤', desc: '코크 L 사이즈' },
      { id: 16, name: '탄산음료(M)', price: 1800, emoji: '🥤', desc: '코크 M 사이즈' },
      { id: 17, name: '사이다(L)', price: 2300, emoji: '🥤', desc: '스프라이트 L 사이즈' },
      { id: 18, name: '사이다(M)', price: 1800, emoji: '🥤', desc: '스프라이트 M 사이즈' },
      { id: 19, name: '저지방 우유', price: 1500, emoji: '🥛', desc: '흰 우유' },
      { id: 20, name: '아이스 블랙커피', price: 2500, emoji: '☕', desc: '맥카페 아메리카노' },
      { id: 21, name: '카페 라떼', price: 3000, emoji: '☕', desc: '우유 들어간 커피' },
      { id: 45, name: '환타 오렌지', price: 2000, emoji: '🍊', desc: '상큼한 오렌지 탄산' }, 
      { id: 46, name: '아이스 초코', price: 3200, emoji: '🍫', desc: '시원한 초콜릿 음료' }, 
      { id: 47, name: '레모네이드', price: 3500, emoji: '🍋', desc: '상큼 달콤 레몬' }, 
      { id: 48, name: '따뜻한 우유', price: 1500, emoji: '🥛', desc: '따뜻하게 데운 우유' }, 
      { id: 49, name: '생수', price: 1200, emoji: '💧', desc: '시원한 생수' }, 
      { id: 61, name: '핫초코', price: 3000, emoji: '☕', desc: '따뜻한 초콜릿' },
      { id: 62, name: '오렌지 주스', price: 3500, emoji: '🍊', desc: '착즙 주스' },
      { id: 63, name: '아메리카노(L)', price: 3000, emoji: '☕', desc: '블랙커피 L' },
    ],
    dessert: [
      { id: 22, name: '오레오 아이스크림', price: 3500, emoji: '🍦', desc: '오레오 토핑' },
      { id: 23, name: '초콜릿 선데', price: 2200, emoji: '🍦', desc: '초코 시럽' },
      { id: 24, name: '사과 파이', price: 1800, emoji: '🥧', desc: '따뜻한 사과 필링' },
      { id: 25, name: '에그 머핀', price: 3800, emoji: '🍳', desc: '아침 전용 메뉴' },
      { id: 50, name: '소프트콘', price: 1500, emoji: '🍦', desc: '기본 소프트 아이스크림' }, 
      { id: 51, name: '딸기 선데', price: 2500, emoji: '🍓', desc: '딸기 시럽' }, 
      { id: 52, name: '초코 케이크', price: 4000, emoji: '🍰', desc: '미니 초코 케이크' }, 
      { id: 53, name: '슈크림 콤보', price: 2800, emoji: '🥐', desc: '슈크림 디저트' }, 
      { id: 54, name: '마카롱 (3개)', price: 5000, emoji: '🍬', desc: '3가지 맛 마카롱' }, 
      { id: 64, name: '쿠키 (2개)', price: 2500, emoji: '🍪', desc: '초코칩 쿠키' },
      { id: 65, name: '브라우니', price: 3800, emoji: '🍫', desc: '진한 초코' },
      { id: 66, name: '바닐라 쉐이크', price: 4500, emoji: '🥤', desc: '진한 바닐라 쉐이크' },
    ]
};


// 메인 컴포넌트 이름은 App으로 변경합니다.
const App = () => {
  // intro, difficulty_select, start, ordering, upsize, membership, payment, result, final_result
  const [gameState, setGameState] = useState('intro');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(null); // 'easy', 'medium', 'hard'
  const [customerQueue, setCustomerQueue] = useState([]); // Array of customer IDs
  const [accessibilityMode, setAccessibilityMode] = useState('normal');
  const [diningOption, setDiningOption] = useState(''); // 'in' or 'out'
  const [cart, setCart] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60); 
  const [activeTab, setActiveTab] = useState('set'); 
  
  const [showUpsizePrompt, setShowUpsizePrompt] = useState(false); 
  const [upgradableItems, setUpgradableItems] = useState([]);
  
  const [showMembershipOptions, setShowMembershipOptions] = useState(false);
  const [showCardInsertionPrompt, setShowCardInsertionPrompt] = useState(false); 
  const [showSimplePayOptions, setShowSimplePayOptions] = useState(false); 
  const [showQrCodePrompt, setShowQrCodePrompt] = useState(false);       
  const [selectedSimplePay, setSelectedSimplePay] = useState('');         

  const [discountApplied, setDiscountApplied] = useState(0);
  
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  
  // 게임 중단 확인 팝업
  const [showExitConfirm, setShowExitConfirm] = useState(false); 
  
  // Gemini AI Critique
  const [isCritiquing, setIsCritiquing] = useState(false);
  const [critiqueText, setCritiqueText] = useState('');
  const [showCritiqueModal, setShowCritiqueModal] = useState(false);
  
  // 주문번호 (4자리 랜덤)
  const [orderNumber, setOrderNumber] = useState(0);
  
  // M -> L 업사이징 비용
  const UPSIZE_COST = 500; 
  
  // Audio state
  // isBgmPlaying -> isClickSoundEnabled
  const [isClickSoundEnabled, setIsClickSoundEnabled] = useState(true);
  const [isAudioContextResumed, setIsAudioContextResumed] = useState(false);
  
  // BGM 관련 상태 제거 (bgm, synth)

  // --- Audio Setup (Web Audio API for click sounds) ---
  const audioContext = useMemo(() => {
    // Check for existence of AudioContext and safe instantiation
    return window.AudioContext ? new window.AudioContext() : null;
  }, []);

  const playClickSound = useCallback(async (frequency = BEEP_FREQUENCY) => {
    if (!isClickSoundEnabled || !audioContext) return;
    
    // Resume context on first user interaction if suspended
    if (audioContext.state === 'suspended') {
        try {
            await audioContext.resume();
            setIsAudioContextResumed(true);
        } catch (e) {
            console.warn("AudioContext resume failed:", e);
            return;
        }
    }

    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + CLICK_DURATION);
        oscillator.stop(audioContext.currentTime + CLICK_DURATION);
    } catch (e) {
        console.warn("Could not play click sound:", e);
    }
  }, [audioContext, isClickSoundEnabled]);

  const toggleClickSound = useCallback(async () => {
    // 터치음 토글 (AudioContext resume logic included)
    if (!isClickSoundEnabled && audioContext && audioContext.state === 'suspended') {
        try {
            await audioContext.resume();
            setIsAudioContextResumed(true);
        } catch (e) {
            console.warn("AudioContext resume failed on toggle:", e);
        }
    }
    setIsClickSoundEnabled(prev => !prev);
    if (isClickSoundEnabled) {
         window.speechSynthesis.cancel(); // TTS 중지
    }
  }, [audioContext, isClickSoundEnabled]);

  useEffect(() => {
    // Cleanup function for audio context
    return () => {
        // BGM 관련 코드는 이미 제거됨
        if (audioContext && audioContext.state !== 'closed' && audioContext.state !== 'suspended') {
            audioContext.close();
        }
    };
  }, [audioContext]);

  // --- Constants and Derived State ---
  const currentCustomer = useMemo(() => {
    return customerQueue[currentLevel]
        ? ALL_CUSTOMERS_DATA.find(c => c.id === customerQueue[currentLevel])
        : null;
  }, [customerQueue, currentLevel]);

  const currentSettings = difficulty ? DIFFICULTY_SETTINGS[difficulty] : null;

  const getPaymentNameById = useCallback((id) => PAYMENT_METHODS_DATA.find(m => m.id === id)?.name || id, []);

  // M 사이즈 업그레이드 대상인지 확인하는 헬퍼 함수
  const isUpgradableMItem = (item) => {
      // (M) 접미사가 있고, 세트가 아니며, 아직 업그레이드되지 않은 단품 항목
      return (
          item.name.includes('(M)') && 
          !item.isSet &&
          !item.isUpgraded &&
          (item.name.includes('탄산음료') || item.name.includes('사이다') || item.name.includes('웨지 감자'))
      );
  }

  // TTS 함수 (Audio Context resume logic added for TTS)
  const speak = useCallback(async (text) => {
    if ('speechSynthesis' in window && accessibilityMode === 'voice') {
      if (audioContext && audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
            setIsAudioContextResumed(true);
          } catch (e) {
            console.warn("TTS AudioContext resume failed:", e);
          }
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = accessibilityMode === 'elderly' ? 0.7 : 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [accessibilityMode, audioContext]);
  
  // 게임 중단 처리
  const handleExitGame = (confirm) => {
    if (confirm) {
      // BGM 제거로 인해 bgm.stop() 제거
      setGameState('intro');
    }
    setShowExitConfirm(false);
  }

  // 타이머
  useEffect(() => {
    if (gameState === 'ordering' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'ordering') {
      handleTimeout();
    }
  }, [timeLeft, gameState]);

  // 탭 변경시 음성 안내
  useEffect(() => {
    if (accessibilityMode === 'voice' && gameState === 'ordering') {
      const tabNames = {
        set: '세트 메뉴', 
        burger: '버거 메뉴',
        side: '사이드 메뉴',
        drink: '음료 메뉴',
        dessert: '디저트 메뉴'
      };
      speak(`${tabNames[activeTab]} 화면입니다.`);
    }
  }, [activeTab, speak]);

  // --- Game Flow Handlers ---

  const startGame = () => {
    playClickSound(); // 터치음 추가
    // 인트로 -> 난이도 선택
    setGameState('difficulty_select'); 
  };
  
  const setupGame = useCallback((level) => {
    playClickSound(); // 터치음 추가
    const settings = DIFFICULTY_SETTINGS[level];
    setDifficulty(level);
    
    // Create a pool of customer IDs
    const allCustomerIds = ALL_CUSTOMERS_DATA.map(c => c.id);
    
    // Shuffle and pick the required count
    const shuffledIds = shuffle(allCustomerIds);
    const selectedQueue = shuffledIds.slice(0, settings.count);
    
    setCustomerQueue(selectedQueue);
    setCurrentLevel(0);
    setScore(0);
    setGameState('start'); // Jump to the meal/mode selection start state
    setTimeLeft(settings.time); // Set time dynamically
    setCart([]);
    setAccessibilityMode('normal');
    setDiningOption('');
    setDiscountApplied(0); 
    setPaymentMethod(''); 
    setSelectedSimplePay('');
    setActiveTab('set');

    if (accessibilityMode === 'voice') {
      speak(`${settings.name} 난이도가 시작됩니다. 총 고객 수 ${settings.count}명, 각 주문 제한 시간 ${settings.time}초입니다.`);
    } else {
        // console.log(`${settings.name} 난이도 시작: ${settings.count}명, ${settings.time}초`);
    }
  }, [accessibilityMode, speak, playClickSound]);

  
  const startOrdering = (option) => {
    playClickSound(); // 터치음 추가
    setDiningOption(option);
    // 2단계: 메뉴 선택 및 장바구니 담기 (Ordering)
    setGameState('ordering');
    if (accessibilityMode === 'voice') {
        speak(`${option === 'in' ? '매장 식사' : '포장'}을 선택하셨습니다. 이제 메뉴를 선택해주세요.`);
    }
  }

  // 피드백 후 다음 레벨로 넘어가는 함수
  const proceedNext = () => {
    playClickSound(); // 터치음 추가
    setShowFeedback(false);
    
    if (currentLevel < customerQueue.length - 1) {
      setCurrentLevel(currentLevel + 1);
      
      // Reset states for the new customer
      setTimeLeft(DIFFICULTY_SETTINGS[difficulty].time); 
      setCart([]);
      setAccessibilityMode('normal');
      setDiningOption('');
      setActiveTab('set');
      setDiscountApplied(0); 
      setPaymentMethod(''); 
      setShowCardInsertionPrompt(false); 
      setShowSimplePayOptions(false);
      setShowQrCodePrompt(false);
      setSelectedSimplePay('');

      // 다음 레벨의 1단계로 이동
      setGameState('start'); 
      if (accessibilityMode === 'voice') {
          speak(`다음 고객을 맞이합니다. 제한 시간은 ${DIFFICULTY_SETTINGS[difficulty].time}초입니다.`);
      }
    } else if (currentLevel === customerQueue.length - 1) {
      // 최종 결과 화면으로 이동
      setGameState('final_result');
    }
  };

  // 최종 결과 화면에서 다시 시작
  const restartGame = () => {
      playClickSound(); // 터치음 추가
      setGameState('intro');
  }

  const handleModeChange = (mode) => {
    playClickSound(); // 터치음 추가
    setAccessibilityMode(mode);
    
    if (mode === 'voice') {
      speak(`음성 안내 모드가 활성화되었습니다. 현재 단계는 ${gameState === 'start' ? '식사 장소 선택' : '메뉴 선택'}입니다.`);
    } else if (mode === 'elderly') {
      speak('큰 글씨 모드가 활성화되었습니다.');
    } else {
      speak('일반 모드로 전환되었습니다.');
    }
  };

  const addToCart = (item) => {
    playClickSound(BEEP_FREQUENCY + 100); // 터치음 추가 (높은 톤)
    const itemToAdd = item.isSet
        ? { 
            ...item, 
            sideSize: item.components.side.includes('(M)') ? 'M' : 'S', 
            drinkSize: item.components.drink.includes('(M)') ? 'M' : 'S',
            sideUpgraded: false, // 업그레이드 초기 상태
            drinkUpgraded: false, // 업그레이드 초기 상태
          } 
        : isUpgradableMItem(item) 
            ? { ...item, isUpgradable: true, isUpgraded: false, upsizeTo: item.name.replace('(M)', '(L)') } 
            : item;

    const newCart = [...cart, itemToAdd];
    setCart(newCart);
    
    // finalPrice는 useMemo로 계산되므로, 현재는 할인 미적용 상태의 가격을 말합니다.
    const currentPrice = newCart.reduce((sum, item) => sum + item.price, 0);
    
    if (accessibilityMode === 'voice') {
      speak(`${item.name}이 장바구니에 추가되었습니다. 가격은 ${item.price.toLocaleString()}원입니다. 현재 주문 금액은 ${currentPrice.toLocaleString()}원입니다.`);
    }
  };

  const removeFromCart = (index) => {
    playClickSound(BEEP_FREQUENCY - 100); // 터치음 추가 (낮은 톤)
    const item = cart[index];
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    
    if (accessibilityMode === 'voice') {
      speak(`${item.name}이 삭제되었습니다.`);
    }
  };

  const fetchAccessibilityCritique = async () => {
    playClickSound(); // 터치음 추가
    if (isCritiquing) return;
    
    // levels 배열을 직접 참조
    const level = currentCustomer; // use currentCustomer (memoized)
    if (!level) return;

    setIsCritiquing(true);
    setCritiqueText("AI가 현재 상황을 분석 중입니다..."); // Loading message
    setShowCritiqueModal(true);

    const dining = diningOption === 'in' ? '매장 식사' : '포장';
    const orderedItems = cart.map(item => item.name).join(', ') || '장바구니가 비어 있음';

    const systemPrompt = `Act as a specialized UX/Accessibility consultant for digital kiosks. Your task is to provide a brief, objective analysis (in Korean, max 50 words) on whether the current order process (Mode and Dining option) is appropriate for the customer's needs, and suggest one practical improvement or a positive observation regarding the current steps taken. Focus strictly on the accessibility aspect.`;
    
    const userQuery = `Current Customer: ${level.customer} (${level.icon}). Requirement: ${level.requirement}. Selected Mode: ${accessibilityMode}. Selected Dining Option: ${dining}. Current Cart: ${orderedItems}. Analyze the order flow's accessibility and provide critique.`;
    
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        tools: [{ "google_search": {} }], 
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
        const response = await fetchWithRetry(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "분석 결과를 받아오지 못했습니다.";
        
        setCritiqueText(text);

    } catch (error) {
        console.error("Gemini API Error:", error);
        setCritiqueText("AI 분석 중 오류가 발생했습니다. (API 호출 실패)");
    } finally {
        setIsCritiquing(false);
    }
  };


  const proceedToUpsizePrompt = () => {
    playClickSound(); // 터치음 추가
    if (cart.length === 0) {
      setFeedbackMessage('메뉴를 선택해주세요!');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 1500);
      return;
    }
    
    // 3단계: 주문 확인 및 결제 (Upsize Prompt)
    setGameState('upsize');

    // 업그레이드 대상 항목만 필터링하고 새로운 구조로 매핑
    const potentialUpsizeItems = cart.reduce((acc, item, index) => {
        if (item.isSet) {
            if (item.sideSize === 'M' && !item.sideUpgraded) {
              acc.push({ id: `s-${index}`, cartIndex: index, name: `${item.name} (사이드)`, type: 'side', currentSize: 'M', price: item.price, isUpgraded: item.sideUpgraded, shouldUpgrade: false });
            }
            if (item.drinkSize === 'M' && !item.drinkUpgraded) {
              acc.push({ id: `d-${index}`, cartIndex: index, name: `${item.name} (음료)`, type: 'drink', currentSize: 'M', price: item.price, isUpgraded: item.drinkUpgraded, shouldUpgrade: false });
            }
        } else if (isUpgradableMItem(item)) {
            // 단품 메뉴의 경우
            acc.push({ id: `i-${index}`, cartIndex: index, name: item.name, type: 'item', currentSize: 'M', price: item.price, isUpgraded: item.isUpgraded, shouldUpgrade: false });
        }
        return acc;
    }, []);

    if (potentialUpsizeItems.length > 0) {
      setUpgradableItems(potentialUpsizeItems);
      setShowUpsizePrompt(true);
      if (accessibilityMode === 'voice') {
          speak(`M 사이즈 메뉴 ${potentialUpsizeItems.length}개가 있습니다. L 사이즈로 업그레이드하시겠습니까?`);
      }
    } else {
      // 업그레이드 대상이 없으면 바로 결제 단계로 이동
      setGameState('payment');
      if (accessibilityMode === 'voice') {
        speak(`총 ${getCurrentTotal().toLocaleString()}원입니다. 결제 수단을 선택해주세요.`);
      }
    }
  };
  
  // 업사이징 적용 후 결제 단계로 이동
  const handleUpsize = (upgradeList) => {
      playClickSound(); // 터치음 추가
      let newCart = [...cart];
      let totalUpsizeCost = 0;

      upgradeList.forEach(upgradedItem => {
          if (upgradedItem.shouldUpgrade) {
              totalUpsizeCost += UPSIZE_COST;
              
              const itemIndex = upgradedItem.cartIndex;
              const originalItem = newCart[itemIndex];
              
              // 현재 카트에 있는 아이템의 price를 직접 수정하여 최종 금액에 반영
              originalItem.price += UPSIZE_COST; 

              if (originalItem.isSet) {
                  if (upgradedItem.type === 'side') {
                      originalItem.sideSize = 'L';
                      originalItem.sideUpgraded = true;
                  } else if (upgradedItem.type === 'drink') {
                      originalItem.drinkSize = 'L';
                      originalItem.drinkUpgraded = true;
                  }
              } else {
                  originalItem.name = originalItem.upsizeTo; // 이름 변경
                  originalItem.isUpgraded = true;
              }
              newCart[itemIndex] = originalItem; 
          }
      });
      
      setCart(newCart);
      setShowUpsizePrompt(false);
      setGameState('payment'); // 결제 수단 선택 단계로 이동
      
      if (accessibilityMode === 'voice') {
          const currentTotal = getCurrentTotal();
          const message = totalUpsizeCost > 0 ? 
            `총 ${totalUpsizeCost.toLocaleString()}원이 추가되었습니다. 현재 금액은 ${currentTotal.toLocaleString()}원입니다. 결제 수단을 선택해주세요.` :
            '업그레이드 없이 결제를 진행합니다. 결제 수단을 선택해주세요.';
          speak(message);
      }
  };

  // 멤버십 할인 적용
  const handleMembershipSelect = (discountAmount) => {
    playClickSound(); // 터치음 추가
    setDiscountApplied(discountAmount);
    setShowMembershipOptions(false);
    
    // 할인이 적용된 후, 다시 결제 수단 선택 단계로 돌아감
    setGameState('payment'); 
    
    if (accessibilityMode === 'voice') {
        const currentTotal = getCurrentTotal();
        speak(`${discountAmount.toLocaleString()}원이 할인되었습니다. 최종 결제 금액은 ${currentTotal.toLocaleString()}원입니다. 최종 결제 수단을 선택해주세요.`);
    }
  }

  // 최종 채점 및 결과 화면으로 이동
  const finalizeOrder = (method) => {
    playClickSound(BEEP_FREQUENCY + 200); // 터치음 추가 (성공톤)
    setPaymentMethod(method);
    const level = currentCustomer;
    if (!level) return;

    const orderedItems = cart.map(item => item.name);
    
    // --- 채점 로직 ---
    const isCorrectMode = accessibilityMode === level.correctMode;
    // 멤버십이 선호 결제 방식이면, 할인이 적용되었는지 확인 (discountApplied > 0)
    const isMembershipUsed = level.preferredPayment === 'membership' && discountApplied > 0;
    // 최종 결제 수단이 선호 결제 방식과 일치하는지 확인 (멤버십 미션이 아닐 때)
    const isCorrectPayment = (level.preferredPayment !== 'membership' && method === level.preferredPayment) || isMembershipUsed || (level.preferredPayment === 'samsung' && method === 'samsung') || (level.preferredPayment === 'kakao' && method === 'kakao'); // 간편결제(samsung) 및 QR(kakao) 별도 처리
    
    // 고객이 선호하지 않더라도 멤버십을 사용했는지 확인 (보너스 점수용)
    const didUseMembership = discountApplied > 0;
    
    const isCorrectDining = diningOption === level.preferredDining;
    
    let originalPrice = cart.reduce((sum, item) => sum + item.price, 0);
    let finalPrice = originalPrice - discountApplied;
    const isWithinBudget = finalPrice <= level.budget;
    
    // targetOrder에 있는 모든 항목이 orderedItems에 포함되었는지 확인
    const hasAllItems = level.targetOrder.every(targetName => orderedItems.includes(targetName));
    
    let earnedScore = 0;
    let feedback = [];
    
    // 1. 접근성 모드 피드백 (100점)
    if (isCorrectMode) {
      earnedScore += 100;
      feedback.push('✅ 올바른 접근성 모드 선택 (+100점)');
    } else {
      feedback.push(`❌ 접근성 모드 오류: 적절 모드는 '${level.correctMode === 'elderly' ? '큰 글씨' : level.correctMode === 'voice' ? '음성 안내' : '일반'}' 입니다.`);
    }
    
    // 2. 식사 장소 선택 (30점)
    if (isCorrectDining) {
        earnedScore += 30;
        feedback.push(`✅ 식사 장소 선택 ('${diningOption === 'in' ? '매장 식사' : '포장'}'') (+30점)`);
    } else {
        feedback.push(`❌ 식사 장소 오류: 손님 선호는 '${level.preferredDining === 'in' ? '매장 식사' : '포장'}' 입니다.`);
    }

    // 3. 메뉴 선택 및 업사이징 피드백 (80점 + 추가 점수)
    if (hasAllItems) {
      earnedScore += 80;
      feedback.push('✅ 정확한 메뉴 선택 (+80점)');

      // 레벨 1 (할머니) L 사이즈 필수 조건 검사
      if (level.id === 1) {
          const targetSet = cart.find(item => item.name === '시그니처 한우 버거 세트');
          // 사이드와 음료 모두 L 사이즈인지 확인
          const isLSize = targetSet?.sideSize === 'L' && targetSet?.drinkSize === 'L';
          
          if (isLSize) {
              earnedScore += 30;
              feedback.push('✅ L 사이즈 업그레이드 완료 (미션 성공 +30점)');
          } else {
              feedback.push('❌ L 사이즈 업그레이드 누락: 웨지 감자/탄산음료가 M 사이즈입니다.');
          }
      }
    } else {
      // 메뉴가 누락되었을 경우
      const targetItems = level.targetOrder;
      // orderedItems에 있는 항목들을 임시로 복사하여 사용
      let tempOrdered = [...orderedItems];
      let missing = [];

      targetItems.forEach(targetName => {
          const index = tempOrdered.indexOf(targetName);
          if (index > -1) {
              tempOrdered.splice(index, 1); // 찾은 항목 제거
          } else {
              missing.push(targetName); // 누락된 항목 추가
          }
      });
      
      if (missing.length > 0) {
          feedback.push(`❌ 메뉴 선택 오류: 필수 메뉴 ${missing.join(', ')} (이)가 빠졌습니다.`);
      } else {
          // 수량이 안 맞거나, 세트 메뉴 옵션 (예: L사이즈 필수)을 충족 못했을 때
        feedback.push('❌ 메뉴 선택 오류: 수량 또는 세트 구성에 문제가 있습니다.');
      }
    }
    
    // 4. 결제 수단 피드백 (50점)
    if (isCorrectPayment) {
      earnedScore += 50;
      feedback.push(`✅ 선호 결제수단 사용 (${getPaymentNameById(level.preferredPayment)} 처리 완료) (+50점)`);
    } else {
      const preferredName = getPaymentNameById(level.preferredPayment);
      feedback.push(`❌ 결제 수단 오류: 손님 선호 결제는 '${preferredName}' 입니다.`);
    }
    
    // 5. 멤버십 사용 보너스 (20점)
    if (didUseMembership && level.preferredPayment !== 'membership') {
        earnedScore += 20;
        feedback.push('⭐ 멤버십 할인 적용 보너스 (+20점)');
    }
    
    // 6. 시간/속도 피드백 (50점/30점)
    const missionTime = currentSettings?.time || 60; // 현재 난이도의 설정 시간
    if (timeLeft > missionTime * 0.66) { // 33% 시간 안에 완료
      earnedScore += 50;
      feedback.push('✅ 매우 신속한 주문 (+50점)');
    } else if (timeLeft > missionTime * 0.33) { // 66% 시간 안에 완료
      earnedScore += 30;
      feedback.push('⚡ 적절한 속도 (+30점)');
    } else {
      feedback.push('⏱️ 주문 속도가 조금 촉박했습니다.');
    }
    
    // 7. 예산 피드백 (20점)
    if (isWithinBudget) {
      earnedScore += 20;
      feedback.push('✅ 예산 내 주문 (+20점)');
    } else {
      feedback.push(`❌ 예산 초과: 최종 결제 금액 ${finalPrice.toLocaleString()}원 > 예산 ${level.budget.toLocaleString()}원`);
    }

    // 최종 점수 업데이트 및 피드백 표시
    setScore(s => s + earnedScore);
    const finalFeedback = `획득 점수: ${earnedScore}점\n\n--- 상세 피드백 ---\n${feedback.join('\n')}`;
    setFeedbackMessage(finalFeedback);
    
    // 주문번호 생성
    setOrderNumber(Math.floor(1000 + Math.random() * 9000));
    
    // 카드/QR 프롬프트 숨기기
    setShowCardInsertionPrompt(false);
    setShowQrCodePrompt(false);

    // 4단계: 주문 완료 및 수령
    setGameState('result');
    
    if (accessibilityMode === 'voice') {
      speak(`주문이 완료되었습니다. 주문번호는 ${orderNumber}번입니다. 다음 버튼을 눌러 결과를 확인하세요.`);
    }
  };


  // 결제 수단 선택 시 (멤버십 버튼 클릭 포함)
  const handlePaymentSelection = (methodId) => {
    playClickSound(); // 터치음 추가
    if (methodId === 'membership') {
        // 멤버십 선택 시 할인 옵션 팝업을 띄우고 상태 변경
        setShowMembershipOptions(true);
        setGameState('membership');
        if (accessibilityMode === 'voice') {
            speak('멤버십 할인 혜택을 선택하세요.');
        }
    } else if (methodId === 'card') {
        // Card interaction prompt
        setShowCardInsertionPrompt(true);
        if (accessibilityMode === 'voice') {
            speak('신용카드를 선택하셨습니다. 화면 아래쪽 카드 투입구에 카드를 넣어주세요.');
        }
    } else if (methodId === 'samsung') { // 모바일 간편결제
        setShowSimplePayOptions(true);
        setGameState('payment'); // Stay in payment state, modals handle flow
        if (accessibilityMode === 'voice') {
            speak('모바일 간편결제를 선택하셨습니다. 사용하실 페이 종류를 선택하세요.');
        }
    } else if (methodId === 'kakao') { // 큐알 결제 (바로 QR 프롬프트로 이동)
        setSelectedSimplePay(getPaymentNameById('kakao'));
        setShowQrCodePrompt(true);
        setGameState('payment');
        if (accessibilityMode === 'voice') {
            speak('큐알 결제를 선택하셨습니다. 화면의 QR 코드를 스캔해주세요.');
        }
    } else {
        // All other instant payment methods (Should be minimal now)
        finalizeOrder(methodId);
    }
  }


  const handleTimeout = () => {
    // 4단계: 주문 완료 및 수령 (시간 초과 시)
    setOrderNumber(0); // 주문번호 없음
    setFeedbackMessage('시간이 초과되었습니다! 다음 버튼을 눌러 결과를 확인하세요.');
    setGameState('result');
    setShowFeedback(true); // 바로 피드백 모달 표시
  };

  // 스타일 변수
  const getFontSize = () => {
    switch (accessibilityMode) {
      case 'elderly': return 'text-2xl';
      case 'voice': return 'text-xl';
      default: return 'text-base';
    }
  };

  const getButtonSize = () => {
    // 1단계 버튼 높이 조정
    return accessibilityMode === 'elderly' ? 'h-36' : 'h-24'; 
  };

  const getContrast = () => {
    return accessibilityMode === 'elderly' ? 'contrast-125 brightness-110' : '';
  };
  
  // 현재 총 금액 계산 (할인 적용)
  const getCurrentTotal = () => {
    const originalPrice = cart.reduce((sum, item) => sum + item.price, 0);
    return originalPrice - discountApplied;
  }
  
  // 2단계 메뉴 아이템 높이 (최종 축소 버전)
  const getMenuButtonSize = useCallback(() => {
    return 'h-40 sm:h-48';
  }, []);


  // 0단계: 인트로 화면
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-yellow-500 p-4 sm:p-8 flex items-center justify-center font-['Inter']">
        {/* 상단 교육 정보 영역: 상단 중앙으로 이동 */}
        <div className="absolute top-0 w-full text-center p-4">
            <div className="inline-block text-sm text-gray-700 bg-white bg-opacity-80 rounded-b-lg shadow-md px-4 py-2">
                <span className="bg-green-500 text-white rounded-full px-2 py-1 text-xs font-bold mr-1">초등</span>
                사회(김정인) | 1. 사회 변화로 달라진 생활 모습(30~31쪽)
            </div>
        </div>
        {/* 본문 시작 */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-12 max-w-3xl w-full">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-800 mb-4">✨ 모두의 키오스크</h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-8">지능 정보화로 달라진 생활 모습</p>
            
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 sm:p-6 mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">🎮 게임 방법 및 흐름</h2>
              <ul className="text-left text-gray-700 space-y-3 text-base sm:text-lg list-none">
                <li><span className="text-red-600 font-semibold">1. 모드 선택:</span> 고객에 맞는 접근성 모드와 식사 장소를 선택합니다.</li>
                <li><span className="text-red-600 font-semibold">2. 메뉴 선택:</span> 미션에 맞는 메뉴를 장바구니에 담습니다.</li>
                {/* '선택' 글씨 강조 제거 */}
                <li><span className="text-red-600 font-semibold">3. 결제:</span> 업그레이드, 할인, 카드/모바일 선택 후 최종 결제합니다.</li>
                <li><span className="text-red-600 font-semibold">4. 수령:</span> 점수와 함께 주문번호를 확인합니다.</li>
                <li>⏱️ <span className="font-bold">제한 시간:</span> 난이도별로 30초 ~ 50초</li>
              </ul>
            </div>

            <button
              onClick={startGame}
              className="w-full bg-gradient-to-r from-red-600 to-yellow-500 text-white px-8 py-4 sm:px-16 sm:py-5 rounded-full text-xl sm:text-3xl font-bold hover:shadow-2xl transform hover:scale-105 transition"
            >
              난이도 선택하기 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // 0.5단계: 난이도 선택 화면 (State: difficulty_select)
  if (gameState === 'difficulty_select') {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-12 max-w-3xl w-full text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800 mb-8">난이도를 선택하세요</h1>

          <div className="space-y-6">
            {Object.entries(DIFFICULTY_SETTINGS).map(([key, setting]) => (
              <button
                key={key}
                onClick={() => setupGame(key)}
                className={`w-full py-6 rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] ${
                  key === 'easy' ? 'bg-green-500 hover:bg-green-600' : 
                  key === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600' : 
                  'bg-red-500 hover:bg-red-600'
                } text-white`}
              >
                <div className="text-3xl font-bold mb-1">{setting.name}</div>
                <div className="text-xl">손님 {setting.count}명 | 시간 {setting.time}초</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setGameState('intro')}
            className="mt-8 px-8 py-3 bg-gray-300 hover:bg-gray-400 rounded-full text-lg font-bold transition"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }


  // 1단계: 주문 시작 및 식사 장소 선택 (Dining/Mode Selection)
  if (gameState === 'start') {
    const level = currentCustomer;
    if (!level) return <div className="min-h-screen flex items-center justify-center text-xl">게임 데이터를 로딩 중입니다...</div>;
    
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8 flex flex-col justify-center font-['Inter']">
        
        {/* 상단 미션 */}
        <div className="max-w-4xl mx-auto w-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                레벨 {currentLevel + 1} / {customerQueue.length}: 고객 맞이
            </h1>
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="text-6xl sm:text-7xl shrink-0">{level.icon}</div>
              <div className="flex-1 w-full">
                {/* 손님 호칭 '님' 제거 반영 */}
                <h2 className={`font-bold ${getFontSize()} mb-2`}>{level.customer}</h2>
                <p className={`text-gray-600 ${getFontSize()} mb-2`}>{level.story}</p>
                <div className={`bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3 ${getFontSize()}`}>
                  <strong className="text-red-700">미션:</strong> {level.requirement}
                </div>
              </div>
            </div>
          </div>
        </div>


        <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. 식사 장소 선택 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className={`font-bold mb-4 text-red-600 ${getFontSize()}`}>1. 식사 장소 선택</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setDiningOption('in')}
                        className={`h-36 rounded-xl font-bold transition flex flex-col items-center justify-center text-center text-gray-800 border-4 ${
                          diningOption === 'in'
                            ? 'bg-red-100 border-red-500 shadow-xl'
                            : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
                        }`}
                    >
                        <Utensils className="w-8 h-8 mb-2" />
                        <div className={getFontSize()}>매장 식사</div>
                    </button>
                    <button
                        onClick={() => setDiningOption('out')}
                        className={`h-36 rounded-xl font-bold transition flex flex-col items-center justify-center text-center text-gray-800 border-4 ${
                          diningOption === 'out'
                            ? 'bg-red-100 border-red-500 shadow-xl'
                            : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
                        }`}
                    >
                        <Package className="w-8 h-8 mb-2" />
                        <div className={getFontSize()}>포장 (Take-Out)</div>
                    </button>
                </div>
            </div>

            {/* 2. 접근성 모드 선택 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className={`font-bold mb-4 text-red-600 ${getFontSize()}`}>2. 접근성 모드 선택</h3>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => handleModeChange('elderly')}
                        className={`h-36 rounded-lg font-bold transition flex flex-col items-center justify-center p-2 text-center border-4 ${
                          accessibilityMode === 'elderly' ? 'bg-blue-100 border-blue-500 text-blue-800 shadow-xl' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-800'
                        }`}
                    >
                        <div className="text-3xl sm:text-4xl mb-1">👵</div>
                        <div className="text-base sm:text-lg font-bold">큰 글씨</div> {/* 텍스트 크기 고정 및 변경 */}
                    </button>
                    <button
                        onClick={() => handleModeChange('normal')}
                        className={`h-36 rounded-lg font-bold transition flex flex-col items-center justify-center p-2 text-center border-4 ${
                          accessibilityMode === 'normal' ? 'bg-green-100 border-green-500 text-green-800 shadow-xl' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-800'
                        }`}
                    >
                        <div className="text-3xl sm:text-4xl mb-1">👔</div>
                        <div className={getFontSize()}>일반 모드</div>
                    </button>
                    <button
                        onClick={() => handleModeChange('voice')}
                        className={`h-36 rounded-lg font-bold transition flex flex-col items-center justify-center p-2 text-center border-4 ${
                          accessibilityMode === 'voice' ? 'bg-purple-100 border-purple-500 text-purple-800 shadow-xl' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-800'
                        }`}
                    >
                        <div className="text-3xl sm:text-4xl mb-1">🔊</div>
                        <div className={getFontSize()}>음성 안내</div>
                    </button>
                </div>
            </div>
        </div>

        <button
            onClick={() => startOrdering(diningOption)}
            disabled={!diningOption || !accessibilityMode}
            className={`w-full max-w-4xl mx-auto h-20 mt-8 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-xl font-bold text-2xl transition shadow-lg transform hover:scale-[1.01]`}
        >
            메뉴 선택 화면으로 이동 ➡️
        </button>
      </div>
    );
  }


  // 2단계: 메뉴 선택 및 장바구니 담기 (Ordering)
  if (gameState === 'ordering') {
    const level = currentCustomer;
    if (!level) return <div className="min-h-screen flex items-center justify-center text-xl">고객 데이터 오류. 난이도를 다시 선택해주세요.</div>;

    const totalPrice = getCurrentTotal();
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    // 큰 글씨 모드일 때 스크롤 영역 높이 설정
    const menuScrollHeight = accessibilityMode === 'elderly' ? 'max-h-[65vh]' : 'max-h-[50vh]';
    const cartScrollHeight = accessibilityMode === 'elderly' ? 'max-h-80' : 'max-h-64';

    return (
      <div className={`min-h-screen bg-gray-50 font-['Inter'] ${getContrast()}`}>
        {/* 상단 헤더 */}
        <div className="bg-red-600 text-white shadow-lg sticky top-0 z-10">
          <div className="max-w-7xl mx-auto p-3 sm:p-4 flex justify-between items-center">
             <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-bold text-lg">{diningOption === 'in' ? '매장 식사' : '포장'}</span>
                <span className={`text-sm rounded-full px-2 py-1 ${accessibilityMode === 'elderly' ? 'bg-blue-300' : accessibilityMode === 'voice' ? 'bg-purple-300' : 'bg-green-300'} text-gray-800`}>
                    {accessibilityMode === 'elderly' ? '큰 글씨' : accessibilityMode === 'voice' ? '음성 안내' : '일반'} 모드
                </span>
            </div>
            <div className={`flex items-center gap-4`}>
                {/* 터치음 토글 버튼 */}
                <button
                    onClick={toggleClickSound}
                    className="flex items-center text-sm bg-red-800 hover:bg-red-900 text-white px-2 py-1 rounded-md transition"
                >
                    {isClickSoundEnabled ? <Volume1 className="w-4 h-4 mr-1" /> : <VolumeX className="w-4 h-4 mr-1" />} 
                    {isClickSoundEnabled ? '터치음 ON' : '터치음 OFF'}
                </button>

                <div className={`font-bold text-lg flex items-center gap-1 sm:gap-2`}>
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className={timeLeft < 10 ? 'text-yellow-300 animate-pulse' : ''}>
                    {minutes}:{seconds.toString().padStart(2, '0')}
                    </span>
                </div>
                <button
                    onClick={() => setShowExitConfirm(true)}
                    className="flex items-center text-sm bg-red-800 hover:bg-red-900 text-white px-2 py-1 rounded-md transition"
                >
                    <LogOut className="w-4 h-4 mr-1" /> 게임 종료
                </button>
            </div>
          </div>
        </div>
        
        {/* 게임 종료 확인 팝업 */}
        {showExitConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                <div className={`bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in`}>
                    <h3 className="text-xl font-bold text-center mb-4 flex items-center justify-center text-red-600">
                        <XCircle className="w-6 h-6 mr-2" /> 게임을 종료하시겠습니까?
                    </h3>
                    <p className="text-gray-600 text-center mb-6">현재까지의 진행 상황은 저장되지 않습니다.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleExitGame(true)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-3 font-bold transition"
                        >
                            예 (첫 화면으로)
                        </button>
                        <button
                            onClick={() => handleExitGame(false)}
                            className="flex-1 bg-gray-300 hover:bg-gray-400 rounded-lg py-3 font-bold transition"
                        >
                            아니요 (계속 진행)
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* 메인 콘텐츠 영역 */}
        <div className="max-w-7xl mx-auto p-3 sm:p-4">
          
          {/* 미션 */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4">
              <div className="mb-4">
                {/* 손님 호칭 '님' 제거 반영 */}
                <h2 className="text-xl font-bold text-gray-800">미션: {level.customer}의 주문</h2>
              </div>
              <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-3 text-sm">
                  {level.requirement}
              </div>
          </div>

          {/* 메뉴 및 장바구니 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* 메뉴 영역 */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-4">
              {/* 탭 네비게이션 - 5개 탭 */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('set')}
                  className={`${getButtonSize()} rounded-lg font-bold transition flex items-center justify-center p-1 sm:p-4 text-center ${
                    activeTab === 'set'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <span className={accessibilityMode === 'elderly' ? 'text-lg' : getFontSize()}>🎁 세트</span> {/* 텍스트 크기 조정 */}
                </button>
                <button
                  onClick={() => setActiveTab('burger')}
                  className={`${getButtonSize()} rounded-lg font-bold transition flex items-center justify-center p-1 sm:p-4 text-center ${
                    activeTab === 'burger'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <span className={accessibilityMode === 'elderly' ? 'text-lg' : getFontSize()}>🍔 버거</span>
                </button>
                <button
                  onClick={() => setActiveTab('side')}
                  className={`${getButtonSize()} rounded-lg font-bold transition flex items-center justify-center p-1 sm:p-4 text-center ${
                    activeTab === 'side'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <span className={accessibilityMode === 'elderly' ? 'text-lg' : getFontSize()}>🍟 사이드</span>
                </button>
                <button
                  onClick={() => setActiveTab('drink')}
                  className={`${getButtonSize()} rounded-lg font-bold transition flex items-center justify-center p-1 sm:p-4 text-center ${
                    activeTab === 'drink'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <span className={accessibilityMode === 'elderly' ? 'text-lg' : getFontSize()}>🥤 음료</span>
                </button>
                <button
                  onClick={() => setActiveTab('dessert')}
                  className={`${getButtonSize()} rounded-lg font-bold transition flex items-center justify-center p-1 sm:p-4 text-center ${
                    activeTab === 'dessert'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <span className={accessibilityMode === 'elderly' ? 'text-lg' : getFontSize()}>🍦 디저트</span>
                </button>
              </div>

              {/* 메뉴 아이템 */}
              <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 ${menuScrollHeight} overflow-y-auto pr-2`}>
                {menuItems[activeTab].map(item => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    // 메뉴 항목 높이를 h-40 sm:h-48로 설정 (최종 축소 버전)
                    className={`${getMenuButtonSize()} bg-yellow-400 hover:bg-yellow-500 rounded-xl font-bold transition p-4 text-left shadow-md transform hover:scale-[1.02] active:scale-100`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {/* 아이콘 크기를 text-3xl로 통일 */}
                      <span className="text-3xl">{item.emoji}</span>
                      <span className={`font-bold text-red-700 ${getFontSize()}`}>
                        {item.price.toLocaleString()}원
                      </span>
                    </div>
                    {/* 큰 글씨 모드에서 텍스트가 넘치지 않도록 폰트 크기 강제 조정 (text-xl) */}
                    <div className={`font-bold ${accessibilityMode === 'elderly' ? 'text-xl' : getFontSize()} text-gray-800 mb-1`}>{item.name}</div>
                    <div className="text-xs sm:text-sm text-gray-700">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 장바구니 */}
            <div className="bg-white rounded-xl shadow-lg p-4 lg:sticky lg:top-20 lg:h-fit">
              <h3 className={`font-bold mb-3 ${getFontSize()} flex items-center gap-2 text-red-600`}>
                <ShoppingCart className="w-6 h-6" />
                장바구니 ({cart.length}개)
              </h3>
              
              <div className={`mb-4 overflow-y-auto flex-1 border-b-2 ${cartScrollHeight}`}>
                {cart.length === 0 ? (
                  <div className={`text-gray-400 text-center py-8 ${getFontSize()}`}>
                    메뉴를 선택해주세요
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg mb-2 shadow-sm">
                      <div>
                        <div className={`font-bold ${getFontSize()}`}>
                          {item.emoji} {item.name}
                          {item.isSet && item.sideSize === 'L' && <span className="text-xs text-blue-600 ml-2"> (사이드 L)</span>}
                          {item.isSet && item.drinkSize === 'L' && <span className="text-xs text-blue-600 ml-1"> (음료 L)</span>}
                          {discountApplied > 0 && <span className="text-xs text-green-600 ml-1 block"> (할인 적용됨)</span>}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.price.toLocaleString()}원
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <div className={`border-t-2 border-gray-200 pt-3 mb-3 ${getFontSize()}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">주문 수량</span>
                  <span className="font-bold">{cart.length}개</span>
                </div>
                {discountApplied > 0 && (
                    <div className="flex justify-between items-center mb-1 text-green-600 font-bold">
                        <span>멤버십 할인</span>
                        <span>-{discountApplied.toLocaleString()}원</span>
                    </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">총 금액</span>
                  <span className="text-red-600 font-bold text-2xl">
                    {totalPrice.toLocaleString()}원
                  </span>
                </div>
              </div>

              <button
                onClick={proceedToUpsizePrompt}
                disabled={cart.length === 0}
                className={`w-full h-16 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-bold ${getFontSize()} transition shadow-lg mb-2 transform hover:scale-[1.01]`}
              >
                주문 확인 및 결제하기
              </button>
              
              <button
                onClick={() => {
                  setCart([]);
                  setDiscountApplied(0);
                  if (accessibilityMode === 'voice') speak('장바구니가 비워졌습니다.');
                }}
                className={`w-full h-12 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold ${getFontSize()} transition`}
              >
                전체 삭제
              </button>
            </div>
          </div>
        </div>
        
        {/* Gemini AI Critique Modal */}
        {showCritiqueModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-2xl p-8 max-w-xl w-full shadow-2xl animate-in fade-in zoom-in ${accessibilityMode === 'elderly' ? 'contrast-125 brightness-110' : ''}`}>
              <h3 className="text-2xl font-bold text-center mb-4 flex items-center justify-center text-yellow-600">
                <Bot className="w-6 h-6 mr-2" /> ✨ AI 접근성 분석
              </h3>
              <div className="bg-yellow-50 rounded-xl p-4 mb-4 border border-yellow-300 text-gray-700 text-base">
                {critiqueText}
              </div>
              <button
                onClick={() => setShowCritiqueModal(false)}
                className="w-full bg-gray-300 hover:bg-gray-400 rounded-lg py-3 mt-4 font-bold text-lg transition"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3단계: 주문 확인 및 결제 (Upsize / Membership / Payment)
  if (gameState === 'upsize' || gameState === 'membership' || gameState === 'payment') {
      const totalPrice = getCurrentTotal();

      return (
          <div className="min-h-screen bg-gray-50 p-4 sm:p-8 flex items-center justify-center font-['Inter']">
              <div className="max-w-4xl w-full bg-white rounded-xl shadow-2xl p-6 sm:p-8">
                  <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                      3. 주문 내역 확인 및 결제
                  </h1>

                  <div className="mb-6">
                      <h2 className="text-xl font-bold mb-3 text-red-600">주문 내역</h2>
                      <div className="border rounded-lg p-4 bg-red-50 max-h-48 overflow-y-auto mb-4">
                          {cart.map((item, index) => (
                              <div key={index} className="flex justify-between py-1 text-base">
                                  <span>
                                      {item.name}
                                      {item.isSet && item.sideSize === 'L' && <span className="text-xs text-blue-600 ml-1"> (사이드 L)</span>}
                                      {item.isSet && item.drinkSize === 'L' && <span className="text-xs text-blue-600 ml-1"> (음료 L)</span>}
                                  </span>
                                  <span>{item.price.toLocaleString()}원</span>
                              </div>
                          ))}
                      </div>
                      <div className={`border-t-2 pt-3 ${getFontSize()}`}>
                          {discountApplied > 0 && (
                            <div className="flex justify-between items-center mb-1 text-green-600 font-bold">
                                <span>멤버십 할인</span>
                                <span>-{discountApplied.toLocaleString()}원</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center font-bold text-xl">
                              <span>최종 결제 금액</span>
                              <span className="text-red-600 text-2xl">
                                  {totalPrice.toLocaleString()}원
                              </span>
                          </div>
                      </div>
                  </div>
                  
                  {/* L 사이즈 업사이징 팝업 (결제 전) */}
                  {showUpsizePrompt && gameState === 'upsize' && (
                      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                          <UpsizePrompt
                              upgradableItems={upgradableItems}
                              totalPrice={cart.reduce((sum, item) => sum + item.price, 0) - (discountApplied || 0)} // 현재 총 금액 (할인 적용 후)
                              UPSIZE_COST={UPSIZE_COST}
                              onConfirm={handleUpsize}
                              onCancel={() => {
                                  setShowUpsizePrompt(false);
                                  setGameState('payment'); // 업사이징 거부 시 결제 수단 선택으로
                                  if (accessibilityMode === 'voice') speak('업그레이드 없이 결제를 진행합니다. 결제 수단을 선택해주세요.');
                              }}
                              accessibilityMode={accessibilityMode}
                              playClickSound={playClickSound}
                          />
                      </div>
                  )}

                  {/* 멤버십 선택 팝업 */}
                  {showMembershipOptions && gameState === 'membership' && (
                      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                        <MembershipOptions 
                            options={MEMBERSHIP_OPTIONS}
                            onSelectDiscount={handleMembershipSelect}
                            onCancel={() => {
                                setShowMembershipOptions(false);
                                setGameState('payment');
                            }}
                            accessibilityMode={accessibilityMode}
                            playClickSound={playClickSound}
                        />
                      </div>
                  )}
                  
                  {/* 카드 투입 프롬프트 */}
                  {showCardInsertionPrompt && (
                      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                        <CardInsertionPrompt 
                            onCardInserted={finalizeOrder}
                            onCancel={() => setShowCardInsertionPrompt(false)}
                            accessibilityMode={accessibilityMode}
                            playClickSound={playClickSound}
                        />
                      </div>
                  )}
                  
                  {/* 간편결제 옵션 선택 프롬프트 */}
                  {showSimplePayOptions && (
                      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                        <SimplePayOptions
                            options={SIMPLE_PAY_OPTIONS}
                            onSelectPay={(payId) => {
                                setSelectedSimplePay(SIMPLE_PAY_OPTIONS.find(p => p.id === payId)?.name || '모바일 페이');
                                setShowSimplePayOptions(false);
                                setShowQrCodePrompt(true);
                                if (accessibilityMode === 'voice') speak(`${SIMPLE_PAY_OPTIONS.find(p => p.id === payId)?.name}를 선택하셨습니다. 화면의 QR 코드를 스캔해주세요.`);
                            }}
                            onCancel={() => {
                                setShowSimplePayOptions(false);
                                setGameState('payment');
                            }}
                            accessibilityMode={accessibilityMode}
                            playClickSound={playClickSound}
                        />
                      </div>
                  )}
                  
                  {/* QR 코드 스캔 프롬프트 */}
                  {showQrCodePrompt && (
                      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                        <QrCodePrompt
                            selectedPay={selectedSimplePay}
                            onQrScanned={() => finalizeOrder(selectedSimplePay.includes('큐알') ? 'kakao' : 'samsung')} // QR은 kakao로 처리, 아니면 samsung (구분 필요)
                            onCancel={() => {
                                setShowQrCodePrompt(false);
                                setGameState('payment');
                                setSelectedSimplePay('');
                            }}
                            accessibilityMode={accessibilityMode}
                            playClickSound={playClickSound}
                        />
                      </div>
                  )}


                  {/* 최종 결제 수단 선택 */}
                  {gameState === 'payment' && !showCardInsertionPrompt && !showSimplePayOptions && !showQrCodePrompt && (
                      <div className="animate-in fade-in">
                        <h2 className="text-xl font-bold mb-4 text-red-600">최종 결제 방식 선택</h2>
                        {discountApplied > 0 && (
                            <div className="bg-green-100 text-green-800 p-3 rounded-lg mb-4 font-bold">
                                멤버십 할인 {discountApplied.toLocaleString()}원 적용됨! 잔액 {totalPrice.toLocaleString()}원을 결제하세요.
                            </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {PAYMENT_METHODS_DATA.map(method => (
                              <button
                                key={method.id}
                                onClick={() => handlePaymentSelection(method.id)}
                                disabled={method.id === 'membership' && discountApplied > 0} // 할인 적용 후 멤버십 재선택 불가
                                className={`h-36 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-bold transition p-4 shadow-md transform hover:scale-[1.02] ${
                                    method.id === 'membership' 
                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' 
                                        : ''
                                }`}
                              >
                                <div className="text-3xl sm:text-4xl mb-2">{method.icon}</div>
                                <div className={getFontSize()}>{method.name}</div>
                                <div className="text-xs sm:text-sm opacity-90">{method.desc}</div>
                              </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setGameState('ordering')}
                            className={`w-full h-14 bg-gray-300 hover:bg-gray-400 rounded-lg font-bold ${getFontSize()} mt-6 transition`}
                        >
                            메뉴 수정하기
                        </button>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // 4단계: 주문 완료 및 수령 (Result / Receipt)
  if (gameState === 'result') {
      const level = currentCustomer;
      if (!level) return <div className="min-h-screen flex items-center justify-center text-xl">결과 데이터 오류.</div>;
      
      const diningText = diningOption === 'in' ? '매장 식사' : '포장';
      // 선호 옵션 이름을 찾아서 표시
      const preferredDiningText = level.preferredDining === 'in' ? '매장 식사' : '포장';
      const preferredPaymentName = getPaymentNameById(level.preferredPayment);

      return (
          <div className="min-h-screen bg-gray-50 p-4 sm:p-8 flex items-center justify-center font-['Inter']">
              <div className="max-w-4xl w-full bg-white rounded-xl shadow-2xl p-6 sm:p-8 text-center">
                  <h1 className="text-4xl font-bold text-green-600 mb-6">
                      {orderNumber !== 0 ? '4. 주문 완료 및 수령' : '시간 초과!'}
                  </h1>
                  
                  {/* 주문 영수증/정보 */}
                  <div className="bg-green-50 border-4 border-green-300 rounded-xl p-6 mb-8">
                      <div className="text-5xl font-extrabold text-green-700 mb-4">
                          {orderNumber !== 0 ? `${orderNumber}` : '---'}
                      </div>
                      <p className="text-xl font-bold text-gray-800">
                          {orderNumber !== 0 ? '✅ 주문 번호가 나왔습니다. 카운터에서 수령하세요.' : '❌ 주문이 취소되었습니다.'}
                      </p>
                      {/* 식사 옵션 표시 수정: 선호 옵션과 주문 옵션 분리 */}
                      <p className="text-sm text-gray-600 mt-2">
                          고객 선호 식사: {preferredDiningText} / 주문 식사: {diningText}
                      </p>
                      <p className="text-sm text-gray-600">
                          고객 선호 결제: {preferredPaymentName} / 최종 결제 수단: {getPaymentNameById(paymentMethod)}
                          {discountApplied > 0 && <span className="text-green-600 ml-2">(할인 적용됨)</span>}
                      </p>
                  </div>
                  
                  {/* 피드백 모달 */}
                  {showFeedback && (
                      <div className="animate-in fade-in">
                          <h3 className="text-2xl font-bold text-center mb-4">
                              {feedbackMessage.includes('❌') ? '미션 결과 상세' : '주문 성공!'}
                          </h3>
                          <div className="bg-gray-100 rounded-xl p-4 mb-4 whitespace-pre-line text-left text-sm font-mono border border-gray-300">
                              {feedbackMessage}
                          </div>
                          <button
                              onClick={proceedNext}
                              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-3 mt-4 font-bold text-lg transition"
                          >
                              {/* 버튼 문구 변경 요청 반영 */}
                              {currentLevel < customerQueue.length - 1 ? '다음 사람 ➡️' : '최종 결과 보기 🏆'}
                          </button>
                      </div>
                  )}

                  {/* 피드백이 이미 닫힌 상태 (시간 초과 후 바로 이동 시) */}
                  {!showFeedback && (
                    <button
                        onClick={() => setShowFeedback(true)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-3 mt-4 font-bold text-lg transition"
                    >
                        미션 결과 보기 🔍
                    </button>
                  )}
              </div>
          </div>
      );
  }

  // 최종 결과 화면
  if (gameState === 'final_result') {
      const maxScorePerLevel = 360; 
      const maxScore = customerQueue.length * maxScorePerLevel;
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      
      let grade = '🔰 접근성 초보자';
      if (percentage >= 85) grade = '🏆 접근성 마스터';
      else if (percentage >= 70) grade = '⭐ 접근성 전문가';
      else if (percentage >= 50) grade = '👍 접근성 숙련자';
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-500 p-4 sm:p-8 flex items-center justify-center font-['Inter']">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-12 max-w-3xl w-full text-center">
            <div className="text-6xl sm:text-7xl mb-4">🎊</div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-4">최종 미션 완료!</h1>
            
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-8 sm:p-10 mb-8 shadow-xl">
              <div className="text-white text-6xl sm:text-7xl font-bold mb-3">{score}점</div>
              <div className="text-white text-2xl sm:text-3xl font-bold mb-2">{grade}</div>
              <div className="text-white text-lg sm:text-xl">
                 난이도: {currentSettings.name} ({customerQueue.length}명) | 총 달성률: {percentage}%
              </div>
            </div>

            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 sm:p-6 mb-8">
              <h3 className="text-xl sm:text-2xl font-bold text-red-700 mb-4">🎓 학습 요약 -</h3>
              <ul className="text-left text-gray-700 space-y-3 text-base sm:text-lg list-none">
                <li>✅ 키오스크(무인 주문기)의 사용방법을 이해했습니다.</li>
                <li>✅ 지능정보화 시대에서 일어나는 문제점을 알았습니다.</li>
                <li>✅ 고령화로 인한 디지털 소외를 해결하는 자세를 알았습니다.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={restartGame}
                className="flex-1 bg-gradient-to-r from-red-600 to-yellow-500 text-white px-8 py-4 rounded-full text-xl sm:text-2xl font-bold hover:shadow-2xl transform hover:scale-105 transition"
              >
                다시 처음부터 도전하기 🔄
              </button>
            </div>
          </div>
        </div>
      );
    }
};

// --- 카드 투입구 인터랙션 컴포넌트 ---
const CardInsertionPrompt = ({ onCardInserted, onCancel, accessibilityMode, playClickSound }) => {
    const [inserted, setInserted] = useState(false);
    const [processing, setProcessing] = useState(false);

    const getFontSize = () => {
        switch (accessibilityMode) {
          case 'elderly': return 'text-2xl';
          case 'voice': return 'text-xl';
          default: return 'text-base';
        }
    };
    
    const handleInsert = () => {
        playClickSound(); // 터치음 추가
        if (inserted || processing) return;
        setInserted(true);
        setProcessing(true);
        if (accessibilityMode === 'voice') speak('카드가 투입되었습니다. 결제 승인을 시작합니다.');

        // 1.5초 후 최종 결제 완료 (채점)
        setTimeout(() => {
            onCardInserted('card');
        }, 1500);
    }

    return (
        <div className={`bg-white rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl ${accessibilityMode === 'elderly' ? 'contrast-125 brightness-110' : ''}`}>
            <h2 className={`text-2xl font-bold mb-4 text-center text-blue-700 ${getFontSize()}`}>
                💳 카드 결제 진행
            </h2>
            <p className={`text-gray-700 mb-6 text-center ${getFontSize()}`}>
                화면 아래쪽 카드 투입구(IC칩 방향)에 카드를 넣어주세요.
            </p>

            <div className="flex flex-col items-center justify-center p-6 bg-gray-200 rounded-xl mb-6 border-4 border-dashed border-gray-400">
                <div className="text-4xl text-gray-700 mb-2">
                    {inserted ? (processing ? <Zap className="w-10 h-10 text-yellow-600 animate-pulse" /> : <Check className="w-10 h-10 text-green-600" />) : <CreditCard className="w-10 h-10" />}
                </div>
                <div className={`font-bold ${getFontSize()} text-gray-800`}>
                    {inserted ? (processing ? '결제 승인 처리 중...' : '결제 완료!') : 'IC칩 방향 확인 후 투입'}
                </div>
                <div className="h-4 w-48 mt-4 bg-gray-400 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-mono">카드 투입구</span>
                </div>
            </div>

            <button
                onClick={handleInsert}
                disabled={inserted}
                className={`w-full h-14 ${inserted ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg font-bold ${getFontSize()} transition`}
            >
                {inserted ? '결제 처리 완료 (자동 이동)' : '카드 투입 시뮬레이션'}
            </button>
            <button
                onClick={onCancel}
                disabled={inserted}
                className={`w-full h-12 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold ${getFontSize()} transition mt-3`}
            >
                취소하고 결제 수단 다시 선택
            </button>
        </div>
    );
};

// --- 모바일 간편결제 옵션 선택 컴포넌트 ---
const SimplePayOptions = ({ options, onSelectPay, onCancel, accessibilityMode, playClickSound }) => {
    const getFontSize = () => {
        switch (accessibilityMode) {
          case 'elderly': return 'text-2xl';
          case 'voice': return 'text-xl';
          default: return 'text-base';
        }
    };

    return (
        <div className={`bg-white rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl ${accessibilityMode === 'elderly' ? 'contrast-125 brightness-110' : ''}`}>
            <h2 className={`text-2xl font-bold mb-4 text-center text-blue-600 ${getFontSize()}`}>
                📱 모바일 간편결제 선택
            </h2>
            <p className={`text-gray-700 mb-6 text-center ${getFontSize()}`}>
                사용하실 간편결제 서비스(Pay)를 선택해주세요.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
                {options.map(option => (
                    <button
                        key={option.id}
                        onClick={() => {
                            playClickSound();
                            onSelectPay(option.id);
                        }}
                        className={`h-32 bg-indigo-100 hover:bg-indigo-200 border-2 border-indigo-500 rounded-xl font-bold transition p-4 flex flex-col items-center justify-center`}
                    >
                        <div className="text-3xl mb-1">{option.icon}</div>
                        <div className={`font-bold text-base sm:text-lg`}>{option.name}</div> {/* 텍스트 크기 고정 */}
                    </button>
                ))}
            </div>

            <button
                onClick={onCancel}
                className={`w-full h-14 bg-gray-300 hover:bg-gray-400 rounded-lg font-bold ${getFontSize()} transition`}
            >
                취소하고 결제 수단 다시 선택
            </button>
        </div>
    );
};

// --- QR 코드 스캔 컴포넌트 ---
const QrCodePrompt = ({ selectedPay, onQrScanned, onCancel, accessibilityMode, playClickSound }) => {
    const [scanned, setScanned] = useState(false);
    const [processing, setProcessing] = useState(false);

    const getFontSize = () => {
        switch (accessibilityMode) {
          case 'elderly': return 'text-2xl';
          case 'voice': return 'text-xl';
          default: return 'text-base';
        }
    };
    
    const handleScan = () => {
        playClickSound(); // 터치음 추가
        if (scanned || processing) return;
        setScanned(true);
        setProcessing(true);
        if (accessibilityMode === 'voice') speak('QR 코드가 스캔되었습니다. 결제 승인 중입니다.');

        // 2초 후 최종 결제 완료 (채점)
        setTimeout(() => {
            onQrScanned();
        }, 2000);
    }

    // QR 결제일 경우 제목 변경 요청 반영
    const isKakaoQr = selectedPay === getPaymentNameById('kakao');
    const title = isKakaoQr ? '큐알 결제 (카메라 스캔)' : `${selectedPay} 결제 (QR 스캔)`;
    const instruction = isKakaoQr ? '휴대폰 카메라 또는 앱을 열어 QR 코드를 스캔해 주세요.' : '휴대폰 앱을 열어 키오스크의 QR 코드를 스캔해 주세요.';

    return (
        <div className={`bg-white rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl ${accessibilityMode === 'elderly' ? 'contrast-125 brightness-110' : ''}`}>
            <h2 className={`text-2xl font-bold mb-4 text-center text-green-700 ${getFontSize()}`}>
                {title}
            </h2>
            <p className={`text-gray-700 mb-6 text-center ${getFontSize()}`}>
                {instruction}
            </p>

            <div className="flex flex-col items-center p-6 bg-white rounded-xl mb-6 border-4 border-dashed border-gray-400">
                <div className="text-8xl text-gray-700 mb-2">
                    {scanned ? (processing ? <Loader2 className="w-24 h-24 animate-spin text-blue-500" /> : <Check className="w-24 h-24 text-green-600" />) : <QrCode className="w-24 h-24" />}
                </div>
                <div className={`font-bold ${getFontSize()} text-gray-800 mt-2`}>
                    {scanned ? (processing ? '결제 승인 처리 중...' : '결제 완료!') : 'QR 코드 표시 영역'}
                </div>
            </div>

            <button
                onClick={handleScan}
                disabled={scanned}
                className={`w-full h-14 ${scanned ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-bold ${getFontSize()} transition`}
            >
                {scanned ? '결제 처리 완료 (자동 이동)' : 'QR 스캔 시뮬레이션'}
            </button>
            <button
                onClick={onCancel}
                disabled={scanned}
                className={`w-full h-12 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold ${getFontSize()} transition mt-3`}
            >
                취소하고 결제 수단 다시 선택
            </button>
        </div>
    );
};


// --- 업사이징 프롬프트 컴포넌트 ---
const UpsizePrompt = ({ upgradableItems, totalPrice, UPSIZE_COST, onConfirm, onCancel, accessibilityMode, playClickSound }) => {
    const [selectedUpgrades, setSelectedUpgrades] = useState(
      upgradableItems.map(item => ({ ...item, shouldUpgrade: false }))
    );
    
    // 스타일 유틸리티 (부모에서 가져옴)
    const getFontSize = () => {
        switch (accessibilityMode) {
          case 'elderly': return 'text-2xl';
          case 'voice': return 'text-xl';
          default: return 'text-base';
        }
    };

    const toggleUpgrade = (id) => {
        playClickSound(); // 터치음 추가
        setSelectedUpgrades(prev => 
            prev.map(item => 
                item.id === id ? { ...item, shouldUpgrade: !item.shouldUpgrade } : item
            )
        );
    };

    const upsizeCount = selectedUpgrades.filter(item => item.shouldUpgrade).length;
    const additionalCost = upsizeCount * UPSIZE_COST;
    const finalPrice = totalPrice + additionalCost;

    return (
        <div className={`bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl ${accessibilityMode === 'elderly' ? 'contrast-125 brightness-110' : ''}`}>
            <h2 className={`text-2xl font-bold mb-4 text-center text-red-700 ${getFontSize()}`}>
                🥤 L 사이즈 업그레이드
            </h2>
            <p className={`text-gray-700 mb-4 text-center ${getFontSize()}`}>
                M 사이즈 메뉴를 L 사이즈로 변경하시겠습니까? (개당 +{UPSIZE_COST.toLocaleString()}원)
            </p>

            <div className="max-h-60 overflow-y-auto mb-4 border p-3 rounded-lg bg-gray-50">
                {selectedUpgrades.map((item) => (
                    <div key={item.id} className={`flex items-center justify-between py-2 border-b last:border-b-0`}>
                        <span className={`${getFontSize()} font-medium`}>{item.name}</span>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            {/* UX 개선: 선택 상태에 따라 표시되는 텍스트를 명확히 변경 */}
                            <span className={`text-sm ${item.shouldUpgrade ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                                {item.shouldUpgrade ? 
                                    `L 사이즈 선택 (+${UPSIZE_COST.toLocaleString()}원)` : 
                                    `M 사이즈 유지 (0원)`
                                }
                            </span>
                            <input
                                type="checkbox"
                                checked={item.shouldUpgrade}
                                onChange={() => toggleUpgrade(item.id)}
                                className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                        </label>
                    </div>
                ))}
            </div>

            <div className={`border-t-2 pt-3 mb-4 ${getFontSize()}`}>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-600">현재 금액</span>
                    <span className="font-bold">{totalPrice.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">추가 비용 ({upsizeCount}개)</span>
                    <span className="font-bold text-red-600">{additionalCost.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center text-xl font-extrabold text-green-700">
                    <span>최종 금액</span>
                    <span>{finalPrice.toLocaleString()}원</span>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className={`flex-1 h-14 bg-gray-300 hover:bg-gray-400 rounded-lg font-bold ${getFontSize()} transition`}
                >
                    취소 (M 사이즈 유지)
                </button>
                <button
                    onClick={() => onConfirm(selectedUpgrades)}
                    className={`flex-1 h-14 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold ${getFontSize()} transition`}
                >
                    확인 및 결제 ({finalPrice.toLocaleString()}원)
                </button>
            </div>
        </div>
    );
};

// --- 멤버십 옵션 컴포넌트 ---
const MembershipOptions = ({ options, onSelectDiscount, onCancel, accessibilityMode, playClickSound }) => {
    
    // 스타일 유틸리티 (부모에서 가져옴)
    const getFontSize = () => {
        switch (accessibilityMode) {
          case 'elderly': return 'text-2xl';
          case 'voice': return 'text-xl';
          default: return 'text-base';
        }
    };
    
    return (
        <div className={`bg-white rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl ${accessibilityMode === 'elderly' ? 'contrast-125 brightness-110' : ''}`}>
            <h2 className={`text-2xl font-bold mb-4 text-center text-orange-600 ${getFontSize()}`}>
                ⭐ 멤버십/쿠폰 할인 선택
            </h2>
            <p className={`text-gray-700 mb-6 text-center ${getFontSize()}`}>
                사용 가능한 할인 혜택을 선택해주세요.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
                {options.map(option => (
                    <button
                        key={option.id}
                        onClick={() => onSelectDiscount(option.discount)}
                        className={`h-32 bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-500 rounded-xl font-bold transition p-4 flex flex-col items-center justify-center`}
                    >
                        <div className="text-3xl mb-1">{option.name}</div>
                        <div className={`text-red-600 font-bold ${getFontSize()}`}>-{option.discount.toLocaleString()}원 할인</div>
                    </button>
                ))}
            </div>

            <button
                onClick={() => onSelectDiscount(0)} // 할인 없이 진행
                className={`w-full h-14 bg-gray-300 hover:bg-gray-400 rounded-lg font-bold ${getFontSize()} transition mb-3`}
            >
                할인 적용 안함
            </button>
            <button
                onClick={onCancel}
                className={`w-full h-14 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-bold ${getFontSize()} transition`}
            >
                결제 화면으로 돌아가기
            </button>
        </div>
    );
};

export default App;