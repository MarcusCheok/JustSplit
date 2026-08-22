import { getUsers } from "@/lib/data";
import { CurrentUserProvider } from "@/components/CurrentUserProvider";
import { Header } from "@/components/Header";

// Every page here reads live, frequently-mutated data — never prerender.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const users = await getUsers();

  return (
    <CurrentUserProvider users={users}>
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col p-4">
          {children}
        </main>
      </div>
    </CurrentUserProvider>
  );
}
