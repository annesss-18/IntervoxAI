'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { auth } from '@/firebase/client'
import { signIn, signUp } from '@/lib/actions/auth.action'
import { toast } from 'sonner'
import { Loader2, Mail, Lock, User, Chrome } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Label } from '@/components/atoms/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/atoms/card'
import { Separator } from '@/components/atoms/separator'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type SignInFormData = z.infer<typeof signInSchema>
type SignUpFormData = z.infer<typeof signUpSchema>

interface AuthFormProps {
  type: 'sign-in' | 'sign-up'
}

export function AuthForm({ type }: AuthFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)

  const isSignIn = type === 'sign-in'

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const form = isSignIn ? signInForm : signUpForm

  const onSubmit = async (data: SignInFormData | SignUpFormData) => {
    setIsLoading(true)

    try {
      if (isSignIn) {
        const { email, password } = data as SignInFormData
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const idToken = await userCredential.user.getIdToken()

        const result = await signIn({ email, idToken })

        if (!result.success) {
          throw new Error(result.message || 'Failed to sign in')
        }

        toast.success('Welcome back!')
        router.push('/dashboard')
      } else {
        const { name, email, password } = data as SignUpFormData
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(userCredential.user, { displayName: name })

        const result = await signUp({
          uid: userCredential.user.uid,
          name,
          email,
        })

        if (!result.success) {
          throw new Error(result.message || 'Failed to create account')
        }

        toast.success('Account created successfully!')
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      console.error('Auth error:', error)
      const err = error as { message?: string }
      const message = err?.message || (isSignIn ? 'Failed to sign in' : 'Failed to create account')
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      const userCredential = await signInWithPopup(auth, provider)
      const idToken = await userCredential.user.getIdToken()

      const user = userCredential.user
      const result = isSignIn
        ? await signIn({ email: user.email!, idToken })
        : await signUp({
            uid: user.uid,
            name: user.displayName || 'User',
            email: user.email!,
          })

      if (!result.success) {
        throw new Error(result.message || 'Authentication failed')
      }

      toast.success(isSignIn ? 'Welcome back!' : 'Account created successfully!')
      router.push('/dashboard')
    } catch (error: unknown) {
      console.error('Google auth error:', error)
      const err = error as { message?: string }
      const message = err?.message || 'Google authentication failed'
      toast.error(message)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const errors = form.formState.errors as Record<string, { message?: string }>

  return (
    <Card variant="gradient" className="w-full">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-2xl">{isSignIn ? 'Welcome Back' : 'Create Account'}</CardTitle>
        <CardDescription>
          {isSignIn
            ? 'Sign in to continue your interview practice'
            : 'Start your journey to interview success'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Google Auth */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleAuth}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Chrome className="size-4" />
              Continue with Google
            </>
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card text-muted-foreground px-2">or continue with email</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!isSignIn && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                icon={<User className="size-4" />}
                error={!!errors.name}
                {...signUpForm.register('name')}
              />
              {errors.name && <p className="text-error-500 text-sm">{errors.name.message}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="size-4" />}
              error={!!errors.email}
              {...(isSignIn ? signInForm.register('email') : signUpForm.register('email'))}
            />
            {errors.email && <p className="text-error-500 text-sm">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="size-4" />}
              error={!!errors.password}
              {...(isSignIn ? signInForm.register('password') : signUpForm.register('password'))}
            />
            {errors.password && <p className="text-error-500 text-sm">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isSignIn ? 'Signing In...' : 'Creating Account...'}
              </>
            ) : isSignIn ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-muted-foreground text-sm">
          {isSignIn ? "Don't have an account?" : 'Already have an account?'}{' '}
          <Link
            href={isSignIn ? '/sign-up' : '/sign-in'}
            className="text-primary font-medium hover:underline"
          >
            {isSignIn ? 'Sign Up' : 'Sign In'}
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
