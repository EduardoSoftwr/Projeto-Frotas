import { useContext } from 'react'
import { FleetContext } from './FleetContext'

function useFleet() {
  const context = useContext(FleetContext)
  if (context === null) throw new Error('useFleet deve ser usado dentro de FleetProvider.')
  return context
}

export default useFleet