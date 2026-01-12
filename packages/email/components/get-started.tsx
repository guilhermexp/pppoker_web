import { Section } from "@react-email/components";
import { getAppUrl } from "@midpoker/utils/envs";
import { Button } from "./theme";

export function GetStarted() {
  return (
    <Section className="text-center mt-[50px] mb-[50px]">
      <Button href={getAppUrl()}>Get started</Button>
    </Section>
  );
}
