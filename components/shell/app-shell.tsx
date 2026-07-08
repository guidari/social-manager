import { Sidebar, type SidebarUser } from "./sidebar";
import { TopBar, type TopBarUser } from "./top-bar";

interface AppShellProps {
  children: React.ReactNode;
  user: SidebarUser & TopBarUser;
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
