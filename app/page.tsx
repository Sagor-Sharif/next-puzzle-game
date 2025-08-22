"use client";
import { useEffect, useState } from "react";
import SlidingPuzzle from "@/components/SlidingPuzzle";

export default function Page() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      {/* Only render SlidingPuzzle on the client to avoid hydration mismatch */}
  {mounted && <SlidingPuzzle imageSrc={"/mina-raju.jpg"} size={3} />}
    </main>
  );
}
