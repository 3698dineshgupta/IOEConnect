import { cn } from "@/lib/utils";

export function SectionHead({
  eyebrow,
  title,
  text,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  text?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className={cn("text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]", eyebrow && "mt-3")}>{title}</h2>
      {text && <p className="mt-4 text-base text-muted-foreground sm:text-lg">{text}</p>}
    </div>
  );
}
