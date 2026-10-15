import { AuthProvider } from "./context/AuthContext";
import AppRouter from "./routes/AppRouter";
import { ThemeProvider } from "./ui/Theme";
import { ToastProvider } from "./ui/Toast";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
