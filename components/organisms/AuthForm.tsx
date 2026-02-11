"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/firebase/client";
import { googleAuthenticate, signIn, signUp } from "@/lib/actions/auth.action";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Chrome } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Separator } from "@/components/atoms/separator";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

interface AuthFormProps {
  type: "sign-in" | "sign-up";
}

export function AuthForm({ type }: AuthFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const isSignIn = type === "sign-in";

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const form = isSignIn ? signInForm : signUpForm;

  const onSubmit = async (data: SignInFormData | SignUpFormData) => {
    setIsLoading(true);

    try {
      if (isSignIn) {
        const { email, password } = data as SignInFormData;
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const idToken = await userCredential.user.getIdToken();

        const result = await signIn({ email, idToken });

        if (!result.success) {
          throw new Error(result.message || "Failed to sign in");
        }

        toast.success("Welcome back!");
        router.push("/dashboard");
      } else {
        const { name, email, password } = data as SignUpFormData;
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(userCredential.user, { displayName: name });
        const idToken = await userCredential.user.getIdToken();

        const result = await signUp({
          uid: userCredential.user.uid,
          name,
          email,
          idToken,
        });

        if (!result.success) {
          throw new Error(result.message || "Failed to create account");
        }

        toast.success("Account created successfully!");
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      console.error("Auth error:", error);
      const err = error as { message?: string };
      const message =
        err?.message ||
        (isSignIn ? "Failed to sign in" : "Failed to create account");
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();

      const user = userCredential.user;
      const userEmail = user.email || "";

      if (!userEmail) {
        throw new Error(
          "No email associated with this Google account. Please use a different account.",
        );
      }

      const result = isSignIn
        ? await signIn({ email: userEmail, idToken })
        : await googleAuthenticate({
            uid: user.uid,
            name: user.displayName || "User",
            email: userEmail,
            idToken,
          });

      if (!result.success) {
        throw new Error(result.message || "Authentication failed");
      }

      toast.success(
        isSignIn ? "Welcome back!" : "Account created successfully!",
      );
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Google auth error:", error);
      const err = error as { message?: string };
      const message = err?.message || "Google authentication failed";
      toast.error(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const errors = form.formState.errors as Record<string, { message?: string }>;

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-normal">
          <span className="font-serif italic">
            {isSignIn ? "Welcome back" : "Create account"}
          </span>
        </h1>
        <p className="text-muted-foreground">
          {isSignIn
            ? "Sign in to continue your interview practice."
            : "Get started with structured interview preparation."}
        </p>
      </div>

      <div className="space-y-6">
        <Button
          type="button"
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
            <span className="bg-background text-muted-foreground px-3">
              or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!isSignIn && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                icon={<User className="size-4" />}
                error={!!errors.name}
                {...signUpForm.register("name")}
              />
              {errors.name && (
                <p className="text-error text-sm">{errors.name.message}</p>
              )}
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
              {...(isSignIn
                ? signInForm.register("email")
                : signUpForm.register("email"))}
            />
            {errors.email && (
              <p className="text-error text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              icon={<Lock className="size-4" />}
              error={!!errors.password}
              {...(isSignIn
                ? signInForm.register("password")
                : signUpForm.register("password"))}
            />
            {errors.password && (
              <p className="text-error text-sm">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isSignIn ? "Signing In..." : "Creating Account..."}
              </>
            ) : isSignIn ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </div>

      <div className="border-t border-border pt-6 text-center">
        <p className="text-muted-foreground text-sm">
          {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
          <Link
            href={isSignIn ? "/sign-up" : "/sign-in"}
            className="text-primary font-medium hover:underline"
          >
            {isSignIn ? "Sign Up" : "Sign In"}
          </Link>
        </p>
      </div>
    </div>
  );
}
