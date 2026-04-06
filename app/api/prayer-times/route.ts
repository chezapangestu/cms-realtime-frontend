import { NextResponse } from "next/server";
import { DateTime } from "luxon";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("latitude") ?? -6.842751);
  const longitude = Number(url.searchParams.get("longitude") ?? 107.580121);

  const jakartaDate = DateTime.now().setZone("Asia/Jakarta");
  const formattedDate = jakartaDate.toFormat("dd-MM-yyyy");
  const hariIndonesia = jakartaDate.setLocale("id").toFormat("cccc");

  const tuneValues = [3, 3, 3, 3, 2, 7, 0, 3, -30];
  const tuneString = tuneValues.join(",");

  const dataManual = {
    Fajr: "04:37",
    Sunrise: "05:55",
    Dhuhr: "11:55",
    Asr: "15:13",
    Maghrib: "17:59",
    Isha: "19:04",
    Imsak: "04:27",
    Midnight: "23:22",
    Firstthird: "21:52",
    Lastthird: "01:52",
    Date: "Selasa, 07 Apr 2026",
    HijriDay: "19",
    HijriMonth: "Shawwāl",
    HijriYear: "1447",
    Source: "Kementerian Agama Republik Indonesia",
  };

  try {
    const apiUrl = `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${latitude}&longitude=${longitude}&method=20&tune=${tuneString}&timezonestring=Asia/Jakarta`;

    const response = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      // optional: cache no-store biar selalu fresh
      cache: "no-store",
    });

    if (!response.ok)
      throw new Error(`API responded with status: ${response.status}`);

    const data = await response.json();
    if (!data?.data?.timings)
      throw new Error("Invalid response structure from API");

    const prayerTimes = {
      Fajr: data.data.timings.Fajr,
      Sunrise: data.data.timings.Sunrise,
      Dhuhr: data.data.timings.Dhuhr,
      Asr: data.data.timings.Asr,
      Maghrib: data.data.timings.Maghrib,
      Isha: data.data.timings.Isha,
      Imsak: data.data.timings.Imsak,
      Midnight: data.data.timings.Midnight,
      Firstthird: data.data.timings.Firstthird,
      Lastthird: data.data.timings.Lastthird,
      Date: `${hariIndonesia}, ${data.data.date.readable}`,
      HijriDay: data.data.date.hijri.day,
      HijriMonth: data.data.date.hijri.month.en,
      HijriYear: data.data.date.hijri.year,
      Source: data.data.meta.method.name,
    };

    return NextResponse.json(prayerTimes);
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    return NextResponse.json(dataManual);
  }
}
