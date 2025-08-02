import { QueryClientProvider } from "@tanstack/react-query"
import { Layout } from "@/components/layout/Layout"
import { queryClient } from "@/lib/queryClient"
import { Dashboard } from "@/pages/Dashboard"

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Dashboard />
      </Layout>
    </QueryClientProvider>
  )
}

export default App
