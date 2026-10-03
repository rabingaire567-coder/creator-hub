import { cn } from "@/lib/utils";

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Tag chip. Uses the tag's admin-defined colour when available, otherwise a
 * warm neutral style. Also used for article/post tag lists.
 */
export function TagPill({
  name,
  color,
  className,
  as = "span",
  onClick,
}: {
  name: string;
  color?: string;
  className?: string;
  as?: "span" | "button";
  onClick?: () => void;
}) {
  const styled =
    typeof color === "string" && HEX.test(color)
      ? {
          backgroundColor: `${color}1f`,
          color,
          borderColor: `${color}4d`,
        }
      : undefined;

  const Comp = as;
  return (
    <Comp
      onClick={onClick}
      style={styled}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors",
        as === "button" && "cursor-pointer hover:border-ember/40 hover:text-ember",
        !styled && "hover:border-ember/40 hover:text-ember",
        className,
      )}
    >
      {name}
    </Comp>
  );
}
