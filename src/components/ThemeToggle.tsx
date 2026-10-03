import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Dark / light / system theme control. Preference is persisted by next-themes;
 * the product defaults to dark.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-9 rounded-full", className)}
        aria-label="Toggle theme"
        disabled
      >
        <Moon className="size-4" />
      </Button>
    );
  }

  const current = theme ?? "dark";
  const Icon = current === "light" ? Sun : Moon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-9 rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-ember",
            className,
          )}
          aria-label="Change colour theme"
        >
          <Icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {(["dark", "light", "system"] as const).map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => setTheme(option)}
            className={cn("capitalize", current === option && "font-semibold text-ember")}
          >
            {option} mode
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
