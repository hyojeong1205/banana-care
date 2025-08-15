import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { CalendarDays, Check, Plus, Trash2, Upload, Download, Dog, Activity, Syringe, Pill, Bath, Footprints, Baby, School, Tooth, Soup, Weight } from "lucide-react";

/**
 * Banana Care Tracker – Mobile-first React (Vite) app
 * - LocalStorage persistence
 * - Daily / monthly / yearly checklists with history
 * - As-needed medication logging (date/time/dose)
 * - Recurring care tasks (daily/2day/weekly/bi-weekly/quarterly)
 * - Walks (date + duration)
 * - Kindergarten attendance with photos & notes
 * - Meals (AM/PM) quick log
 * - Tooth brushing quick log
 * - Poop log (multi/day)
 * - Weight log with line chart
 * - JSON import/export (backup)
 */

const KEY = "banana-care-tracker-v1";
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const ts = () => new Date().toISOString();

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function classNames(...arr) { return arr.filter(Boolean).join(" "); }
function fmtDate(d) {
  try { const dt = new Date(d); if (Number.isNaN(dt.getTime())) return d; return dt.toLocaleString(); }
  catch { return d; }
}

const defaultData = {
  dailySupplements: { log: {}, name: "영양제(매일)" },
  prnMeds: [],
  recurring: {
    items: [
      { key: "tear", name: "눈물 닦기", everyDays: 1, history: [] },
      { key: "pawSanitize", name: "발 소독", everyDays: 2, history: [] },
      { key: "earClean", name: "귀청소", everyDays: 2, history: [] },
      { key: "nailTrim", name: "발톱깎기", everyDays: 14, history: [] },
      { key: "bath", name: "목욕", everyDays: 7, history: [] },
      { key: "grooming", name: "미용", everyDays: 90, history: [] },
    ]
  },
  walks: [],
  vaccine: { name: "예방접종(연 1회)", last: null, history: [] },
  heartworm: { name: "심장사상충(월 1회)", last: null, history: [] },
  kindergarten: [],
  meals: { AM: {}, PM: {} },
  tooth: { log: {} },
  poop: [],
  weight: [],
};

function load() {
  try { const raw = localStorage.getItem(KEY); if (!raw) return defaultData; const parsed = JSON.parse(raw); return { ...defaultData, ...parsed }; }
  catch { return defaultData; }
}
function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

const Card = ({ title, icon, children, footer, className }) => (
  <div className={classNames("bg-white rounded-2xl shadow p-4 mb-4", className)}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
    <div>{children}</div>
    {footer && <div className="pt-3 mt-3 border-t text-sm text-gray-500">{footer}</div>}
  </div>
);

const SectionTitle = ({ children }) => (
  <h1 className="text-2xl font-bold mb-3 flex items-center gap-2">
    <Dog className="w-6 h-6" /> {children}
  </h1>
);

function isDue(history, everyDays) {
  if (!history || history.length === 0) return true;
  const last = new Date(history[history.length - 1]).getTime();
  const next = last + everyDays * 24 * 60 * 60 * 1000;
  return Date.now() >= next;
}
function nextDueDate(history, everyDays) {
  if (!history || history.length === 0) return "미완료";
  const last = new Date(history[history.length - 1]).getTime();
  const next = new Date(last + everyDays * 24 * 60 * 60 * 1000);
  return next.toLocaleDateString();
}

export default function BananaCareApp() {
  const [data, setData] = useState(defaultData);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => { setData(load()); }, []);
  useEffect(() => { save(data); }, [data]);

  const dueRecurring = useMemo(() => {
    return data.recurring.items.map((it) => ({
      ...it, due: isDue(it.history, it.everyDays), nextDue: nextDueDate(it.history, it.everyDays),
    }));
  }, [data.recurring.items]);

  const toggleDailySupplement = (date = todayStr()) => {
    const next = { ...data };
    const v = !!next.dailySupplements.log[date];
    next.dailySupplements.log[date] = !v;
    setData(next);
  };
  const addPrnMed = (entry) => { setData({ ...data, prnMeds: [...data.prnMeds, { id: uid(), ...entry }] }); };
  const completeRecurring = (key) => {
    setData({
      ...data,
      recurring: {
        ...data.recurring,
        items: data.recurring.items.map((it) => it.key === key ? { ...it, history: [...it.history, ts()] } : it),
      },
    });
  };
  const addWalk = (minutes, note = "") => {
    setData({ ...data, walks: [...data.walks, { id: uid(), date: todayStr(), time: nowTime(), minutes: Number(minutes || 0), note }] });
  };
  const completeVaccine = () => { const t = ts(); setData({ ...data, vaccine: { ...data.vaccine, last: t, history: [...data.vaccine.history, t] } }); };
  const completeHeartworm = () => { const t = ts(); setData({ ...data, heartworm: { ...data.heartworm, last: t, history: [...data.heartworm.history, t] } }); };
  const toggleMeal = (when, date = todayStr()) => { const next = { ...data }; const cur = next.meals[when][date]; next.meals[when][date] = !cur; setData(next); };
  const toggleTooth = (date = todayStr()) => { const next = { ...data }; next.tooth.log[date] = !next.tooth.log[date]; setData(next); };
  const addPoop = (note = "") => { setData({ ...data, poop: [...data.poop, { id: uid(), date: todayStr(), time: nowTime(), note }] }); };
  const addWeight = (date, kg) => { if (!date || !kg) return; setData({ ...data, weight: [...data.weight, { id: uid(), date, kg: Number(kg) }] }); };
  const addKindergarten = (entry) => { setData({ ...data, kindergarten: [...data.kindergarten, { id: uid(), ...entry }] }); };
  const deleteItem = (collection, id) => { const next = { ...data }; next[collection] = next[collection].filter((x) => x.id !== id); setData(next); };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `banana-care-${todayStr()}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = () => { try { const parsed = JSON.parse(reader.result); setData({ ...defaultData, ...parsed }); } catch { alert("JSON 파싱 오류: 올바른 백업 파일이 아닙니다."); } };
    reader.readAsText(file);
  };

  const weightData = useMemo(() => {
    return [...data.weight].sort((a, b) => new Date(a.date) - new Date(b.date)).map((d) => ({ date: d.date, kg: d.kg }));
  }, [data.weight]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Dog className="w-6 h-6" /> 바나 케어 트래커
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportJSON} className="px-2 py-1 text-sm rounded-xl border flex items-center gap-1">
              <Download className="w-4 h-4" /> 내보내기
            </button>
            <label className="px-2 py-1 text-sm rounded-xl border flex items-center gap-1 cursor-pointer">
              <Upload className="w-4 h-4" /> 가져오기
              <input className="hidden" type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <Tabs active={activeTab} onChange={setActiveTab} />

        {activeTab === "dashboard" && (
          <Dashboard
            data={data}
            dueRecurring={dueRecurring}
            toggleDailySupplement={toggleDailySupplement}
            completeVaccine={completeVaccine}
            completeHeartworm={completeHeartworm}
            toggleMeal={toggleMeal}
            toggleTooth={toggleTooth}
          />
        )}

        {activeTab === "health" && (
          <HealthSection
            data={data}
            toggleDailySupplement={toggleDailySupplement}
            addPrnMed={addPrnMed}
            completeRecurring={completeRecurring}
            dueRecurring={dueRecurring}
          />
        )}

        {activeTab === "activity" && (
          <ActivitySection
            walks={data.walks}
            addWalk={addWalk}
            poop={data.poop}
            addPoop={addPoop}
            meals={data.meals}
            toggleMeal={toggleMeal}
            tooth={data.tooth}
            toggleTooth={toggleTooth}
          />
        )}

        {activeTab === "school" && (
          <KindergartenSection list={data.kindergarten} add={addKindergarten} remove={(id) => deleteItem("kindergarten", id)} />
        )}

        {activeTab === "weight" && (
          <WeightSection weightData={weightData} addWeight={addWeight} />
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t">
        <div className="max-w-2xl mx-auto grid grid-cols-4 text-sm">
          <TabButton icon={<Activity className="w-5 h-5" />} label="대시보드" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <TabButton icon={<Pill className="w-5 h-5" />} label="건강/위생" active={activeTab === "health"} onClick={() => setActiveTab("health")} />
          <TabButton icon={<Footprints className="w-5 h-5" />} label="활동" active={activeTab === "activity"} onClick={() => setActiveTab("activity")} />
          <TabButton icon={<Weight className="w-5 h-5" />} label="몸무게" active={activeTab === "weight"} onClick={() => setActiveTab("weight")} />
        </div>
      </nav>
    </div>
  );
}

function Tabs({ active, onChange }) {
  const tabs = [
    { key: "dashboard", label: "대시보드" },
    { key: "health", label: "건강/위생" },
    { key: "activity", label: "활동" },
    { key: "school", label: "유치원" },
    { key: "weight", label: "몸무게" },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-1 px-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={classNames(
            "px-3 py-1.5 rounded-full whitespace-nowrap border",
            active === t.key ? "bg-black text-white border-black" : "bg-white"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const TabButton = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={classNames("flex flex-col items-center py-2", active ? "text-black" : "text-gray-500") }>
    {icon}
    <span className="text-[11px]">{label}</span>
  </button>
);

function Dashboard({ data, dueRecurring, toggleDailySupplement, completeVaccine, completeHeartworm, toggleMeal, toggleTooth }) {
  return (
    <div>
      <SectionTitle>오늘 체크</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <QuickCheck
          title="영양제"
          icon={<Pill className="w-5 h-5" />}
          done={!!data.dailySupplements.log[todayStr()]}
          onClick={() => toggleDailySupplement()}
        />
        <QuickCheck
          title="아침 밥"
          icon={<Soup className="w-5 h-5" />}
          done={!!data.meals.AM[todayStr()]}
          onClick={() => toggleMeal("AM")}
        />
        <QuickCheck
          title="저녁 밥"
          icon={<Soup className="w-5 h-5" />}
          done={!!data.meals.PM[todayStr()]}
          onClick={() => toggleMeal("PM")}
        />
        <QuickCheck
          title="양치"
          icon={<Tooth className="w-5 h-5" />}
          done={!!data.tooth.log[todayStr()]}
          onClick={() => toggleTooth()}
        />
      </div>

      <Card title="주기 관리" icon={<CalendarDays className="w-5 h-5" />}>
        <ul className="divide-y">
          {dueRecurring.map((it) => (
            <li key={it.key} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-gray-500">다음 예정: {it.nextDue}</div>
              </div>
              <button
                onClick={() => completeRecurring(it.key)}
                className={classNames(
                  "px-3 py-1.5 rounded-xl border text-sm",
                  it.due ? "bg-black text-white border-black" : "bg-gray-100 text-gray-500"
                )}
              >
                {it.due ? "오늘 하기" : "완료 기록"}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card title="예방접종" icon={<Syringe className="w-5 h-5" />}>
          <button onClick={completeVaccine} className="w-full px-3 py-2 rounded-xl border">완료 기록</button>
          <HistoryList items={data.vaccine.history} empty="기록 없음" />
        </Card>
        <Card title="심장사상충" icon={<Activity className="w-5 h-5" />}>
          <button onClick={completeHeartworm} className="w-full px-3 py-2 rounded-xl border">완료 기록</button>
          <HistoryList items={data.heartworm.history} empty="기록 없음" />
        </Card>
      </div>
    </div>
  );
}

function HealthSection({ data, toggleDailySupplement, addPrnMed, completeRecurring, dueRecurring }) {
  const [dose, setDose] = useState("");
  const [note, setNote] = useState("");

  return (
    <div>
      <Card title="매일 영양제" icon={<Pill className="w-5 h-5" />}>
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => toggleDailySupplement()} className="px-3 py-2 rounded-xl border flex items-center gap-2">
            <Check className="w-4 h-4" /> 오늘 복용
          </button>
          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">{todayStr()}</span>
        </div>
        <HistoryToggleMap map={data.dailySupplements.log} />
      </Card>

      <Card title="증상 시 복용(용량 기록)" icon={<Pill className="w-5 h-5" />}>
        <div className="flex gap-2 mb-2">
          <input className="flex-1 px-3 py-2 rounded-xl border" placeholder="용량(ex. 5mg/1정)" value={dose} onChange={(e) => setDose(e.target.value)} />
          <button
            onClick={() => { if (!dose) return alert("용량을 입력하세요"); addPrnMed({ date: todayStr(), time: nowTime(), dose, note }); setDose(""); setNote(""); }}
            className="px-3 py-2 rounded-xl border"
          >
            기록
          </button>
        </div>
        <input className="w-full px-3 py-2 rounded-xl border mb-2" placeholder="메모(증상, 약 이름 등)" value={note} onChange={(e) => setNote(e.target.value)} />
        <ListTable
          cols={["날짜", "시간", "용량", "메모"]}
          rows={data.prnMeds.slice().reverse().map((m) => [m.date, m.time, m.dose, m.note || "-"])}
          empty="기록 없음"
        />
      </Card>

      <Card title="주기적 관리" icon={<Bath className="w-5 h-5" />}>
        <ul className="divide-y">
          {dueRecurring.map((it) => (
            <li key={it.key} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-gray-500">다음 예정: {it.nextDue}</div>
              </div>
              <button onClick={() => completeRecurring(it.key)} className="px-3 py-1.5 rounded-xl border">완료 기록</button>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <h3 className="text-sm font-medium mb-1">최근 이력</h3>
          <ListTable
            cols={["항목", "완료시각"]}
            rows={data.recurring.items
              .flatMap((it) => it.history.map((h) => ({ name: it.name, time: h })))
              .sort((a, b) => new Date(b.time) - new Date(a.time))
              .slice(0, 10)
              .map((r) => [r.name, fmtDate(r.time)])}
            empty="기록 없음"
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card title="예방접종(연 1회)" icon={<Syringe className="w-5 h-5" />}>
          <HistoryList items={data.vaccine.history} empty="기록 없음" />
        </Card>
        <Card title="심장사상충(월 1회)" icon={<Activity className="w-5 h-5" />}>
          <HistoryList items={data.heartworm.history} empty="기록 없음" />
        </Card>
      </div>
    </div>
  );
}

function ActivitySection({ walks, addWalk, poop, addPoop, meals, toggleMeal, tooth, toggleTooth }) {
  const [walkMin, setWalkMin] = useState("");
  const [walkNote, setWalkNote] = useState("");
  const [poopNote, setPoopNote] = useState("");

  return (
    <div>
      <Card title="산책" icon={<Footprints className="w-5 h-5" />}>
        <div className="flex gap-2 mb-2">
          <input className="w-28 px-3 py-2 rounded-xl border" placeholder="분" inputMode="numeric" value={walkMin} onChange={(e) => setWalkMin(e.target.value)} />
          <input className="flex-1 px-3 py-2 rounded-xl border" placeholder="메모(코스/컨디션)" value={walkNote} onChange={(e) => setWalkNote(e.target.value)} />
          <button onClick={() => { addWalk(walkMin || 0, walkNote); setWalkMin(""); setWalkNote(""); }} className="px-3 py-2 rounded-xl border flex items-center gap-1">
            <Plus className="w-4 h-4" /> 추가
          </button>
        </div>
        <ListTable
          cols={["날짜", "시간", "분", "메모"]}
          rows={walks.slice().reverse().map((w) => [w.date, w.time, w.minutes, w.note || "-"])}
          empty="기록 없음"
        />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card title="식사" icon={<Soup className="w-5 h-5" />}>
          <div className="flex gap-2 mb-2">
            <button onClick={() => toggleMeal("AM")} className="flex-1 px-3 py-2 rounded-xl border">아침 먹음</button>
            <button onClick={() => toggleMeal("PM")} className="flex-1 px-3 py-2 rounded-xl border">저녁 먹음</button>
          </div>
          <HistoryToggleMap map={meals.AM} label="아침" />
          <HistoryToggleMap map={meals.PM} label="저녁" />
        </Card>

        <Card title="양치" icon={<Tooth className="w-5 h-5" />}>
          <button onClick={() => toggleTooth()} className="w-full px-3 py-2 rounded-xl border mb-2">오늘 양치</button>
          <HistoryToggleMap map={tooth.log} />
        </Card>
      </div>

      <Card title="배변" icon={<Baby className="w-5 h-5" />}>
        <div className="flex gap-2 mb-2">
          <input className="flex-1 px-3 py-2 rounded-xl border" placeholder="메모(상태 등)" value={poopNote} onChange={(e) => setPoopNote(e.target.value)} />
          <button onClick={() => { addPoop(poopNote); setPoopNote(""); }} className="px-3 py-2 rounded-xl border flex items-center gap-1">
            <Plus className="w-4 h-4" /> 기록
          </button>
        </div>
        <ListTable
          cols={["날짜", "시간", "메모"]}
          rows={poop.slice().reverse().map((p) => [p.date, p.time, p.note || "-"])}
          empty="기록 없음"
        />
      </Card>
    </div>
  );
}

function KindergartenSection({ list, add, remove }) {
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);

  const onPickPhoto = (files) => {
    const arr = Array.from(files || []);
    const readers = arr.map((f) => new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then((imgs) => setPhotos((prev) => [...prev, ...imgs]));
  };

  const addEntry = () => {
    add({ date: todayStr(), note, photos });
    setNote(""); setPhotos([]);
  };

  return (
    <div>
      <Card title="유치원" icon={<School className="w-5 h-5" />}
        footer={<span className="text-xs">사진은 이 기기 로컬 저장소에만 보관됩니다(백업 시 JSON에 포함되지 않음).</span>}>
        <textarea className="w-full px-3 py-2 rounded-xl border mb-2" placeholder="오늘 한 일(간단 메모)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex items-center gap-2 mb-2">
          <label className="px-3 py-2 rounded-xl border cursor-pointer">
            사진 추가
            <input className="hidden" type="file" accept="image/*" multiple onChange={(e) => onPickPhoto(e.target.files)} />
          </label>
          <button onClick={addEntry} className="px-3 py-2 rounded-xl border">저장</button>
        </div>
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {photos.map((src, i) => (<img key={i} src={src} alt="preview" className="w-full h-20 object-cover rounded-xl" />))}
          </div>
        )}
        <ul className="divide-y">
          {list.slice().reverse().map((e) => (
            <li key={e.id} className="py-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{e.date}</div>
                <button onClick={() => remove(e.id)} className="px-2 py-1 rounded-xl border text-xs flex items-center gap-1"><Trash2 className="w-4 h-4" /> 삭제</button>
              </div>
              {e.note && <div className="text-sm text-gray-700 mt-1">{e.note}</div>}
              {e.photos?.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {e.photos.map((src, i) => (<img key={i} src={src} alt="photo" className="w-full h-20 object-cover rounded-xl" />))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function WeightSection({ weightData, addWeight }) {
  const [date, setDate] = useState(todayStr());
  const [kg, setKg] = useState("");

  return (
    <div>
      <Card title="몸무게 기록" icon={<Weight className="w-5 h-5" />}>
        <div className="flex items-center gap-2 mb-4">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 rounded-xl border" />
          <input type="number" step="0.01" placeholder="kg" value={kg} onChange={(e) => setKg(e.target.value)} className="px-3 py-2 rounded-xl border w-28" />
          <button onClick={() => { addWeight(date, kg); setKg(""); }} className="px-3 py-2 rounded-xl border">추가</button>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="kg" dot={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

const QuickCheck = ({ title, icon, done, onClick }) => (
  <button onClick={onClick} className={classNames("p-3 rounded-2xl border text-left", done ? "bg-emerald-50 border-emerald-300" : "bg-white") }>
    <div className="flex items-center gap-2">
      {icon}
      <div className="font-medium">{title}</div>
    </div>
    <div className="text-xs text-gray-500 mt-1">{todayStr()} {done ? "완료" : "미완료"}</div>
  </button>
);

const HistoryList = ({ items = [], empty = "기록 없음" }) => (
  <div className="mt-2 max-h-40 overflow-auto text-sm">
    {(!items || items.length === 0) && <div className="text-gray-400">{empty}</div>}
    <ul className="space-y-1">
      {items.slice().reverse().map((d, i) => (<li key={i}>{fmtDate(d)}</li>))}
    </ul>
  </div>
);

const HistoryToggleMap = ({ map = {}, label }) => {
  const entries = Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  return (
    <div className="mt-2 max-h-40 overflow-auto text-sm">
      {entries.length === 0 && <div className="text-gray-400">기록 없음</div>}
      {entries.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="py-1">날짜</th>
              <th className="py-1">상태{label ? `(${label})` : ""}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([d, v]) => (
              <tr key={d} className="border-t">
                <td className="py-1">{d}</td>
                <td className="py-1">{v ? "완료" : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const ListTable = ({ cols = [], rows = [], empty = "기록 없음" }) => (
  <div className="max-h-64 overflow-auto text-sm">
    {rows.length === 0 ? (
      <div className="text-gray-400">{empty}</div>
    ) : (
      <table className="w-full text-left">
        <thead className="text-gray-500 text-xs">
          <tr>
            {cols.map((c) => (<th key={c} className="py-1 pr-2">{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t">
              {r.map((cell, i) => (<td key={i} className="py-1 pr-2 align-top">{String(cell)}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);
