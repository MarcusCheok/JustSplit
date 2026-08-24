import Link from "next/link";
import { getTrips, getAllTripParticipants } from "@/lib/data";
import { CountriesSummary } from "@/components/CountriesSummary";

export default async function CountriesVisitedPage() {
  let trips;
  let participantRows;
  try {
    [trips, participantRows] = await Promise.all([
      getTrips(),
      getAllTripParticipants(),
    ]);
  } catch {
    return (
      <div className="flex flex-col gap-5">
        <BackLink />
        <ErrorCard />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <BackLink />
      <h1 className="text-xl font-bold">🌍 Countries Visited</h1>
      <CountriesSummary trips={trips} participantRows={participantRows} />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/trips" className="text-sm text-ink/50">
      ← Trips
    </Link>
  );
}

function ErrorCard() {
  return (
    <div className="rounded-2xl bg-white p-4 text-center text-sm text-ink/60 shadow-sm ring-1 ring-black/5">
      Couldn&apos;t load your countries — try again.
    </div>
  );
}
