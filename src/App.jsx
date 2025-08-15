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
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const defaultState = {
  // 캘린더용 샘플 로그 (date -> ["영양제","산책",...])
  calendar: {
    // 예시 데이터
    // "2025-08-05": ["영양제", "아침식사", "저녁식사", "양치"],
  },
  // 오늘 요약 타임라인
  timeline: [], // [{time: "09:32 PM", label: "관절영양제", color:"#E6F4EA"}]
  // 루틴 카테고리
  routine: {
    am: ["양치", "아침식사", "눈영양제"],
    pm: ["산책", "저녁식사", "관절영양제"],
    reg: ["목욕", "미용", "발톱깎기"],
  },
  // 이벤트(다가오는 일정)
  upcoming: [
    { label: "귀청소", d: -3, color: "#F9E1F1" },
    { label: "예방접종", d: -25, color: "#DDF7FA" },
  ],
  // 건강 탭 데이터
  weight: [], // [{date:"2025-08-15", time:"01:14 PM", kg:2.85, diff:+0.3}]
  meds: [], // [{date,time,type,dose}]
  walks: [], // [{date,start,end,minutes}]
};

function load() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : defaultState; } catch { return defaultState; }
}
function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

export default function App() {
  const [tab, setTab] = useState("home"); // calendar | today | home | health | diary → 디자인상: calendar/today(home)/health/diary
  const [state, setState] = useState(defaultState);

  useEffect(() => { setState(load()); }, []);
  useEffect(() => { save(state); }, [state]);

  // 오늘 요약 타임라인용 헬퍼
  const addTimeline = (label, color, dateOverride, timeOverride) => {
    const timeToSave = timeOverride || nowTime();
    const dateToSave = dateOverride || todayStr();
    setState(prev => ({
      ...prev,
      timeline: [
        ...prev.timeline,
        { time: timeToSave, label, color }
      ]
    }));
    // 캘린더 점 표시용
    setState(prev => ({
      ...prev,
      calendar: {
        ...prev.calendar,
        [dateToSave]: Array.from(new Set([...(prev.calendar[dateToSave] || []), label]))
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex justify-center">
      <div className="w-full max-w-[420px] min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 px-6 py-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
          {tab === "calendar" && <CalendarScreen calendar={state.calendar} />}
          {tab === "home" && (
            <HomeScreen
              timeline={state.timeline}
              routine={state.routine}
              upcoming={state.upcoming}
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
      {id === "home" && <img src="/image/home.png" alt="홈" className="w-5 h-5" />}
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
function CalendarScreen({ calendar }) {
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

  const colorPool = ["#E6F4EA", "#FDF0D5", "#F7FBE7", "#FCE4EC", "#E7F0FF"]; // 연한 점들

  return (
    <section aria-labelledby="cal-title">
      <h2 id="cal-title" className="sr-only">캘린더</h2>
      <div className="text-lg font-semibold mb-3">{year}년 {month + 1}월</div>
      <div className="grid grid-cols-7 gap-2 text-center text-sm text-gray-500 mb-2">
        {"일월화수목금토".split("").map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((d, i) => {
          const dateStr = d ? new Date(year, month, d).toISOString().slice(0, 10) : "";
          const dots = calendar[dateStr] || [];
          return (
            <div key={i} className="h-16 rounded-xl bg-white border flex flex-col items-center p-1 justify-between">
              <div className={`text-sm ${[0,6].includes((i)%7)?"text-red-500":""}`}>{d || ""}</div>
              <div className="flex gap-1 pb-1">
                {dots.slice(0,5).map((_, idx) => (
                  <span key={idx} className="w-3 h-3 rounded-full" style={{ backgroundColor: colorPool[idx%colorPool.length] }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
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
              <img src="/image/edit.png" alt="편집" className="w-4 h-4" />
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
        <ChipRow labels={routine.am} onAdd={(l)=>setConfirm({ label:l, color: "#E6F4EA", date: todayStr(), time: nowTime() })} />
        <div className="text-sm text-gray-500 mt-3 mb-1">오후</div>
        <ChipRow labels={routine.pm} onAdd={(l)=>setConfirm({ label:l, color: "#E7F0FF", date: todayStr(), time: nowTime() })} />
        <h4 className="font-semibold text-lg mt-5 mb-2">정기루틴</h4>
        <ChipRow labels={routine.reg} onAdd={(l)=>setConfirm({ label:l, color: "#FDF0D5", date: todayStr(), time: nowTime() })} />
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
          <div className="space-y-3 text-center">
            <div className="font-semibold text-lg">기록 하시겠습니까?</div>
            <div className="text-sm text-gray-600"><span className="font-medium">{confirm.label}</span></div>
            <div className="text-sm text-gray-600"><span className="font-medium">{confirm.date}</span></div>
            <div className="text-sm text-gray-600"><span className="font-medium">{confirm.time}</span></div>
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

function ChipRow({ labels, onAdd }) {
  return (
    <div className="flex flex-wrap gap-3">
      {labels.map((label) => (
        <button key={label} onClick={()=>onAdd(label)} className="min-w-[92px] h-12 rounded-2xl border px-4 bg-white">
          {label}
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
  const data = useMemo(()=> list.map(i=>({ date:i.date, kg:i.kg })),[list]);
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
          <button onClick={()=>{ if(!kg) return; onAdd(parseFloat(kg), date); setKg(""); setDate(todayStr()); }} className="px-3 py-2 rounded-xl border">추가</button>
        </div>
      </Card>
      <section>
        <div className="font-semibold mb-2">그래프 보기</div>
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
        <div className="font-semibold mb-2">리스트 보기</div>
        <Table cols={["날짜","시간","몸무게","변화량"]} rows={list.slice().reverse().map(w=>[w.date,w.time,`${w.kg} kg`, w.diff>0?`+ ${w.diff} kg`: `${w.diff||0} kg`])} />
      </section>
    </div>
  );
}

function MedTab({ list, onAdd }) {
  const [type, setType] = useState("슬개골약");
  const [dose, setDose] = useState("1알");
  return (
    <div className="space-y-6">
      <Card className="bg-blue-50">
        <div className="font-medium mb-2">투약 기록 입력</div>
        <div className="flex gap-2 items-center">
          <input value={type} onChange={(e)=>setType(e.target.value)} className="px-3 py-2 rounded-xl border" />
          <input value={dose} onChange={(e)=>setDose(e.target.value)} className="px-3 py-2 rounded-xl border w-24" />
          <button onClick={()=>onAdd(type, dose)} className="px-3 py-2 rounded-xl border">추가</button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="px-4 h-10 rounded-2xl border bg-white grid place-items-center">슬개골약</span>
          <span className="px-4 h-10 rounded-2xl border border-dashed text-gray-400 grid place-items-center">+</span>
        </div>
      </Card>
      <section>
        <div className="font-semibold mb-2">리스트 보기</div>
        <Table cols={["날짜","시간","약 종류","용량"]} rows={list.slice().reverse().map(m=>[m.date,m.time,m.type,m.dose])} />
      </section>
    </div>
  );
}

function WalkTab({ list, onAdd }) {
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("08:00");
  const [minutes, setMinutes] = useState(60);
  return (
    <div className="space-y-6">
      <Card className="bg-blue-50">
        <div className="font-medium mb-2">산책 기록 입력</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="time" value={start} onChange={(e)=>setStart(e.target.value)} className="px-3 py-2 rounded-xl border" />
          <input type="time" value={end} onChange={(e)=>setEnd(e.target.value)} className="px-3 py-2 rounded-xl border" />
          <input type="number" value={minutes} onChange={(e)=>setMinutes(parseInt(e.target.value||"0"))} className="px-3 py-2 rounded-xl border w-24" />
          <button onClick={()=>onAdd(start,end,minutes)} className="px-3 py-2 rounded-xl border">추가</button>
        </div>
      </Card>
      <section>
        <div className="font-semibold mb-2">그래프 보기</div>
        <Table cols={["날짜","시작시간","종료시간","분"]} rows={list.slice().reverse().map(w=>[w.date,w.start,w.end,w.minutes])} />
      </section>
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

  const addEntry = () => {
    if (newEntry.title.trim() && newEntry.content.trim()) {
      setEntries(prev => [...prev, { ...newEntry, id: Date.now() }]);
      setNewEntry({ date: todayStr(), title: "", content: "", image: null });
      setShowModal(false);
    }
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
        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-lg mb-2">아직 작성된 일기가 없어요</div>
            <div className="text-sm">첫 번째 일기를 작성해보세요!</div>
          </div>
        ) : (
          entries.slice().reverse().map((entry) => (
            <Card key={entry.id}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">{entry.date}</div>
                  <div className="text-xs text-gray-400">#{entry.id}</div>
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
    </section>
  );
}

/***************************
 * 설정 화면
 ***************************/
function SettingsScreen({ routine, onChange }) {
  const [showModal, setShowModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [newRoutine, setNewRoutine] = useState({ name: "", type: "daily", time: "am", frequency: "daily" });

  const addRoutine = () => {
    if (newRoutine.name.trim()) {
      const where = newRoutine.type === "daily" ? newRoutine.time : "reg";
      onChange({ ...routine, [where]: Array.from(new Set([...(routine[where]||[]), newRoutine.name.trim()])) });
      setNewRoutine({ name: "", type: "daily", time: "am", frequency: "daily" });
      setShowModal(false);
    }
  };

  const deleteRoutine = (where, index) => {
    const newList = routine[where].filter((_, i) => i !== index);
    onChange({ ...routine, [where]: newList });
    setDeleteModal(null);
  };

  const Row = ({ title, list, where }) => (
    <div className="mb-6">
      {title && <div className="text-sm text-gray-600 mb-2">{title}</div>}
      <div className="flex flex-wrap gap-3">
        {list.map((l, index) => (
          <div key={l} className="relative">
            <span className="min-w-[92px] h-12 rounded-2xl border bg-white flex items-center justify-between px-4">
              <span>{l}</span>
              <button
                onClick={() => setDeleteModal({ where, index, label: l })}
                className="w-6 h-6 flex items-center justify-center"
                title="삭제"
              >
                <img src="/image/delete.png" alt="삭제" className="w-4 h-4" />
              </button>
            </span>
          </div>
        ))}
        <button onClick={() => setShowModal(true)} className="min-w-[92px] h-12 rounded-2xl border border-dashed grid place-items-center text-gray-400">+</button>
      </div>
    </div>
  );

  return (
    <section>
      <div className="font-semibold text-xl mb-4">카테고리 설정</div>
      <div className="font-semibold text-lg mb-2">데일리루틴</div>
      <Row title="오전" list={routine.am} where="am" />
      <Row title="오후" list={routine.pm} where="pm" />
      <div className="font-semibold text-lg mt-2 mb-2">정기루틴</div>
      <Row title="" list={routine.reg} where="reg" />

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="space-y-3 text-center">
            <div className="font-semibold text-lg">새 루틴 추가</div>
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
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setShowModal(false)}>취소</button>
              <button
                className="px-3 py-2 rounded-xl border bg-black text-white"
                onClick={addRoutine}
              >
                추가
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
