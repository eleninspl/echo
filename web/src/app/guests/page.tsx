import type { Metadata } from "next";
import { Suspense } from "react";

import { YourGuests } from "@/components/your-guests";

export const metadata: Metadata = { title: "Your guests" };

export default function GuestsPage() {
  return (
    <Suspense>
      <YourGuests />
    </Suspense>
  );
}
