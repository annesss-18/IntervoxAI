import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/auth.action'
import { Navbar } from '@/components/layout/Navbar'
import { FooterCompact } from '@/components/layout/Footer'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        user={{
          name: user.name,
          email: user.email,
          id: user.id,
        }}
      />
      <main className="flex-1 py-8">{children}</main>
      <FooterCompact />
    </div>
  )
}
