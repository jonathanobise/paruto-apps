"use client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppError({ reset, error }: { reset: () => void; error: Error & { digest?: string } }) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <Alert tone="danger" title="Something went wrong loading this page">
        Nothing was changed. Try again; if it keeps happening, quote reference {error.digest ?? "n/a"} to support.
      </Alert>
      <Button className="mt-4" variant="secondary" onClick={reset}>Try again</Button>
    </div>
  );
}
