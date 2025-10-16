// src/components/CenteredSpinner.tsx
export default function CenteredSpinner() {
  return (
    <div className="grid place-items-center min-h-screen bg-neutral-50">
      <div className="h-10 w-10 rounded-full border-4 border-neutral-300 border-t-neutral-700 animate-spin" />
    </div>
  );
}
