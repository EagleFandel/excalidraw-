import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";
import { TextField } from "@excalidraw/excalidraw/components/TextField";
import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";
import { t } from "@excalidraw/excalidraw/i18n";
import { useState } from "react";

import { authApi } from "./auth-api";
import "./auth-dialog.scss";

import type { AuthUser } from "./auth-api";

export const AuthDialog = ({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}) => {
  const { openDialog } = useUIAppState();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen || openDialog) {
    return null;
  }

  return (
    <Dialog
      title={`${t("labels.liveCollaboration").replace(/\./g, "")} • Auth`}
      size="small"
      onCloseRequest={onClose}
    >
      <div className="AuthDialog">
        <TextField
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          fullWidth
        />
        <TextField
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="********"
          isRedacted
          fullWidth
        />

        {errorMessage && (
          <div className="AuthDialog__error">{errorMessage}</div>
        )}

        <FilledButton
          size="large"
          fullWidth
          label={isSubmitting ? "Signing in..." : "Sign in"}
          onClick={async () => {
            if (!email.trim() || !password.trim()) {
              setErrorMessage("Email and password are required");
              return;
            }

            setIsSubmitting(true);
            setErrorMessage("");

            try {
              const user = await authApi.login({
                email: email.trim(),
                password,
              });
              onSuccess(user);
              onClose();
              setPassword("");
            } catch {
              setErrorMessage(
                "Failed to sign in. Please check your credentials.",
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={isSubmitting}
        />
      </div>
    </Dialog>
  );
};
