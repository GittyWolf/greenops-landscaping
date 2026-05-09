import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const themeStyle = document.createElement("style");
themeStyle.textContent = `
  @keyframes pulse { 0%,100% { box-shadow: 0 0 8px #3fb95088; } 50% { box-shadow: 0 0 20px #3fb950cc; } }
  * { transition: background-color 0.2s, color 0.2s, border-color 0.2s; }
`;
document.head.appendChild(themeStyle);

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const darkPalette = {
  bg: "#0d1117", card: "#161b22", border: "#30363d", green: "#3fb950",
  greenDim: "#1a3a22", red: "#f85149", yellow: "#d29922", blue: "#58a6ff",
  text: "#e6edf3", muted: "#8b949e",
};

const lightPalette = {
  bg: "#ffffff", card: "#f6f8fa", border: "#d0d7de", green: "#3fb950",
  greenDim: "#ddf4e4", red: "#cf222e", yellow: "#9a6700", blue: "#0969da",
  text: "#1f2328", muted: "#636e7b",
};

const ThemeContext = React.createContext(darkPalette);

const makeStyles = (p) => ({
  inputStyle: {
    background: p.bg, border: `1px solid ${p.border}`, borderRadius: 8,
    padding: "9px 12px", color: p.text, fontSize: 13,
    fontFamily: "'Space Mono', monospace", outline: "none",
  },
  btnPrimary: {
    background: p.green, color: p.bg, border: "none", borderRadius: 8,
    padding: "11px 18px", fontWeight: 700, cursor: "pointer",
    fontFamily: "'Space Mono', monospace", fontSize: 13,
  },
  btnOutline: {
    background: "transparent", color: p.muted, border: `1px solid ${p.border}`,
    borderRadius: 8, padding: "11px 14px", cursor: "pointer",
    fontFamily: "'Space Mono', monospace", fontSize: 13,
  },
});

const fmt$ = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;
const marginColor = (margin, p) => margin >= 20 ? p.green : margin >= 10 ? p.yellow : p.red;

function StatCard({ label, value, sub, color }) {
  const palette = React.useContext(ThemeContext);
  return (
    <div style={{
      background: palette.card, border: `1px solid ${palette.border}`,
      borderRadius: 12, padding: "16px 18px", flex: 1, minWidth: 140,
    }}>
      <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ color: color || palette.text, fontSize: 22, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{value}</div>
      {sub && <div style={{ color: palette.muted, fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Reports({ defaultMonth }) {
  const palette = React.useContext(ThemeContext);
  const { inputStyle } = makeStyles(palette);
  const [reportType, setReportType] = useState("weekly");
  const [reportMonth, setReportMonth] = useState(defaultMonth || new Date().toISOString().slice(0, 7));
  const [weeklyData, setWeeklyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const EXPENSE_COLORS = [palette.green, palette.blue, palette.yellow, palette.red, "#a5d6ff"];

  useEffect(() => {
    setLoading(true);
    if (reportType === "weekly") {
      fetch(`${API}/reports/weekly?date=${new Date().toISOString().slice(0, 10)}&hourly_rate=25`)
        .then(r => r.json()).then(d => { setWeeklyData(d); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      fetch(`${API}/reports/monthly?month=${reportMonth}&hourly_rate=25`)
        .then(r => r.json()).then(d => { setMonthlyData(d); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [reportType, reportMonth]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        {["weekly", "monthly"].map(t => (
          <button key={t} onClick={() => setReportType(t)} style={{
            background: reportType === t ? palette.green : "transparent",
            color: reportType === t ? palette.bg : palette.muted,
            border: `1px solid ${reportType === t ? palette.green : palette.border}`,
            borderRadius: 20, padding: "5px 14px", fontSize: 11, cursor: "pointer",
            fontFamily: "'Space Mono', monospace", textTransform: "capitalize",
            fontWeight: reportType === t ? 700 : 400,
          }}>{t}</button>
        ))}
        {reportType === "monthly" && (
          <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
            style={{ ...inputStyle, fontSize: 12, padding: "5px 10px" }} />
        )}
      </div>

      {loading && (
        <div style={{ color: palette.muted, textAlign: "center", padding: 40, fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
          Loading...
        </div>
      )}

      {/* ── Weekly view ── */}
      {!loading && reportType === "weekly" && weeklyData && (
        <>
          <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 10 }}>
            WEEK OF {weeklyData.week_start} — {weeklyData.week_end}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <StatCard label="Week Revenue" value={fmt$(weeklyData.total_revenue)} color={palette.green} />
            <StatCard label="Week Profit" value={fmt$(weeklyData.total_profit)} color={weeklyData.total_profit >= 0 ? palette.green : palette.red} />
          </div>

          <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 12, padding: "14px 10px", marginBottom: 16 }}>
            <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 10, paddingLeft: 6 }}>DAILY NET PROFIT</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData.days} margin={{ left: -20 }}>
                <XAxis dataKey="day" tick={{ fill: palette.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: palette.muted, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 8, color: palette.text }}
                  formatter={(v) => [fmt$(v), "profit"]} />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                  {weeklyData.days.map((d, i) => (
                    <Cell key={i} fill={marginColor(d.margin_pct, palette)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8 }}>
              {[{ c: palette.green, l: "≥20% margin" }, { c: palette.yellow, l: "10–20%" }, { c: palette.red, l: "<10%" }].map(({ c, l }) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: palette.muted, fontFamily: "'Space Mono', monospace" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 10 }}>DAY BREAKDOWN</div>
            {weeklyData.days.map(d => (
              <div key={d.date} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${palette.border}22` }}>
                <div>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: palette.text }}>{d.day}</span>
                  <span style={{ color: palette.muted, fontSize: 11, marginLeft: 8 }}>{d.date}</span>
                  {d.job_count > 0 && <span style={{ color: palette.muted, fontSize: 11, marginLeft: 8 }}>{d.job_count} job{d.job_count !== 1 ? "s" : ""}</span>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: marginColor(d.margin_pct, palette), fontFamily: "'Space Mono', monospace", fontSize: 12 }}>{fmt$(d.profit)}</span>
                  {d.revenue > 0 && <span style={{ color: palette.muted, fontSize: 10, marginLeft: 6 }}>{fmtPct(d.margin_pct)}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Monthly view ── */}
      {!loading && reportType === "monthly" && monthlyData && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <StatCard label="Month Revenue" value={fmt$(monthlyData.total_revenue)} color={palette.green} />
            <StatCard label="Month Profit" value={fmt$(monthlyData.total_profit)} color={monthlyData.total_profit >= 0 ? palette.green : palette.red} />
          </div>

          {monthlyData.weekly_breakdown?.length > 0 ? (
            <>
              <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 12, padding: "14px 10px", marginBottom: 16 }}>
                <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 10, paddingLeft: 6 }}>WEEKLY NET PROFIT</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthlyData.weekly_breakdown} margin={{ left: -20 }}>
                    <XAxis dataKey="label" tick={{ fill: palette.muted, fontSize: 10 }} />
                    <YAxis tick={{ fill: palette.muted, fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 8, color: palette.text }}
                      formatter={(v) => [fmt$(v), "profit"]} />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                      {monthlyData.weekly_breakdown.map((w, i) => (
                        <Cell key={i} fill={marginColor(w.margin_pct, palette)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {monthlyData.weekly_breakdown.some(w => w.below_20pct_margin) && (
                  <div style={{ marginTop: 10, padding: "7px 10px", background: palette.red + "22", border: `1px solid ${palette.red}44`, borderRadius: 6, color: palette.red, fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
                    ⚠️ {monthlyData.weekly_breakdown.filter(w => w.below_20pct_margin).length} week(s) below 20% margin
                  </div>
                )}
              </div>

              {Object.keys(monthlyData.expense_by_category || {}).length > 0 && (
                <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 10 }}>EXPENSE BREAKDOWN</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={Object.entries(monthlyData.expense_by_category).map(([k, v]) => ({ name: k, value: v }))}
                        cx="50%" cy="50%" outerRadius={65} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: palette.muted }} fontSize={10}>
                        {Object.keys(monthlyData.expense_by_category).map((_, i) => (
                          <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: palette.card, border: `1px solid ${palette.border}` }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {monthlyData.top_jobs?.length > 0 && (
                <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 10 }}>TOP JOBS BY MARGIN</div>
                  {monthlyData.top_jobs.map((j, i) => (
                    <div key={j.job_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${palette.border}22` }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: palette.green, fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700 }}>#{i + 1}</span>
                        <div>
                          <div style={{ fontSize: 12, color: palette.text }}>{j.client}</div>
                          <div style={{ fontSize: 10, color: palette.muted }}>{j.date}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: marginColor(j.margin_pct, palette), fontFamily: "'Space Mono', monospace", fontSize: 12 }}>{fmtPct(j.margin_pct)}</div>
                        <div style={{ color: palette.muted, fontSize: 10 }}>{fmt$(j.profit)} profit</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {monthlyData.bottom_jobs?.length > 0 && (
                <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 10 }}>LOWEST MARGIN JOBS</div>
                  {monthlyData.bottom_jobs.map((j) => (
                    <div key={j.job_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${palette.border}22` }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 12 }}>⚠️</span>
                        <div>
                          <div style={{ fontSize: 12, color: palette.text }}>{j.client}</div>
                          <div style={{ fontSize: 10, color: palette.muted }}>{j.date}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: marginColor(j.margin_pct, palette), fontFamily: "'Space Mono', monospace", fontSize: 12 }}>{fmtPct(j.margin_pct)}</div>
                        <div style={{ color: palette.muted, fontSize: 10 }}>{fmt$(j.profit)} profit</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ color: palette.muted, textAlign: "center", padding: 40, fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
              No data for {reportMonth}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AskClaude({ summary }) {
  const palette = React.useContext(ThemeContext);
  const { inputStyle, btnPrimary } = makeStyles(palette);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = React.useRef(null);

  const SpeechRecognition = typeof window !== "undefined"
    && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const ask = async (question) => {
    const text = (question ?? q).trim();
    if (!text) return;
    setLoading(true);
    setAnswer("");
    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      setAnswer(data.answer || "No response.");
    } catch {
      setAnswer("⚠️ Could not reach backend. Make sure Flask is running.");
    }
    setLoading(false);
  };

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQ(transcript);
      ask(transcript);
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const suggestions = [
    "Which job was most profitable this month?",
    "Where am I losing money?",
    "How can I reduce fuel costs?",
    "What's my best client?",
  ];

  return (
    <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: palette.green, boxShadow: `0 0 8px ${palette.green}` }} />
        <span style={{ color: palette.text, fontWeight: 600, fontFamily: "'Space Mono', monospace", fontSize: 13 }}>Ask Claude</span>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {suggestions.map(s => (
          <button key={s} onClick={() => setQ(s)} style={{
            background: palette.greenDim, border: `1px solid ${palette.green}33`,
            color: palette.green, borderRadius: 20, padding: "4px 10px", fontSize: 11,
            cursor: "pointer", fontFamily: "'Space Mono', monospace",
          }}>{s}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && ask()}
          placeholder="Ask anything about your business..."
          style={{ ...inputStyle, flex: 1, padding: "10px 14px", fontSize: 14 }} />
        {SpeechRecognition && (
          <button onClick={toggleMic} title={listening ? "Stop listening" : "Speak your question"} style={{
            background: listening ? palette.green : palette.card,
            border: `1px solid ${listening ? palette.green : palette.border}`,
            borderRadius: 8, padding: "10px 13px", cursor: "pointer",
            fontSize: 16, lineHeight: 1, flexShrink: 0,
            animation: listening ? "pulse 1s ease-in-out infinite" : "none",
            boxShadow: listening ? `0 0 12px ${palette.green}88` : "none",
          }}>🎤</button>
        )}
        <button onClick={() => ask()} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
          {loading ? "..." : "Ask"}
        </button>
      </div>

      {answer && (
        <div style={{
          marginTop: 14, background: palette.bg, border: `1px solid ${palette.green}44`,
          borderRadius: 8, padding: 14, color: palette.text, fontSize: 13,
          lineHeight: 1.7, fontFamily: "Georgia, serif", whiteSpace: "pre-wrap",
        }}>{answer}</div>
      )}
    </div>
  );
}

function RouteOptimizer() {
  const palette = React.useContext(ThemeContext);
  const { inputStyle, btnPrimary, btnOutline } = makeStyles(palette);
  const [start, setStart] = useState("");
  const [stops, setStops] = useState(["", ""]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useGPS, setUseGPS] = useState(false);

  const addStop = () => setStops([...stops, ""]);
  const updateStop = (i, v) => { const s = [...stops]; s[i] = v; setStops(s); };
  const removeStop = (i) => setStops(stops.filter((_, idx) => idx !== i));

  const optimize = async () => {
    setLoading(true);
    setResult(null);
    let payload = { start_address: start, job_addresses: stops.filter(s => s.trim()) };
    if (useGPS && navigator.geolocation) {
      await new Promise(res => navigator.geolocation.getCurrentPosition(pos => {
        payload.current_location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        res();
      }, res));
    }
    try {
      const r = await fetch(`${API}/optimize-route`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setResult(await r.json());
    } catch {
      setResult({ error: "Could not reach backend." });
    }
    setLoading(false);
  };

  return (
    <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 12, padding: 18 }}>
      <div style={{ color: palette.text, fontWeight: 600, fontFamily: "'Space Mono', monospace", fontSize: 13, marginBottom: 14 }}>📍 Route Optimizer</div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, color: palette.muted, fontSize: 12, marginBottom: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={useGPS} onChange={e => setUseGPS(e.target.checked)} />
        Use my current GPS location as start
      </label>
      {!useGPS && (
        <input value={start} onChange={e => setStart(e.target.value)} placeholder="Start address"
          style={{ ...inputStyle, marginBottom: 10, width: "100%", boxSizing: "border-box" }} />
      )}
      {stops.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input value={s} onChange={e => updateStop(i, e.target.value)} placeholder={`Stop ${i + 1} address`} style={{ ...inputStyle, flex: 1 }} />
          {stops.length > 1 && (
            <button onClick={() => removeStop(i)} style={{ background: palette.red + "22", border: "none", color: palette.red, borderRadius: 6, padding: "0 10px", cursor: "pointer" }}>✕</button>
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={addStop} style={{ ...btnOutline, flex: 1 }}>+ Add Stop</button>
        <button onClick={optimize} disabled={loading} style={{ ...btnPrimary, flex: 2 }}>{loading ? "Optimizing..." : "Optimize Route"}</button>
      </div>
      {result && !result.error && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: palette.muted, fontSize: 11, marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>
            {result.total_stops} stops · {result.estimated_total_drive_minutes} min total drive
          </div>
          {result.optimized_stops?.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${palette.border}` }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: palette.green, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.stop_number}</div>
              <div>
                <div style={{ color: palette.text, fontSize: 13 }}>{s.address}</div>
                <div style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>+{s.cumulative_drive_minutes} min cumulative</div>
              </div>
            </div>
          ))}
          {result.apple_maps_url && (
            <a href={result.apple_maps_url} target="_blank" rel="noreferrer" style={{
              display: "block", marginTop: 12, background: palette.blue + "22",
              border: `1px solid ${palette.blue}44`, color: palette.blue,
              padding: "10px 14px", borderRadius: 8, textAlign: "center",
              textDecoration: "none", fontFamily: "'Space Mono', monospace", fontSize: 12,
            }}>Open in Apple Maps →</a>
          )}
        </div>
      )}
      {result?.error && <div style={{ color: palette.red, marginTop: 10, fontSize: 13 }}>{result.error}</div>}
    </div>
  );
}

function AddJob({ onAdded }) {
  const palette = React.useContext(ThemeContext);
  const { inputStyle, btnPrimary } = makeStyles(palette);
  const [form, setForm] = useState({ client_name: "", address: "", revenue: "", labor_hours: "", materials_cost: "", fuel_cost: "", date: new Date().toISOString().slice(0, 10), status: "scheduled" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch(`${API}/jobs`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, revenue: +form.revenue, labor_hours: +form.labor_hours, materials_cost: +form.materials_cost, fuel_cost: +form.fuel_cost }),
    });
    setSaving(false);
    setForm({ client_name: "", address: "", revenue: "", labor_hours: "", materials_cost: "", fuel_cost: "", date: new Date().toISOString().slice(0, 10), status: "scheduled" });
    onAdded();
  };

  const field = (key, placeholder, type = "text") => (
    <input value={form[key]} type={type} onChange={e => setForm({ ...form, [key]: e.target.value })}
      placeholder={placeholder} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
  );

  return (
    <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 12, padding: 18 }}>
      <div style={{ color: palette.text, fontWeight: 600, fontFamily: "'Space Mono', monospace", fontSize: 13, marginBottom: 14 }}>➕ Add Job</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {field("client_name", "Client name")}
        {field("address", "Address")}
        {field("date", "Date", "date")}
        {field("revenue", "Revenue $", "number")}
        {field("labor_hours", "Labor hrs", "number")}
        {field("materials_cost", "Materials $", "number")}
        {field("fuel_cost", "Fuel $", "number")}
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 120 }}>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="complete">Complete</option>
        </select>
      </div>
      <button onClick={save} disabled={saving} style={{ ...btnPrimary, width: "100%", marginTop: 12 }}>
        {saving ? "Saving..." : "Save Job"}
      </button>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem("greenops-theme") !== "light");
  const [tab, setTab] = useState("dashboard");
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editExpenseDraft, setEditExpenseDraft] = useState({});

  const palette = isDark ? darkPalette : lightPalette;
  const { inputStyle, btnPrimary, btnOutline } = makeStyles(palette);
  const EXPENSE_COLORS = [palette.green, palette.blue, palette.yellow, palette.red, "#a5d6ff"];

  const toggleTheme = () => {
    setIsDark(d => {
      const next = !d;
      localStorage.setItem("greenops-theme", next ? "dark" : "light");
      return next;
    });
  };

  const loadData = async () => {
    try {
      const [s, j, e] = await Promise.all([
        fetch(`${API}/financials/summary?month=${month}&hourly_rate=25`).then(r => r.json()),
        fetch(`${API}/jobs`).then(r => r.json()),
        fetch(`${API}/expenses`).then(r => r.json()),
      ]);
      setSummary(s);
      setJobs(j);
      setExpenses(e);
    } catch {
      // backend not running
    }
  };

  useEffect(() => { loadData(); }, [month]);

  const saveExpense = async (id) => {
    await fetch(`${API}/expenses/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editExpenseDraft),
    });
    setEditingExpenseId(null);
    loadData();
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    await fetch(`${API}/expenses/${id}`, { method: "DELETE" });
    loadData();
  };

  const tabs = ["dashboard", "reports", "route", "add job", "ask claude"];

  return (
    <ThemeContext.Provider value={palette}>
      <div style={{ background: palette.bg, minHeight: "100vh", color: palette.text, fontFamily: "Georgia, serif", maxWidth: 520, margin: "0 auto", paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ padding: "24px 18px 12px", borderBottom: `1px solid ${palette.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: palette.green }}>🌿 GreenOps</span>
              <span style={{ fontSize: 12, color: palette.muted, fontFamily: "'Space Mono', monospace" }}>v1.0</span>
            </div>
            <button onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{
              background: "none", border: `1px solid ${palette.border}`, borderRadius: 8,
              padding: "6px 10px", cursor: "pointer", fontSize: 16, lineHeight: 1, color: palette.muted,
            }}>{isDark ? "☀️" : "🌙"}</button>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? palette.green : "transparent",
                color: tab === t ? palette.bg : palette.muted,
                border: `1px solid ${tab === t ? palette.green : palette.border}`,
                borderRadius: 20, padding: "5px 12px", fontSize: 11, cursor: "pointer",
                fontFamily: "'Space Mono', monospace", textTransform: "capitalize",
                fontWeight: tab === t ? 700 : 400,
              }}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "16px 18px" }}>
          {/* Month picker on dashboard */}
          {tab === "dashboard" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ color: palette.muted, fontSize: 12, fontFamily: "'Space Mono', monospace" }}>Month:</span>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
            </div>
          )}

          {/* ── Dashboard ── */}
          {tab === "dashboard" && summary && (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <StatCard label="Revenue" value={fmt$(summary.total_revenue)} color={palette.green} />
                <StatCard label="Net Profit" value={fmt$(summary.net_profit)} color={summary.net_profit >= 0 ? palette.green : palette.red} sub={fmtPct(summary.net_margin_pct) + " margin"} />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                <StatCard label="Jobs" value={summary.total_jobs} />
                <StatCard label="Expenses" value={fmt$(summary.total_expenses)} color={palette.yellow} />
              </div>

              {summary.job_breakdown?.length > 0 && (
                <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 12, padding: "14px 10px", marginBottom: 16 }}>
                  <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 10, paddingLeft: 6 }}>REVENUE vs PROFIT BY JOB</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={summary.job_breakdown.slice(0, 8)} margin={{ left: -20 }}>
                      <XAxis dataKey="client" tick={{ fill: palette.muted, fontSize: 10 }} />
                      <YAxis tick={{ fill: palette.muted, fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 8, color: palette.text }} />
                      <Bar dataKey="revenue" fill={palette.blue} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" fill={palette.green} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {Object.keys(summary.expense_by_category || {}).length > 0 && (
                <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 10 }}>EXPENSE BREAKDOWN</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={Object.entries(summary.expense_by_category).map(([k, v]) => ({ name: k, value: v }))}
                        cx="50%" cy="50%" outerRadius={65} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: palette.muted }} fontSize={10}>
                        {Object.keys(summary.expense_by_category).map((_, i) => (
                          <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: palette.card, border: `1px solid ${palette.border}` }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recent jobs */}
              <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", marginBottom: 8 }}>RECENT JOBS</div>
              {jobs.slice(0, 10).map(j => (
                <div key={j.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${palette.border}22` }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{j.client_name}</div>
                    <div style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>{j.date} · {j.address}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: palette.green, fontFamily: "'Space Mono', monospace", fontSize: 14 }}>{fmt$(j.revenue)}</div>
                    <div style={{ fontSize: 10, color: j.status === "complete" ? palette.green : j.status === "in_progress" ? palette.yellow : palette.muted, marginTop: 2 }}>{j.status}</div>
                  </div>
                </div>
              ))}

              {/* Expenses with edit/delete */}
              {expenses.length > 0 && (
                <>
                  <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'Space Mono', monospace", marginTop: 20, marginBottom: 8 }}>EXPENSES</div>
                  {expenses.slice(0, 15).map(e => (
                    <div key={e.id} style={{ padding: "10px 0", borderBottom: `1px solid ${palette.border}22` }}>
                      {editingExpenseId === e.id ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <input value={editExpenseDraft.description || ""} onChange={ev => setEditExpenseDraft({ ...editExpenseDraft, description: ev.target.value })}
                            placeholder="Description" style={{ ...inputStyle, flex: 2, minWidth: 100, padding: "6px 10px", fontSize: 12 }} />
                          <input type="number" value={editExpenseDraft.amount || ""} onChange={ev => setEditExpenseDraft({ ...editExpenseDraft, amount: +ev.target.value })}
                            placeholder="Amount" style={{ ...inputStyle, width: 80, padding: "6px 10px", fontSize: 12 }} />
                          <input value={editExpenseDraft.category || ""} onChange={ev => setEditExpenseDraft({ ...editExpenseDraft, category: ev.target.value })}
                            placeholder="Category" style={{ ...inputStyle, width: 90, padding: "6px 10px", fontSize: 12 }} />
                          <button onClick={() => saveExpense(e.id)} style={{ ...btnPrimary, padding: "7px 12px", fontSize: 12 }}>Save</button>
                          <button onClick={() => setEditingExpenseId(null)} style={{ ...btnOutline, padding: "7px 10px", fontSize: 12 }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{e.description}</div>
                            <div style={{ color: palette.muted, fontSize: 11, marginTop: 2 }}>{e.date} · {e.category}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: palette.red, fontFamily: "'Space Mono', monospace", fontSize: 13 }}>{fmt$(e.amount)}</span>
                            <button onClick={() => { setEditingExpenseId(e.id); setEditExpenseDraft({ description: e.description, amount: e.amount, category: e.category }); }}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: 2 }} title="Edit">✏️</button>
                            <button onClick={() => deleteExpense(e.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: 2 }} title="Delete">🗑️</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {tab === "dashboard" && !summary && (
            <div style={{ color: palette.muted, textAlign: "center", paddingTop: 60, fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
              Start Flask backend to load data.<br />
              <span style={{ fontSize: 11, marginTop: 8, display: "block" }}>python main.py</span>
            </div>
          )}

          {tab === "reports" && <Reports defaultMonth={month} />}
          {tab === "route" && <RouteOptimizer />}
          {tab === "add job" && <AddJob onAdded={loadData} />}
          {tab === "ask claude" && <AskClaude summary={summary} />}
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
