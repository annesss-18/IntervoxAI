import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/api-middleware'

export const POST = withRateLimit(async () => {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('session')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sign out error:', error)
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
  }
}, {
  maxRequests: 30,
  windowMs: 60 * 1000,
})
