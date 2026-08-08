import { GoogleOAuthProvider } from "@react-oauth/google";
import AppRoutes from "@/routes/AppRoutes";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppRoutes />
    </GoogleOAuthProvider>
  );
}

export default App;
