import { expect, test } from "bun:test"
import { ConnectivityMap } from "../src/ConnectivityMap"

const pins = ["A", "B", "C", "D", "E", "F"]
const edges = [
  ["A", "B"],
  ["C", "D"],
  ["E", "F"],
  ["C", "E"],
  ["A", "D"],
]

test.failing("merging reconstructed net aliases preserves unique pins and every edge", () => {
  for (const edgeOrder of [edges, edges.toReversed()]) {
    const directMap = new ConnectivityMap({})
    const connections = edgeOrder.map((edge, i) => [`EDGE_${i}`, ...edge])
    directMap.addConnections(connections)
    const aliases = Object.keys(directMap.netMap)
    const netMap = new ConnectivityMap(directMap.netMap)
    netMap.addConnections([["V3V3", ...pins]])
    const expectedIds = [
      "V3V3",
      ...pins,
      ...connections.map(([netId]) => netId!),
    ]

    for (const alias of aliases) {
      expect(netMap.getIdsConnectedToNet(alias).toSorted()).toEqual(
        expectedIds.toSorted(),
      )
    }
    for (const connection of connections) {
      expect(netMap.areAllIdsConnected(connection)).toBe(true)
    }
    const reconstructed = new ConnectivityMap(netMap.netMap)
    expect(reconstructed.areAllIdsConnected(expectedIds)).toBe(true)
  }
})
