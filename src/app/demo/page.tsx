"use client";

// The shareable demo link (lofty-two.vercel.app/demo). The provider saw "/demo" when it mounted and
// loaded the sample wall in memory, so this only moves on to /wall. If the provider mounted elsewhere
// first (a client-side visit), a full load with ?demo turns the demo on.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIdeas } from "@/lib/useIdeas";

export default function DemoPage() {
  const { demo, hydrated } = useIdeas();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (demo) router.replace("/wall");
    else window.location.replace("/wall?demo");
  }, [demo, hydrated, router]);

  return null;
}
