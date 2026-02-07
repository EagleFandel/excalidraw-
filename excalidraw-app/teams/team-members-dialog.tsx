import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";
import { TextField } from "@excalidraw/excalidraw/components/TextField";
import { useState } from "react";

import "./team-members-dialog.scss";

import type { TeamMemberRecord, TeamRole } from "./teams-api";

export const TeamMembersDialog = ({
  isOpen,
  teamName,
  members,
  isLoading,
  errorMessage,
  currentUserId,
  onClose,
  onRefresh,
  onAddMember,
  onUpdateMemberRole,
  onRemoveMember,
}: {
  isOpen: boolean;
  teamName: string;
  members: TeamMemberRecord[];
  isLoading: boolean;
  errorMessage: string;
  currentUserId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onAddMember: (input: { email: string; role: TeamRole }) => Promise<void>;
  onUpdateMemberRole: (input: {
    userId: string;
    role: TeamRole;
  }) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}) => {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const ownerCount = members.filter((member) => member.role === "owner").length;

  return (
    <Dialog
      title={teamName ? `Team Members · ${teamName}` : "Team Members"}
      size="small"
      onCloseRequest={onClose}
    >
      <div className="TeamMembersDialog">
        <div className="TeamMembersDialog__headerActions">
          <FilledButton
            size="medium"
            label={isLoading ? "Loading..." : "Refresh"}
            onClick={onRefresh}
            disabled={isLoading}
          />
        </div>

        <div className="TeamMembersDialog__invite">
          <TextField
            label="Invite Email"
            value={inviteEmail}
            onChange={setInviteEmail}
            placeholder="member@example.com"
            fullWidth
          />

          <label
            className="TeamMembersDialog__fieldLabel"
            htmlFor="invite-role"
          >
            Role
          </label>
          <select
            id="invite-role"
            className="TeamMembersDialog__roleSelect"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as TeamRole)}
          >
            <option value="owner">owner</option>
            <option value="admin">admin</option>
            <option value="member">member</option>
          </select>

          <FilledButton
            size="medium"
            fullWidth
            label={isSubmitting ? "Inviting..." : "Add Member"}
            onClick={async () => {
              const email = inviteEmail.trim();
              if (!email) {
                return;
              }

              setIsSubmitting(true);
              try {
                await onAddMember({
                  email,
                  role: inviteRole,
                });
                setInviteEmail("");
                setInviteRole("member");
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
          />
        </div>

        {errorMessage && (
          <div className="TeamMembersDialog__error">{errorMessage}</div>
        )}

        <div className="TeamMembersDialog__list">
          {members.map((member) => {
            const isSelf = currentUserId === member.userId;
            const isSoleOwner = member.role === "owner" && ownerCount <= 1;
            const canRemove = !isSoleOwner && !isSelf;

            return (
              <div key={member.userId} className="TeamMembersDialog__row">
                <div className="TeamMembersDialog__identity">
                  <div className="TeamMembersDialog__name">
                    {member.user.displayName || member.user.email}
                    {isSelf ? " (You)" : ""}
                  </div>
                  <div className="TeamMembersDialog__email">
                    {member.user.email}
                  </div>
                </div>

                <select
                  className="TeamMembersDialog__roleSelect"
                  value={member.role}
                  onChange={async (event) => {
                    const role = event.target.value as TeamRole;

                    if (isSoleOwner && role !== "owner") {
                      return;
                    }

                    await onUpdateMemberRole({
                      userId: member.userId,
                      role,
                    });
                  }}
                >
                  <option value="owner">owner</option>
                  <option value="admin">admin</option>
                  <option value="member">member</option>
                </select>

                <button
                  type="button"
                  className="TeamMembersDialog__remove"
                  onClick={async () => {
                    if (!canRemove) {
                      return;
                    }

                    const confirmed = window.confirm(
                      `Remove ${member.user.email} from this team?`,
                    );
                    if (!confirmed) {
                      return;
                    }

                    await onRemoveMember(member.userId);
                  }}
                  disabled={!canRemove}
                >
                  Remove
                </button>
              </div>
            );
          })}

          {!members.length && !isLoading && (
            <div className="TeamMembersDialog__empty">No members found.</div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
