import React from 'react';

const bar = 'rounded-full bg-[#9AA1AB]';

export function CollectionVariantThumb({ variant }: {variant: string;}) {
  switch (variant) {
    case 'cards':
      return (
        <div className="grid h-full grid-cols-2 gap-1.5 p-2">
          {[0, 1].map((i) =>
          <div key={i} className="relative rounded-lg bg-[#C9CED6]">
              <span className="absolute inset-x-1 bottom-1 h-3 rounded bg-white" />
            </div>
          )}
        </div>);

    case 'products':
      return (
        <div className="grid h-full grid-cols-3 gap-1.5 p-2">
          {[0, 1, 2].map((i) =>
          <div key={i} className="flex flex-col gap-1">
              <span className="flex-1 rounded-md bg-[#C9CED6]" />
              <span className={`${bar} h-1 w-3/4`} />
              <span className="h-2 w-6 rounded-full bg-[#15171C]" />
            </div>
          )}
        </div>);

    case 'services':
      return (
        <div className="flex h-full flex-col gap-1.5 p-2">
          {[0, 1].map((i) =>
          <div key={i} className="grid flex-1 grid-cols-[1fr_38%] overflow-hidden rounded-lg bg-[#3F5B60]">
              <div className="space-y-1 p-1.5">
                <span className="block h-1 w-3/4 rounded-full bg-white/80" />
                <span className="block h-1 w-1/2 rounded-full bg-white/50" />
              </div>
              <span className="bg-[#C9CED6]" />
            </div>
          )}
        </div>);

    case 'menu':
      return (
        <div className="flex h-full flex-col justify-center gap-2 p-3">
          {[0, 1, 2].map((i) =>
          <div key={i} className="flex items-center gap-1.5">
              <span className={`${bar} h-1.5 w-10`} />
              <span className="flex-1 border-b border-dotted border-[#9AA1AB]" />
              <span className="h-1.5 w-4 rounded-full bg-[#15171C]" />
            </div>
          )}
        </div>);

    case 'portfolio':
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 p-2">
          {[0, 1, 2].map((i) =>
          <div key={i} className="flex items-center gap-2 border-t border-[#C9CED6] pt-1.5">
              <span className="h-4 w-6 rounded-sm bg-[#C9CED6]" />
              <span className={`${bar} h-1.5 w-14`} />
            </div>
          )}
        </div>);

    default:
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 p-3">
          <span className="text-[18px] leading-none text-[#9AA1AB]">“</span>
          <span className={`${bar} h-1 w-full`} />
          <span className={`${bar} h-1 w-2/3`} />
          <span className="mt-1 flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-[#9AA1AB]" />
            <span className={`${bar} h-1 w-8`} />
          </span>
        </div>);

  }
}