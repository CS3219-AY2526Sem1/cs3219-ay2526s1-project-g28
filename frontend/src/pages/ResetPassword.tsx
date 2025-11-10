import { useMemo, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { getPasswordRequirementStatus, isPasswordStrong } from "@/lib/password";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const hasToken = token.length > 0;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [requestResult, setRequestResult] = useState<
    | null
    | {
        message: string;
        dispatched: boolean;
        expiresAt?: string | null;
      }
  >(null);
  const [resetResult, setResetResult] = useState<null | { message: string }>(null);

  const passwordStatus = useMemo(() => getPasswordRequirementStatus(password), [password]);
  const passwordStrong = isPasswordStrong(password);
  const passwordsMatch = password === confirm;

  const canSubmitReset = hasToken && passwordStrong && passwordsMatch && !loading;
  const canSubmitRequest = !hasToken && email.trim().length > 0 && !loading;

  const requestExpiry = useMemo(() => {
    if (!requestResult?.expiresAt) return null;
    const expires = new Date(requestResult.expiresAt);
    if (Number.isNaN(expires.getTime())) return null;
    const formatted = new Intl.DateTimeFormat("en-SG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Singapore",
    }).format(expires);
    return `${formatted} GMT+8`;
  }, [requestResult?.expiresAt]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitRequest) return;

    setError(null);
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const response = await api("/auth/forgot-password", {
        method: "POST",
        body: { email: trimmedEmail },
      });

      const dispatched = Boolean(response?.data?.dispatched);
      setRequestResult({
        message:
          response?.message ||
          "If an account exists for this email, we sent instructions to reset your password.",
        dispatched,
        expiresAt: response?.data?.expiresAt,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to request password reset");
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitReset) return;

    setError(null);
    setLoading(true);

    try {
      const response = await api("/auth/reset-password", {
        method: "POST",
        body: { token, password },
      });

      setResetResult({
        message: response?.message || "Password reset successfully",
      });
    } catch (err: any) {
      setError(err?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  const content = hasToken ? (
    resetResult ? (
      <SuccessCard
        title="Password updated"
        message={
          resetResult.message || "Your password has been updated. You can now sign in with your new password."
        }
        actionLabel="Return to login"
        actionHref="/login"
      />
    ) : (
      <form
        onSubmit={submitReset}
        className="w-full max-w-md rounded-2xl shadow p-6 space-y-4 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800"
      >
        <h1 className="text-xl font-semibold text-center text-neutral-900 dark:text-neutral-100">
          Choose a new password
        </h1>

        {error && (
          <div className="text-sm rounded p-2 text-red-700 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900">
            {error}
          </div>
        )}

        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="reset-password-requirements"
        />
        <Input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <div
          id="reset-password-requirements"
          className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
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
                      : "text-neutral-500 dark:text-neutral-400"
                  }
                >
                  {requirement.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {!passwordsMatch && confirm.length > 0 && (
          <p className="text-sm text-red-600 dark:text-red-400">Passwords do not match.</p>
        )}

        <button
          type="submit"
          disabled={!canSubmitReset}
          className="w-full rounded-md py-2.5 font-medium bg-black text-white hover:opacity-90 active:opacity-80 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:opacity-90"
        >
          {loading ? "Saving…" : "Reset password"}
        </button>

        <p className="text-center text-sm text-neutral-700 dark:text-neutral-300">
          Changed your mind? <Link to="/login" className="font-semibold underline">Back to login</Link>
        </p>
      </form>
    )
  ) : requestResult ? (
    <SuccessCard
      title="Check your inbox"
      message={
        requestResult.message ||
        "If we found an account with that email, you'll receive a link to reset your password shortly."
      }
      extra={
        requestResult.dispatched && requestExpiry ? (
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            The link will expire on <span className="font-medium">{requestExpiry}</span>.
          </p>
        ) : null
      }
      actionLabel="Return to login"
      actionHref="/login"
    />
  ) : (
    <form
      onSubmit={submitRequest}
      className="w-full max-w-md rounded-2xl shadow p-6 space-y-4 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800"
    >
      <h1 className="text-xl font-semibold text-center text-neutral-900 dark:text-neutral-100">
        Reset your password
      </h1>
      <p className="text-sm text-neutral-700 dark:text-neutral-300 text-center">
        Enter the email associated with your account. We'll send you a link to choose a new password.
      </p>

      {error && (
        <div className="text-sm rounded p-2 text-red-700 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900">
          {error}
        </div>
      )}

      <Input
        type="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button
        type="submit"
        disabled={!canSubmitRequest}
        className="w-full rounded-md py-2.5 font-medium bg-black text-white hover:opacity-90 active:opacity-80 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:opacity-90"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-neutral-700 dark:text-neutral-300">
        Remember your password? <Link to="/login" className="font-semibold underline">Back to login</Link>
      </p>
    </form>
  );

  return (
    <div>
      <Header variant="authing" />
      <div className="min-h-screen flex items-center justify-center px-6 bg-neutral-50 dark:bg-black">
        {content}
      </div>
    </div>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md px-3 py-2 border-2 border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500 text-neutral-900 placeholder-neutral-500 caret-neutral-700 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-400 dark:caret-neutral-200 ${
        props.className ?? ""
      }`}
    />
  );
}

function SuccessCard({
  title,
  message,
  extra,
  actionLabel,
  actionHref,
}: {
  title: string;
  message: string;
  extra?: ReactNode;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="w-full max-w-md rounded-2xl shadow p-6 space-y-4 bg-white border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800">
      <h1 className="text-2xl font-semibold text-center text-neutral-900 dark:text-neutral-100">{title}</h1>
      <p className="text-sm text-neutral-700 dark:text-neutral-300 text-center whitespace-pre-line">{message}</p>
      {extra}
      <div className="pt-2 text-center text-sm text-neutral-700 dark:text-neutral-300">
        <Link to={actionHref} className="font-semibold underline">
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
