import { ReplitAuth } from "@/lib/replit-auth"; // Wrapper for Replit Auth headers
import Sidebar from "@/components/admin/Sidebar";
import TopBar from "@/components/admin/TopBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Ensure only the Repl owner or authorized users can access
  const user = await ReplitAuth.getCurrentUser();
  
  if (!user) {
    return <div className="p-20 text-center">Access Denied. Please log in via Replit.</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
