import { QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { queryClient } from '@/lib/queryClient';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Dashboard />
      </Layout>
    </QueryClientProvider>
  );
}

export default App;
