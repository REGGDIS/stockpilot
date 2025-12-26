import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/Layout";
import ProductsPage from "../pages/ProductsPage";
import LocationsPage from "../pages/LocationsPage";
import MovementsPage from "../pages/MovementsPage";

export default function AppRouter() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/products" replace />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/locations" element={<LocationsPage />} />
                <Route path="/movements" element={<MovementsPage />} />
            </Route>

            <Route path="*" element={<div className="p-6">404</div>} />
        </Routes>
    );
}