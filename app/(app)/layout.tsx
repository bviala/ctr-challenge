import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";

async function AuthInfo() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return (
    <div className="flex items-center gap-4">
      Hey, {user?.email}!
      <LogoutButton />
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-6xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>Contour LMS Challenge</Link>
            </div>
            <Suspense fallback={null}>
              <AuthInfo />
            </Suspense>
          </div>
        </nav>
        <div className="flex-1 w-full flex flex-col gap-20 max-w-6xl p-5">
          {children}
        </div>
      </div>
    </main>
  );
}
