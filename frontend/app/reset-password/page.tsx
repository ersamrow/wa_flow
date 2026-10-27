import AuthForm from '@/components/auth-form';
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) { const { token, email } = await searchParams; return <AuthForm mode="reset" token={token} initialEmail={email} />; }
