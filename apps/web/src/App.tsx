import { Route, Switch } from "wouter";
import { useAuthStore } from "./stores/auth";
import { IDE } from "./pages/IDE";
import { Login } from "./pages/Login";

function App() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={IDE} />
      <Route path="/chat/:id" component={IDE} />
    </Switch>
  );
}

export default App;
