// src/components/OAuthButtons.tsx
type Props = {
  className?: string;
  labelPrefix?: string; // e.g. "Sign up" vs "Continue"
};

const API_BASE = import.meta.env.VITE_API_ORIGIN || "http://localhost:3001";

export default function OAuthButtons({ className = "", labelPrefix = "Continue" }: Props) {
  const go = (path: string) => {
    // Pure redirect — no CORS/fetch involved
    window.location.href = `${API_BASE}${path}`;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={() => go("/auth/google")}
        className="w-full rounded-md border-2 border-black py-2.5"
      >
        {labelPrefix} with Google
      </button>

      <button
        type="button"
        onClick={() => go("/auth/github")}
        className="w-full rounded-md border-2 border-black py-2.5"
      >
        {labelPrefix} with GitHub
      </button>
    </div>
  );
}
