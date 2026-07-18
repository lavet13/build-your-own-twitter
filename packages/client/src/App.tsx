import { Theme } from "@radix-ui/themes";
import { RouterProvider } from "@tanstack/react-router";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { router } from "@/lib/router";
import { Toaster } from "sonner";
import { useTheme } from "@/hooks/use-theme";
import type { FC } from "react";
import { environment } from "@/lib/relay-environment";
import { RelayEnvironmentProvider } from "react-relay";
import { Provider } from "jotai";
import { store } from "@/lib/store";

export const App: FC = () => {
  const { resolvedTheme } = useTheme();

  return (
    <Theme
      appearance={resolvedTheme}
      accentColor="blue"
      grayColor="slate"
      panelBackground="solid"
    >
      <TooltipProvider delayDuration={400}>
        <RelayEnvironmentProvider environment={environment}>
          <Provider store={store}>
            <RouterProvider router={router} />
          </Provider>
        </RelayEnvironmentProvider>
      </TooltipProvider>
      <Toaster />
    </Theme>
  );
};
