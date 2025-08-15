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
  const addTimeline = (label, color) => {
    setState(prev => ({
      ...prev,
      timeline: [
        ...prev.timeline,
        { time: nowTime(), label, color }
      ]
    }));
    // 캘린더 점 표시용
    setState(prev => ({
      ...prev,
      calendar: {
        ...prev.calendar,
        [todayStr()]: Array.from(new Set([...(prev.calendar[todayStr()] || []), label]))
      }
    }));
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
            />
          )}
          {tab === "health" && (
            <HealthScreen
              weight={state.weight}
              meds={state.meds}
              walks={state.walks}
              onAddWeight={(kg) => setState(p => ({ ...p, weight: [...p.weight, makeWeightEntry(kg)] }))}
              onAddMed={(type, dose) => setState(p => ({ ...p, meds: [...p.meds, makeMedEntry(type, dose)] }))}
              onAddWalk={(start, end, minutes) => setState(p => ({ ...p, walks: [...p.walks, makeWalkEntry(start, end, minutes)] }))}
            />
          )}
          {tab === "diary" && (
            <DiaryScreen routine={state.routine} onChange={(r) => setState(p => ({ ...p, routine: r }))} />
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
        <h1 className="font-bold text-2xl tracking-tight">Banana Care</h1>
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
      <span className="text-sm">{label}</span>
    </button>
  );
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center">
      <div className="w-full max-w-[420px] border-t bg-white px-6 pb-[env(safe-area-inset-bottom)]">
        <div className="h-14 grid grid-cols-4">
          <Item id="calendar" label="캘린더" />
          <Item id="today" label="오늘" />
          <Item id="home" label="홈" />
          <Item id="health" label="건강" />
          {/* 디자인엔 다이어리 탭도 있어 보였으므로 필요 시 교체 */}
          {/* <Item id="diary" label="다이어리" /> */}
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
function HomeScreen({ timeline, routine, upcoming, onQuickAdd }) {
  return (
    <div className="space-y-6">
      {/* 오늘 요약 */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">오늘 요약</div>
          <div className="text-sm text-gray-500">{todayStr()}</div>
        </div>
        <div className="rounded-xl bg-white">
          {timeline.length === 0 ? (
            <div className="text-sm text-gray-400">아직 기록이 없어요</div>
          ) : (
            <ul className="space-y-2">
              {timeline.slice().reverse().map((t, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color || "#E6F4EA" }} />
                  <span className="text-sm text-gray-500 w-20">{t.time}</span>
                  <span className="text-sm">{t.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* 데일리루틴 */}
      <section>
        <h3 className="font-semibold text-lg mb-2">데일리루틴</h3>
        <div className="text-sm text-gray-500 mb-1">오전</div>
        <ChipRow labels={routine.am} onAdd={(l)=>onQuickAdd(l, "#E6F4EA")} />
        <div className="text-sm text-gray-500 mt-3 mb-1">오후</div>
        <ChipRow labels={routine.pm} onAdd={(l)=>onQuickAdd(l, "#E7F0FF")} />
        <h4 className="font-semibold text-lg mt-5 mb-2">정기루틴</h4>
        <ChipRow labels={routine.reg} onAdd={(l)=>onQuickAdd(l, "#FDF0D5")} />
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
      <div className="min-w-[92px] h-12 rounded-2xl border border-dashed grid place-items-center text-gray-400">+</div>
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
  const data = useMemo(()=> list.map(i=>({ date:i.date, kg:i.kg })),[list]);
  return (
    <div className="space-y-6">
      <Card className="bg-blue-50"> 
        <div className="font-medium mb-2">몸무게 입력</div>
        <div className="flex gap-2">
          <input type="number" step="0.01" placeholder="kg" value={kg} onChange={(e)=>setKg(e.target.value)} className="px-3 py-2 rounded-xl border w-28" />
          <button onClick={()=>{ if(!kg) return; onAdd(parseFloat(kg)); setKg(""); }} className="px-3 py-2 rounded-xl border">추가</button>
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
function DiaryScreen({ routine, onChange }) {
  const update = (where, label) => {
    onChange({ ...routine, [where]: Array.from(new Set([...(routine[where]||[]), label])) });
  };
  const Row = ({ title, list, where }) => (
    <div className="mb-6">
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className="flex flex-wrap gap-3">
        {list.map((l) => (
          <span key={l} className="min-w-[92px] h-12 rounded-2xl border bg-white grid place-items-center px-4">{l}</span>
        ))}
        <button onClick={()=>update(where, "새 항목")} className="min-w-[92px] h-12 rounded-2xl border border-dashed text-gray-400">+</button>
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

/***************************
 * 엔트리 생성기
 ***************************/
function makeWeightEntry(kg) {
  const prev = load().weight.slice(-1)[0];
  const lastKg = prev?.kg || 0;
  const diff = lastKg ? +(kg - lastKg).toFixed(1) : 0;
  return { date: todayStr(), time: nowTime(), kg: +kg, diff };
}
function makeMedEntry(type, dose) {
  return { date: todayStr(), time: nowTime(), type, dose };
}
function makeWalkEntry(start, end, minutes) {
  return { date: todayStr(), start, end, minutes: +minutes };
}
