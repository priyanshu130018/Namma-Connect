import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import TripPlannerChat from "@/components/chat/TripPlannerChat";
import { PageWrapper } from "@/components/kit/PageWrapper";

const AIChatbot = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <Navbar />
    <main className="flex flex-1 flex-col pt-32 pb-12">
      <PageWrapper className="flex flex-1 flex-col">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            AI Trip Planner
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe your ideal trip and get matched with farms, stays and local
            creators.
          </p>
        </header>
        <div className="surface-card flex min-h-[60vh] flex-1 flex-col overflow-hidden p-0">
          <TripPlannerChat />
        </div>
      </PageWrapper>
    </main>
    <Footer />
  </div>
);

export default AIChatbot;
