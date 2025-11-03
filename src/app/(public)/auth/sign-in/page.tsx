'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const result = await signIn('credentials', {
      ...values,
      redirect: false
    });
    if (result?.error) {
      setError('Giriş yapılamadı. Bilgilerinizi kontrol edin.');
      return;
    }
    router.push('/dashboard');
  };

  return (
    <main className="container-responsive flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Tekrar hoş geldiniz</h1>
          <p className="text-sm text-slate-600">
            Çiftlik Pazar hesabınızla giriş yapın veya Google ile devam edin.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input type="email" placeholder="eposta@ornek.com" {...register('email')} />
          <Input type="password" placeholder="********" {...register('password')} />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Giriş yap
          </Button>
        </form>
        <div className="space-y-3 text-center">
          <Button variant="outline" className="w-full" onClick={() => signIn('google')}>
            Google ile devam et
          </Button>
        </div>
      </div>
    </main>
  );
}
