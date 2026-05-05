const SOURCE_URL = "https://nory-subway-proxy.vercel.app/api/trains";

export async function GET() {
  try {
    const response = await fetch(SOURCE_URL, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Source failed with HTTP ${response.status}`,
          trains: [],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const data = await response.json();

    const trains = Array.isArray(data.trains)
      ? data.trains.map((train, index) => ({
          id: index + 1,
          led: train.led,
          station: train.station,
          minutesAway: train.minutesAway,
        }))
      : [];

    return new Response(
      JSON.stringify({
        ok: true,
        route: "3",
        start: "Van Siclen Av",
        end: "Times Sq-42 St",
        updatedAt: new Date().toISOString(),
        trains,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message || "Unknown server error",
        trains: [],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}