"use client";

import { useEffect, useState } from "react";

const NUM_LEDS = 28;

type Train = {
  id?: string;
  led: number;
  station?: string;
  minutesAway?: number;
  line?: string;
  headsign?: string;
  direction?: string;
  beyondSegment?: boolean;
};

type StationMapItem = {
  led: number;
  station: string;
  minutesToEnd: number;
};

type TrainData = {
  ok?: boolean;
  route?: string;
  direction?: string;
  start?: string;
  end?: string;
  mode?: string;
  updatedAt?: string;
  sourceUrl?: string;
  rawArrivalsFound?: number;
  line3ArrivalsFound?: number;
  stationMap?: StationMapItem[];
  trains?: Train[];
  error?: string;
};

function ledColor(index: number, trains: Train[]) {
  const trainsHere = trains.filter((train) => train.led === index).length;

  if (trainsHere > 1) return "cyan";
  if (trainsHere === 1) return "blue";
  if (index === 0) return "purple";
  if (index === NUM_LEDS - 1) return "green";
  return "gray";
}

function trainsAtLed(index: number, trains: Train[]) {
  return trains.filter((train) => train.led === index);
}

function stationForLed(index: number, stationMap: StationMapItem[]) {
  return stationMap.find((item) => item.led === index);
}

export default function Home() {
  const [data, setData] = useState<TrainData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/trains", { cache: "no-store" });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || `HTTP ${response.status}`);
      }

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Could not load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 30000);

    return () => clearInterval(interval);
  }, []);

  const trains = data?.trains || [];
  const stationMap = data?.stationMap || [];

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <div style={styles.kicker}>NORY Subway LED Proxy</div>
          <h1 style={styles.title}>3 Train Station-Mapped LED Map</h1>
          <p style={styles.subtitle}>
            LED 0 = Van Siclen Av. LED 27 = Times Sq-42 St. Blue dots are live
            3 train arrivals mapped to their closest estimated station zone.
          </p>
        </div>

        <button onClick={loadData} style={styles.button}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      {error && <div style={styles.error}>Error: {error}</div>}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>28-LED Route Preview</h2>

        <div style={styles.ledRow}>
          {Array.from({ length: NUM_LEDS }, (_, index) => {
            const color = ledColor(index, trains);
            const station = stationForLed(index, stationMap);
            const ledTrains = trainsAtLed(index, trains);

            return (
              <div key={index} style={styles.ledWrap} title={station?.station || ""}>
                <div
                  style={{
                    ...styles.led,
                    ...(styles as any)[color],
                  }}
                />
                <div style={styles.ledLabel}>{index}</div>
                <div style={styles.stationTiny}>
                  {station?.station ? station.station.split(" ")[0] : ""}
                </div>
                {ledTrains.length > 0 && (
                  <div style={styles.trainCount}>{ledTrains.length}</div>
                )}
              </div>
            );
          })}
        </div>

        <div style={styles.legend}>
          <span>Purple = Van Siclen</span>
          <span>Green = Times Sq-42 St</span>
          <span>Blue = train</span>
          <span>Cyan = multiple trains</span>
          <span>Number under LED = trains there</span>
        </div>
      </section>

      <section style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Mapped Live Trains</h2>

          {trains.length === 0 ? (
            <p style={styles.muted}>No mapped 3 trains found right now.</p>
          ) : (
            <div style={styles.trainList}>
              {trains.map((train, index) => (
                <div key={`${train.id || "train"}-${index}`} style={styles.trainCard}>
                  <strong>Train {index + 1}</strong>
                  <div>LED: {train.led}</div>
                  <div>Mapped station: {train.station || "-"}</div>
                  <div>Minutes away from 42nd: {train.minutesAway ?? "-"}</div>
                  <div>Line: {train.line || "-"}</div>
                  <div>Headsign: {train.headsign || "-"}</div>
                  <div>Direction: {train.direction || "-"}</div>
                  {train.beyondSegment && (
                    <div style={styles.warning}>
                      Beyond mapped route window, shown at Van Siclen side.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Status</h2>
          <div style={styles.statusGrid}>
            <div>Route</div>
            <div>{data?.route || "-"}</div>

            <div>Mode</div>
            <div>{data?.mode || "-"}</div>

            <div>Start</div>
            <div>{data?.start || "-"}</div>

            <div>End</div>
            <div>{data?.end || "-"}</div>

            <div>Updated</div>
            <div>{data?.updatedAt || "-"}</div>

            <div>Raw arrivals</div>
            <div>{data?.rawArrivalsFound ?? "-"}</div>

            <div>3 arrivals</div>
            <div>{data?.line3ArrivalsFound ?? "-"}</div>

            <div>Source URL</div>
            <div style={styles.smallText}>{data?.sourceUrl || "-"}</div>
          </div>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Station-to-LED Map</h2>
        <div style={styles.stationGrid}>
          {stationMap.map((item) => (
            <div key={`${item.led}-${item.station}`} style={styles.stationCard}>
              <strong>LED {item.led}</strong>
              <div>{item.station}</div>
              <div style={styles.mutedSmall}>
                ~{item.minutesToEnd} min from Times Sq
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Arduino Endpoint</h2>
        <p style={styles.muted}>After deployment, your Arduino will use:</p>
        <pre style={styles.pre}>
          https://YOUR-VERCEL-APP.vercel.app/api/trains
        </pre>

        <h2 style={styles.cardTitle}>Raw JSON</h2>
        <pre style={styles.pre}>
          {data ? JSON.stringify(data, null, 2) : "Loading..."}
        </pre>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#09090b",
    color: "#f4f4f5",
    padding: 24,
    fontFamily: "Arial, sans-serif",
  },
  header: {
    maxWidth: 1200,
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "end",
  },
  kicker: {
    color: "#93c5fd",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontSize: 13,
    marginBottom: 8,
  },
  title: {
    fontSize: 42,
    lineHeight: 1,
    margin: 0,
  },
  subtitle: {
    color: "#a1a1aa",
    maxWidth: 800,
    lineHeight: 1.5,
  },
  button: {
    background: "#2563eb",
    color: "white",
    border: 0,
    padding: "14px 20px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: "bold",
  },
  card: {
    maxWidth: 1200,
    margin: "0 auto 20px",
    background: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 18,
    padding: 20,
  },
  cardTitle: {
    marginTop: 0,
    fontSize: 20,
  },
  ledRow: {
    display: "grid",
    gridTemplateColumns: "repeat(28, minmax(22px, 1fr))",
    gap: 7,
    alignItems: "start",
    overflowX: "auto",
    paddingBottom: 10,
  },
  ledWrap: {
    textAlign: "center",
    minWidth: 26,
  },
  led: {
    width: 18,
    height: 18,
    borderRadius: 999,
    margin: "0 auto 6px",
  },
  ledLabel: {
    color: "#d4d4d8",
    fontSize: 10,
  },
  stationTiny: {
    color: "#71717a",
    fontSize: 8,
    minHeight: 12,
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  trainCount: {
    marginTop: 4,
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "bold",
  },
  gray: {
    background: "#3f3f46",
  },
  blue: {
    background: "#3b82f6",
    boxShadow: "0 0 14px #3b82f6",
  },
  cyan: {
    background: "#67e8f9",
    boxShadow: "0 0 14px #67e8f9",
  },
  purple: {
    background: "#a855f7",
    boxShadow: "0 0 10px #a855f7",
  },
  green: {
    background: "#22c55e",
    boxShadow: "0 0 10px #22c55e",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    color: "#d4d4d8",
    fontSize: 14,
    marginTop: 12,
  },
  grid: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 20,
  },
  trainList: {
    display: "grid",
    gap: 10,
    maxHeight: 540,
    overflow: "auto",
  },
  trainCard: {
    background: "#09090b",
    border: "1px solid #27272a",
    borderRadius: 14,
    padding: 14,
    lineHeight: 1.6,
  },
  warning: {
    color: "#facc15",
    fontSize: 13,
    marginTop: 6,
  },
  muted: {
    color: "#a1a1aa",
  },
  mutedSmall: {
    color: "#a1a1aa",
    fontSize: 12,
    marginTop: 4,
  },
  pre: {
    background: "#09090b",
    border: "1px solid #27272a",
    borderRadius: 12,
    padding: 12,
    overflowX: "auto",
    color: "#d4d4d8",
    fontSize: 12,
  },
  error: {
    maxWidth: 1200,
    margin: "0 auto 20px",
    background: "#7f1d1d",
    border: "1px solid #991b1b",
    borderRadius: 14,
    padding: 14,
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "130px 1fr",
    gap: 8,
    color: "#d4d4d8",
    fontSize: 14,
  },
  smallText: {
    fontSize: 12,
    color: "#a1a1aa",
    wordBreak: "break-word",
  },
  stationGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  },
  stationCard: {
    background: "#09090b",
    border: "1px solid #27272a",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
};