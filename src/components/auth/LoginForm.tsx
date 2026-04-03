"use client";

import { useState } from 'react';
import { loginSchema } from '@/lib/validators';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setFieldErrors({});
      
      const data = loginSchema.parse({ email, password });
      
      await login(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const errMap: Record<string, string> = {};
        const fieldErrors = (err as z.ZodError).flatten().fieldErrors;
        Object.entries(fieldErrors).forEach(([key, msgs]) => {
           if (Array.isArray(msgs) && msgs.length > 0) errMap[key] = msgs[0];
        });
        setFieldErrors(errMap);
      } else {
        setError(err.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-500 rounded-md text-sm">{error}</div>}
      
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        icon={<Mail className="w-5 h-5" />}
        value={email}
        onChange={e => setEmail(e.target.value)}
        error={fieldErrors.email}
      />
      
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        icon={<Lock className="w-5 h-5" />}
        value={password}
        onChange={e => setPassword(e.target.value)}
        error={fieldErrors.password}
      />
      
      <Button type="submit" className="w-full" isLoading={loading}>
        Sign in
      </Button>

      <div className="text-center text-sm text-slate-500 mt-4">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary hover:underline font-medium">
          Register
        </Link>
      </div>
    </form>
  );
}
