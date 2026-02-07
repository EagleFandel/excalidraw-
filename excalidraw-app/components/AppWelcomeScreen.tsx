import { loginIcon } from "@excalidraw/excalidraw/components/icons";
import { useI18n } from "@excalidraw/excalidraw/i18n";
import { WelcomeScreen } from "@excalidraw/excalidraw/index";
import React from "react";

import type { AuthDialogMode } from "../auth/auth-dialog";

export const AppWelcomeScreen: React.FC<{
  onCollabDialogOpen: () => any;
  isCollabEnabled: boolean;
  isSignedIn: boolean;
  onAuthClick: (mode: AuthDialogMode) => void;
}> = React.memo((props) => {
  const { t } = useI18n();
  const headingContent = (
    <>
      {t("welcomeScreen.app.center_heading")}
      <br />
      {t("welcomeScreen.app.center_heading_line2")}
      <br />
      {t("welcomeScreen.app.center_heading_line3")}
    </>
  );

  return (
    <WelcomeScreen>
      <WelcomeScreen.Hints.MenuHint>
        {t("welcomeScreen.app.menuHint")}
      </WelcomeScreen.Hints.MenuHint>
      <WelcomeScreen.Hints.ToolbarHint />
      <WelcomeScreen.Hints.HelpHint />
      <WelcomeScreen.Center>
        <WelcomeScreen.Center.Logo />
        <WelcomeScreen.Center.Heading>
          {headingContent}
        </WelcomeScreen.Center.Heading>
        <WelcomeScreen.Center.Menu>
          <WelcomeScreen.Center.MenuItemLoadScene />
          <WelcomeScreen.Center.MenuItemHelp />
          {props.isCollabEnabled && (
            <WelcomeScreen.Center.MenuItemLiveCollaborationTrigger
              onSelect={() => props.onCollabDialogOpen()}
            />
          )}
          {!props.isSignedIn ? (
            <WelcomeScreen.Center.MenuItem
              onSelect={() => props.onAuthClick("signup")}
              shortcut={null}
              icon={loginIcon}
            >
              {t("excPlus.auth.signUp")}
            </WelcomeScreen.Center.MenuItem>
          ) : (
            <WelcomeScreen.Center.MenuItem
              onSelect={() => props.onAuthClick("signin")}
              shortcut={null}
              icon={loginIcon}
            >
              {t("excPlus.auth.account")}
            </WelcomeScreen.Center.MenuItem>
          )}
        </WelcomeScreen.Center.Menu>
      </WelcomeScreen.Center>
    </WelcomeScreen>
  );
});
