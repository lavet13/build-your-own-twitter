import type { FC } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@radix-ui/themes";

export const DefaultNotFoundComponent: FC = () => {
  return (
    <main className="flex min-h-[100svh] shrink-0 grow flex-col">
      <div className="flex flex-1 flex-col items-center justify-center">
        <h1 className="text-5xl font-bold lg:text-6xl">404</h1>
        <p className="text-center leading-7">
          Упс, такой страницы не существует
        </p>
        <Button asChild>
          <Link to="/">Вернуться на главную страницу</Link>
        </Button>
      </div>
    </main>
  );
};
