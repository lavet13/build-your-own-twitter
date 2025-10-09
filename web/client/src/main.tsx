import { StrictMode, type FC } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Button, Theme } from "@radix-ui/themes";

const App: FC = () => {
  return (
    <Theme appearance={"dark"} accentColor="blue" grayColor="slate">
      <Button>Hello</Button>
    </Theme>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
