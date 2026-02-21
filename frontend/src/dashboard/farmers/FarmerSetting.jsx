import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import SettingPanel from "@/components/ui/setting";

export default function FarmerSetting() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-20 flex flex-col items-center min-h-[calc(100vh-80px)]">
        <div className="w-full">
          <SettingPanel
            title="Settings"
            subtitle="Manage your Farmer account preferences"
            accentColor="amber"
            notifLabels={[
              { label: "Email Alerts",     key: "email"  },
              { label: "SMS Alerts",       key: "sms"    },
              { label: "Marketing Offers", key: "offers" },
            ]}
            dangerText="Permanently delete your farmer account. All listings will be removed."
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
