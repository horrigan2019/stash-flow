import { IzzyShell } from "@/components/izzy/IzzyShell";
import { DecodePolicy } from "@/components/izzy/DecodePolicy";

export const metadata = {
  title: "Decode My Policy — Free",
};

export default function IzzyDecodePage() {
  return (
    <IzzyShell active="/izzy/decode">
      <DecodePolicy />
    </IzzyShell>
  );
}
