import { DeepSeekBalance } from "@/components/DeepSeekBalance";

export default function BalancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-8">DeepSeek Balance</h1>
      <DeepSeekBalance />
    </div>
  );
}
