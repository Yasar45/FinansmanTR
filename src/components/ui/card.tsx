import * as React from 'react';
import { cn } from '@/lib/utils';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white p-6 shadow-sm', className)} {...props} />;
}
