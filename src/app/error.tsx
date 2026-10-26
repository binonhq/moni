"use client";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="standalone-message">
      <Brand />
      <h1>A small pause.</h1>
      <p>We couldn’t load your space. Your data is safe; please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
