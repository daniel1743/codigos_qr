import { profileService } from "../services/profile.service";

// Replace handleInviteAccept
const handleInviteAccept = async () => {
    setIsProcessingInvite(true);
    try {
      await profileService.patchBasicEditorTemplateConfig(supabase, profile.id as string, { onboarding_v2_invite_status: "accepted" });
      setShowInviteModal(false);
      navigate({ to: "/onboarding-preview" });
    } catch (e) {
      console.error(e);
      toast.error("Error al actualizar la invitación.");
    } finally {
      setIsProcessingInvite(false);
    }
  };
