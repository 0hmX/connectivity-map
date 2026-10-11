import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { ConnectivityMap } from "../src/ConnectivityMap"

test("TSX net aliases keep pins unique", async () => {
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board>
      <net name="V3V3" />
      <schematictext
        text="connectivity-map: each physical pin occurs once"
        schX={0}
        schY={2.2}
        fontSize={0.18}
      />
      <chip
        name="U1"
        schWidth={3}
        schHeight={2}
        pinLabels={{
          pin1: "A",
          pin2: "B",
          pin3: "C",
          pin4: "D",
          pin5: "E",
          pin6: "F",
        }}
        connections={{ A: "net.V3V3", C: "net.V3V3", E: "net.V3V3" }}
      />
      <trace name="EDGE_0" from=".U1 > .A" to=".U1 > .B" />
      <trace name="EDGE_1" from=".U1 > .C" to=".U1 > .D" />
      <trace name="EDGE_2" from=".U1 > .E" to=".U1 > .F" />
      <trace name="EDGE_3" from=".U1 > .C" to=".U1 > .E" />
      <trace name="EDGE_4" from=".U1 > .A" to=".U1 > .D" />
    </board>,
  )
  circuit.on("solver:started", (event) => {
    if (event.solverName !== "SchematicTracePipelineSolver") return
    const input = event.solverParams
    const directMap = new ConnectivityMap({})
    const connections = input.directConnections.map((connection: any) => [
      connection.netId,
      ...connection.pinIds,
    ])
    directMap.addConnections(connections)
    const aliases = Object.keys(directMap.netMap)
    const netMap = new ConnectivityMap(directMap.netMap)
    netMap.addConnections(
      input.netConnections.map((net: any) => [net.netId, ...net.pinIds]),
    )
    const pinIds = input.chips.flatMap((chip: any) =>
      chip.pins.map((pin: any) => pin.pinId),
    )
    for (const alias of aliases) {
      expect(
        netMap
          .getIdsConnectedToNet(alias)
          .filter((id) => pinIds.includes(id))
          .toSorted(),
      ).toEqual(pinIds.toSorted())
    }
    for (const connection of connections)
      expect(netMap.areAllIdsConnected(connection)).toBe(true)
    // The solver bundles its own ConnectivityMap; supply the local map's output.
    input.directConnections = []
    input.netConnections = input.netConnections.map((net: any) => ({
      ...net,
      pinIds: netMap
        .getIdsConnectedToNet(netMap.getNetConnectedToId(net.netId)!)
        .filter((id) => pinIds.includes(id)),
    }))
  })
  let failure: unknown
  try {
    await circuit.renderUntilSettled()
  } catch (error) {
    failure = error
  }
  const text = circuit.db.schematic_text.getWhere({
    text: "connectivity-map: each physical pin occurs once",
  })!
  circuit.db.schematic_text.update(text.schematic_text_id, {
    text: failure
      ? "FAIL: TSX aliases repeat physical pins"
      : "PASS: TSX aliases preserve six unique pins",
  })
  const svg = convertCircuitJsonToSchematicSvg(circuit.db.toArray(), {
    colorOverrides: { schematic: { background: "white" } },
    width: 900,
    height: 500,
  }).replace(/[ \t]+$/gm, "")
  const snapshot = new URL(
    `./assets/aliased-net-merge-${failure ? "failure" : "pass"}.svg`,
    import.meta.url,
  )
  if (process.env.BUN_UPDATE_SNAPSHOTS) await Bun.write(snapshot, svg)
  if (failure) throw failure
  expect(
    circuit.db.source_trace
      .list()
      .filter((trace) => trace.connected_source_port_ids.length === 2),
  ).toHaveLength(5)
  expect(
    circuit.db.schematic_port.list().every((pin) => pin.is_connected),
  ).toBe(true)
  expect(svg).toBe(await Bun.file(snapshot).text())
})
