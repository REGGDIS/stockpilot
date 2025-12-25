import { NavLink, Outlet } from "react-router-dom";

const linkBase =
    "block rounded px-3 py-2 text-sm hover:bg-zinc-100 transition";
const linkActive = "bg-zinc-100 font-medium";

export default function Layout() {
    return (
        <div className="min-h-screen bg-white text-zinc-900">
            <header className="border-b">
                <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
                   <div className="font-semibold">StockPilot</div>
                   <div className="text-sm text-zinc-500">Frontend</div> 
                </div>
            </header>

            <div className="mx-auto max-w-5xl px-4 py-6 grid-cols-12 gap-6">
                <aside className="col-span-12 md:col-span-3">
                    <nav className="space-y-1">
                        <NavLink
                            to="/products"
                            className={({ isActive }) =>
                                `${linkBase} ${isActive ? linkActive : ""}`
                            }
                        >
                            Products
                        </NavLink>

                        <div className="text-xs text-zinc-400 px-3">
                            Próximamente: Locations, Movements, Stock
                        </div>
                    </nav>
                </aside>

                <main className="col-span-12 md:col-span-9">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}