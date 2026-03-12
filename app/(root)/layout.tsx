import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { Navbar } from "@/components/layout/Navbar";
import { FooterCompact } from "@/components/layout/Footer";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    // Clear the stale session cookie so the edge middleware (proxy.ts) won't
    // redirect back from /sign-in, breaking the redirect loop that occurs when
    // a cookie is JWT-shaped but expired/revoked.
    const cookieStore = await cookies();
    cookieStore.delete("session");
    redirect("/sign-in");
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Navbar
        user={{
          name: user.name,
          email: user.email,
          id: user.id,
        }}
      />
      <main className="relative flex-1 py-8 md:py-10">{children}</main>
      <FooterCompact />

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-48 -right-32 h-[480px] w-[480px] rounded-full opacity-[0.07] blur-[130px]"
          style={{
            background: "radial-gradient(ellipse, #7050b0, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-48 -left-32 h-[400px] w-[400px] rounded-full opacity-[0.06] blur-[110px]"
          style={{
            background: "radial-gradient(ellipse, #48a8b8, transparent 70%)",
          }}
        />
      </div>
    </div>
  );
}
