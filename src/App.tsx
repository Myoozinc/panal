import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import AppLayout from "@/components/AppLayout";
import { Toaster } from "@/components/ui/toaster";

// Lazy-loaded pages
const Landing = lazy(() => import("@/pages/Landing"));
const Auth = lazy(() => import("@/pages/Auth"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Discover = lazy(() => import("@/pages/Discover"));
const Matches = lazy(() => import("@/pages/Matches"));
const Feed = lazy(() => import("@/pages/Feed"));
const SearchPage = lazy(() => import("@/pages/Search"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const MyProfile = lazy(() => import("@/pages/MyProfile"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const NewCollab = lazy(() => import("@/pages/NewCollab"));
const Chat = lazy(() => import("@/pages/Chat"));
const CollabAgreement = lazy(() => import("@/pages/CollabAgreement"));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminLiveUsers = lazy(() => import("@/pages/admin/AdminLiveUsers"));
const AdminVerifications = lazy(() => import("@/pages/admin/AdminVerifications"));
const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminUserDetail = lazy(() => import("@/pages/admin/AdminUserDetail"));
const AdminBroadcast = lazy(() => import("@/pages/admin/AdminBroadcast"));
const AdminConversations = lazy(() => import("@/pages/admin/AdminConversations"));
const AdminConversationDetail = lazy(() => import("@/pages/admin/AdminConversationDetail"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const PageFallback = () => (
  <div className="h-[60vh] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                <Route path="/onboarding" element={<Onboarding />} />

                <Route element={<AppLayout><Outlet /></AppLayout>}>
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/matches" element={<Matches />} />
                  <Route path="/feed" element={<Feed />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/me" element={<MyProfile />} />
                  <Route path="/profile/:username" element={<ProfilePage />} />
                  <Route path="/collabs/new" element={<NewCollab />} />
                  <Route path="/chat/:conversationId" element={<Chat />} />
                  <Route path="/collab-ai/:conversationId" element={<CollabAgreement />} />
                </Route>
              </Route>

              {/* Panel Oculto de Administración */}
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="live" element={<AdminLiveUsers />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/:userId" element={<AdminUserDetail />} />
                <Route path="broadcast" element={<AdminBroadcast />} />
                <Route path="conversations" element={<AdminConversations />} />
                <Route path="conversations/:conversationId" element={<AdminConversationDetail />} />
                <Route path="verifications" element={<AdminVerifications />} />
                <Route path="reports" element={<AdminReports />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
