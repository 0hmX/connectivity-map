export class ConnectivityMap {
  netMap: Record<string, string[]>

  idToNetMap: Record<string, string>

  constructor(netMap: Record<string, string[]>) {
    this.netMap = netMap
    this.idToNetMap = {}
    for (const [netId, ids] of Object.entries(netMap)) {
      for (const id of ids) {
        this.idToNetMap[id] = netId
      }
    }
  }

  addConnections(connections: string[][]) {
    for (const connection of connections) {
      const existingNets = new Set<string>()

      // Find all existing nets for the connection
      for (const id of connection) {
        const existingNetId = this.idToNetMap[id]
        if (existingNetId) {
          existingNets.add(existingNetId)
        }
      }

      let targetNetId: string

      if (existingNets.size === 0) {
        // If no existing nets found, create a new one
        targetNetId = `connectivity_net${Object.keys(this.netMap).length}`
        this.netMap[targetNetId] = []
      } else if (existingNets.size === 1) {
        // If only one existing net found, use it
        targetNetId =
          existingNets.values().next().value ??
          `connectivity_net${Object.keys(this.netMap).length}`
      } else {
        // If multiple nets found, merge them
        targetNetId =
          existingNets.values().next().value ??
          `connectivity_net${Object.keys(this.netMap).length}`
        for (const netId of existingNets) {
          const targetNet = this.netMap[targetNetId]
          const sourceNet = this.netMap[netId]
          if (!targetNet || !sourceNet || targetNet === sourceNet) continue
          targetNet.push(...sourceNet)
          for (const alias of Object.keys(this.netMap)) {
            if (this.netMap[alias] === sourceNet) this.netMap[alias] = targetNet
          }
          for (const id of sourceNet) this.idToNetMap[id] = targetNetId
        }
      }

      // Add all ids to the target net
      for (const id of connection) {
        const targetNet = this.netMap[targetNetId]
        if (targetNet && !targetNet.includes(id)) {
          targetNet.push(id)
        }
        this.idToNetMap[id] = targetNetId
      }
    }
  }

  getIdsConnectedToNet(netId: string): string[] {
    return this.netMap[netId] || []
  }

  getNetConnectedToId(id: string): string | undefined {
    return this.idToNetMap[id]
  }

  areIdsConnected(id1: string, id2: string): boolean {
    if (id1 === id2) return true
    const netId1 = this.getNetConnectedToId(id1)
    if (!netId1) return false
    const netId2 = this.getNetConnectedToId(id2)
    if (!netId2) return false
    return netId1 === netId2 || netId2 === id1 || netId2 === id1
  }

  areAllIdsConnected(ids: string[]): boolean {
    if (ids.length === 0) return true
    const netId = this.getNetConnectedToId(ids[0]!)
    if (!netId) return false

    for (const id of ids) {
      const nextNetId = this.getNetConnectedToId(id)
      if (nextNetId === undefined) {
        return false
      }
      if (nextNetId !== netId) {
        return false
      }
    }
    return true
  }
}
