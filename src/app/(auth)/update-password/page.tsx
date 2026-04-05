import UpdatePasswordForm from '@/components/auth/UpdatePasswordForm';

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--background) px-4">
      <div className="w-full max-w-md rounded-lg border border-(--surface-border) bg-(--surface) p-8 shadow-sm">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
