import Image from "next/image";
import { APP_NAME } from "@/lib/brand";

/** The gingham jam jar. The favicon (src/app/icon.png) is made from the same artwork. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return <Image src="/brand/sitemap-jam-jar.png" alt="" width={size} height={size} loading="eager" className="shrink-0" />;
}

export default function Logo({ size = 36, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span
        className={
          compact
            ? "font-brand hidden whitespace-nowrap text-lg font-semibold text-neutral-900 sm:inline"
            : "font-brand text-2xl font-semibold text-neutral-900"
        }
      >
        {APP_NAME}
      </span>
    </span>
  );
}
