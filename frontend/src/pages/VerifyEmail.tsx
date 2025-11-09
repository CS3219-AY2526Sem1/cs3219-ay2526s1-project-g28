import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { api } from "../lib/api";

type Status = "idle" | "loading" | "success" | "error";

type VerificationResponse = {
  message?: string;
};

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const hasRequested = useRef(false);
  const lastTokenRef = useRef<string | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (lastTokenRef.current !== token) {
      lastTokenRef.current = token;
      hasRequested.current = false;
    }

    if (hasRequested.current) {
      return;
    }

    hasRequested.current = true;

    (async () => {
      if (!token) {
        if (isMountedRef.current) {
          setStatus("error");
          setMessage("Missing verification token");
        }
        return;
      }

      setStatus("loading");

      try {
        const res = (await api(`/users/verify-email?token=${encodeURIComponent(token)}`)) as VerificationResponse;
        if (!isMountedRef.current) {
          return;
        }
        setMessage(res?.message ?? "Email verified successfully");
        setStatus("success");
      } catch (err: unknown) {
        if (!isMountedRef.current) {
          return;
        }
        const errorMessage = err instanceof Error ? err.message : "Failed to verify email";
        setMessage(errorMessage);
        setStatus("error");
      }
    })();
  }, [token]);

  return (
    <div>
      <Header variant="authing" />
      <main className="min-h-screen flex items-center justify-center px-6 dark:bg-black">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow p-8 space-y-6 text-center dark:text-black">
          <h1 className="text-2xl font-semibold">Verify your email</h1>
          {status === "loading" ? (
            <p className="text-neutral-600">We’re verifying your email. Hang tight…</p>
          ) : (
            <p className="text-neutral-700 whitespace-pre-line">{message}</p>
          )}

          {status === "success" && (
            <div className="space-y-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-white"
              >
                Continue to login
              </Link>
              <p className="text-sm text-neutral-500">
                You can now sign in with your verified email address.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-red-500">
                If this keeps happening, please request a new verification email from the signup page.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                <Link to="/signup" className="underline">
                  Back to sign up
                </Link>
                <Link to="/login" className="underline">
                  Go to login
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}