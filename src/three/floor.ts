import {
  DoubleSide,
  FrontSide,
  ImageUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  RepeatWrapping,
  Shape,
  ShapeGeometry,
  Vector2
} from 'three'
import { Corner } from '../model/corner'
import Scene from '../model/scene'
import { Room } from '../model/room'

let Floor = function(scene: Scene, room: Room): any {
  let floorPlane: Mesh | null = null
  let roofPlane = null

  init()

  function init() {
    room.fireOnFloorChange(redraw)
    floorPlane = buildFloor()
    // roofs look weird, so commented out
    //roofPlane = buildRoof();
  }

  function redraw() {
    removeFromScene()
    floorPlane = buildFloor()
    addToScene()
  }

  function buildFloor() {
    let textureSettings = room.getTexture()
    // setup texture
    let floorTexture = ImageUtils.loadTexture(textureSettings.url)
    floorTexture.wrapS = RepeatWrapping
    floorTexture.wrapT = RepeatWrapping
    floorTexture.repeat.set(1, 1)
    let floorMaterialTop = new MeshPhongMaterial({
      map: floorTexture,
      side: DoubleSide,
      // ambient: 0xffffff, TODO_Ekki
      color: 0xcccccc,
      specular: 0x0a0a0a
    })

    let textureScale = textureSettings.scale
    // http://stackoverflow.com/questions/19182298/how-to-texture-a-three-js-mesh-created-with-shapegeometry
    // scale down coords to fit 0 -> 1, then rescale

    let points: Vector2[] = []
    room.interiorCorners.forEach((corner: Corner) => {
      points.push(new Vector2(corner.x / textureScale, corner.y / textureScale))
    })
    let shape = new Shape(points)

    let geometry = new ShapeGeometry(shape)

    let floor = new Mesh(geometry, floorMaterialTop)

    floor.rotation.set(Math.PI / 2, 0, 0)
    floor.scale.set(textureScale, textureScale, textureScale)
    floor.receiveShadow = true
    floor.castShadow = false
    return floor
  }

  function buildRoof() {
    // setup texture
    let roofMaterial = new MeshBasicMaterial({
      side: FrontSide,
      color: 0xe5e5e5
    })

    let points: Vector2[] = []
    room.interiorCorners.forEach((corner: Corner) => {
      points.push(new Vector2(corner.x, corner.y))
    })
    let shape = new Shape(points)
    let geometry = new ShapeGeometry(shape)
    let roof = new Mesh(geometry, roofMaterial)

    roof.rotation.set(Math.PI / 2, 0, 0)
    roof.position.y = 250
    return roof
  }

  let addToScene = function() {
    if (floorPlane) {
      scene.add(floorPlane)
    }
    //scene.add(roofPlane);
    // hack so we can do intersect testing
    if (room.floorPlane) {
      scene.add(room.floorPlane)
    }
  }

  let removeFromScene = function() {
    if (floorPlane) {
      scene.remove(floorPlane)
    }
    //scene.remove(roofPlane);
    if (room.floorPlane) {
      scene.remove(room.floorPlane)
    }
  }
}

export default Floor
