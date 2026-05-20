import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, icon, defaultOpen = true, badge, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-[#252830] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-[#181c25] hover:bg-[#1e2028] transition-colors text-left"
      >
        {open ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
        {icon}
        <span className="text-sm font-semibold text-gray-300">{title}</span>
        {badge && <span className="text-[10px] text-gray-500 ml-1">{badge}</span>}
      </button>
      {open && <div className="p-4 bg-[#181c25]">{children}</div>}
    </div>
  );
}
