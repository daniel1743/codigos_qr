import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type InviteStatus = "unseen" | "accepted" | "declined";

interface ExistingUserOnboardingInviteModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isProcessing?: boolean;
}

export function ExistingUserOnboardingInviteModal({
  open,
  onAccept,
  onDecline,
  isProcessing = false,
}: ExistingUserOnboardingInviteModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onDecline(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Nuevo Onboarding disponible</DialogTitle>
        <DialogDescription>
          Tenemos una nueva experiencia para crear tu página con el nuevo motor de Cripqer. ¿Quieres probar lo que puede hacer con tu perfil?
        </DialogDescription>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-2 mt-4">
          <Button variant="outline" onClick={onDecline} disabled={isProcessing}>
            Ahora no
          </Button>
          <Button onClick={onAccept} disabled={isProcessing}>
            {isProcessing ? "Redirigiendo..." : "Probar ahora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
