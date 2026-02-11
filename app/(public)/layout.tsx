import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="texture-grid absolute inset-0 opacity-20" />
      </div>
    </div>
  );
}
