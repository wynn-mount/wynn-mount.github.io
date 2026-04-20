import { useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { isAppReadyAtom, isBulkModalOpenAtom } from './store/mountStore'
import { BentoMountManager } from './components/config/BentoMountManager'
import { MaterialMatrix } from './components/matrix/MaterialMatrix'
import { ShoppingList } from './components/shopping/ShoppingList'
import { BulkImportExportModal } from './components/modal/BulkImportExportModal'
import { FeedKanbanBoard } from './components/kanban/FeedKanbanBoard'
import { LiveStatChart } from './components/chart/LiveStatChart'
import { Package } from 'lucide-react'
import { useKanbanMonitor } from './hooks/useKanbanMonitor'
import { useKanbanSync } from './hooks/useKanbanSync'

function App() {
  const isAppReady = useAtomValue(isAppReadyAtom)
  const setIsBulkModalOpen = useSetAtom(isBulkModalOpenAtom)
  const [activeTab, setActiveTab] = useState<'calculator' | 'matrix'>('calculator')

  // Register the global kanban monitor and sync logic
  useKanbanMonitor()
  useKanbanSync()

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <BulkImportExportModal />
      
      {/* Global Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-neutral-800 bg-black sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg">
            <Package size={20} className="text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Wynn-Mount Optimizer</h1>
            <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Architect Edition</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('calculator')}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                activeTab === 'calculator' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Calculator
            </button>
            <button 
              onClick={() => setActiveTab('matrix')}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                activeTab === 'matrix' 
                  ? 'border-white text-white' 
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Material Matrix
            </button>
          </div>
          
          <div className="h-6 w-px bg-neutral-800 mx-2" />
          
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-4 py-2 bg-white text-black text-[10px] font-bold uppercase rounded hover:bg-neutral-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            Export / Import Mounts
          </button>
        </div>
      </header>
      
      <div className="flex-1 p-8">
        {!isAppReady ? (
          <div className="w-full max-w-4xl mx-auto space-y-8 p-6 border border-neutral-800 rounded-md animate-pulse">
            <div className="h-8 bg-neutral-900 w-1/3 rounded"></div>
            <div className="h-32 bg-neutral-900 w-full rounded"></div>
            <div className="h-64 bg-neutral-900 w-full rounded"></div>
          </div>
        ) : (
          <div className="max-w-full mx-auto h-full px-4">
            <main className="h-full">
              {activeTab === 'calculator' ? (
                <div className="flex flex-row flex-wrap xl:flex-nowrap gap-8 items-start h-full">
                  {/* Left Column: Mount Configuration & Material List (Equally split) */}
                  <div className="flex-1 flex flex-col gap-8 order-1 xl:order-1 w-full min-w-[500px]">
                    <div className="min-h-0">
                      <BentoMountManager />
                    </div>
                    <div className="min-h-0">
                      <ShoppingList />
                    </div>
                  </div>
                  
                  {/* Center Column: Live Stat Progress & Feeding Kanban (Equally split) */}
                  <div className="flex-1 flex flex-col gap-8 order-2 xl:order-2 w-full self-stretch min-w-[800px]">
                    <div className="min-h-0">
                      <LiveStatChart />
                    </div>
                    {/* Core Kanban Sections - Optimized to fit equally */}
                    <div className="min-h-0 flex-1">
                      <FeedKanbanBoard columnIds={['inventory', 'feeder', 'consumed']} />
                    </div>
                  </div>

                  {/* Right Column: Stash Section (Fixed Width) */}
                  <div className="flex-none order-3 xl:order-3 w-full xl:w-[450px] self-stretch">
                    <div className="min-h-0 h-full">
                      <FeedKanbanBoard columnIds={['stash']} />
                    </div>
                  </div>
                </div>
              ) : (
                <MaterialMatrix />
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
