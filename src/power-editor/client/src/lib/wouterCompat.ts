import { useNavigate } from "@tanstack/react-router";

/**
 * Adaptador técnico mínimo para preservar el contrato useLocation del editor
 * dentro del router TanStack del destino, sin modificar su comportamiento.
 */
export function useLocation(): [string, (to: string) => void] {
  const navigate = useNavigate();
  return ["", (to) => void navigate({ to: to as never })];
}
