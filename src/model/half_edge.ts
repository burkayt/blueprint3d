import {
  Face3,
  Geometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Vector3
} from 'three'
import { Room } from './room'
import { Wall } from './wall'
import Utils from '../core/utils'
import Point from './point'

/**
 * Half Edges are created by Room.
 *
 * Once rooms have been identified, Half Edges are created for each interior wall.
 *
 * A wall can have two half edges if it is visible from both sides.
 */
class HalfEdge {
  /** The successor edge in CCW ??? direction. */
  public next: HalfEdge

  /** The predecessor edge in CCW ??? direction. */
  public prev: HalfEdge

  /** */
  public offset: number

  /** */
  public height: number

  /** used for intersection testing... not convinced this belongs here */
  public plane: Mesh | null = null

  /** transform from world coords to wall planes (z=0) */
  public interiorTransform = new Matrix4()

  /** transform from world coords to wall planes (z=0) */
  public invInteriorTransform = new Matrix4()

  /** */
  public redrawCallbacks = $.Callbacks()

  /** transform from world coords to wall planes (z=0) */
  public exteriorTransform = new Matrix4()

  /** transform from world coords to wall planes (z=0) */
  public invExteriorTransform = new Matrix4()

  /**
   * Constructs a half edge.
   * @param room The associated room.
   * @param wall The corresponding wall.
   * @param front True if front side.
   */
  constructor(
    private room: Room | null,
    public wall: Wall,
    public front: boolean
  ) {
    this.front = front || false

    this.offset = wall.thickness / 2.0
    this.height = wall.height

    if (this.front) {
      this.wall.frontEdge = this
    } else {
      this.wall.backEdge = this
    }
  }

  /**
   *
   */
  public getTexture() {
    if (this.front) {
      return this.wall.frontTexture
    } else {
      return this.wall.backTexture
    }
  }

  /**
   *
   */
  public setTexture(
    textureUrl: string,
    textureStretch: boolean,
    textureScale: number
  ) {
    let texture = {
      url: textureUrl,
      stretch: textureStretch,
      scale: textureScale
    }
    if (this.front) {
      this.wall.frontTexture = texture
    } else {
      this.wall.backTexture = texture
    }
    this.redrawCallbacks.fire()
  }

  /**
   * this feels hacky, but need wall items
   */
  public generatePlane() {
    function transformCorner(corner: any) {
      return new Vector3(corner.x, 0, corner.y)
    }

    let v1 = transformCorner(this.interiorStart())
    let v2 = transformCorner(this.interiorEnd())
    let v3 = v2.clone()
    v3.y = this.wall.height
    let v4 = v1.clone()
    v4.y = this.wall.height

    let geometry = new Geometry()
    geometry.vertices = [v1, v2, v3, v4]

    geometry.faces.push(new Face3(0, 1, 2))
    geometry.faces.push(new Face3(0, 2, 3))
    geometry.computeFaceNormals()
    geometry.computeBoundingBox()

    this.plane = new Mesh(geometry, new MeshBasicMaterial())
    this.plane.visible = false
    // this.plane.edge = this; // js monkey patch

    this.computeTransforms(
      this.interiorTransform,
      this.invInteriorTransform,
      this.interiorStart(),
      this.interiorEnd()
    )
    this.computeTransforms(
      this.exteriorTransform,
      this.invExteriorTransform,
      this.exteriorStart(),
      this.exteriorEnd()
    )
  }

  public interiorDistance(): number {
    let start = this.interiorStart()
    let end = this.interiorEnd()
    return Utils.distance(start.x, start.y, end.x, end.y)
  }

  /** Gets the distance from specified point.
   * @param x X coordinate of the point.
   * @param y Y coordinate of the point.
   * @returns The distance.
   */
  public distanceTo(x: number, y: number): number {
    // x, y, x1, y1, x2, y2
    return Utils.pointDistanceFromLine(
      x,
      y,
      this.interiorStart().x,
      this.interiorStart().y,
      this.interiorEnd().x,
      this.interiorEnd().y
    )
  }

  // these return an object with attributes x, y
  public interiorEnd(): { x: number; y: number } {
    let vec = this.halfAngleVector(this, this.next)
    return {
      x: this.getEnd().x + vec.x,
      y: this.getEnd().y + vec.y
    }
  }

  public interiorStart(): { x: number; y: number } {
    let vec = this.halfAngleVector(this.prev, this)
    return {
      x: this.getStart().x + vec.x,
      y: this.getStart().y + vec.y
    }
  }

  public interiorCenter(): { x: number; y: number } {
    return {
      x: (this.interiorStart().x + this.interiorEnd().x) / 2.0,
      y: (this.interiorStart().y + this.interiorEnd().y) / 2.0
    }
  }

  public exteriorEnd(): { x: number; y: number } {
    let vec = this.halfAngleVector(this, this.next)
    return {
      x: this.getEnd().x - vec.x,
      y: this.getEnd().y - vec.y
    }
  }

  public exteriorStart(): { x: number; y: number } {
    let vec = this.halfAngleVector(this.prev, this)
    return {
      x: this.getStart().x - vec.x,
      y: this.getStart().y - vec.y
    }
  }

  /** Get the corners of the half edge.
   * @returns An array of x,y pairs.
   */
  public corners(): { x: number; y: number }[] {
    return [
      this.interiorStart(),
      this.interiorEnd(),
      this.exteriorEnd(),
      this.exteriorStart()
    ]
  }

  private computeTransforms(
    transform: Matrix4,
    invTransform: Matrix4,
    start: Point,
    end: Point
  ) {
    let v1 = start
    let v2 = end

    let angle = Utils.angle(1, 0, v2.x - v1.x, v2.y - v1.y)

    let tt = new Matrix4()
    tt.makeTranslation(-v1.x, 0, -v1.y)
    let tr = new Matrix4()
    tr.makeRotationY(-angle)
    transform.multiplyMatrices(tr, tt)
    invTransform.getInverse(transform)
  }

  private getStart() {
    if (this.front) {
      return this.wall.getStart()
    } else {
      return this.wall.getEnd()
    }
  }

  private getEnd() {
    if (this.front) {
      return this.wall.getEnd()
    } else {
      return this.wall.getStart()
    }
  }

  private getOppositeEdge(): HalfEdge {
    if (this.front) {
      return this.wall.backEdge as HalfEdge
    } else {
      return this.wall.frontEdge as HalfEdge
    }
  }

  /**
   * Gets CCW angle from v1 to v2
   */
  private halfAngleVector(
    v1: HalfEdge,
    v2: HalfEdge
  ): { x: number; y: number } {
    let v1startX
    let v1startY
    let v1endX
    let v1endY

    let v2startX
    let v2startY
    let v2endX
    let v2endY

    // make the best of things if we dont have prev or next
    if (!v1) {
      v1startX = v2.getStart().x - (v2.getEnd().x - v2.getStart().x)
      v1startY = v2.getStart().y - (v2.getEnd().y - v2.getStart().y)
      v1endX = v2.getStart().x
      v1endY = v2.getStart().y
    } else {
      v1startX = v1.getStart().x as number
      v1startY = v1.getStart().y as number
      v1endX = v1.getEnd().x
      v1endY = v1.getEnd().y
    }

    if (!v2) {
      v2startX = v1.getEnd().x
      v2startY = v1.getEnd().y
      v2endX = v1.getEnd().x + (v1.getEnd().x - v1.getStart().x)
      v2endY = v1.getEnd().y + (v1.getEnd().y - v1.getStart().y)
    } else {
      v2startX = v2.getStart().x
      v2startY = v2.getStart().y
      v2endX = v2.getEnd().x
      v2endY = v2.getEnd().y
    }

    // CCW angle between edges
    let theta = Utils.angle2pi(
      v1startX - v1endX,
      v1startY - v1endY,
      v2endX - v1endX,
      v2endY - v1endY
    )

    // cosine and sine of half angle
    let cs = Math.cos(theta / 2.0)
    let sn = Math.sin(theta / 2.0)

    // rotate v2
    let v2dx = v2endX - v2startX
    let v2dy = v2endY - v2startY

    let vx = v2dx * cs - v2dy * sn
    let vy = v2dx * sn + v2dy * cs

    // normalize
    let mag = Utils.distance(0, 0, vx, vy)
    let desiredMag = this.offset / sn
    let scalar = desiredMag / mag

    let halfAngleVector = {
      x: vx * scalar,
      y: vy * scalar
    }

    return halfAngleVector
  }
}

export default HalfEdge
