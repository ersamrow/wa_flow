import AuthForm from '@/components/auth-form';
export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ email?: string }> }) { const { token } = await params; const { email } = await searchParams; return <AuthForm mode="reset" token={token} initialEmail={email} />; }
