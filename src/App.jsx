import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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
  "#DDEFFF", "#FFF0DD", "#FFDFDD", "#EAE4F5", "#DFEFDE", "#FAFAEA",
  "#F0F8FF", "#FFF5EE", "#F0FFF0", "#FFE4E1", "#E6E6FA", "#F5F5DC"
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
    am: [],
    pm: [],
    reg: [],
  },
  // 이벤트(다가오는 일정) - 사용자가 추가
  upcoming: [],
  // 건강 탭 데이터
  weight: [],
  meds: [],
  walks: [],
};

function load() {
  try { 
    const raw = localStorage.getItem(KEY); 
    if (raw) {
      const data = JSON.parse(raw);
      // 마이그레이션: 기존 문자열 배열을 새로운 객체 구조로 변환
      if (data.routine && Array.isArray(data.routine.am) && typeof data.routine.am[0] === 'string') {
        const colorPool = ROUTINE_COLORS;
        data.routine = {
          am: data.routine.am.map((label, index) => ({ label, color: colorPool[index % colorPool.length] })),
          pm: data.routine.pm.map((label, index) => ({ label, color: colorPool[index % colorPool.length] })),
          reg: data.routine.reg.map((label, index) => ({ label, color: colorPool[index % colorPool.length] }))
        };
      }
      // 색상 유니크 랜덤 배정(리스트별)
      const assignUniqueRandom = (list=[]) => {
        const palette = [...ROUTINE_COLORS];
        // shuffle
        for (let i = palette.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [palette[i], palette[j]] = [palette[j], palette[i]];
        }
        return list.map((item, idx) => ({
          label: item.label,
          color: palette[idx % palette.length],
        }));
      };
      if (data.routine) {
        data.routine.am = assignUniqueRandom(data.routine.am || []);
        data.routine.pm = assignUniqueRandom(data.routine.pm || []);
        data.routine.reg = assignUniqueRandom(data.routine.reg || []);
      }
      return data;
    }
    return defaultState; 
  } catch { 
    return defaultState; 
  }
}
function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

export default function App() {
  const [tab, setTab] = useState("home"); // calendar | today | home | health | diary → 디자인상: calendar/today(home)/health/diary
  const [state, setState] = useState(defaultState);

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
    const entries = [];
    for (const item of reg) {
      const freq = item?.freq;
      if (!freq || !freq.type) continue;
      let next = null;
      if (freq.type === 'daily') {
        next = startOfToday;
      } else if (freq.type === 'weekly' && typeof freq.weekday === 'number') {
        const wd = freq.weekday; // 0-6
        const cur = startOfToday.getDay();
        const delta = (wd - cur + 7) % 7; // 0..6
        next = new Date(startOfToday);
        next.setDate(startOfToday.getDate() + delta);
      } else if (freq.type === 'monthly' && typeof freq.day === 'number') {
        const d = freq.day; // 1..31
        const y = startOfToday.getFullYear();
        const m = startOfToday.getMonth();
        const thisMonth = new Date(y, m, Math.min(d, 28) + (d > 28 ? 3 : 0));
        // Create carefully to handle months shorter than d
        next = new Date(y, m, d);
        if (isNaN(next.getTime()) || next < startOfToday) {
          next = new Date(y, m + 1, d);
        }
      } else if (freq.type === 'yearly' && typeof freq.month === 'number' && typeof freq.day === 'number') {
        const y = startOfToday.getFullYear();
        next = new Date(y, freq.month - 1, freq.day);
        if (next < startOfToday) next = new Date(y + 1, freq.month - 1, freq.day);
      }
      if (!next) continue;
      const diffMs = next.getTime() - startOfToday.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      entries.push({ label: item.label, color: item.color, d: `-${days}` });
    }
    entries.sort((a, b) => parseInt(a.d) - parseInt(b.d));
    return entries;
  }, [state.routine?.reg]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex justify-center">
      <div className="w-full max-w-[420px] min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 px-6 py-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
          {tab === "calendar" && <CalendarScreen calendar={state.calendar} routine={state.routine} timeline={state.timeline} onDeleteByDate={deleteTimelineByDateIndex} />}
          {tab === "home" && (
            <HomeScreen
              timeline={state.timeline}
              routine={state.routine}
              upcoming={computeUpcoming}
              onQuickAdd={addTimeline}
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
            />
          )}
          {tab === "diary" && (
            <DiaryScreen />
          )}
          {tab === "settings" && (
            <SettingsScreen
              routine={state.routine}
              onChange={(r)=> setState(p => ({ ...p, routine: r }))}
            />
          )}
        </main>

        <BottomNav tab={tab} onChange={setTab} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b px-6 pt-[env(safe-area-inset-top)]">
      <div className="h-16 flex items-end">
        <h1 className="font-bold text-2xl tracking-tight -mt-1 mb-1">Banana Care</h1>
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
      {id === "home" && <img src="/src/assets/home.png" alt="홈" className="w-5 h-5" />}
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
function CalendarScreen({ calendar, routine, timeline = [], onDeleteByDate }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { localIndex, label, time }
  
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

  return (
    <section aria-labelledby="cal-title">
      <h2 id="cal-title" className="sr-only">캘린더</h2>
      <div className="text-lg font-semibold mb-3">{year}년 {month + 1}월</div>
      <div className="grid grid-cols-7 gap-2 text-center text-sm text-gray-500 mb-2">
        {"일월화수목금토".split("").map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((d, i) => {
          const dateStr = d ? getDateString(year, month, d) : "";
          const dayRoutines = (calendar[dateStr] || []).filter(l => l && String(l).trim());
          
          return (
            <button
              key={i}
              onClick={() => handleDateClick(dateStr)}
              className="h-16 rounded-xl bg-white border flex flex-col items-center p-1 justify-between hover:bg-gray-50 transition-colors"
            >
              <div className={`text-sm ${[0,6].includes((i)%7)?"text-red-500":""}`}>{d || ""}</div>
              <div className="flex gap-1 pb-1">
                {dayRoutines.slice(0, 5).map((routineLabel, idx) => {
                  // 해당 루틴의 색상 찾기
                  const routineItem = [
                    ...routine.am,
                    ...routine.pm,
                    ...routine.reg
                  ].find(item => item.label === routineLabel);
                  
                  const color = routineItem ? routineItem.color : allRoutineColors[idx % allRoutineColors.length];
                  
                  return (
                    <span 
                      key={idx} 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: color }} 
                    />
                  );
                })}
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
                  <img src="/src/assets/edit.png" alt="편집" className="w-4 h-4" />
                )}
              </button>
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
  return (
    <div className="space-y-6">
      {/* 오늘 요약 */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
          <div className="font-semibold">오늘 요약</div>
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
              <img src="/src/assets/edit.png" alt="편집" className="w-4 h-4" />
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
          <ul className="space-y-2 text-sm">
            {upcoming.map((u, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: u.color }} />
                <span className="text-gray-500">D{u.d}</span>
                <span className="">{u.label}</span>
              </li>
            ))}
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
              <button className="px-3 py-2 rounded-xl border" onClick={()=>setConfirm(null)}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-black text-white"
                onClick={() => { onQuickAdd(confirm.label, confirm.color, confirm.date, confirm.time); setConfirm(null); }}
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
function HealthScreen({ weight, meds, walks, onAddWeight, onAddMed, onAddWalk }) {
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

      {sub === "weight" && <WeightTab list={weight} onAdd={onAddWeight} />}
      {sub === "med" && <MedTab list={meds} onAdd={onAddMed} />}
      {sub === "walk" && <WalkTab list={walks} onAdd={onAddWalk} />}
    </div>
  );
}

function WeightTab({ list, onAdd }) {
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(todayStr());
  const [editMode, setEditMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const data = useMemo(()=> list.map(i=>({ date:i.date, kg:i.kg })),[list]);

  const deleteWeight = (index) => {
    // Weight deletion logic would need to be passed from parent
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
              <img src="/src/assets/edit.png" alt="편집" className="w-4 h-4" />
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
              <img src="/src/assets/edit.png" alt="편집" className="w-4 h-4" />
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

function MedTab({ list, onAdd }) {
  const [type, setType] = useState("");
  const [dose, setDose] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState({ type: "", dose: "" });
  const [showNewMedModal, setShowNewMedModal] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", dose: "", frequency: "daily", color: "#DDEFFF" });
  const [medCategories, setMedCategories] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);

  const handleAdd = () => {
    setConfirmData({ type, dose });
    setShowConfirm(true);
  };

  const confirmAdd = () => {
    onAdd(confirmData.type, confirmData.dose);
    setType("슬개골약");
    setDose("1알");
    setShowConfirm(false);
  };

  const addNewMed = () => {
    if (newMed.name.trim() && newMed.dose.trim()) {
      setMedCategories(prev => [...prev, { ...newMed }]);
      setNewMed({ name: "", dose: "", frequency: "daily", color: "#DDEFFF" });
      setShowNewMedModal(false);
    }
  };

  const selectMed = (med) => {
    setType(med.name);
    setDose(med.dose);
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
            <button onClick={() => setShowNewMedModal(true)} className="px-3 py-2 rounded-xl border border-dashed text-gray-400 text-sm">+</button>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <input value={type} onChange={(e)=>setType(e.target.value)} className="px-3 py-2 rounded-xl border w-28" />
          <input value={dose} onChange={(e)=>setDose(e.target.value)} className="px-3 py-2 rounded-xl border w-24" />
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
              <img src="/src/assets/edit.png" alt="편집" className="w-4 h-4" />
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
                onClick={() => { /* Delete logic */ setDeleteModal(null); }}
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

function WalkTab({ list, onAdd }) {
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("08:00");
  const [minutes, setMinutes] = useState(60);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState({ start: "", end: "", minutes: 0 });
  const [editMode, setEditMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);

  const handleAdd = () => {
    setConfirmData({ start, end, minutes });
    setShowConfirm(true);
  };

  const confirmAdd = () => {
    onAdd(confirmData.start, confirmData.end, confirmData.minutes);
    setStart("07:00");
    setEnd("08:00");
    setMinutes(60);
    setShowConfirm(false);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">산책 기록 입력</div>
          <button onClick={handleAdd} className="px-3 py-2 rounded-xl border">추가</button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="time" value={start} onChange={(e)=>setStart(e.target.value)} className="px-3 py-2 rounded-xl border" />
          <input type="time" value={end} onChange={(e)=>setEnd(e.target.value)} className="px-3 py-2 rounded-xl border" />
          <div className="flex items-center gap-1">
          <input type="number" value={minutes} onChange={(e)=>setMinutes(parseInt(e.target.value||"0"))} className="px-3 py-2 rounded-xl border w-24" />
            <span className="text-gray-600">분</span>
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
              <img src="/src/assets/edit.png" alt="편집" className="w-4 h-4" />
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
                    <span>{item.start}</span>
                    <span>{item.end}</span>
                    <span>{item.minutes}분</span>
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
                onClick={() => { /* Delete logic */ setDeleteModal(null); }}
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

  const addEntry = () => {
    if (newEntry.title.trim() && newEntry.content.trim()) {
      setEntries(prev => [...prev, { ...newEntry, id: Date.now() }]);
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
          <div className="font-semibold text-lg">일기 목록</div>
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
              <img src="/src/assets/edit.png" alt="편집" className="w-4 h-4" />
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
                      <button
                        onClick={() => setDeleteModal({ index: entries.length - 1 - index, entry })}
                        className="w-6 h-6 grid place-items-center rounded-full border text-xs text-gray-600"
                        title="삭제"
                      >
                        ×
                      </button>
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

      {/* 새 일기 작성 모달 */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="space-y-4 text-center">
            <div className="font-semibold text-lg">새 일기 작성</div>
            
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
              <button className="px-3 py-2 rounded-xl border" onClick={() => setShowModal(false)}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-black text-white"
                onClick={addEntry}
              >
                작성
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
function SettingsScreen({ routine, onChange }) {
  const [showModal, setShowModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [newRoutine, setNewRoutine] = useState({ name: "", type: "daily", time: "am", frequency: "daily", color: ROUTINE_COLORS[0] });
  const [editMode, setEditMode] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null); // { where, index, item }
  
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
      onChange({ ...routine, [where]: Array.from(new Set([...(routine[where]||[]), { label: newRoutine.name.trim(), color: newRoutine.color }])) });
      setNewRoutine({ name: "", type: "daily", time: "am", frequency: "daily", color: getRandomAvailableColor(where) });
      setShowModal(false);
    }
  };

  const updateRoutine = () => {
    if (editingRoutine && newRoutine.name.trim()) {
      const where = newRoutine.type === "daily" ? newRoutine.time : "reg";
      const newList = [...routine[editingRoutine.where]];
      newList[editingRoutine.index] = { label: newRoutine.name.trim(), color: newRoutine.color };
      onChange({ ...routine, [where]: newList });
      setNewRoutine({ name: "", type: "daily", time: "am", frequency: "daily", color: getRandomAvailableColor(where) });
      setEditingRoutine(null);
      setShowModal(false);
    }
  };

  const deleteRoutine = (where, index) => {
    const newList = routine[where].filter((_, i) => i !== index);
    onChange({ ...routine, [where]: newList });
    setDeleteModal(null);
  };

  const handleRoutineClick = (where, index, item) => {
    if (editMode) {
      setEditingRoutine({ where, index, item });
      setNewRoutine({
        name: item.label,
        type: where === "reg" ? "regular" : "daily",
        time: where === "am" ? "am" : "pm",
        frequency: "daily",
        color: item.color
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
                  <img src="/src/assets/delete.png" alt="삭제" className="w-4 h-4" />
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
        }} className="min-w-[92px] h-12 rounded-2xl border border-dashed grid place-items-center text-gray-400">+</button>
      </div>
    </div>
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-xl">카테고리 설정</div>
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
            <img src="/src/assets/edit.png" alt="편집" className="w-4 h-4" />
          )}
        </button>
      </div>
      <div className="font-semibold text-lg mb-2">데일리루틴</div>
      <Row title="오전" list={routine.am} where="am" />
      <Row title="오후" list={routine.pm} where="pm" />
      <div className="font-semibold text-lg mt-2 mb-2">정기루틴</div>
      <Row title="" list={routine.reg} where="reg" />

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
                <select
                  value={newRoutine.frequency}
                  onChange={(e) => setNewRoutine(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-center"
                >
                  <option value="daily">매일</option>
                  <option value="weekly">매주 {new Date().toLocaleDateString('ko-KR', { weekday: 'long' })}</option>
                  <option value="monthly">매월 {new Date().getDate()}일</option>
                  <option value="yearly">매년 {new Date().getMonth() + 1}월 {new Date().getDate()}일</option>
                </select>
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
function makeWalkEntry(start, end, minutes) {
  return { date: todayStr(), start, end, minutes: +minutes };
}
