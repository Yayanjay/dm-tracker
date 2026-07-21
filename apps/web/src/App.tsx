import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">DM Tracker - Puskesmas</p>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
