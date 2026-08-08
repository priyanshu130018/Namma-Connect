import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import SettingPanel from "@/components/ui/setting";

export default function TouristSetting() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-20 flex flex-col items-center min-h-[calc(100vh-80px)]">
        <div className="w-full py-8 px-4">
          <SettingPanel
            title="Account Settings"
            subtitle="Manage notifications, security, and preferences"
            accentColor="green"
            notifLabels={[
              { label: "Email Alerts",  key: "email"  },
              { label: "SMS Alerts",    key: "sms"    },
              { label: "Offers & Deals", key: "offers" },
            ]}
            dangerText="Permanently delete your account. This action cannot be undone."
            showLanguage
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
