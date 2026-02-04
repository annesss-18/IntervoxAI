import { Metadata } from 'next'
import { AuthForm } from '@/components/organisms/AuthForm'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your IntervoxAI account and start practicing interviews today.',
}

export default function SignUpPage() {
  return <AuthForm type="sign-up" />
}
