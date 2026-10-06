import { IzzyShell } from "@/components/izzy/IzzyShell";
import { IzzyLanding } from "@/components/izzy/IzzyLanding";

export default function IzzyHomePage() {
  return (
    <IzzyShell active="/izzy">
      <IzzyLanding />
    </IzzyShell>
  );
}
