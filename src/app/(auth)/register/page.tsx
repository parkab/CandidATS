import RegistrationForm from '@/components/auth/RegistrationForm';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--background) px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-(--surface-border) bg-(--surface) p-8 shadow-sm">
        <RegistrationForm />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[linear-gradient(to_right,#ff75c3_0%,#ffa647_20%,#ffe83f_40%,#9fff5b_60%,#70e2ff_80%,#cd93ff_100%)]"
        />
      </div>
    </div>
  );
}
