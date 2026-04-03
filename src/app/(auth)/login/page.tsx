import { LoginForm } from '@/components/auth/LoginForm';
import { Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-emerald-500">
            TeleMedic
          </h1>
          <p className="text-slate-500 mt-2 text-center text-sm">
            Welcome back. Please enter your details.
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
