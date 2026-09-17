import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Logo from "../components/brand/Logo";

export const Route = createFileRoute("/correo-confirmado")({
  component: EmailConfirmationSuccess,
});

function EmailConfirmationSuccess() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b1020] px-5 py-10 text-white">
      <section
        className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl shadow-black/30 backdrop-blur sm:p-10"
        data-testid="email-confirmation-success"
      >
        <Logo
          variant="horizontal"
          theme="inverse"
          responsiveSymbol
          showTagline={false}
          className="mx-auto h-10 w-auto"
        />
        <div className="mx-auto mt-10 grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Correo confirmado</h1>
        <p className="mt-3 text-base text-white/75">Tu cuenta de Cripqer ya está activa.</p>
        <p className="mt-2 text-sm leading-6 text-white/55">
          Ya puedes iniciar sesión y comenzar a crear tu página.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0b1020] transition hover:bg-white/90"
        >
          Ir a Cripqer <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
