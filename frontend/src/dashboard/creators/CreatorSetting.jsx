import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import SettingPanel from "@/components/ui/setting";

export default function CreatorSetting() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-20 flex flex-col items-center min-h-[calc(100vh-80px)]">
        <div className="w-full">
          <SettingPanel
            title="Creator Settings"
            subtitle="Manage your account preferences"
            accentColor="purple"
            notifLabels={[
              { label: "Email Alerts",     key: "email"  },
              { label: "Collab Invites",   key: "collab" },
              { label: "Marketing Offers", key: "offers" },
            ]}
            dangerText="Permanently delete your Creator account. All portfolio data will be removed."
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
