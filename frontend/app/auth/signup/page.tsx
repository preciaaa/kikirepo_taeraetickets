"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ReCAPTCHA from "react-google-recaptcha";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        localStorage.setItem("customSessionStart", Date.now().toString());
        window.location.href = "/events";
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (showPassword && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (!recaptchaToken) {
      setMessage("Please complete the reCAPTCHA.");
      setLoading(false);
      return;
    }

    const FRONTEND_BASE_URL = process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || 'http://localhost:3000';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${FRONTEND_BASE_URL}/events`, // change to your actual redirect URL
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (user) {
        localStorage.setItem("user_id", user.id);
        localStorage.setItem("customSessionStart", Date.now().toString());
        window.location.href = "/events";
      } else {
        setMessage("Check your email to confirm your account.");
        console.warn(
          "User not available until email is confirmed:",
          userError?.message
        );
      }
      // ✅ Optional: do not redirect unless session exists
      // router.push('/events')
    }

    setLoading(false);
  };

  const redirectLogin = () => {
    // router.push('/auth/login')
    window.location.href = "/auth/login";
  };

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-[calc(100vh-69px)] flex items-center justify-center bg-gradient-to-b from-yellow-50 to-white">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-8 border border-gray-200">
        <h1 className="text-3xl font-bold mb-6 text-center">Sign Up</h1>
        <form onSubmit={handleSignup}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
            className="mb-4 text-base h-12 px-4"
            disabled={showPassword}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!validateEmail(email)) {
                  setEmailError("Please enter a valid email address.");
                } else {
                  setShowPassword(true);
                }
              }
            }}
          />
          {!showPassword ? (
            <>
              {emailError && (
                <p className="text-red-500 mb-2 text-center">{emailError}</p>
              )}
              <Button
                type="button"
                className="w-full h-12 text-base font-semibold mb-4"
                disabled={!email}
                onClick={() => {
                  if (!validateEmail(email)) {
                    setEmailError("Please enter a valid email address.");
                  } else {
                    setShowPassword(true);
                  }
                }}
              >
                Continue with Email
              </Button>
            </>
          ) : (
            <>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                className="mb-3 text-base h-12 px-4"
              />
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                required
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mb-4 text-base h-12 px-4"
              />
              <div className="mb-4 flex justify-left">
                <ReCAPTCHA
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                  onChange={(token) => setRecaptchaToken(token)}
                  className="w-full"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold"
              >
                {loading ? "Signing up..." : "Sign Up"}
              </Button>
            </>
          )}
          {message && <p className="mt-4 text-sm text-center">{message}</p>}
        </form>
        <div className="mt-6 text-center text-base">
          Already have an account?{" "}
          <Button
            variant="link"
            onClick={redirectLogin}
            className="text-blue-500 underline inline-flex p-0 align-baseline text-base"
          >
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
}
