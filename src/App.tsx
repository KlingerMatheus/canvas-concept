import { useEffect } from 'react'
import { Toolbar } from '@/components/Toolbar'
import { RunProgressBar } from '@/components/RunProgressBar'
import { NodePalette } from '@/components/palette/NodePalette'
import { FlowCanvas } from '@/components/canvas/FlowCanvas'
import { NodeEditModal } from '@/components/nodes/NodeEditModal'
import { useFlowStore } from '@/store/flowStore'

function App() {
  const theme = useFlowStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas text-ink">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <NodePalette />
        <main className="flex min-w-0 flex-1 flex-col">
          <RunProgressBar />
          <div className="relative min-h-0 flex-1">
            <FlowCanvas />
          </div>
        </main>
      </div>
      <NodeEditModal />
    </div>
  )
}

export default App
