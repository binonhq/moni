import type { Metadata } from "next";
import { TransactionsScreen } from "@/components/transactions-screen";
export const metadata: Metadata = { title: "Transactions" };
export default function TransactionsPage() { return <TransactionsScreen />; }
