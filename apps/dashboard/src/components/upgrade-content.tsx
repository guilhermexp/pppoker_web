import { OpenURL } from "./open-url";

type UpgradeContentProps = {
  user: {
    fullName: string | null;
  };
};

export function UpgradeContent({ user }: UpgradeContentProps) {
  // Upgrade content disabled - billing removed
  return null;
}
