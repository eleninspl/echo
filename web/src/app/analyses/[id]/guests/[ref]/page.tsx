import { Suspense } from "react";

import { GuestPage } from "@/components/guest-page";

export default function GuestRoute({ params }: PageProps<"/analyses/[id]/guests/[ref]">) {
  return (
    <Suspense>
      <Guest params={params} />
    </Suspense>
  );
}

async function Guest({ params }: Pick<PageProps<"/analyses/[id]/guests/[ref]">, "params">) {
  const { ref } = await params;
  return <GuestPage guestRef={ref} />;
}
