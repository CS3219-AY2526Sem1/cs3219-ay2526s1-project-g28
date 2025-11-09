// src/pages/Signup.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Header from "@/components/Header";
import OAuthButtons from "@/components/OAuthButtons";
import { getPasswordRequirementStatus, isPasswordStrong } from "@/lib/password";
export default function Signup() {
  const [username, setUsername] = useState("");
  const [fullname, setFullname] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<
    | null
    | {
        email: string;
        dispatched: boolean;
        expiresAt?: string;
        message?: string;
      }
  >(null);

  const passwordStatus = useMemo(
    () => getPasswordRequirementStatus(password),
    [password]
  );

  const pwOk = isPasswordStrong(password);
  const match = password === confirm;
  const canSubmit = Boolean(username && email && pwOk && match && !loading);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const result = await api("/users", {
        method: "POST",
        body: { username, fullname, email, password },
      });

      const verification = result?.data?.emailVerification ?? {};
      setSuccess({
        email,
        dispatched: Boolean(verification?.dispatched),
        expiresAt: verification?.expiresAt,
        message: result?.message,
      });
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  const verificationExpiry = useMemo(() => {
    if (!success?.expiresAt) return null;
    const expires = new Date(success.expiresAt);
    if (Number.isNaN(expires.getTime())) return null;
    const formatted = new Intl.DateTimeFormat("en-SG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Singapore",
    }).format(expires);
    return `${formatted} GMT+8`;
  }, [success?.expiresAt]);

  if (success) {
    return (
      <div>
        <Header variant="authing" />

        <div className="min-h-screen flex items-center justify-center px-6 bg-neutral-50 dark:bg-black">
          <div
            className="w-full max-w-md rounded-2xl shadow p-6 space-y-4
                       bg-white border border-neutral-200
                       dark:bg-neutral-900 dark:border-neutral-800"
          >
            <h1 className="text-2xl font-semibold text-center text-neutral-900 dark:text-neutral-100">
              Check your inbox
            </h1>

            {success.message && (
              <p className="text-sm text-center text-neutral-700 dark:text-neutral-300">
                {success.message}
              </p>
            )}

            {success.dispatched ? (
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                We sent a verification email to <span className="font-medium">{success.email}</span>. Follow the
                link in that email to activate your account before logging in.
                {verificationExpiry && " "}
                {verificationExpiry && (
                  <span>
                    The link will expire on <span className="font-medium">{verificationExpiry}</span>.
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                Your account was created, but we couldn’t automatically send a verification email. Please reach out
                to our support team so we can help verify <span className="font-medium">{success.email}</span>.
              </p>
            )}

            <div className="pt-4 text-center text-sm text-neutral-700 dark:text-neutral-300">
              Ready to sign in once verified?{" "}
              <Link to="/login" className="font-semibold underline">
                Go to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header variant="authing" />

      <div className="min-h-screen flex items-center justify-center px-6 bg-neutral-50 dark:bg-black">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm rounded-2xl shadow p-6 space-y-4
                     bg-white border border-neutral-200
                     dark:bg-neutral-900 dark:border-neutral-800"
        >
          <h1 className="text-xl font-semibold text-center text-neutral-900 dark:text-neutral-100">
            Create your account
          </h1>

          {error && (
            <div className="text-sm rounded p-2
                            text-red-700 bg-red-50 border border-red-200
                            dark:text-red-300 dark:bg-red-950/40 dark:border-red-900">
              {error}
            </div>
          )}

          <Input
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.trim())}
          />
          <Input
            type="text"
            placeholder="Full Name"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
          />
          <Input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-requirements"
          />
          <Input
            type="password"
            placeholder="confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <div
            id="password-requirements"
            className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700
                       dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <p className="font-medium text-neutral-800 dark:text-neutral-200">Password must include:</p>
            <ul className="mt-2 space-y-1">
              {passwordStatus.map((requirement) => (
                <li key={requirement.id} className="flex items-center gap-2">
                  <span
                    className={
                      requirement.met
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-neutral-400 dark:text-neutral-600"
                    }
                  >
                    {requirement.met ? "✓" : "•"}
                  </span>
                  <span
                    className={
                      requirement.met
                        ? "text-neutral-800 dark:text-neutral-100"
                        : "text-neutral-600 dark:text-neutral-400"
                    }
                  >
                    {requirement.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {password && confirm && !match && (
            <p className="text-xs text-red-700 dark:text-red-300">Passwords do not match.</p>
          )}

          <button
            disabled={!canSubmit}
            className="w-full rounded-md py-2.5 font-medium
                       bg-black text-white disabled:opacity-60
                       dark:bg-neutral-100 dark:text-neutral-900"
          >
            {loading ? "Creating…" : "Sign up"}
          </button>
          <OAuthButtons className="pt-2" labelPrefix="Sign up" />
          <p className="text-center text-sm text-neutral-700 dark:text-neutral-300">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

/** Reusable input with light/dark styles */
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md px-3 py-2
                  bg-white text-neutral-900 border border-neutral-300
                  placeholder:text-neutral-400
                  focus:outline-none focus:ring-2 focus:ring-neutral-800/20 focus:border-neutral-400
                  dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700
                  dark:placeholder:text-neutral-500 dark:focus:ring-neutral-100/20 dark:focus:border-neutral-600`}
    />
  );
}
