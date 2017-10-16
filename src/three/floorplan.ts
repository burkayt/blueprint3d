import Floor from './floor'
import Scene from '../model/scene'
import { Floorplan } from '../model/floorplan'
import Controls from './controls'
import Edge from './edge'

let FloorplanFunc: Function = function(
  scene: Scene,
  floorplan: Floorplan,
  controls: Controls
) {
  let floors: any[] = [] // Floor from ./floor
  let edges: any[] = [] // Edge from './edge'

  floorplan.fireOnUpdatedRooms(redraw)

  function redraw() {
    // clear scene
    floors.forEach(floor => {
      floor.removeFromScene()
    })

    edges.forEach(edge => {
      edge.remove()
    })
    floors = []
    edges = []

    // draw floors
    floorplan.getRooms().forEach(room => {
      let threeFloor = Floor(scene, room)
      floors.push(threeFloor)
      threeFloor.addToScene()
    })

    // draw edges
    floorplan.wallEdges().forEach(edge => {
      let threeEdge = Edge(scene, edge, controls)
      edges.push(threeEdge)
    })
  }
}

export default FloorplanFunc
