import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import {
  IZZY_HERO_HEADLINE,
  IZZY_NAME,
  IZZY_TAGLINE,
} from "@/lib/izzy/brand";

const izzyDisplay = Fraunces({
  variable: "--font-izzy-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const izzyBody = Manrope({
  variable: "--font-izzy-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${IZZY_NAME}: Insurance Decoder — No BS.`,
    template: `%s · ${IZZY_NAME}`,
  },
  description: `${IZZY_HERO_HEADLINE} ${IZZY_TAGLINE}`,
};

export default function IzzyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${izzyDisplay.variable} ${izzyBody.variable} izzy-surface font-[family-name:var(--font-izzy-body)]`}
    >
      {children}
    </div>
  );
}
