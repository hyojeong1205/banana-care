import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./Login";
import Signup from "./Signup";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

/**
 * Banana Care – 디자인 반영 단일 파일(App.jsx 대체용)
 * - 반응형 모바일(최대폭 420px) + sticky header + bottom nav
 * - 탭: 캘린더 / 오늘(홈) / 건강 / 다이어리(카테고리 설정)
 * - 로컬스토리지 저장
 * - 몸무게 라인차트(Recharts)
 *
 * 사용법: 프로젝트의 src/App.jsx 내용을 이 파일로 교체하세요.
 */

const KEY = "banana-care-v2";
const todayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// 공용 루틴 색상 팔레트
const ROUTINE_COLORS = [
  // 빨강 계열 (연한 → 진한)
  "#FFDFDD", "#E6A8A8",
  // 주황 계열 (연한 → 진한)
  "#FFF0DD", "#E6C8A8",
  // 노랑 계열 (연한 → 진한)
  "#FAFAEA", "#E6E6A8",
  // 초록 계열 (연한 → 진한)
  "#DFEFDE", "#B8E6B8",
  // 파랑 계열 (연한 → 진한)
  "#DDEFFF", "#B8D4E8",
  // 남색 계열 (연한 → 진한)
  "#F0F8FF", "#C8B8E6",
  // 보라 계열 (연한 → 진한)
  "#EAE4F5", "#E6E6FA",
  // 기타 계열
  "#F0FFF0", "#FFF5EE", "#FFE4E1", "#F5F5DC"
];

const defaultState = {
  // 캘린더용 샘플 로그 (date -> ["영양제","산책",...])
  calendar: {
    // 비어 있음
  },
  // 오늘 요약 타임라인
  timeline: [],
  // 루틴 카테고리 (사용자가 설정)
  routine: {
    am: [
      { label: "아침식사", color: "#DDEFFF" },
      { label: "배변", color: "#FFF0DD" },
      { label: "영양제", color: "#FFDFDD" }
    ],
    pm: [
      { label: "저녁식사", color: "#EAE4F5" },
      { label: "배변", color: "#DFEFDE" },
      { label: "영양제", color: "#FAFAEA" },
      { label: "눈꼽관리", color: "#F0F8FF" }
    ],
    reg: [
      { label: "발톱관리", color: "#FFF5EE", freq: { type: "monthly", day: 15 } },
      { label: "발바닥관리", color: "#F0FFF0", freq: { type: "weekly", weekday: 0 } },
      { label: "빗질", color: "#FFE4E1", freq: { type: "daily" } },
      { label: "심장사상충약", color: "#E6E6FA", freq: { type: "monthly", day: 1 } },
      { label: "예방접종", color: "#F5F5DC", freq: { type: "yearly", month: 3, day: 15 } }
    ],
  },
  // 이벤트(다가오는 일정) - 사용자가 추가
  upcoming: [],
  // 건강 탭 데이터
  weight: [],
  meds: [],
  walks: [],
  // 다이어리 데이터
  diary: [],
  // 약 카테고리
  medCategories: [
    { name: "감기약", dose: "1알", color: "#DDEFFF", frequency: "once" },
    { name: "위장약", dose: "1알", color: "#FFDFDD", frequency: "once" }
  ],
};
export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser ? "User logged in" : "No user");
      setUser(currentUser);
      setReady(true);
    });
    return () => unsub();
  }, []);

  if (!ready) return null; // 초기 로딩

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <BananaApp /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
function load() {
  try { 
    const raw = localStorage.getItem(KEY); 
    if (raw) {
      const data = JSON.parse(raw);
      
      // 기존 데이터가 있고 루틴이 비어있지 않으면 그대로 사용
      if (data.routine && 
          (data.routine.am.length > 0 || data.routine.pm.length > 0 || data.routine.reg.length > 0)) {
        
      // 마이그레이션: 기존 문자열 배열을 새로운 객체 구조로 변환
      if (data.routine && Array.isArray(data.routine.am) && typeof data.routine.am[0] === 'string') {
        const colorPool = ROUTINE_COLORS;
        data.routine = {
          am: data.routine.am.map((label, index) => ({ label, color: colorPool[index % colorPool.length] })),
          pm: data.routine.pm.map((label, index) => ({ label, color: colorPool[index % colorPool.length] })),
          reg: data.routine.reg.map((label, index) => ({ label, color: colorPool[index % colorPool.length] }))
        };
      }
        
        // 색상 유니크 랜덤 배정(리스트별) - 주기 정보 보존
      const assignUniqueRandom = (list=[]) => {
        const palette = [...ROUTINE_COLORS];
        // shuffle
        for (let i = palette.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [palette[i], palette[j]] = [palette[j], palette[i]];
        }
        return list.map((item, idx) => ({
          label: item.label,
            color: item.color || palette[idx % palette.length], // 이미 색상이 있으면 유지
            freq: item.freq // 주기 정보 보존
        }));
      };
        
      if (data.routine) {
        data.routine.am = assignUniqueRandom(data.routine.am || []);
        data.routine.pm = assignUniqueRandom(data.routine.pm || []);
          
          // 정기 루틴에 기본 주기 추가 (기존 사용자 마이그레이션)
          const defaultFreqs = {
            "발톱관리": { type: "monthly", day: 15 },
            "발바닥관리": { type: "weekly", weekday: 0 },
            "빗질": { type: "daily" },
            "심장사상충약": { type: "monthly", day: 1 },
            "예방접종": { type: "yearly", month: 3, day: 15 }
          };
          
          data.routine.reg = assignUniqueRandom(data.routine.reg || []).map(item => ({
            ...item,
            freq: item.freq || defaultFreqs[item.label] || { type: "monthly", day: 1 }
          }));
        }
        
        // medCategories가 없으면 기본값 추가
        if (!data.medCategories) {
          data.medCategories = defaultState.medCategories;
        }
        
      return data;
      } else {
        // 기존 데이터가 없거나 루틴이 비어있으면 기본 루틴 제공
        return {
          ...data,
          routine: defaultState.routine,
          medCategories: defaultState.medCategories
        };
      }
    }
    return defaultState; 
  } catch { 
    return defaultState; 
  }
}
function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

function BananaApp() {
  const [tab, setTab] = useState("home"); // calendar | today | home | health | diary → 디자인상: calendar/today(home)/health/diary
  const [state, setState] = useState(defaultState);
  const [showTutorial, setShowTutorial] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [tutorialShown, setTutorialShown] = useState(new Set()); // 빈 Set으로 초기화

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("로그아웃 에러:", error);
    }
  };

  // 탭별 튜토리얼 표시
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('banana-care-tutorial');
    console.log('튜토리얼 체크:', { tab, hasSeenTutorial, tutorialShown: Array.from(tutorialShown) });
    
    // "다시 보지 않기"가 체크되어 있으면 모달을 표시하지 않음
    if (hasSeenTutorial === 'true') {
      console.log('튜토리얼 이미 본 사용자');
      setShowTutorial(false);
      return;
    }
    
    // 각 탭에 처음 접속할 때만 모달 표시
    if (!tutorialShown.has(tab)) {
      console.log('튜토리얼 표시:', tab);
      setShowTutorial(true);
      setTutorialShown(prev => new Set([...prev, tab]));
    }
  }, [tab, tutorialShown]);

  // 튜토리얼 닫기
  const closeTutorial = () => {
    setShowTutorial(false);
    if (dontShowAgain) {
      localStorage.setItem('banana-care-tutorial', 'true');
    }
  };

  useEffect(() => { setState(load()); }, []);
  useEffect(() => { save(state); }, [state]);

  // 오늘 요약 타임라인용 헬퍼
  const addTimeline = (label, color, dateOverride, timeOverride) => {
    const safeLabel = String(label || "").trim();
    if (!safeLabel) return; // 빈 라벨은 무시
    const timeToSave = timeOverride || nowTime();
    const dateToSave = dateOverride || todayStr();
    setState(prev => ({
      ...prev,
      timeline: [
        ...prev.timeline,
        { time: timeToSave, label: safeLabel, color, date: dateToSave }
      ]
    }));
    // 캘린더 점 표시용 (빈 라벨 제거)
    setState(prev => ({
      ...prev,
      calendar: {
        ...prev.calendar,
        [dateToSave]: Array.from(new Set([...
          (prev.calendar[dateToSave] || []).filter((l) => l && String(l).trim()),
          safeLabel
        ]))
      }
    }));
  };

  const deleteTimelineAt = (index) => {
    setState(prev => {
      const nextTimeline = prev.timeline.filter((_, i) => i !== index);
      const todaysLabels = Array.from(new Set(nextTimeline.map(t => t.label)));
      return {
        ...prev,
        timeline: nextTimeline,
        calendar: {
          ...prev.calendar,
          [todayStr()]: todaysLabels,
        },
      };
    });
  };

  const deleteTimelineByDateIndex = (date, localIndex) => {
    setState(prev => {
      const indicesForDate = prev.timeline
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.date === date)
        .map(({ i }) => i);
      const globalIndex = indicesForDate[localIndex];
      if (globalIndex === undefined) return prev;
      const nextTimeline = prev.timeline.filter((_, i) => i !== globalIndex);
      const todaysLabels = Array.from(new Set(
        nextTimeline
          .filter(t => t.date === date && t.label && String(t.label).trim())
          .map(t => t.label)
      ));
      return {
        ...prev,
        timeline: nextTimeline,
        calendar: {
          ...prev.calendar,
          [date]: todaysLabels,
        },
      };
    });
  };

  const computeUpcoming = React.useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const reg = state.routine?.reg || [];
    const medCategories = state.medCategories || [];
    console.log("정기 루틴:", reg); // 디버깅용
    const entries = [];
    
    for (const item of reg) {
      const freq = item?.freq;
      if (!freq || !freq.type) continue;
      
      let next = null;
      const startDate = freq.startDate ? new Date(freq.startDate) : startOfToday;
      
      if (freq.type === 'daily') {
        next = startOfToday;
      } else if (freq.type === 'weekly' && typeof freq.weekday === 'number') {
        const wd = freq.weekday; // 0-6 (일요일=0)
        const cur = startOfToday.getDay();
        const delta = (wd - cur + 7) % 7; // 0..6
        next = new Date(startOfToday);
        next.setDate(startOfToday.getDate() + delta);
      } else if (freq.type === 'monthly' && typeof freq.day === 'number') {
        const d = freq.day; // 1..31
        const y = startOfToday.getFullYear();
        const m = startOfToday.getMonth();
        
        // 이번 달의 해당 날짜
        next = new Date(y, m, d);
        
        // 이번 달에 해당 날짜가 없거나 이미 지났으면 다음 달로
        if (isNaN(next.getTime()) || next < startOfToday) {
          next = new Date(y, m + 1, d);
          // 다음 달에도 해당 날짜가 없으면 그 다음 달로
          if (isNaN(next.getTime())) {
            next = new Date(y, m + 2, d);
          }
        }
      } else if (freq.type === 'yearly' && typeof freq.month === 'number' && typeof freq.day === 'number') {
        const y = startOfToday.getFullYear();
        next = new Date(y, freq.month - 1, freq.day);
        if (next < startOfToday) {
          next = new Date(y + 1, freq.month - 1, freq.day);
        }
      }
      
      // 시작일 이후인지 확인
      if (next && next < startDate) {
        next = null;
      }
      
      if (!next) continue;
      
      const diffMs = next.getTime() - startOfToday.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // D-day 텍스트 생성
      let dDayText = "";
      if (days === 0) {
        dDayText = "오늘";
      } else if (days === 1) {
        dDayText = "내일";
      } else if (days === -1) {
        dDayText = "어제";
      } else if (days > 0) {
        dDayText = `D-${days}`;
      } else {
        dDayText = `D+${Math.abs(days)}`;
      }
      
      entries.push({ 
        label: item.label, 
        color: item.color, 
        d: dDayText,
        days: days,
        nextDate: next
      });
    }
    
    // 정기 투약 추가
    for (const med of medCategories) {
      if (!med.frequency || med.frequency === "once") continue;
      
      let next = null;
      if (med.frequency === 'daily') {
        next = startOfToday;
      } else if (med.frequency === 'weekly') {
        const wd = 0; // 일요일
        const cur = startOfToday.getDay();
        const delta = (wd - cur + 7) % 7;
        next = new Date(startOfToday);
        next.setDate(startOfToday.getDate() + delta);
      } else if (med.frequency === 'monthly') {
        const d = 1; // 1일
        const y = startOfToday.getFullYear();
        const m = startOfToday.getMonth();
        
        next = new Date(y, m, d);
        if (isNaN(next.getTime()) || next < startOfToday) {
          next = new Date(y, m + 1, d);
          if (isNaN(next.getTime())) {
            next = new Date(y, m + 2, d);
          }
        }
      } else if (med.frequency === 'yearly') {
        const y = startOfToday.getFullYear();
        next = new Date(y, 2, 15); // 3월 15일
        if (next < startOfToday) {
          next = new Date(y + 1, 2, 15);
        }
      }
      
      if (!next) continue;
      
      const diffMs = next.getTime() - startOfToday.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      let dDayText = "";
      if (days === 0) {
        dDayText = "오늘";
      } else if (days === 1) {
        dDayText = "내일";
      } else if (days === -1) {
        dDayText = "어제";
      } else if (days > 0) {
        dDayText = `D-${days}`;
      } else {
        dDayText = `D+${Math.abs(days)}`;
      }
      
      entries.push({ 
        label: med.name, 
        color: med.color, 
        d: dDayText,
        days: days,
        nextDate: next,
        isMed: true
      });
    }
    
    // 날짜순으로 정렬 (가까운 순)
    entries.sort((a, b) => a.days - b.days);
    return entries;
  }, [state.routine?.reg, state.medCategories]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex justify-center">
      <div className="w-full max-w-[420px] min-h-screen flex flex-col">
        <Header onLogout={handleLogout} onShowTutorial={() => setShowTutorial(true)} />

        <main className="flex-1 px-6 py-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
          {tab === "calendar" && <CalendarScreen calendar={state.calendar} routine={state.routine} timeline={state.timeline} onDeleteByDate={deleteTimelineByDateIndex} onAddRoutine={addTimeline} weight={state.weight} meds={state.meds} walks={state.walks} diary={state.diary || []} medCategories={state.medCategories} />}
          {tab === "home" && (
            <HomeScreen
              timeline={state.timeline}
              routine={state.routine}
              upcoming={computeUpcoming}
              onQuickAdd={addTimeline}
              medCategories={state.medCategories}
              onApplyTimeline={(next) => {
                setState(prev => ({
                  ...prev,
                  timeline: next,
                  calendar: {
                    ...prev.calendar,
                    [todayStr()]: Array.from(new Set(next.map(t => t.label)))
                  }
                }));
              }}
            />
          )}
          {tab === "health" && (
            <HealthScreen
              weight={state.weight}
              meds={state.meds}
              walks={state.walks}
              onAddWeight={(kg, date) => setState(p => ({ ...p, weight: [...p.weight, makeWeightEntry(kg, date)] }))}
              onAddMed={(type, dose) => setState(p => ({ ...p, meds: [...p.meds, makeMedEntry(type, dose)] }))}
              onAddWalk={(start, end, minutes) => setState(p => ({ ...p, walks: [...p.walks, makeWalkEntry(start, end, minutes)] }))}
              onDeleteWeight={(index) => setState(p => ({ ...p, weight: p.weight.filter((_, i) => i !== index) }))}
              onDeleteMed={(index) => setState(p => ({ ...p, meds: p.meds.filter((_, i) => i !== index) }))}
              onDeleteWalk={(index) => setState(p => ({ ...p, walks: p.walks.filter((_, i) => i !== index) }))}
              medCategories={state.medCategories}
              onMedCategoriesChange={(mc) => setState(p => ({ ...p, medCategories: mc }))}
            />
          )}
          {tab === "diary" && (
            <DiaryScreen />
          )}
          {tab === "settings" && (
            <SettingsScreen
              routine={state.routine}
              onChange={(r)=> setState(p => ({ ...p, routine: r }))}
              medCategories={state.medCategories}
              onMedCategoriesChange={(mc)=> setState(p => ({ ...p, medCategories: mc }))}
            />
          )}
        </main>

        <BottomNav tab={tab} onChange={setTab} />
      </div>

      {/* 사용설명서 모달 */}
      {showTutorial && (
        <TutorialModal 
          tab={tab} 
          onClose={closeTutorial}
          dontShowAgain={dontShowAgain}
          onDontShowAgainChange={setDontShowAgain}
        />
      )}
    </div>
  );
}

function TutorialModal({ tab, onClose, dontShowAgain, onDontShowAgainChange }) {
  const [currentPage, setCurrentPage] = useState(0);

  const getCalendarPages = () => [
    {
      title: "캘린더로 내 루틴 확인해요",
      icon: "📅",
              content: (
          <div className="space-y-4">
            <div className="flex justify-center items-center">
              <img src="/img/calendar_ttr_01.svg" alt="캘린더 튜토리얼 1" className="w-[90%] max-w-[288px] rounded-lg" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">완료한 루틴이 해당 날짜에 점으로 표시돼요.</p>
              <p className="text-sm text-gray-600">어떤 루틴을 했는지 색깔별로 바로 알 수 있어요.</p>
            </div>
          </div>
        )
    },
    {
      title: "날짜를 눌러서 상세보기",
      icon: "📝",
              content: (
          <div className="space-y-4">
            <div className="flex justify-center items-center">
              <img src="/img/calendar_ttr_02.svg" alt="캘린더 튜토리얼 2" className="w-[90%] max-w-[288px] rounded-lg" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">날짜를 누르면 해당 날짜의 루틴을 시간과 함께 자세히 볼 수 있어요.</p>
            </div>
          </div>
        )
    },
    {
      title: "루틴을 추가·편집해요",
      icon: "➕",
              content: (
          <div className="space-y-4">
            <div className="flex justify-center items-center">
              <img src="/img/calendar_ttr_03.svg" alt="캘린더 튜토리얼 3" className="w-[90%] max-w-[288px] rounded-lg" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">➕ 버튼으로 새 루틴을 추가할 수 있어요.</p>
              <p className="text-sm text-gray-600">✏️ 버튼으로 기존 루틴을 수정하거나 삭제할 수 있어요.</p>
            </div>
          </div>
        )
    }
  ];

  const getHealthPages = () => [
    {
      title: "건강을 기록해요",
      icon: "💪",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/health_ttr_01.svg" alt="건강 튜토리얼 1" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">상단 탭에서 몸무게, 투약, 산책 기록을 선택해</p>
            <p className="text-sm text-gray-600">날짜별로 입력하고 확인할 수 있어요.</p>
          </div>
        </div>
      )
    },
    {
      title: "몸무게를 기록해요",
      icon: "⚖️",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/health_ttr_02.svg" alt="건강 튜토리얼 2" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">날짜와 몸무게를 입력하고 추가하면</p>
            <p className="text-sm text-gray-600">그래프에서 변화 과정을 한눈에 볼 수 있어요.</p>
          </div>
        </div>
      )
    },
    {
      title: "기록을 리스트로 관리해요",
      icon: "📋",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/health_ttr_03.svg" alt="건강 튜토리얼 3" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">입력한 몸무게를 리스트로 확인할 수 있어요.</p>
            <p className="text-sm text-gray-600">✏️ 버튼을 눌러 수정하거나 삭제할 수 있어요.</p>
          </div>
        </div>
      )
    },
    {
      title: "투약을 기록해요",
      icon: "💊",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/health_ttr_04.svg" alt="건강 튜토리얼 4" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">약 이름과 용량을 버튼에 저장해두면</p>
            <p className="text-sm text-gray-600">버튼 한 번으로 불러와 쉽게 기록할 수 있어요.</p>
            <p className="text-sm text-gray-600">기록된 내용은 아래 리스트에서 확인할 수 있어요.</p>
          </div>
        </div>
      )
    },
    {
      title: "산책을 기록해요",
      icon: "🚶",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/health_ttr_05.svg" alt="건강 튜토리얼 5" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">시작 시간과 종료 시간을 입력하면</p>
            <p className="text-sm text-gray-600">산책 시간이 자동 계산되어 리스트에 저장돼요.</p>
          </div>
        </div>
      )
    }
  ];

  const getHomePages = () => [
    {
      title: "오늘의 케어를 빠르게 기록해요",
      icon: "🏠",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/home_ttr_01.svg" alt="홈 튜토리얼 1" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">퀵 버튼을 눌러서 바로 루틴을 기록할 수 있어요.</p>
            <p className="text-sm text-gray-600">색깔별로 구분되어 한눈에 알아보기 쉬워요.</p>
          </div>
        </div>
      )
    },
    {
      title: "오늘 완료한 루틴을 확인해요",
      icon: "📊",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/home_ttr_02.svg" alt="홈 튜토리얼 2" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">오늘 완료한 루틴을 시간순으로 확인할 수 있어요.</p>
            <p className="text-sm text-gray-600">✏️ 버튼으로 기록을 수정하거나 삭제할 수 있어요.</p>
          </div>
        </div>
      )
    },
    {
      title: "다가오는 일정을 확인해요",
      icon: "📅",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/home_ttr_03.svg" alt="홈 튜토리얼 3" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">정기 루틴의 다가오는 일정을 확인할 수 있어요.</p>
            <p className="text-sm text-gray-600">D-day로 남은 날짜를 한눈에 볼 수 있어요.</p>
          </div>
        </div>
      )
    },
    {
      title: "빠른 루틴 추가",
      icon: "➕",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/home_ttr_04.svg" alt="홈 튜토리얼 4" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">➕ 버튼을 눌러서 새로운 루틴을 빠르게 추가할 수 있어요.</p>
            <p className="text-sm text-gray-600">날짜와 시간을 선택해서 정확한 기록을 남길 수 있어요.</p>
          </div>
        </div>
      )
    },
    {
      title: "홈 화면 완성",
      icon: "✅",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/home_ttr_05.svg" alt="홈 튜토리얼 5" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">홈 화면에서 오늘의 모든 케어를 한눈에 확인하고</p>
            <p className="text-sm text-gray-600">빠르게 기록할 수 있어요.</p>
          </div>
        </div>
      )
    }
  ];

  const getDiaryPages = () => [
    {
      title: "다이어리 쓰고 모아봐요",
      icon: "📖",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/diary_ttr_01.svg" alt="다이어리 튜토리얼 1" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">맨 위 버튼을 누르면 새 일기를 작성할 수 있어요.</p>
            <p className="text-sm text-gray-600">작성한 일기는 아래에서 피드 형태로 쌓여 확인할 수 있어요.</p>
          </div>
        </div>
      )
    },
    {
      title: "새 일기를 작성해요",
      icon: "✏️",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/diary_ttr_02.svg" alt="다이어리 튜토리얼 2" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">날짜, 제목, 내용을 입력하고 사진도 함께 올려</p>
            <p className="text-sm text-gray-600">일기를 기록할 수 있어요.</p>
          </div>
        </div>
      )
    }
  ];

  const getSettingsPages = () => [
    {
      title: "루틴·약 버튼을 관리해요",
      icon: "⚙️",
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src="/img/setting_ttr_01.svg" alt="설정 튜토리얼 1" className="w-full max-w-xs rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">루틴 버튼과 약 버튼을 추가·편집·삭제할 수 있어요.</p>
            <p className="text-sm text-gray-600">버튼을 편집하려면 원하는 버튼을 클릭하세요.</p>
          </div>
        </div>
      )
    }
  ];

  const getPages = () => {
    switch (tab) {
      case "calendar":
        return getCalendarPages();
      case "health":
        return getHealthPages();
      case "home":
        return getHomePages();
      case "diary":
        return getDiaryPages();
      case "settings":
        return getSettingsPages();
      default:
        return [
          {
            title: "사용설명서",
            icon: "🐕",
            content: (
              <div className="text-center space-y-4">
                <div className="text-4xl mb-4">🐕</div>
                <p className="text-gray-600">
                  기본 사용설명서입니다.
                </p>
              </div>
            )
          }
        ];
    }
  };

  const pages = getPages();
  const currentPageData = pages[currentPage];

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      onClose();
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full h-[600px] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentPageData.icon}</span>
            <h2 className="text-lg font-bold">{currentPageData.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 페이지 내용 */}
        <div className="p-6 flex-1 overflow-y-auto">
          {currentPageData.content}
        </div>

        {/* 페이지네이션 */}
        <div className="flex justify-center gap-2 pb-4 flex-shrink-0">
          {pages.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentPage ? 'bg-blue-400' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="p-6 border-t flex-shrink-0">
          {/* 다시보지않기 체크박스 */}
          <div className="flex justify-center mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => onDontShowAgainChange(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-600">
                다시 보지 않기
              </span>
            </label>
          </div>
          
          <div className="flex gap-2">
            {currentPage > 0 && (
              <button
                onClick={prevPage}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium"
              >
                이전
              </button>
            )}
            <button
              onClick={nextPage}
              className={`py-3 rounded-xl font-medium ${
                currentPage > 0 ? 'flex-1 bg-black text-white' : 'w-full bg-black text-white'
              }`}
            >
              {currentPage === pages.length - 1 ? '확인' : '다음'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ onLogout, onShowTutorial }) {
  const [showMenu, setShowMenu] = useState(false);
  const { currentUser } = auth;

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b px-6 pt-[env(safe-area-inset-top)]">
      <div className="h-16 flex items-end justify-between">
        <div className="flex items-center gap-2">
        <h1 className="font-bold text-2xl tracking-tight -mt-1 mb-1">Banana Care</h1>
          
          {/* 도움말 버튼 */}
          <button
            onClick={onShowTutorial}
            className="p-0.5 rounded-full hover:bg-gray-100"
          >
            <img src="/img/question.svg" alt="도움말" className="w-3 h-3" />
          </button>
        </div>
        
        {/* 헤더 우측 버튼들 */}
        <div className="flex items-center gap-2 -mt-3">
          {/* 프로필 이미지와 케밥 메뉴 */}
          <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 -mt-3 z-30"
          >
            {/* 프로필 이미지 */}
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="프로필" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-gray-600">
                  {currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U'}
                </span>
              )}
            </div>
            
            {/* 케밥 메뉴 아이콘 */}
            <svg 
              className="w-4 h-4 text-gray-600" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {/* 드롭다운 메뉴 */}
          {showMenu && (
            <div 
              className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border py-1 z-30"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  onLogout();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                로그아웃
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}

function BottomNav({ tab, onChange }) {
  const Item = ({ id, label }) => (
    <button
      onClick={() => onChange(id)}
      className={`flex flex-col items-center justify-center ${tab === id ? "text-blue-700 font-semibold" : "text-gray-600"}`}
    >
      {id === "home" && <img src="/img/home.png" alt="홈" className="w-5 h-5" />}
      {id !== "home" && <span className="text-sm">{label}</span>}
    </button>
  );
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center">
      <div className="w-full max-w-[420px] border-t bg-white px-6 pb-[env(safe-area-inset-bottom)]">
        <div className="h-14 grid grid-cols-5">
          <Item id="calendar" label="캘린더" />
          <Item id="health" label="건강" />
          <Item id="home" label="홈" />
          <Item id="diary" label="다이어리" />
          <Item id="settings" label="설정" />
        </div>
      </div>
    </nav>
  );
}

/***************************
 * 캘린더 화면
 ***************************/
function CalendarScreen({ calendar, routine, timeline = [], onDeleteByDate, onAddRoutine, weight = [], meds = [], walks = [], diary = [], medCategories = [] }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { localIndex, label, time }
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [tempRoutine, setTempRoutine] = useState(null);
  const [addRoutineDate, setAddRoutineDate] = useState("");
  const [addRoutineTime, setAddRoutineTime] = useState("");
  const [filterType, setFilterType] = useState("routine"); // routine, weight, med, walk, diary
  
  // 단순한 월 달력(현재 월)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0(Sun)-6(Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // 날짜 문자열 생성 함수 (한국 시간대 기준)
  const getDateString = (year, month, day) => {
    const date = new Date(year, month, day);
    const yearStr = date.getFullYear();
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}`;
  };

  // 모든 루틴 색상 풀 생성
  const allRoutineColors = [
    ...routine.am.map(item => item.color),
    ...routine.pm.map(item => item.color),
    ...routine.reg.map(item => item.color)
  ];

  const handleDateClick = (dateStr) => {
    if (dateStr) {
      setSelectedDate(dateStr);
      setShowDateModal(true);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 필터별 데이터 가져오기
  const getFilteredData = (dateStr) => {
    switch (filterType) {
      case "routine":
        return (calendar[dateStr] || []).filter(l => l && String(l).trim());
      case "weight":
        return weight.filter(item => item.date === dateStr);
      case "med":
        // 실제 투약 기록 + 정기 투약
        const actualMeds = meds.filter(item => item.date === dateStr);
        const regularMeds = medCategories
          .filter(med => med.frequency && med.frequency !== "once")
          .filter(med => {
            const date = new Date(dateStr);
            switch (med.frequency) {
              case "daily":
                return true;
              case "weekly":
                return date.getDay() === 0; // 일요일
              case "monthly":
                return date.getDate() === 1; // 1일
              case "yearly":
                return date.getMonth() === 2 && date.getDate() === 15; // 3월 15일
              default:
                return false;
            }
          });
        return [...actualMeds, ...regularMeds.map(med => ({ ...med, isRegular: true }))];
      case "walk":
        return walks.filter(item => item.date === dateStr);
      case "diary":
        return diary.filter(item => item.date === dateStr);
      default:
        return [];
    }
  };

  // 필터별 표시 아이템 렌더링
  const renderFilteredItems = (dateStr) => {
    const data = getFilteredData(dateStr);
    
    switch (filterType) {
      case "routine":
        return data.map((routineLabel, idx) => {
                  const routineItem = [
                    ...routine.am,
                    ...routine.pm,
                    ...routine.reg
                  ].find(item => item.label === routineLabel);
                  
                  const color = routineItem ? routineItem.color : allRoutineColors[idx % allRoutineColors.length];
                  
                  return (
                    <span 
                      key={idx} 
              className="w-2 h-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: color }} 
                    />
                  );
        });
      case "weight":
        return data.map((item, idx) => (
          <span key={idx} className="text-xs text-gray-700 flex-shrink-0">
            {item.kg}kg
          </span>
        ));
      case "med":
        return data.map((item, idx) => {
          // 정기 투약인지 확인
          const isRegular = item.isRegular;
          // 약 카테고리에서 색상 찾기
          const medCategory = medCategories.find(med => med.name === item.type || med.name === item.name);
          const color = medCategory ? medCategory.color : "#DDEFFF";
          
          return (
            <span 
              key={idx} 
              className={`w-2 h-2 rounded-full flex-shrink-0 ${isRegular ? 'border border-gray-400' : ''}`}
              style={{ backgroundColor: color }} 
              title={isRegular ? `${item.name || item.type} (정기)` : item.type || item.name}
            />
          );
        });
      case "walk":
        return data.map((item, idx) => (
          <span key={idx} className="text-xs text-gray-700 flex-shrink-0">
            {item.minutes}분
          </span>
        ));
      case "diary":
        return data.length > 0 ? (
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-400" />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <section aria-labelledby="cal-title">
      <h2 id="cal-title" className="sr-only">캘린더</h2>
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">{year}년 {month + 1}월</div>
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1 text-sm border rounded-lg bg-white"
        >
          <option value="routine">루틴</option>
          <option value="weight">몸무게</option>
          <option value="med">투약기록</option>
          <option value="walk">산책기록</option>
          <option value="diary">다이어리</option>
        </select>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500 mb-2">
        {"일월화수목금토".split("").map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const dateStr = d ? getDateString(year, month, d) : "";
          
          return (
            <button
              key={i}
              onClick={() => handleDateClick(dateStr)}
              className="min-h-[4rem] rounded-xl bg-white border flex flex-col items-center p-1 hover:bg-gray-50 transition-colors"
            >
              <div className={`text-sm ${[0,6].includes((i)%7)?"text-red-500":""}`}>{d || ""}</div>
              <div className="flex flex-wrap gap-1 justify-start w-full flex-1 items-center">
                {renderFilteredItems(dateStr)}
              </div>
            </button>
          );
        })}
      </div>

      {showDateModal && selectedDate && (
        <Modal onClose={() => setShowDateModal(false)}>
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-lg text-left">{formatDate(selectedDate)}</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="w-8 h-8 grid place-items-center rounded-lg border"
                  title="추가"
                >
                  <img src="/img/add.png" alt="추가" className="w-4 h-4" />
                </button>
              <button
                type="button"
                onClick={() => setEditMode(v => !v)}
                className="w-8 h-8 grid place-items-center rounded-lg border"
                title={editMode ? "완료" : "편집"}
                aria-pressed={editMode}
              >
                {editMode ? (
                  <span className="text-xs font-medium">완료</span>
                ) : (
                  <img src="/img/edit.png" alt="편집" className="w-4 h-4" />
                )}
              </button>
              </div>
            </div>
            <div className="space-y-3 text-left">
              {(timeline.filter(t => t.date === selectedDate && t.label && String(t.label).trim())).length > 0 ? (
                timeline
                  .filter(t => t.date === selectedDate && t.label && String(t.label).trim())
                  .map((t, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="text-sm text-gray-500 w-20">{t.time}</span>
                      <span className="text-sm font-medium flex-1">{t.label}</span>
                      {editMode && (
                        <button
                          type="button"
                          className="w-6 h-6 grid place-items-center rounded-full border text-xs text-gray-600"
                          title="삭제"
                          onClick={() => setConfirmDelete({ localIndex: index, label: t.label, time: t.time })}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))
              ) : (
                calendar[selectedDate] && calendar[selectedDate].filter(l => l && String(l).trim()).length > 0 ? (
                  calendar[selectedDate].filter(l => l && String(l).trim()).map((routineLabel, index) => {
                    const routineItem = [
                      ...routine.am,
                      ...routine.pm,
                      ...routine.reg
                    ].find(item => item.label === routineLabel);
                    const color = routineItem ? routineItem.color : allRoutineColors[index % allRoutineColors.length];
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium">{routineLabel}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-400 py-4">이 날 기록된 루틴이 없습니다</div>
                )
              )}
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button 
                className="px-3 py-2 rounded-xl border" 
                onClick={() => setShowDateModal(false)}
              >
                닫기
              </button>
            </div>
            {confirmDelete && (
              <div className="pt-2">
                <Modal onClose={() => setConfirmDelete(null)}>
                  <div className="space-y-4 text-center">
                    <div className="font-semibold text-lg">삭제하시겠습니까?</div>
                    <div className="space-y-3 text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-16">항목:</span>
                        <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{confirmDelete.label}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-16">시간:</span>
                        <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{confirmDelete.time}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-center pt-2">
                      <button className="px-3 py-2 rounded-xl border" onClick={() => setConfirmDelete(null)}>취소</button>
                      <button
                        className="px-3 py-2 rounded-xl border bg-red-500 text-white"
                        onClick={() => { onDeleteByDate && onDeleteByDate(selectedDate, confirmDelete.localIndex); setConfirmDelete(null); }}
                      >
                        예
                      </button>
                    </div>
                  </div>
                </Modal>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 루틴 추가 모달 */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <div className="space-y-4 text-center">
            <div className="font-semibold text-lg">루틴 추가</div>
            <div className="space-y-3">
              <div className="text-sm text-gray-600 mb-2">추가할 루틴을 선택하세요</div>
              
              {/* 데일리 루틴 - 오전 */}
              <div className="text-left">
                <div className="text-sm text-gray-600 mb-2">오전</div>
                <div className="flex flex-wrap gap-2">
                  {routine.am.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setTempRoutine(item);
                        setAddRoutineDate(selectedDate);
                        setAddRoutineTime(nowTime());
                        setShowAddModal(false);
                        setShowTimeModal(true);
                      }}
                      className="px-3 py-2 rounded-lg border text-sm font-medium"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 데일리 루틴 - 오후 */}
              <div className="text-left">
                <div className="text-sm text-gray-600 mb-2">오후</div>
                <div className="flex flex-wrap gap-2">
                  {routine.pm.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setTempRoutine(item);
                        setAddRoutineDate(selectedDate);
                        setAddRoutineTime(nowTime());
                        setShowAddModal(false);
                        setShowTimeModal(true);
                      }}
                      className="px-3 py-2 rounded-lg border text-sm font-medium"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 정기 루틴 */}
              <div className="text-left">
                <div className="text-sm text-gray-600 mb-2">정기</div>
                <div className="flex flex-wrap gap-2">
                  {routine.reg.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setTempRoutine(item);
                        setAddRoutineDate(selectedDate);
                        setAddRoutineTime(nowTime());
                        setShowAddModal(false);
                        setShowTimeModal(true);
                      }}
                      className="px-3 py-2 rounded-lg border text-sm font-medium"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 justify-center pt-2">
              <button 
                className="px-3 py-2 rounded-xl border" 
                onClick={() => setShowAddModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 날짜/시간 선택 모달 */}
      {showTimeModal && tempRoutine && (
        <Modal onClose={() => setShowTimeModal(false)}>
          <div className="space-y-4 text-center">
            <div className="font-semibold text-lg">시간 설정</div>
            <div className="space-y-3">
              <div className="text-left">
                <div className="text-sm text-gray-600 mb-2">선택된 루틴</div>
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">
                  {tempRoutine.label}
                </div>
              </div>
              
              <div className="text-left">
                <div className="text-sm text-gray-600 mb-2">날짜</div>
                <input
                  type="date"
                  value={addRoutineDate}
                  onChange={(e) => setAddRoutineDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-center"
                />
              </div>
              
              <div className="text-left">
                <div className="text-sm text-gray-600 mb-2">시간</div>
                <input
                  type="time"
                  value={addRoutineTime}
                  onChange={(e) => setAddRoutineTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-center"
                />
              </div>
            </div>
            
            <div className="flex gap-2 justify-center pt-2">
              <button 
                className="px-3 py-2 rounded-xl border" 
                onClick={() => setShowTimeModal(false)}
              >
                취소
              </button>
              <button
                className="px-3 py-2 rounded-xl border bg-black text-white"
                onClick={() => {
                  onAddRoutine(tempRoutine.label, tempRoutine.color, addRoutineDate, addRoutineTime);
                  setShowTimeModal(false);
                  setTempRoutine(null);
                }}
              >
                추가
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

/***************************
 * 홈(오늘) 화면
 ***************************/
function HomeScreen({ timeline, routine, upcoming, onQuickAdd, onApplyTimeline }) {
  const [editMode, setEditMode] = useState(false);
  const [draftTimeline, setDraftTimeline] = useState(null);
  const [confirm, setConfirm] = useState(null); // {label,color,date,time}

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (confirm) {
        if (e.key === 'Enter') {
          e.preventDefault();
          onQuickAdd(confirm.label, confirm.color, confirm.date, confirm.time);
          setConfirm(null);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setConfirm(null);
        }
      }
    };

    if (confirm) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [confirm, onQuickAdd]);
  return (
    <div className="space-y-6">
      {/* 오늘 요약 */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
          <div className="font-semibold">오늘 케어 기록</div>
          <div className="text-sm text-gray-500">{todayStr()}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!editMode) {
                setDraftTimeline(timeline);
                setEditMode(true);
              } else {
                onApplyTimeline(draftTimeline || []);
                setEditMode(false);
                setDraftTimeline(null);
              }
            }}
            className="w-8 h-8 grid place-items-center rounded-lg border"
            title={editMode ? "완료" : "편집"}
            aria-pressed={editMode}
          >
            {editMode ? (
              <span className="text-xs font-medium">완료</span>
            ) : (
              <img src="/img/edit.png" alt="편집" className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="rounded-xl bg-white">
          {(editMode ? (draftTimeline?.length || 0) : timeline.length) === 0 ? (
            <div className="text-sm text-gray-400">아직 기록이 없어요</div>
          ) : (
            <ul className="space-y-2">
              {(editMode ? draftTimeline : timeline).slice().reverse().map((t, idx, arr) => {
                const originalIndex = (editMode ? draftTimeline : timeline).length - 1 - idx;
                return (
                <li key={idx} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color || "#E6F4EA" }} />
                  <span className="text-sm text-gray-500 w-20">{t.time}</span>
                  <span className="text-sm">{t.label}</span>
                    {editMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraftTimeline(prev => prev.filter((_, i) => i !== originalIndex));
                        }}
                        className="ml-auto w-6 h-6 grid place-items-center rounded-full border text-xs text-gray-600"
                        aria-label="삭제"
                        title="삭제"
                      >
                        ×
                      </button>
                    )}
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {/* 데일리루틴 */}
      <section>
        <h3 className="font-semibold text-lg mb-2">데일리루틴</h3>
        <div className="text-sm text-gray-500 mb-1">오전</div>
        <ChipRow items={routine.am} onAdd={(item)=>setConfirm({ label:item.label, color: item.color, date: todayStr(), time: nowTime() })} />
        <div className="text-sm text-gray-500 mt-3 mb-1">오후</div>
        <ChipRow items={routine.pm} onAdd={(item)=>setConfirm({ label:item.label, color: item.color, date: todayStr(), time: nowTime() })} />
        <h4 className="font-semibold text-lg mt-5 mb-2">정기루틴</h4>
        <ChipRow items={routine.reg} onAdd={(item)=>setConfirm({ label:item.label, color: item.color, date: todayStr(), time: nowTime() })} />
      </section>

      {/* 다가오는 일정 */}
      <Card>
        <div className="font-semibold mb-2">다가오는 일정</div>
        {upcoming.length === 0 ? (
          <div className="text-sm text-gray-400">예정 없음</div>
        ) : (
          <ul className="space-y-3 text-sm">
            {upcoming.map((u, i) => {
              // 날짜 포맷팅
              const formatDate = (date) => {
                const month = date.getMonth() + 1;
                const day = date.getDate();
                const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                return `${month}월 ${day}일 (${weekday})`;
              };

              // D-day 스타일 결정
              let dDayStyle = "text-gray-500";
              if (u.days === 0) {
                dDayStyle = "text-red-500 font-bold";
              } else if (u.days === 1) {
                dDayStyle = "text-orange-500 font-semibold";
              } else if (u.days <= 3) {
                dDayStyle = "text-yellow-600 font-medium";
              }

              return (
                <li key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: u.color }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`${dDayStyle}`}>{u.d}</span>
                      <span className="font-medium">{u.label}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDate(u.nextDate)}
                    </div>
                  </div>
              </li>
              );
            })}
          </ul>
        )}
      </Card>

      {confirm && (
        <Modal onClose={()=>setConfirm(null)}>
          <div className="space-y-4 text-center">
            <div className="font-semibold text-lg">기록 하시겠습니까?</div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">항목:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{confirm.label}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">날짜:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{confirm.date}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">시간:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{confirm.time}</div>
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button 
                className="px-3 py-2 rounded-xl border" 
                onClick={()=>setConfirm(null)}
              >
                취소
              </button>
              <button
                className="px-3 py-2 rounded-xl border bg-black text-white"
                onClick={() => { onQuickAdd(confirm.label, confirm.color, confirm.date, confirm.time); setConfirm(null); }}
                autoFocus
              >
                확인
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ChipRow({ items, onAdd }) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <button 
          key={item.label} 
          onClick={()=>onAdd(item)} 
          className="min-w-[92px] h-12 rounded-2xl border px-4 text-gray-800 font-medium"
          style={{ backgroundColor: item.color }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/***************************
 * 건강 화면 (몸무게 / 투약 / 산책 탭)
 ***************************/
function HealthScreen({ weight, meds, walks, onAddWeight, onAddMed, onAddWalk, onDeleteWeight, onDeleteMed, onDeleteWalk, medCategories, onMedCategoriesChange }) {
  const [sub, setSub] = useState("weight");
  return (
    <div>
      <div className="flex gap-3 mb-4">
        {[
          {id:"weight", label:"몸무게"},
          {id:"med", label:"투약 기록"},
          {id:"walk", label:"산책 기록"},
        ].map(t => (
          <button key={t.id} onClick={()=>setSub(t.id)} className={`px-4 h-10 rounded-full border ${sub===t.id?"bg-black text-white":"bg-white"}`}>{t.label}</button>
        ))}
      </div>

      {sub === "weight" && <WeightTab list={weight} onAdd={onAddWeight} onDelete={onDeleteWeight} />}
      {sub === "med" && <MedTab list={meds} onAdd={onAddMed} onDelete={onDeleteMed} medCategories={medCategories} onMedCategoriesChange={onMedCategoriesChange} />}
      {sub === "walk" && <WalkTab list={walks} onAdd={onAddWalk} onDelete={onDeleteWalk} />}
    </div>
  );
}

function WeightTab({ list, onAdd, onDelete }) {
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(todayStr());
  const [editMode, setEditMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const data = useMemo(()=> {
    return list
      .map(i=>({ date:i.date, kg:i.kg }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },[list]);

  const deleteWeight = (index) => {
    onDelete(index);
    setDeleteModal(null);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50"> 
        <div className="font-medium mb-2">몸무게 입력</div>
        <div className="flex gap-2">
          <input 
            type="date" 
            value={date} 
            onChange={(e)=>setDate(e.target.value)} 
            className="px-3 py-2 rounded-xl border" 
          />
          <input type="number" step="0.01" placeholder="kg" value={kg} onChange={(e)=>setKg(e.target.value)} className="px-3 py-2 rounded-xl border w-28" />
          <button onClick={()=>{ if(!kg) return; onAdd(parseFloat(kg), date); setKg(""); setDate(todayStr()); }} className="px-2 py-2 rounded-xl border text-sm whitespace-nowrap">추가</button>
        </div>
      </Card>
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">그래프 보기</div>
          <button
            type="button"
            onClick={() => setEditMode(v => !v)}
            className="w-8 h-8 grid place-items-center rounded-lg border"
            title={editMode ? "완료" : "편집"}
            aria-pressed={editMode}
          >
            {editMode ? (
              <span className="text-xs font-medium">완료</span>
            ) : (
              <img src="/img/edit.png" alt="편집" className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="h-56 w-full bg-white rounded-2xl border">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={["auto","auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="kg" dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">리스트 보기</div>
          <button
            type="button"
            onClick={() => setEditMode(v => !v)}
            className="w-8 h-8 grid place-items-center rounded-lg border"
            title={editMode ? "완료" : "편집"}
            aria-pressed={editMode}
          >
            {editMode ? (
              <span className="text-xs font-medium">완료</span>
            ) : (
              <img src="/img/edit.png" alt="편집" className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="bg-white rounded-2xl border p-3">
          {list.length === 0 ? (
            <div className="text-sm text-gray-400">기록 없음</div>
          ) : (
            <div className="space-y-2">
              {list.slice().reverse().map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex gap-4 text-sm">
                    <span>{item.date}</span>
                    <span>{item.time}</span>
                    <span className="font-medium">{item.kg} kg</span>
                    <span className={item.diff > 0 ? "text-red-500" : "text-blue-500"}>
                      {item.diff > 0 ? `+${item.diff}` : item.diff || 0} kg
                    </span>
                  </div>
                  {editMode && (
                    <button
                      onClick={() => setDeleteModal({ index: list.length - 1 - index, item })}
                      className="w-6 h-6 grid place-items-center rounded-full border text-xs text-gray-600"
                      title="삭제"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {deleteModal && (
        <Modal onClose={() => setDeleteModal(null)}>
          <div className="space-y-4 text-center">
            <div className="font-semibold text-lg">삭제하시겠습니까?</div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">날짜:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{deleteModal.item.date}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">몸무게:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{deleteModal.item.kg} kg</div>
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setDeleteModal(null)}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-red-500 text-white"
                onClick={() => deleteWeight(deleteModal.index)}
              >
                예
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MedTab({ list, onAdd, onDelete, medCategories, onMedCategoriesChange }) {
  const [type, setType] = useState("");
  const [dose, setDose] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState({ type: "", dose: "" });

  const [editMode, setEditMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);

  const handleAdd = () => {
    // 새로운 약을 입력했을 때 자동으로 카테고리에 추가
    addNewMedCategory();
    
    setConfirmData({ type, dose });
    setShowConfirm(true);
  };

  const confirmAdd = () => {
    onAdd(confirmData.type, confirmData.dose);
    setType("슬개골약");
    setDose("1알");
    setShowConfirm(false);
  };



  const deleteMed = (index) => {
    onDelete(index);
    setDeleteModal(null);
  };

  const selectMed = (med) => {
    setType(med.name);
    setDose(med.dose);
  };

  const addNewMedCategory = () => {
    if (type.trim() && dose.trim()) {
      // 이미 존재하는 카테고리인지 확인
      const existingMed = medCategories.find(med => med.name === type.trim());
      if (!existingMed) {
        // 새로운 카테고리 추가
        const newMed = {
          name: type.trim(),
          dose: dose.trim(),
          color: ROUTINE_COLORS[Math.floor(Math.random() * ROUTINE_COLORS.length)],
          frequency: "once"
        };
        onMedCategoriesChange([...medCategories, newMed]);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50">
        <div className="font-medium mb-2">투약 기록 입력</div>
        
        <div className="overflow-x-auto mb-3">
          <div className="flex gap-2 min-w-max">
            {medCategories.map((med, index) => (
              <button
                key={index}
                onClick={() => selectMed(med)}
                className={`px-3 py-2 rounded-xl border text-sm ${type === med.name ? 'border-blue-300' : ''}`}
                style={{ backgroundColor: med.color || "#DDEFFF" }}
              >
                {med.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <input value={type} onChange={(e)=>setType(e.target.value)} className="px-3 py-2 rounded-xl border w-28" placeholder="약이름" />
          <input value={dose} onChange={(e)=>setDose(e.target.value)} className="px-3 py-2 rounded-xl border w-24" placeholder="용량" />
          <button onClick={handleAdd} className="px-2 py-2 rounded-xl border text-sm whitespace-nowrap">추가</button>
        </div>
      </Card>
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">리스트 보기</div>
          <button
            type="button"
            onClick={() => setEditMode(v => !v)}
            className="w-8 h-8 grid place-items-center rounded-lg border"
            title={editMode ? "완료" : "편집"}
            aria-pressed={editMode}
          >
            {editMode ? (
              <span className="text-xs font-medium">완료</span>
            ) : (
              <img src="/img/edit.png" alt="편집" className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="bg-white rounded-2xl border p-3">
          {list.length === 0 ? (
            <div className="text-sm text-gray-400">기록 없음</div>
          ) : (
            <div className="space-y-2">
              {list.slice().reverse().map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex gap-4 text-sm">
                    <span>{item.date}</span>
                    <span>{item.time}</span>
                    <span className="font-medium">{item.type}</span>
                    <span>{item.dose}</span>
                  </div>
                  {editMode && (
                    <button
                      onClick={() => setDeleteModal({ index: list.length - 1 - index, item })}
                      className="w-6 h-6 grid place-items-center rounded-full border text-xs text-gray-600"
                      title="삭제"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>



      {showConfirm && (
        <Modal onClose={() => setShowConfirm(false)}>
          <div className="space-y-4 text-center">
            <div className="font-semibold text-lg">투약 기록을 추가하시겠습니까?</div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">약 종류:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{confirmData.type}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">용량:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{confirmData.dose}</div>
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setShowConfirm(false)}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-blue-500 text-white"
                onClick={confirmAdd}
              >
                추가
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteModal && (
        <Modal onClose={() => setDeleteModal(null)}>
          <div className="space-y-4 text-center">
            <div className="font-semibold text-lg">삭제하시겠습니까?</div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">약 종류:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{deleteModal.item.type}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">용량:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{deleteModal.item.dose}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">날짜:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{deleteModal.item.date}</div>
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setDeleteModal(null)}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-red-500 text-white"
                onClick={() => deleteMed(deleteModal.index)}
              >
                예
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function WalkTab({ list, onAdd, onDelete }) {
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("08:00");
  const [date, setDate] = useState(todayStr());
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState({ start: "", end: "", minutes: 0, date: "" });
  const [editMode, setEditMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);

  // 시작시간과 종료시간으로부터 분 계산
  const calculateMinutes = (startTime, endTime) => {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    const diffMs = end - start;
    return Math.round(diffMs / (1000 * 60));
  };

  const handleAdd = () => {
    const minutes = calculateMinutes(start, end);
    setConfirmData({ start, end, minutes, date });
    setShowConfirm(true);
  };

  const confirmAdd = () => {
    onAdd(confirmData.start, confirmData.end, confirmData.minutes, confirmData.date);
    setStart("07:00");
    setEnd("08:00");
    setDate(todayStr());
    setShowConfirm(false);
  };

  const deleteWalk = (index) => {
    onDelete(index);
    setDeleteModal(null);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">산책 기록 입력</div>
          <button onClick={handleAdd} className="px-3 py-2 rounded-xl border">추가</button>
        </div>
        <div className="space-y-3">
          <div>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">시작시간</div>
              <input type="time" value={start} onChange={(e)=>setStart(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">종료시간</div>
              <input type="time" value={end} onChange={(e)=>setEnd(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
          </div>

        </div>
      </Card>
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">리스트 보기</div>
          <button
            type="button"
            onClick={() => setEditMode(v => !v)}
            className="w-8 h-8 grid place-items-center rounded-lg border"
            title={editMode ? "완료" : "편집"}
            aria-pressed={editMode}
          >
            {editMode ? (
              <span className="text-xs font-medium">완료</span>
            ) : (
              <img src="/img/edit.png" alt="편집" className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="bg-white rounded-2xl border p-3">
          {list.length === 0 ? (
            <div className="text-sm text-gray-400">기록 없음</div>
          ) : (
            <div className="space-y-2">
              {/* 헤더 */}
              <div className="flex gap-4 text-xs text-gray-500 pb-1 border-b">
                <span className="w-20">날짜</span>
                <span className="w-12">시작</span>
                <span className="w-12">종료</span>
                <span className="w-12">시간</span>
              </div>
              {/* 데이터 */}
              {list.slice().reverse().map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex gap-4 text-sm">
                    <span className="w-20">{item.date}</span>
                    <span className="w-12">{item.start}</span>
                    <span className="w-12">{item.end}</span>
                    <span className="w-12">{item.minutes}분</span>
                  </div>
                  {editMode && (
                    <button
                      onClick={() => setDeleteModal({ index: list.length - 1 - index, item })}
                      className="w-6 h-6 grid place-items-center rounded-full border text-xs text-gray-600"
                      title="삭제"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {showConfirm && (
        <Modal onClose={() => setShowConfirm(false)}>
          <div className="space-y-4 text-center">
            <div className="font-semibold text-lg">산책 기록을 추가하시겠습니까?</div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">날짜:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{confirmData.date}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">시작시간:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{confirmData.start}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">종료시간:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{confirmData.end}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">산책시간:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{confirmData.minutes}분</div>
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setShowConfirm(false)}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-blue-500 text-white"
                onClick={confirmAdd}
              >
                추가
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteModal && (
        <Modal onClose={() => setDeleteModal(null)}>
          <div className="space-y-4 text-center">
            <div className="font-semibold text-lg">삭제하시겠습니까?</div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">시작시간:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{deleteModal.item.start}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">종료시간:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{deleteModal.item.end}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">산책시간:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{deleteModal.item.minutes}분</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">날짜:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{deleteModal.item.date}</div>
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setDeleteModal(null)}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-red-500 text-white"
                onClick={() => deleteWalk(deleteModal.index)}
              >
                예
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/***************************
 * 다이어리(카테고리 설정) 화면
 ***************************/
function DiaryScreen() {
  const [entries, setEntries] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: todayStr(),
    title: "",
    content: "",
    image: null
  });
  const [editMode, setEditMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);

  const addEntry = () => {
    if (newEntry.title.trim() && newEntry.content.trim()) {
      if (editingEntry) {
        // 편집 모드
        setEntries(prev => prev.map(entry => 
          entry.id === editingEntry.id ? { ...newEntry, id: editingEntry.id } : entry
        ));
        setEditingEntry(null);
      } else {
        // 새 일기 작성
      setEntries(prev => [...prev, { ...newEntry, id: Date.now() }]);
      }
      setNewEntry({ date: todayStr(), title: "", content: "", image: null });
      setShowModal(false);
    }
  };

  const deleteEntry = (index) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
    setDeleteModal(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewEntry(prev => ({ ...prev, image: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const editEntry = (entry) => {
    setEditingEntry(entry);
    setNewEntry({
      date: entry.date,
      title: entry.title,
      content: entry.content,
      image: entry.image
    });
    setShowModal(true);
  };

  return (
    <section>
      <div className="font-semibold text-xl mb-4">다이어리</div>
      
      {/* 새 일기 작성 버튼 */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full h-12 rounded-2xl border border-dashed border-gray-300 text-gray-500 mb-6 flex items-center justify-center gap-2"
      >
        <span className="text-lg">+</span>
        <span>새 일기 작성</span>
      </button>

      {/* 일기 목록 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">일기 피드</div>
          <button
            type="button"
            onClick={() => setEditMode(v => !v)}
            className="w-8 h-8 grid place-items-center rounded-lg border"
            title={editMode ? "완료" : "편집"}
            aria-pressed={editMode}
          >
            {editMode ? (
              <span className="text-xs font-medium">완료</span>
            ) : (
              <img src="/img/edit.png" alt="편집" className="w-4 h-4" />
            )}
          </button>
        </div>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-lg mb-2">아직 작성된 일기가 없어요</div>
            <div className="text-sm">첫 번째 일기를 작성해보세요!</div>
          </div>
        ) : (
          entries.slice().reverse().map((entry, index) => (
            <Card key={entry.id}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">{entry.date}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-400">#{entry.id}</div>
                    {editMode && (
                      <>
                        <button
                          onClick={() => editEntry(entry)}
                          className="w-6 h-6 grid place-items-center rounded-full border text-xs text-gray-600"
                          title="편집"
                        >
                          <img src="/img/edit.png" alt="편집" className="w-3 h-3" />
                        </button>
                      <button
                        onClick={() => setDeleteModal({ index: entries.length - 1 - index, entry })}
                        className="w-6 h-6 grid place-items-center rounded-full border text-xs text-gray-600"
                        title="삭제"
                      >
                        ×
                      </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="font-semibold text-lg">{entry.title}</div>
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{entry.content}</div>
                {entry.image && (
                  <img src={entry.image} alt="일기 이미지" className="w-full h-48 object-cover rounded-xl" />
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 새 일기 작성/편집 모달 */}
      {showModal && (
        <Modal onClose={() => { setShowModal(false); setEditingEntry(null); }}>
          <div className="space-y-4 text-center">
            <div className="font-semibold text-lg">{editingEntry ? "일기 편집" : "새 일기 작성"}</div>
            
            <div className="space-y-3">
              <input
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-center"
              />
              
              <input
                type="text"
                placeholder="제목"
                value={newEntry.title}
                onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-center"
              />
              
              <textarea
                placeholder="내용을 입력하세요..."
                value={newEntry.content}
                onChange={(e) => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-center min-h-[100px] resize-none"
              />
              
              <div className="space-y-2">
                <label className="block text-sm text-gray-600">이미지 추가</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 rounded-xl border text-center"
                />
                {newEntry.image && (
                  <img src={newEntry.image} alt="미리보기" className="w-full h-32 object-cover rounded-xl" />
                )}
              </div>
            </div>
            
            <div className="flex gap-2 justify-center pt-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => { setShowModal(false); setEditingEntry(null); }}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-black text-white"
                onClick={addEntry}
              >
                {editingEntry ? "수정" : "작성"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 삭제 확인 모달 */}
      {deleteModal && (
        <Modal onClose={() => setDeleteModal(null)}>
          <div className="space-y-4 text-center">
            <div className="font-semibold text-lg">삭제하시겠습니까?</div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">제목:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{deleteModal.entry.title}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">날짜:</span>
                <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-center font-medium">{deleteModal.entry.date}</div>
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setDeleteModal(null)}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-red-500 text-white"
                onClick={() => deleteEntry(deleteModal.index)}
              >
                예
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

/***************************
 * 설정 화면
 ***************************/
function SettingsScreen({ routine, onChange, medCategories, onMedCategoriesChange }) {
  const [showModal, setShowModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [newRoutine, setNewRoutine] = useState({ name: "", type: "daily", time: "am", frequency: "daily", color: ROUTINE_COLORS[0], startDate: todayStr() });
  const [editMode, setEditMode] = useState(true);
  const [editingRoutine, setEditingRoutine] = useState(null); // { where, index, item }
  const [showMedModal, setShowMedModal] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [newMed, setNewMed] = useState({ name: "", dose: "", color: "#DDEFFF", frequency: "once" });
  const [deleteMedModal, setDeleteMedModal] = useState(null);
  
  const getRandomAvailableColor = (where) => {
    const used = new Set((routine[where] || []).map(i => i.color).filter(Boolean));
    const candidates = ROUTINE_COLORS.filter(c => !used.has(c));
    if (candidates.length === 0) {
      return ROUTINE_COLORS[Math.floor(Math.random() * ROUTINE_COLORS.length)];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  const addRoutine = () => {
    if (newRoutine.name.trim()) {
      const where = newRoutine.type === "daily" ? newRoutine.time : "reg";
      const routineData = where === "reg" 
        ? { label: newRoutine.name.trim(), color: newRoutine.color, freq: { type: newRoutine.frequency, startDate: newRoutine.startDate } }
        : { label: newRoutine.name.trim(), color: newRoutine.color };
      onChange({ ...routine, [where]: Array.from(new Set([...(routine[where]||[]), routineData])) });
      setNewRoutine({ name: "", type: "daily", time: "am", frequency: "daily", color: getRandomAvailableColor(where), startDate: todayStr() });
      setShowModal(false);
    }
  };

  const updateRoutine = () => {
    if (editingRoutine && newRoutine.name.trim()) {
      const where = newRoutine.type === "daily" ? newRoutine.time : "reg";
      const newList = [...routine[editingRoutine.where]];
      const routineData = where === "reg" 
        ? { label: newRoutine.name.trim(), color: newRoutine.color, freq: { type: newRoutine.frequency, startDate: newRoutine.startDate } }
        : { label: newRoutine.name.trim(), color: newRoutine.color };
      newList[editingRoutine.index] = routineData;
      onChange({ ...routine, [where]: newList });
      setNewRoutine({ name: "", type: "daily", time: "am", frequency: "daily", color: getRandomAvailableColor(where), startDate: todayStr() });
      setEditingRoutine(null);
      setShowModal(false);
    }
  };

  const deleteRoutine = (where, index) => {
    const newList = routine[where].filter((_, i) => i !== index);
    onChange({ ...routine, [where]: newList });
    setDeleteModal(null);
  };

  // 약 카테고리 관리 함수들
  const addMedCategory = () => {
    if (newMed.name.trim() && newMed.dose.trim()) {
      if (editingMed) {
        // 편집 모드
        const newList = [...medCategories];
        newList[editingMed.index] = { ...newMed };
        onMedCategoriesChange(newList);
        setEditingMed(null);
      } else {
        // 새 카테고리 추가
        onMedCategoriesChange([...medCategories, { ...newMed }]);
      }
      setNewMed({ name: "", dose: "", color: "#DDEFFF" });
      setShowMedModal(false);
    }
  };

  const deleteMedCategory = (index) => {
    const newList = medCategories.filter((_, i) => i !== index);
    onMedCategoriesChange(newList);
    setDeleteMedModal(null);
  };

  const editMedCategory = (index, med) => {
    setEditingMed({ index, med });
    setNewMed({ name: med.name, dose: med.dose, color: med.color, frequency: med.frequency || "once" });
    setShowMedModal(true);
  };

  const handleRoutineClick = (where, index, item) => {
    if (editMode) {
      setEditingRoutine({ where, index, item });
      setNewRoutine({
        name: item.label,
        type: where === "reg" ? "regular" : "daily",
        time: where === "am" ? "am" : "pm",
        frequency: item.freq?.type || "daily",
        color: item.color,
        startDate: item.freq?.startDate || todayStr()
      });
      setShowModal(true);
    }
  };

  const Row = ({ title, list, where }) => (
    <div className="mb-6">
      {title && <div className="text-sm text-gray-600 mb-2">{title}</div>}
      <div className="flex flex-wrap gap-3">
        {list.map((item, index) => (
          <div key={item.label} className="relative">
            <button
              onClick={() => handleRoutineClick(where, index, item)}
              className={`min-w-[92px] h-12 rounded-2xl border flex items-center justify-between px-4 ${editMode ? 'cursor-pointer' : ''}`}
              style={{ backgroundColor: item.color }}
            >
              <span>{item.label}</span>
              {editMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteModal({ where, index, label: item.label }); }}
                  className="w-6 h-6 flex items-center justify-center"
                  title="삭제"
                >
                  <img src="/img/delete.png" alt="삭제" className="w-4 h-4" />
                </button>
              )}
            </button>
          </div>
        ))}
        <button onClick={() => { 
          setEditingRoutine(null); 
          setNewRoutine({ 
            name: "", 
            type: where === "reg" ? "regular" : "daily", 
            time: where === "am" ? "am" : "pm", 
            frequency: "daily", 
            color: getRandomAvailableColor(where) 
          }); 
          setShowModal(true); 
        }} className="min-w-[92px] h-12 rounded-2xl border border-dashed text-gray-400 text-sm">루틴 버튼 추가 +</button>
      </div>
    </div>
  );

  return (
    <section>
      <div className="mb-2">
        <div className="font-semibold text-xl">카테고리 설정</div>
      </div>
      <div className="text-sm text-gray-600 mb-4">버튼을 편집하려면 원하는 버튼을 클릭하세요.</div>
      <div className="font-semibold text-lg mb-2">데일리루틴</div>
      <Row title="오전" list={routine.am} where="am" />
      <Row title="오후" list={routine.pm} where="pm" />
      <div className="font-semibold text-lg mt-2 mb-2">정기루틴</div>
      <Row title="" list={routine.reg} where="reg" />
      
      <div className="font-semibold text-lg mt-6 mb-2">약 카테고리</div>
      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          {medCategories.map((med, index) => (
            <div key={med.name} className="relative">
              <button
                onClick={() => editMode && editMedCategory(index, med)}
                className={`min-w-[92px] h-12 rounded-2xl border flex items-center justify-between px-4 ${editMode ? 'cursor-pointer' : ''}`}
                style={{ backgroundColor: med.color }}
              >
                <span className="text-sm">{med.name}</span>
                {editMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteMedModal({ index, med }); }}
                    className="w-6 h-6 flex items-center justify-center"
                    title="삭제"
                  >
                    <img src="/img/delete.png" alt="삭제" className="w-4 h-4" />
                  </button>
                )}
              </button>
            </div>
          ))}
          <button onClick={() => { setShowMedModal(true); setEditingMed(null); setNewMed({ name: "", dose: "", color: "#DDEFFF", frequency: "once" }); }} className="min-w-[92px] h-12 rounded-2xl border border-dashed text-gray-400 text-sm">약 버튼 추가 +</button>
        </div>
      </div>

      {showModal && (
        <Modal onClose={() => { setShowModal(false); setEditingRoutine(null); }}>
          <div className="space-y-3 text-center">
            <div className="font-semibold text-lg">{editingRoutine ? "루틴 수정" : "새 루틴 추가"}</div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="루틴 이름"
                value={newRoutine.name}
                onChange={(e) => setNewRoutine(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-center"
              />
              <select
                value={newRoutine.type}
                onChange={(e) => setNewRoutine(prev => ({ ...prev, type: e.target.value, time: e.target.value === "daily" ? "am" : "am" }))}
                className="w-full px-3 py-2 rounded-xl border text-center"
              >
                <option value="daily">데일리루틴</option>
                <option value="regular">정기루틴</option>
              </select>
              {newRoutine.type === "daily" && (
                <div className="flex gap-2 justify-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="time"
                      value="am"
                      checked={newRoutine.time === "am"}
                      onChange={(e) => setNewRoutine(prev => ({ ...prev, time: e.target.value }))}
                    />
                    <span className="text-sm">오전</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="time"
                      value="pm"
                      checked={newRoutine.time === "pm"}
                      onChange={(e) => setNewRoutine(prev => ({ ...prev, time: e.target.value }))}
                    />
                    <span className="text-sm">오후</span>
                  </label>
                </div>
              )}
              {newRoutine.type === "regular" && (
                <>
                <select
                  value={newRoutine.frequency}
                  onChange={(e) => setNewRoutine(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-center"
                >
                  <option value="daily">매일</option>
                    <option value="weekly">매주 {new Date(newRoutine.startDate).toLocaleDateString('ko-KR', { weekday: 'long' })}</option>
                    <option value="monthly">매월 {new Date(newRoutine.startDate).getDate()}일</option>
                    <option value="yearly">매년 {new Date(newRoutine.startDate).getMonth() + 1}월 {new Date(newRoutine.startDate).getDate()}일</option>
                </select>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">시작일:</span>
                    <input
                      type="date"
                      value={newRoutine.startDate}
                      onChange={(e) => setNewRoutine(prev => ({ ...prev, startDate: e.target.value }))}
                      className="flex-1 px-3 py-2 rounded-xl border text-center"
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <label className="block text-sm text-gray-600">색상 선택</label>
                <div className="grid grid-cols-6 gap-2">
                  {ROUTINE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewRoutine(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 ${newRoutine.color === color ? 'border-gray-800' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => { setShowModal(false); setEditingRoutine(null); }}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-black text-white"
                onClick={editingRoutine ? updateRoutine : addRoutine}
              >
                {editingRoutine ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 약 카테고리 추가/편집 모달 */}
      {showMedModal && (
        <Modal onClose={() => { setShowMedModal(false); setEditingMed(null); }}>
          <div className="space-y-4 text-center">
            <div className="font-semibold text-lg">{editingMed ? "약 카테고리 편집" : "새 약 카테고리 추가"}</div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">약 이름:</span>
                <input
                  type="text"
                  value={newMed.name}
                  onChange={(e) => setNewMed(prev => ({ ...prev, name: e.target.value }))}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  placeholder="약 이름"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">용량:</span>
                <input
                  type="text"
                  value={newMed.dose}
                  onChange={(e) => setNewMed(prev => ({ ...prev, dose: e.target.value }))}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  placeholder="1알, 5ml 등"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">투약 주기:</span>
                <select
                  value={newMed.frequency}
                  onChange={(e) => setNewMed(prev => ({ ...prev, frequency: e.target.value }))}
                  className="flex-1 px-3 py-2 border rounded-lg"
                >
                  <option value="once">한 번만 투약</option>
                  <option value="daily">매일</option>
                  <option value="weekly">매주</option>
                  <option value="monthly">매월</option>
                  <option value="yearly">매년</option>
                </select>
              </div>
              {newMed.frequency !== "once" && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-16">주기 설정:</span>
                  <select
                    value={newMed.frequency}
                    onChange={(e) => setNewMed(prev => ({ ...prev, frequency: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded-lg"
                  >
                    {newMed.frequency === "daily" && <option value="daily">매일</option>}
                    {newMed.frequency === "weekly" && (
                      <option value="weekly">매주 {new Date().toLocaleDateString('ko-KR', { weekday: 'long' })}</option>
                    )}
                    {newMed.frequency === "monthly" && (
                      <option value="monthly">매월 {new Date().getDate()}일</option>
                    )}
                    {newMed.frequency === "yearly" && (
                      <option value="yearly">매년 {new Date().getMonth() + 1}월 {new Date().getDate()}일</option>
                    )}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-sm text-gray-600">색상 선택</label>
                <div className="grid grid-cols-6 gap-2">
                  {ROUTINE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewMed(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 ${newMed.color === color ? 'border-gray-800' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => { setShowMedModal(false); setEditingMed(null); }}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-blue-500 text-white"
                onClick={addMedCategory}
              >
                {editingMed ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 약 카테고리 삭제 모달 */}
      {deleteMedModal && (
        <Modal onClose={() => setDeleteMedModal(null)}>
          <div className="space-y-3 text-center">
            <div className="font-semibold text-lg">삭제하시겠습니까?</div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{deleteMedModal.med.name}</span> 약 카테고리를 삭제하시겠습니까?
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setDeleteMedModal(null)}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-red-500 text-white"
                onClick={() => deleteMedCategory(deleteMedModal.index)}
              >
                예
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteModal && (
        <Modal onClose={() => setDeleteModal(null)}>
          <div className="space-y-3 text-center">
            <div className="font-semibold text-lg">삭제하시겠습니까?</div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{deleteModal.label}</span> 루틴을 삭제하시겠습니까?
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setDeleteModal(null)}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-red-500 text-white"
                onClick={() => deleteRoutine(deleteModal.where, deleteModal.index)}
              >
                예
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

/***************************
 * 공용 UI
 ***************************/
function Card({ children, className="" }) {
  return (
    <div className={`bg-white rounded-2xl border p-4 ${className}`}>{children}</div>
  );
}

function Table({ cols = [], rows = [] }) {
  return (
    <div className="bg-white rounded-2xl border p-3">
      {rows.length === 0 ? (
        <div className="text-sm text-gray-400">기록 없음</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-gray-500">
            <tr>{cols.map((c) => <th key={c} className="text-left py-1 pr-2">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {r.map((cell, j) => <td key={j} className="py-1 pr-2 align-top">{String(cell)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[380px] bg-white rounded-2xl border p-4 shadow-lg">
        {children}
      </div>
    </div>
  );
}

/***************************
 * 엔트리 생성기
 ***************************/
function makeWeightEntry(kg, date) {
  const prev = load().weight.slice(-1)[0];
  const lastKg = prev?.kg || 0;
  const diff = lastKg ? +(kg - lastKg).toFixed(1) : 0;
  return { date: date, time: nowTime(), kg: +kg, diff };
}
function makeMedEntry(type, dose) {
  return { date: todayStr(), time: nowTime(), type, dose };
}
function makeWalkEntry(start, end, minutes, date) {
  return { date: date || todayStr(), start, end, minutes: +minutes };
}
