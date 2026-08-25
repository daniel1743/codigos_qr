import re

FILE = 'src/components/navigation/MobileBottomNav.tsx'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# 1. Update BUBBLE_WIDTH
content = content.replace("const BUBBLE_WIDTH = 68;", "const BUBBLE_WIDTH = 48;")

# 2. Update bottom padding
content = content.replace(
    "pb-[calc(env(safe-area-inset-bottom)+1rem)]",
    "pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
)

# 3. Replace the active indicator SVG and divs with a clean, single pill
old_indicator = """        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-0 z-0 h-14 w-[68px] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
            ready ? "opacity-100" : "opacity-0",
          )}
          style={{ transform: `translateX(${indicatorX}px)` }}
        >
          <svg
            width="68"
            height="17"
            viewBox="0 0 68 17"
            className="absolute left-0 top-0 z-0 fill-transparent"
          >
            <path d="M 0 0 C 11 0 11 17 34 17 C 57 17 57 0 68 0 Z" />
          </svg>
          <div className="absolute left-[11px] top-[-21px] z-10 h-[45px] w-[45px] rounded-full bg-transparent" />
          <div className="absolute left-4 top-[-18px] z-20 h-9 w-9 rounded-full border border-slate-700/60 bg-[#18181b] shadow-[0_5px_10px_rgba(0,0,0,0.32)]" />
        </div>"""

new_indicator = """        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-0 z-0 h-14 w-[48px] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
            ready ? "opacity-100" : "opacity-0",
          )}
          style={{ transform: `translateX(${indicatorX}px)` }}
        >
          <div className="absolute left-1/2 top-[-10px] z-0 h-[38px] w-[38px] -translate-x-1/2 rounded-full bg-[#18181b] shadow-[0_-4px_12px_rgba(0,0,0,0.4)]" />
        </div>"""

if old_indicator in content:
    content = content.replace(old_indicator, new_indicator)
else:
    print("WARNING: Could not find old_indicator exact match.")

# 4. Replace the Icon wrapper and label
old_link_content = """                <span
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
                    isActive
                      ? "-translate-y-[22px] scale-105 text-indigo-400 drop-shadow-md"
                      : "text-slate-400 group-hover:text-slate-300",
                  )}
                >
                  <HugeiconsIcon icon={item.icon} size={isActive ? 22 : 24} strokeWidth={isActive ? 2 : 1.7} />
                </span>
                <span
                  className={cn(
                    "absolute bottom-1.5 text-[10px] font-medium transition-all duration-300 motion-reduce:transition-none",
                    isActive
                      ? "translate-y-0 opacity-100 text-white"
                      : "pointer-events-none translate-y-2 opacity-0 text-slate-500",
                  )}
                >
                  {item.label}
                </span>"""

new_link_content = """                <span
                  className={cn(
                    "relative z-10 flex h-[38px] w-[38px] items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
                    isActive
                      ? "-translate-y-[23px] text-indigo-400 drop-shadow-md"
                      : "text-slate-400 group-hover:text-slate-300",
                  )}
                >
                  <HugeiconsIcon icon={item.icon} size={isActive ? 20 : 22} strokeWidth={isActive ? 2 : 1.7} />
                </span>
                <span
                  className={cn(
                    "absolute bottom-2 text-[10px] font-medium transition-all duration-300 motion-reduce:transition-none",
                    isActive
                      ? "translate-y-0 opacity-100 text-white"
                      : "pointer-events-none translate-y-2 opacity-0 text-slate-500",
                  )}
                >
                  {item.label}
                </span>"""

if old_link_content in content:
    content = content.replace(old_link_content, new_link_content)
else:
    print("WARNING: Could not find old_link_content exact match.")


if content == original:
    print("ERROR: No changes were applied.")
else:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: MobileBottomNav.tsx patched successfully.")
