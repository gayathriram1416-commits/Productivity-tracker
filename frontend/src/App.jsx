import { useEffect, useRef, useState } from "react";

export default function App() {
  const [running, setRunning] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);

  // SAVED TOTAL ONLY
  const [savedTotalSeconds, setSavedTotalSeconds] = useState(0);

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [history, setHistory] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);

  const intervalRef = useRef(null);
  const liveRef = useRef(0);

  /* ================= FORMAT ================= */

  const format = (sec) => {
    const safeSec = Number(sec) || 0;

    const h = Math.floor(safeSec / 3600);
    const m = Math.floor((safeSec % 3600) / 60);
    const s = safeSec % 60;

    return `${h}h ${m}m ${s}s`;
  };

  const toDateKey = (d) => {
    const date = new Date(d);

    if (isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatTime = (d) => {
    const date = new Date(d);

    if (isNaN(date.getTime())) return "";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  const formatDate = (d) => {
    const date = new Date(d);

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* ================= LOAD HISTORY ================= */

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");

      const data = await res.json();

      const safe = Array.isArray(data) ? data : [];

      setHistory(safe);

      const today = toDateKey(new Date());

      const total = safe
        .filter(
          (i) =>
            toDateKey(i.work_date || i.start_time) === today
        )
        .reduce(
          (sum, item) => sum + (Number(item.total_seconds) || 0),
          0
        );

      setSavedTotalSeconds(total);

      return total;
    } catch (e) {
      console.log(e);
      return 0;
    }
  };

  /* ================= START ================= */

  const start = () => {
    if (intervalRef.current) return;

    setRunning(true);

    setSessionStart(new Date());

    intervalRef.current = setInterval(() => {
      liveRef.current += 1;

      setLiveSeconds(liveRef.current);
    }, 1000);
  };

  /* ================= STOP ================= */

  const stop = async () => {
    if (!intervalRef.current) return;

    clearInterval(intervalRef.current);

    intervalRef.current = null;

    setRunning(false);

    const sessionSeconds = liveRef.current;

    const startTime = sessionStart;

    const endTime = new Date();

    // IMPORTANT FIX
    // ADD ONLY ONCE
    const updatedTotal =
      savedTotalSeconds + sessionSeconds;

    // SAVE IMMEDIATELY
    setSavedTotalSeconds(updatedTotal);

    try {
      await fetch("/api/save", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          totalSeconds: sessionSeconds,

          startTime,

          endTime,

          work_date: toDateKey(endTime),
        }),
      });

      // REFRESH HISTORY ONLY
      const res = await fetch("/api/history");

      const data = await res.json();

      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log(e);
    }

    setToastMsg(
      `Hello 👋 today your total productivity time is ${format(
        updatedTotal
      )}`
    );

    setShowToast(true);

    // DO NOT RESET TIMER HERE
  };

  /* ================= RESET ================= */

  const reset = () => {
    clearInterval(intervalRef.current);

    intervalRef.current = null;

    liveRef.current = 0;

    setLiveSeconds(0);

    setRunning(false);
  };

  /* ================= TOTAL FIX ================= */

  // WHILE RUNNING → SHOW LIVE TOTAL
  // AFTER STOP → SHOW SAVED TOTAL

  const displayTotal = running
    ? savedTotalSeconds + liveSeconds
    : savedTotalSeconds;

  /* ================= GROUP HISTORY ================= */

  const grouped = (history || []).reduce((acc, item) => {
    const d = toDateKey(item.work_date || item.start_time);

    if (!d) return acc;

    if (!acc[d]) {
      acc[d] = [];
    }

    acc[d].push(item);

    return acc;
  }, {});

  return (
    <div style={styles.container}>

      {/* HEADER */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          ⚡ Productivity Tracker
        </h1>
      </div>

      {/* REPORT */}
      <div style={styles.reportTopLeft}>
        <button
          style={styles.reportBtn}
          onClick={() => setShowReport(!showReport)}
        >
          📊 Report
        </button>

        {showReport && (
          <div style={styles.reportBox}>
            {Object.keys(grouped).length === 0 && (
              <div>No productivity sessions yet</div>
            )}

            {Object.keys(grouped)
              .sort((a, b) => b.localeCompare(a))
              .map((date) => {
                const sessions = grouped[date];

                const total = sessions.reduce(
                  (s, i) =>
                    s + (Number(i.total_seconds) || 0),
                  0
                );

                return (
                  <div key={date}>
                    <div style={styles.rowHeader}>
                      <b>{formatDate(date)}</b>

                      <b>{format(total)}</b>
                    </div>

                    {sessions
                      .filter(
                        (s) =>
                          s.start_time && s.end_time
                      )
                      .map((s, i) => (
                        <div
                          key={i}
                          style={styles.session}
                        >
                          <span>
                            {formatTime(s.start_time)} →{" "}
                            {formatTime(s.end_time)}
                          </span>

                          <span>
                            {format(
                              Number(s.total_seconds) || 0
                            )}
                          </span>
                        </div>
                      ))}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* TIMER */}
      <div style={styles.center}>
        <div style={styles.timer}>
          {format(liveSeconds)}
        </div>

        <div style={styles.status}>
          {running
            ? "🟢 Running"
            : "🔴 Stopped"}
        </div>

        <div style={styles.btnRow}>
          <button
            style={styles.startBtn}
            onClick={start}
          >
            Start
          </button>

          <button
            style={styles.stopBtn}
            onClick={stop}
          >
            Stop
          </button>

          <button
            style={styles.resetBtn}
            onClick={reset}
          >
            Reset
          </button>
        </div>
      </div>

      {/* TOTAL */}
      <div style={styles.total}>
        📊 Total Today: {format(displayTotal)}
      </div>

      {/* POPUP */}
      {showToast && (
        <div style={styles.toast}>
          <button
            style={styles.toastClose}
            onClick={() => setShowToast(false)}
          >
            ×
          </button>

          <div style={styles.toastText}>
            {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  container: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#5f2c82,#49a09d)",
    color: "white",
    fontFamily: "Arial",
    position: "relative",
  },

  header: {
    textAlign: "center",
    padding: 10,
  },

  title: {
    fontSize: 28,
  },

  reportTopLeft: {
    position: "absolute",
    top: 80,
    left: 20,
    zIndex: 10,
  },

  reportBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "none",
    color: "white",
    padding: "8px 14px",
    borderRadius: 6,
    fontWeight: "bold",
    cursor: "pointer",
  },

  reportBox: {
    background: "rgba(0,0,0,0.85)",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    minWidth: 320,
  },

  rowHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 6,
  },

  session: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    paddingLeft: 8,
    marginBottom: 4,
  },

  center: {
    textAlign: "center",
    marginTop: 100,
  },

  timer: {
    fontSize: 60,
    fontWeight: "bold",
  },

  status: {
    marginTop: 10,
    fontSize: 18,
  },

  btnRow: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
  },

  startBtn: {
    background: "#00c853",
    color: "white",
    padding: 10,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  stopBtn: {
    background: "#ff1744",
    color: "white",
    padding: 10,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  resetBtn: {
    background: "#ffd600",
    color: "black",
    padding: 10,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  total: {
    textAlign: "center",
    marginTop: 35,
    fontSize: 20,
    fontWeight: "bold",
    background: "rgba(0,0,0,0.25)",
    display: "inline-block",
    padding: "12px 24px",
    borderRadius: 12,
    marginLeft: "50%",
    transform: "translateX(-50%)",
    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
  },

  toast: {
    position: "fixed",
    top: 100,
    right: 20,
    width: 300,
    background: "rgba(0,0,0,0.92)",
    padding: 18,
    borderRadius: 12,
    border: "1px solid #00e676",
    boxShadow: "0 4px 18px rgba(0,0,0,0.4)",
    zIndex: 999,
  },

  toastText: {
    marginTop: 10,
    lineHeight: 1.5,
  },

  toastClose: {
    position: "absolute",
    top: 8,
    right: 12,
    background: "transparent",
    border: "none",
    color: "white",
    fontSize: 20,
    cursor: "pointer",
  },
};