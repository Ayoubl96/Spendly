import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { register as registerUser } from '../../store/slices/authSlice';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const { toast } = useToast();
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    const result = await dispatch(registerUser({
      email: data.email,
      password: data.password,
      full_name: data.full_name,
    }));
    
    if (registerUser.fulfilled.match(result)) {
      toast({
        title: "Registration Successful!",
        description: "Your account has been created. Redirecting to login...",
      });
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else if (error) {
      toast({
        title: "Registration Failed",
        description: error,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">Create Account</h1>
        <p className="text-muted-foreground">
          Start managing your finances with a free account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="full_name" className="text-sm font-medium">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="full_name"
              type="text"
              placeholder="Enter your full name"
              className={`pl-10 ${errors.full_name ? 'border-destructive focus:border-destructive' : ''}`}
              {...register('full_name', {
                required: 'Full name is required',
                minLength: {
                  value: 2,
                  message: 'Full name must be at least 2 characters',
                },
              })}
            />
          </div>
          {errors.full_name && (
            <p className="text-sm text-destructive">{errors.full_name?.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              className={`pl-10 ${errors.email ? 'border-destructive focus:border-destructive' : ''}`}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email?.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Create a strong password"
              className={`pl-10 ${errors.password ? 'border-destructive focus:border-destructive' : ''}`}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
            />
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password?.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              className={`pl-10 ${errors.confirmPassword ? 'border-destructive focus:border-destructive' : ''}`}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value: string) => value === password || 'Passwords do not match',
              })}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword?.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
          size="lg"
          disabled={isLoading || showSuccess}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <RouterLink 
              to="/login" 
              className="text-primary hover:text-primary/80 font-medium hover:underline transition-colors"
            >
              Sign in here
            </RouterLink>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Register;