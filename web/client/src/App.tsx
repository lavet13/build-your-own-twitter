import { Theme } from "@radix-ui/themes";
import { RouterProvider } from "@tanstack/react-router";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { router } from "@/router";
import { Toaster } from "sonner";
import { useTheme } from "@/hooks/use-theme";
import type { FC } from "react";

export const App: FC = () => {
  const { resolvedTheme } = useTheme();

  return (
    <Theme
      appearance={resolvedTheme}
      accentColor="blue"
      grayColor="slate"
      panelBackground="translucent"
    >
      <TooltipProvider delayDuration={400}>
        <RouterProvider router={router} />
      </TooltipProvider>
      <Toaster />
    </Theme>
  );
};
