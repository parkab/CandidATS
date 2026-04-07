import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--background) px-4">
      <div className="w-full max-w-md rounded-lg border border-(--surface-border) bg-(--surface) p-8 shadow-sm">
        <LoginForm />
      </div>
    </div>
  );
}
