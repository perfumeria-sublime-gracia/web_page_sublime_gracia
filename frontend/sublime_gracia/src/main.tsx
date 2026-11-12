
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";


import Router from "./Router";
import Header from "./page/header";
import Footer from "./page/footer";
import { Breadcrumbs, CookieConsent, MobileCatalogCta, SeoManager } from "./page/SiteEnhancements";
import SeasonThemeProvider from "./page/SeasonThemeProvider";
import "./page/site-enhancements.css";
import "./style/brand-theme.css";

createRoot(document.getElementById("root")!).render(

    <StrictMode>

        <BrowserRouter>
            <SeasonThemeProvider>

            <Header />
            <SeoManager />
            <Breadcrumbs />

            <Router />

            <Footer />
            <MobileCatalogCta />
            <CookieConsent />

            </SeasonThemeProvider>
        </BrowserRouter>

    </StrictMode>

);
