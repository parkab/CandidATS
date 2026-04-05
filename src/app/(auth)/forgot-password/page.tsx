import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--background) px-4">
      <div className="w-full max-w-md rounded-lg border border-(--surface-border) bg-(--surface) p-8 shadow-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
