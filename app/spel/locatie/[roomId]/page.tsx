"use client";

import { useParams } from "next/navigation";
import { LocationQuiz } from "@/components/team/LocationQuiz";

export default function LocationPage() {
  const params = useParams<{ roomId: string }>();
  return <LocationQuiz locationId={params.roomId} />;
}
