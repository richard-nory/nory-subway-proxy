const NUM_LEDS = 28;

// This is a station-mapped approximation using live arrivals at Times Sq-42 St.
// The API gives minutes away from Times Sq. We map those minutes to the closest
// station on the Van Siclen Av -> Times Sq-42 St segment.

// We use a 45-minute end-to-end estimate for this segment.
// This can be tuned after comparing with the physical lights.
const MAX_SEGMENT_MINUTES = 45;

// Try the more specific API first, then fall back if needed.
const SOURCE_URLS = [
  "https://subwayinfo.nyc/api/arrivals?station_id=127&line=3&direction=N&limit=10",
  "https://subwayinfo.nyc/api/arrivals?station_id=127&line=3&limit=10",
  "https://subwayinfo.nyc/api/arrivals?station_id=127&limit=20",
];

// LED/station map for 3 train, northbound toward Times Sq-42 St.
// LED 0 = Van Siclen Av side.
// LED 27 = Times Sq-42 St.
//
// Some LEDs intentionally represent "between station" space because we have 28 LEDs
// but fewer station stops in this route segment.
const STATION_MAP = [
  { led: 0, station: "Van Siclen Av", minutesToEnd: 45 },
  { led: 1, station: "Pennsylvania Av", minutesToEnd: 43 },
  { led: 2, station: "Junius St", minutesToEnd: 41 },
  { led: 3, station: "Rockaway Av", minutesToEnd: 39 },
  { led: 4, station: "Saratoga Av", minutesToEnd: 37 },
  { led: 5, station: "Sutter Av-Rutland Rd", minutesToEnd: 35 },
  { led: 6, station: "Crown Hts-Utica Av", minutesToEnd: 33 },
  { led: 7, station: "Kingston Av", minutesToEnd: 31 },
  { led: 8, station: "Nostrand Av", minutesToEnd: 29 },
  { led: 9, station: "Franklin Av-Medgar Evers College", minutesToEnd: 27 },
  { led: 10, station: "Eastern Pkwy-Brooklyn Museum", minutesToEnd: 25 },
  { led: 11, station: "Grand Army Plaza", minutesToEnd: 23 },
  { led: 12, station: "Bergen St", minutesToEnd: 21 },
  { led: 13, station: "Atlantic Av-Barclays Ctr", minutesToEnd: 19 },
  { led: 14, station: "Nevins St", minutesToEnd: 17 },
  { led: 15, station: "Hoyt St", minutesToEnd: 15 },
  { led: 16, station: "Borough Hall", minutesToEnd: 13 },
  { led: 17, station: "Clark St", minutesToEnd: 11 },
  { led: 18, station: "Wall St", minutesToEnd: 9 },
  { led: 19, station: "Fulton St", minutesToEnd: 8 },
  { led: 20, station: "Park Place", minutesToEnd: 7 },
  { led: 21, station: "Chambers St", minutesToEnd: 6 },
  { led: 22, station: "14 St", minutesToEnd: 4 },
  { led: 23, station: "Between 14 St and 34 St-Penn Station", minutesToEnd: 3 },
  { led: 24, station: "34 St-Penn Station", minutesToEnd: 2 },
  { led: 25, station: "Between 34 St and Times Sq-42 St", minutesToEnd: 1.3 },
  { led: 26, station: "Approaching Times Sq-42 St", minutesToEnd: 0.7 },
  { led: 27, station: "Times Sq-42 St", minutesToEnd: 0 },
];

function findArrivals(data) {
  if (Array.isArray(data?.arrivals)) return data.arrivals;
  if (Array.isArray(data)) return data;
  return [];
}

function getMinutesAway(train) {
  const candidates = [
    train?.minutesAway,
    train?.minutes,
    train?.etaMinutes,
    train?.arrivalMinutes,
  ];

  for (const value of candidates) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }

  return null;
}

function isLine3Train(train) {
  const values = [
    train?.line,
    train?.route,
    train?.routeId,
    train?.route_id,
    train?.lineName,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim());

  return values.includes("3");
}

function closestStationForMinutes(minutesAway) {
  const m = Number(minutesAway);

  if (!Number.isFinite(m)) {
    return {
      led: -1,
      station: "Unknown",
      minutesToEnd: null,
      beyondSegment: false,
    };
  }

  // If the arrival prediction is beyond our route window,
  // clamp it to LED 0 and mark it as beyond/at the Van Siclen side.
  if (m >= MAX_SEGMENT_MINUTES) {
    return {
      ...STATION_MAP[0],
      station: "Van Siclen Av or farther from Times Sq-42 St",
      beyondSegment: true,
    };
  }

  let best = STATION_MAP[0];
  let bestDifference = Math.abs(m - best.minutesToEnd);

  for (const item of STATION_MAP) {
    const difference = Math.abs(m - item.minutesToEnd);

    if (difference < bestDifference) {
      best = item;
      bestDifference = difference;
    }
  }

  return {
    ...best,
    beyondSegment: false,
  };
}

function normalizeTrain(train, index) {
  const minutesAway = getMinutesAway(train);
  const mapped = closestStationForMinutes(minutesAway);

  return {
    id:
      train?.id ||
      train?.tripId ||
      train?.trip_id ||
      train?.trip ||
      `train-${index + 1}`,
    led: mapped.led,
    station: mapped.station,
    minutesAway,
    line: train?.line || train?.route || "3",
    headsign: train?.headsign || train?.destination || "",
    direction: train?.directionLabel || train?.direction || "",
    beyondSegment: mapped.beyondSegment,
  };
}

async function fetchFirstWorkingSource() {
  const attempts = [];

  for (const url of SOURCE_URLS) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      });

      attempts.push({
        url,
        status: response.status,
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();

      return {
        url,
        data,
        attempts,
      };
    } catch (error) {
      attempts.push({
        url,
        status: "fetch-error",
        error: error?.message || "Unknown error",
      });
    }
  }

  return {
    url: null,
    data: null,
    attempts,
  };
}

export async function GET() {
  const { url, data, attempts } = await fetchFirstWorkingSource();

  if (!data) {
    return Response.json(
      {
        ok: false,
        route: "3",
        direction: "northbound",
        start: "Van Siclen Av",
        end: "Times Sq-42 St",
        mode: "station-mapped-from-live-arrivals",
        error: "No source URL returned usable data.",
        attempts,
        trains: [],
        stationMap: STATION_MAP,
      },
      { status: 502 }
    );
  }

  const arrivals = findArrivals(data);
  const line3Arrivals = arrivals.filter(isLine3Train);

  const trains = line3Arrivals
    .map(normalizeTrain)
    .filter((train) => train.led >= 0 && train.minutesAway !== null)
    .slice(0, 12);

  return Response.json({
    ok: true,
    route: "3",
    direction: "northbound",
    start: "Van Siclen Av",
    end: "Times Sq-42 St",
    mode: "station-mapped-from-live-arrivals",
    ledStart: 0,
    ledEnd: NUM_LEDS - 1,
    maxSegmentMinutes: MAX_SEGMENT_MINUTES,
    updatedAt: new Date().toISOString(),
    sourceUrl: url,
    attempts,
    rawArrivalsFound: arrivals.length,
    line3ArrivalsFound: line3Arrivals.length,
    trains,
    stationMap: STATION_MAP,
  });
}