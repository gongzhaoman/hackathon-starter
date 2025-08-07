import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Agents } from './pages/Agents'
import { Toolkits } from './pages/Toolkits'
import { Workflows } from './pages/Workflows'
import { KnowledgeBases } from './pages/KnowledgeBases'
import { AgentChat } from './pages/AgentChat'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/agents/:id/chat" element={<AgentChat />} />
        <Route path="/toolkits" element={<Toolkits />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/knowledge-bases" element={<KnowledgeBases />} />
      </Routes>
    </Layout>
  )
}

export default App