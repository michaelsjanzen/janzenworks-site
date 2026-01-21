import { hooks } from "@/lib/hooks";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default async function ThemeLayout({ children }: { children: React.ReactNode }) {
  // Apply a filter to the body classes (plugins could use this to add a "dark-mode" class)
  const bodyClasses = await hooks.applyFilters('theme_body_classes', 'bg-white text-slate-900');

  return (
    <div className={bodyClasses}>
      {/* Action Hook: Plugins can inject scripts or meta tags here */}
      {await hooks.doAction('theme_head')}
      
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        {children}
      </main>

      <Footer />

      {/* Action Hook: Plugins can inject tracking scripts or chat widgets here */}
      {await hooks.doAction('theme_footer')}
    </div>
  );
}
