interface BadgeProps {
  variant: 'bloquant' | 'attention' | 'info' | 'success';
  children: React.ReactNode;
}

const variants = {
  bloquant: 'bg-red-500/20 text-red-400 border-red-500/30',
  attention: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${variants[variant]}`}>
      {children}
    </span>
  );
}
