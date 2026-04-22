"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/firebase/client";
import { googleAuthenticate, signIn, signUp } from "@/lib/actions/auth.action";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignInData = z.infer<typeof signInSchema>;
type SignUpData = z.infer<typeof signUpSchema>;
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
interface AuthFormProps {
  type: "sign-in" | "sign-up";
}

/**
 * Return a safe post-auth redirect destination.
 *
 * Only allows relative paths that start with "/" and do not start with "//"
 * (protocol-relative URLs). Anything else — including absolute URLs — falls
 * back to /dashboard to prevent open-redirect attacks.
 */
function getSafeCallbackUrl(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

export function AuthForm({ type }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postAuthUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isResettingPassword, setIsResettingPassword] = React.useState(false);

  const isSignIn = type === "sign-in";

  const signInForm = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const form = isSignIn ? signInForm : signUpForm;
  const errors = form.formState.errors as Record<string, { message?: string }>;
  const onSubmit = async (data: SignInData | SignUpData) => {
    setIsLoading(true);
    try {
      if (isSignIn) {
        const { email, password } = data as SignInData;
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await cred.user.getIdToken();
        const result = await signIn({ idToken });
        if (!result.success)
          throw new Error(result.message || "Failed to sign in");
        toast.success("Welcome back!");
        router.push(postAuthUrl);
      } else {
        const { name, email, password } = data as SignUpData;
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(cred.user, { displayName: name });
        const idToken = await cred.user.getIdToken();
        const result = await signUp({ name, idToken });
        if (!result.success)
          throw new Error(result.message || "Failed to create account");
        toast.success("Account created successfully!");
        router.push(postAuthUrl);
      }
    } catch (error: unknown) {
      // Roll back client-side Firebase auth so it doesn't diverge from the
      // server state (which failed to issue a session cookie).
      await auth.signOut().catch(() => {});
      const err = error as { message?: string };
      toast.error(
        err?.message ||
          (isSignIn ? "Failed to sign in" : "Failed to create account"),
      );
    } finally {
      setIsLoading(false);
    }
  };
  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();
      const email = cred.user.email || "";
      if (!email) throw new Error("No email on this Google account.");

      // Always use googleAuthenticate — it's idempotent:
      // creates the user on first sign-in, continues if already exists.
      const result = await googleAuthenticate({
        name: cred.user.displayName || "User",
        idToken,
      });

      if (!result.success)
        throw new Error(result.message || "Authentication failed");
      toast.success(
        isSignIn ? "Welcome back!" : "Account created successfully!",
      );
      router.push(postAuthUrl);
    } catch (error: unknown) {
      // Roll back client-side Firebase auth so it doesn't diverge from the
      // server state (which failed to issue a session cookie).
      await auth.signOut().catch(() => {});
      const err = error as { message?: string };
      toast.error(err?.message || "Google authentication failed");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = signInForm.getValues("email");
    if (!email || !email.includes("@")) {
      toast.error("Please enter your email address first.");
      signInForm.setFocus("email");
      return;
    }
    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent. Check your inbox.");
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err?.code === "auth/user-not-found") {
        toast.error("No account found with this email.");
      } else {
        toast.error("Failed to send reset email. Please try again.");
      }
    } finally {
      setIsResettingPassword(false);
    }
  };
  return (
    <div className="space-y-7">
      <div className="space-y-1.5">
        <h1 className="font-serif italic font-normal text-3xl">
          {isSignIn ? "Welcome back" : "Create account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSignIn
            ? "Sign in to continue your interview practice."
            : "Get started with structured interview preparation."}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-3 rounded-xl h-11"
        onClick={handleGoogleAuth}
        disabled={isGoogleLoading || isLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleIcon className="size-4 shrink-0" />
        )}
        <span>Continue with Google</span>
      </Button>

      <div className="relative flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!isSignIn && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Jane Smith"
              icon={<User />}
              error={!!errors.name}
              className="rounded-xl"
              {...signUpForm.register("name")}
            />
            {errors.name && (
              <p className="text-xs text-error mt-1">{errors.name.message}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            icon={<Mail />}
            error={!!errors.email}
            className="rounded-xl"
            {...(isSignIn
              ? signInForm.register("email")
              : signUpForm.register("email"))}
          />
          {errors.email && (
            <p className="text-xs text-error mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {isSignIn && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResettingPassword}
                className="text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                {isResettingPassword ? "Sending…" : "Forgot password?"}
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              icon={<Lock />}
              error={!!errors.password}
              className="rounded-xl pr-10"
              {...(isSignIn
                ? signInForm.register("password")
                : signUpForm.register("password"))}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-error mt-1">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="mt-1 w-full"
          disabled={isLoading || isGoogleLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isSignIn ? "Signing in…" : "Creating account…"}
            </>
          ) : isSignIn ? (
            "Sign In"
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
        <Link
          href={isSignIn ? "/sign-up" : "/sign-in"}
          className="font-semibold text-primary hover:underline underline-offset-4"
        >
          {isSignIn ? "Sign Up" : "Sign In"}
        </Link>
      </p>

      {!isSignIn && (
        <p className="text-center text-[11px] text-muted-foreground/60 leading-relaxed">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline hover:text-muted-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline hover:text-muted-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>
      )}
    </div>
  );
}
