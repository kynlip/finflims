import Image from "next/image";
import { X } from "lucide-react";

interface AuthHeaderProps {
  onClose: () => void;
}

export function AuthHeader({ onClose }: AuthHeaderProps) {
  return (
    <div className="bg-[#151925] border-b border-white/10 p-4 md:p-5 flex items-center justify-between gap-4 relative z-20">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 md:h-11 md:w-11">
          <Image
            src="/images/logo/logo-mark.svg"
            alt="PhimHayHonRo Logo"
            width={512}
            height={512}
            className="h-full w-full"
            priority
          />
        </div>
        <div className="hidden sm:flex flex-col border-l border-white/10 pl-3">
          <span className="text-white font-bold text-sm leading-tight tracking-tight">
            PhimHayHonRo
          </span>
          <span className="text-white/50 text-[11px] font-medium leading-tight mt-0.5">
            phimhayhonro.net
          </span>
        </div>
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng cửa sổ"
        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-95 border border-white/10"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
