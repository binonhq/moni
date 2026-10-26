import Link from "next/link";
import { Brand } from "@/components/brand";
export default function NotFound() {
  return (
    <main className="standalone-message">
      <Brand />
      <h1>A little off track.</h1>
      <p>This page doesn’t exist. Let’s get you home.</p>
      <Link href="/" className="button button-primary">
        Back to Moni
      </Link>
    </main>
  );
}
