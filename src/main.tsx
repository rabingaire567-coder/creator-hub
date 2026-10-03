import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { SearchProvider } from "@/components/SearchProvider";
import { SiteLayout } from "@/components/site/SiteLayout";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router";
import "./index.css";

// ---------------------------------------------------------------------------
// Public site
// ---------------------------------------------------------------------------
const Home = lazy(() => import("./pages/site/Home.tsx"));
const Content = lazy(() => import("./pages/site/Content.tsx"));
const ContentDetail = lazy(() => import("./pages/site/ContentDetail.tsx"));
const Articles = lazy(() => import("./pages/site/Articles.tsx"));
const ArticleDetail = lazy(() => import("./pages/site/ArticleDetail.tsx"));
const Projects = lazy(() => import("./pages/site/Projects.tsx"));
const ProjectDetail = lazy(() => import("./pages/site/ProjectDetail.tsx"));
const About = lazy(() => import("./pages/site/About.tsx"));
const Community = lazy(() => import("./pages/site/Community.tsx"));
const Contact = lazy(() => import("./pages/site/Contact.tsx"));
const SiteNotFound = lazy(() => import("./pages/site/NotFound.tsx"));

// ---------------------------------------------------------------------------
// Auth + admin studio (all screens live in src/admin/*)
// ---------------------------------------------------------------------------
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const AdminApp = lazy(() => import("./admin/AdminApp.tsx"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard.tsx"));
const AdminContent = lazy(() => import("./admin/AdminContent.tsx"));
const AdminArticles = lazy(() => import("./admin/AdminArticles.tsx"));
const AdminProjects = lazy(() => import("./admin/AdminProjects.tsx"));
const AdminTags = lazy(() => import("./admin/AdminTags.tsx"));
const AdminSocial = lazy(() => import("./admin/AdminSocial.tsx"));
const AdminHomepage = lazy(() => import("./admin/AdminHomepage.tsx"));
const AdminCommunity = lazy(() => import("./admin/AdminCommunity.tsx"));
const AdminMessages = lazy(() => import("./admin/AdminMessages.tsx"));
const AdminSettings = lazy(() => import("./admin/AdminSettings.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(error: Error) {
    console.error("[Preview] Root crash:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  // New pages always start at the top (unless it's an in-page anchor jump).
  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <ConvexAuthProvider client={convex}>
          <BrowserRouter>
            <RouteSyncer />
            <SearchProvider>
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  {/* ---------------- Public site ---------------- */}
                  <Route element={<SiteLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/content" element={<Content />} />
                    <Route path="/content/:id" element={<ContentDetail />} />
                    <Route path="/articles" element={<Articles />} />
                    <Route path="/articles/:slug" element={<ArticleDetail />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/community" element={<Community />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="*" element={<SiteNotFound />} />
                  </Route>

                  {/* ---------------- Auth ---------------- */}
                  <Route
                    path="/auth"
                    element={<AuthPage redirectAfterAuth="/admin" />}
                  />

                  {/* ---------------- Admin studio ---------------- */}
                  <Route
                    path="/admin"
                    element={
                      <RequireAuth redirectImmediately>
                        <AdminApp />
                      </RequireAuth>
                    }
                  >
                    <Route index element={<AdminDashboard />} />
                    <Route path="content" element={<AdminContent />} />
                    <Route path="articles" element={<AdminArticles />} />
                    <Route path="projects" element={<AdminProjects />} />
                    <Route path="tags" element={<AdminTags />} />
                    <Route path="social" element={<AdminSocial />} />
                    <Route path="homepage" element={<AdminHomepage />} />
                    <Route path="community" element={<AdminCommunity />} />
                    <Route path="messages" element={<AdminMessages />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                  </Route>

                  {/* Legacy dashboard path from the template */}
                  <Route
                    path="/dashboard"
                    element={<Navigate to="/admin" replace />}
                  />
                </Routes>
              </Suspense>
            </SearchProvider>
          </BrowserRouter>
          <Toaster />
        </ConvexAuthProvider>
      </ThemeProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
