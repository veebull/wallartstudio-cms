"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function AgentPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selTemplate, setSelTemplate] = useState("");
  const [mode, setMode] = useState("adapt");
  const [autoPublish, setAutoPublish] = useState(false);
  const [starting, setStarting] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates || []);
        if (d.templates?.[0]) setSelTemplate(d.templates[0].id);
      });
    loadJobs();
  }, []);

  async function loadJobs() {
    const res = await fetch("/api/agent");
    const data = await res.json();
    setJobs(data.jobs || []);
    const running = (data.jobs || []).find((j: any) => j.status === "running");
    if (running) startPolling(running.id);
  }

  function startPolling(jobId: string) {
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/agent?jobId=${jobId}`);
      const data = await res.json();
      setActiveJob(data.job);
      setLogs(data.logs || []);
      setPaused(data.paused);
      if (data.job?.status !== "running")
        if (pollRef.current) {
          clearInterval(pollRef.current);
        }
      if (logsRef.current)
        logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }, 2000);
  }

  async function startAgent() {
    if (!selTemplate) return alert("Выберите шаблон статьи");
    setStarting(true);
    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        templateId: selTemplate,
        settings: { mode, autoPublish, batchSize: 3, delayMs: 2000 },
      }),
    });
    const data = await res.json();
    setStarting(false);
    startPolling(data.jobId);
    loadJobs();
  }

  async function pauseResume() {
    if (!activeJob) return;
    const action = paused ? "resume" : "pause";
    await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, jobId: activeJob.id }),
    });
    setPaused(!paused);
  }

  const isRunning = activeJob?.status === "running";
  const pct = activeJob
    ? Math.round((activeJob.citiesDone / (activeJob.citiesTotal || 1)) * 100)
    : 0;

  const LOG_COLORS: Record<string, { color: string; bg: string }> = {
    generated: { color: "#3C3489", bg: "#EEEDFE" },
    published: { color: "#27500A", bg: "#EAF3DE" },
    error: { color: "#A32D2D", bg: "#FCEBEB" },
    started: { color: "#185FA5", bg: "#E6F1FB" },
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>AI Агент</h1>
        <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>
          Массовое создание и размножение статей на города
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        {/* Control card */}
        <div
          style={{ background: "var(--bg2)", borderRadius: 12, padding: 20 }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
            Новое задание
          </div>

          <label
            style={{
              fontSize: 12,
              color: "var(--text2)",
              display: "block",
              marginBottom: 4,
            }}
          >
            Шаблон статьи
          </label>
          <select
            value={selTemplate}
            onChange={(e) => setSelTemplate(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              fontSize: 13,
              border: "0.5px solid var(--border2)",
              borderRadius: 8,
              background: "var(--bg)",
              marginBottom: 10,
            }}
          >
            <option value="">— выберите шаблон —</option>
            {templates.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          {templates.length === 0 && (
            <div
              style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}
            >
              Шаблонов нет.{" "}
              <Link href="/admin/editor" style={{ color: "var(--blue)" }}>
                Создать шаблон →
              </Link>
            </div>
          )}

          <label
            style={{
              fontSize: 12,
              color: "var(--text2)",
              display: "block",
              marginBottom: 4,
            }}
          >
            Режим
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              fontSize: 13,
              border: "0.5px solid var(--border2)",
              borderRadius: 8,
              background: "var(--bg)",
              marginBottom: 10,
            }}
          >
            <option value="adapt">Адаптировать текст под город</option>
            <option value="variables_only">Только подставить переменные</option>
            <option value="full_rewrite">
              Написать уникальную статью с нуля
            </option>
          </select>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              marginBottom: 16,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={autoPublish}
              onChange={(e) => setAutoPublish(e.target.checked)}
            />
            Автоматически публиковать
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={startAgent}
              disabled={starting || isRunning || !selTemplate}
              style={{
                flex: 1,
                padding: "9px",
                fontSize: 13,
                fontWeight: 600,
                background:
                  starting || isRunning || !selTemplate
                    ? "var(--bg3)"
                    : "var(--text)",
                color:
                  starting || isRunning || !selTemplate
                    ? "var(--text3)"
                    : "#fff",
                border: "none",
                borderRadius: 8,
                cursor:
                  starting || isRunning || !selTemplate
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {starting
                ? "Запускаем..."
                : isRunning
                  ? "Агент работает"
                  : "▶ Запустить"}
            </button>
            {isRunning && (
              <button
                onClick={pauseResume}
                style={{
                  padding: "9px 14px",
                  fontSize: 13,
                  border: "0.5px solid var(--border2)",
                  borderRadius: 8,
                  background: "var(--bg)",
                  cursor: "pointer",
                }}
              >
                {paused ? "▶ Продолжить" : "⏸ Пауза"}
              </button>
            )}
          </div>
        </div>

        {/* Active job status */}
        <div
          style={{ background: "var(--bg2)", borderRadius: 12, padding: 20 }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
            {isRunning
              ? paused
                ? "⏸ Задание на паузе"
                : "◈ Задание выполняется"
              : "Статус"}
          </div>
          {activeJob ? (
            <>
              <div
                style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}
              >
                Текущий город:{" "}
                <strong style={{ color: "var(--text)" }}>
                  {activeJob.currentCity || "—"}
                </strong>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text2)",
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span>
                  {activeJob.citiesDone} из {activeJob.citiesTotal}
                </span>
                <span>{pct}%</span>
              </div>
              <div
                style={{
                  height: 8,
                  background: "var(--border)",
                  borderRadius: 4,
                  overflow: "hidden",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: paused ? "var(--amber)" : "var(--green)",
                    borderRadius: 4,
                    transition: "width .4s",
                  }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                {[
                  {
                    label: "Готово",
                    val: activeJob.citiesDone,
                    color: "var(--green)",
                  },
                  {
                    label: "Ошибок",
                    val: activeJob.citiesFailed,
                    color: "var(--red)",
                  },
                  {
                    label: "Осталось",
                    val: activeJob.citiesTotal - activeJob.citiesDone,
                    color: "var(--text3)",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      textAlign: "center",
                      padding: 8,
                      background: "var(--bg)",
                      borderRadius: 7,
                    }}
                  >
                    <div
                      style={{ fontSize: 18, fontWeight: 600, color: m.color }}
                    >
                      {m.val}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: "var(--text3)", fontSize: 13 }}>
              Нет активных заданий
            </div>
          )}
        </div>
      </div>

      {/* Live log */}
      <div style={{ background: "var(--bg2)", borderRadius: 12, padding: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: ".05em",
            marginBottom: 12,
          }}
        >
          Лог агента
        </div>
        <div
          ref={logsRef}
          style={{
            maxHeight: 240,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {logs.length === 0 && (
            <div style={{ color: "var(--text3)", fontSize: 12, padding: 8 }}>
              Лог пуст. Запустите задание.
            </div>
          )}
          {logs.map((log: any, i) => {
            const s = LOG_COLORS[log.event] || {
              color: "var(--text3)",
              bg: "var(--bg)",
            };
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  fontSize: 12,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    color: "var(--text3)",
                    fontFamily: "monospace",
                    minWidth: 50,
                  }}
                >
                  {new Date(log.createdAt).toLocaleTimeString("ru", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <span
                  style={{
                    padding: "1px 7px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 500,
                    background: s.bg,
                    color: s.color,
                    minWidth: 80,
                    textAlign: "center",
                  }}
                >
                  {log.event}
                </span>
                <span style={{ color: "var(--text2)" }}>{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Past jobs */}
      {jobs.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            История заданий
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {jobs.map((job: any) => (
              <div
                key={job.id}
                onClick={() => {
                  setActiveJob(job);
                  if (job.status === "running") startPolling(job.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: "var(--bg2)",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: `0.5px solid ${activeJob?.id === job.id ? "var(--border2)" : "var(--border)"}`,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 500,
                    background:
                      job.status === "done"
                        ? "var(--green-bg)"
                        : job.status === "running"
                          ? "var(--blue-bg)"
                          : "var(--bg3)",
                    color:
                      job.status === "done"
                        ? "var(--green)"
                        : job.status === "running"
                          ? "var(--blue)"
                          : "var(--text3)",
                  }}
                >
                  {job.status}
                </span>
                <span style={{ color: "var(--text2)" }}>
                  {job.citiesDone}/{job.citiesTotal} городов
                </span>
                <span
                  style={{
                    color: "var(--text3)",
                    fontSize: 11,
                    marginLeft: "auto",
                  }}
                >
                  {job.startedAt
                    ? new Date(job.startedAt).toLocaleString("ru")
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
