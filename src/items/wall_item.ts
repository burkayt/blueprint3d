/**
 * A Wall Item is an entity to be placed related to a wall.
 */
import {Item} from './item'
import {HalfEdge} from '../model/half_edge'
import {Geometry, Mesh, MultiMaterial, Vector2, Vector3} from 'three'
import {Metadata} from './metadata'
import {Model} from '../model/model'
import {Utils} from '../core/utils'

export abstract class WallItem extends Item {
  /** The currently applied wall edge. */
  protected currentWallEdge: HalfEdge | null = null
  /* TODO:
   This caused a huge headache.
   HalfEdges get destroyed/created every time floorplan is edited.
   This item should store a reference to a wall and front/back,
   and grab its edge reference dynamically whenever it needs it.
   */

  /** */
  protected addToWall = false

  /** */
  protected boundToFloor = false

  /** */
  protected frontVisible = false

  /** */
  protected backVisible = false

  /** used for finding rotations */
  private refVec = new Vector2(0, 1.0)

  /** */
  private wallOffsetScalar = 0

  /** */
  private sizeX = 0

  /** */
  private sizeY = 0

  constructor(protected model: Model,
              metadata: Metadata,
              geometry: Geometry,
              material: MultiMaterial,
              position: Vector3,
              rotation: number,
              scale: Vector3) {
    super(model, metadata, geometry, material, position, rotation, scale)

    this.allowRotate = false
  }

  /** Get the closet wall edge.
   * @returns The wall edge.
   */
  public closestWallEdge(): HalfEdge | null {
    let wallEdges = this.model.floorplan.wallEdges()

    let wallEdge: HalfEdge | null = null
    let minDistance: number | null = null

    let itemX = this.position.x
    let itemZ = this.position.z

    wallEdges.forEach((edge: HalfEdge) => {
      let distance = edge.distanceTo(itemX, itemZ)
      if (minDistance === null || distance < minDistance) {
        minDistance = distance
        wallEdge = edge
      }
    })

    return wallEdge
  }

  /** */
  public removed() {
    if (this.currentWallEdge != null && this.addToWall) {
      Utils.removeValue(this.currentWallEdge.wall.items, this)
      this.redrawWall()
    }
  }

  /** */
  public resized() {
    if (this.boundToFloor) {
      this.position.y =
        0.5 *
        (this.geometry.boundingBox.max.y - this.geometry.boundingBox.min.y) *
        this.scale.y +
        0.01
    }

    this.updateSize()
    this.redrawWall()
  }

  /** */
  public placeInRoom() {
    let closestWallEdge = this.closestWallEdge()
    if (closestWallEdge) {
      this.changeWallEdge(closestWallEdge)
    }
    this.updateSize()

    if (!this.positionSet && closestWallEdge) {
      // position not set
      let center = closestWallEdge.interiorCenter()
      let newPos = new Vector3(
        center.x,
        closestWallEdge.wall.height / 2.0,
        center.y
      )
      this.boundMove(newPos)
      this.position.copy(newPos)
      this.redrawWall()
    }
  }

  /** */
  public moveToPosition(vec3: Vector3, intersection: any) {
    this.changeWallEdge(intersection.object.edge)
    this.boundMove(vec3)
    this.position.copy(vec3)
    this.redrawWall()
  }

  /**
   *  Returns an array of planes to use other than the ground plane
   * for passing intersection to clickPressed and clickDragged
   * @returns {Mesh[]}
   */
  public customIntersectionPlanes(): Mesh[] {
    return this.model.floorplan.wallEdgePlanes()
  }

  /** */
  protected getWallOffset() {
    return this.wallOffsetScalar
  }

  /** */
  private redrawWall() {
    if (this.addToWall && this.currentWallEdge) {
      this.currentWallEdge.wall.fireRedraw()
    }
  }

  /** */
  public updateEdgeVisibility(visible: boolean, front: boolean) {
    if (front) {
      this.frontVisible = visible
    } else {
      this.backVisible = visible
    }
    this.visible = this.frontVisible || this.backVisible
  }

  /** */
  private updateSize() {
    this.wallOffsetScalar =
      (this.geometry.boundingBox.max.z - this.geometry.boundingBox.min.z) *
      this.scale.z /
      2.0
    this.sizeX =
      (this.geometry.boundingBox.max.x - this.geometry.boundingBox.min.x) *
      this.scale.x
    this.sizeY =
      (this.geometry.boundingBox.max.y - this.geometry.boundingBox.min.y) *
      this.scale.y
  }

  /** */
  private changeWallEdge(wallEdge: HalfEdge) {
    if (this.currentWallEdge != null) {
      if (this.addToWall) {
        Utils.removeValue(this.currentWallEdge.wall.items, this)
        this.redrawWall()
      } else {
        Utils.removeValue(this.currentWallEdge.wall.onItems, this)
      }
    }

    // handle subscription to wall being removed
    if (this.currentWallEdge != null) {
      this.currentWallEdge.wall.dontFireOnDelete(this.remove.bind(this))
    }
    wallEdge.wall.fireOnDelete(this.remove.bind(this))

    // find angle between wall normals
    let normal2 = new Vector2()
    let normal3
    if (wallEdge.plane) {
      normal3 = (wallEdge.plane.geometry as Geometry).faces[0].normal
      normal2.x = normal3.x
      normal2.y = normal3.z
    }

    let angle = Utils.angle(this.refVec.x, this.refVec.y, normal2.x, normal2.y)
    this.rotation.y = angle

    // update currentWall
    this.currentWallEdge = wallEdge
    if (this.addToWall) {
      wallEdge.wall.items.push(this)
      this.redrawWall()
    } else {
      wallEdge.wall.onItems.push(this)
    }
  }

  /** takes the move vec3, and makes sure object stays bounded on plane */
  private boundMove(vec3: Vector3) {
    let tolerance = 1
    let edge = this.currentWallEdge
    if (!edge) {
      return
    }
    vec3.applyMatrix4(edge.interiorTransform)
    if (vec3.x < this.sizeX / 2.0 + tolerance) {
      vec3.x = this.sizeX / 2.0 + tolerance
    } else if (
      vec3.x >
      edge.interiorDistance() - this.sizeX / 2.0 - tolerance
    ) {
      vec3.x = edge.interiorDistance() - this.sizeX / 2.0 - tolerance
    }
    if (this.boundToFloor) {
      vec3.y =
        0.5 *
        (this.geometry.boundingBox.max.y - this.geometry.boundingBox.min.y) *
        this.scale.y +
        0.01
    } else {
      if (vec3.y < this.sizeY / 2.0 + tolerance) {
        vec3.y = this.sizeY / 2.0 + tolerance
      } else if (vec3.y > edge.height - this.sizeY / 2.0 - tolerance) {
        vec3.y = edge.height - this.sizeY / 2.0 - tolerance
      }
    }

    vec3.z = this.getWallOffset()

    vec3.applyMatrix4(edge.invInteriorTransform)
  }
}

