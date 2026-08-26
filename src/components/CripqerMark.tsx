type CripqerMarkProps = {
  className?: string;
};

export function CripqerMark({ className = "" }: CripqerMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 18V6h12M6 6l12 12M26 6h12v12M38 6 26 18M6 26v12h12M6 38l12-12"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="square"
      />
      <circle cx="30" cy="30" r="4.5" fill="currentColor" />
    </svg>
  );
}
