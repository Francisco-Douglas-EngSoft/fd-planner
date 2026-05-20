import { Navigate } from "react-router-dom";

// Index agora redireciona para a Landing Page
const Index = () => {
  return <Navigate to="/" replace />;
};

export default Index;
