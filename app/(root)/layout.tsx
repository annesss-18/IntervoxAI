import { redirect } from "next/navigation";
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

      {/* Subtle background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/5 blur-[100px]" />
      </div>
    </div>
  );
}
