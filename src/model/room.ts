/*
 TODO
 var Vec2 = require('vec2')
 var segseg = require('segseg')
 var Polygon = require('polygon')
 */


import {Corner} from './corner';
import {DoubleSide, Mesh, MeshBasicMaterial, Shape, ShapeGeometry, Vector2} from 'three';
import {Floorplan} from './floorplan';
import Utils from '../core/utils';
import HalfEdge from './half_edge';

/** Default texture to be used if nothing is provided. */
const defaultRoomTexture = {
  url: "rooms/textures/hardwood.png",
  scale: 400
}

/**
 * A Room is the combination of a Floorplan with a floor plane.
 */
export class Room {

  /** */
  public interiorCorners: Corner[] = [];

  /** floor plane for intersection testing */
  public floorPlane: Mesh | null = null;

  /** */
  private customTexture = false;

  /** */
  private edgePointer: HalfEdge | null = null;

  /** */
  private floorChangeCallbacks = $.Callbacks();

  /**
   *  ordered CCW
   */
  constructor(private floorplan: Floorplan, public corners: Corner[]) {
    this.updateWalls();
    this.updateInteriorCorners();
    this.generatePlane();
  }

  public fireOnFloorChange(callback: any) {
    this.floorChangeCallbacks.add(callback);
  }

  private getUuid(): string {
    let cornerUuids = Utils.map(this.corners, function (c: any) {
      return c.id;
    });
    cornerUuids.sort();
    return cornerUuids.join();
  }


  private getTexture() {
    let uuid = this.getUuid();
    let tex = this.floorplan.getFloorTexture(uuid);
    return tex || defaultRoomTexture;
  }

  /**
   * textureStretch always true, just an argument for consistency with walls
   */
  private setTexture(textureUrl: string, textureStretch: any, textureScale: number) {
    let uuid = this.getUuid();
    this.floorplan.setFloorTexture(uuid, textureUrl, textureScale);
    this.floorChangeCallbacks.fire();
  }

  private generatePlane() {
    let points: Vector2[] = [];
    this.interiorCorners.forEach((corner) => {
      points.push(new Vector2(
        corner.x,
        corner.y));
    });
    let shape = new Shape(points);
    let geometry = new ShapeGeometry(shape);
    this.floorPlane = new Mesh(geometry,
      new MeshBasicMaterial({
        side: DoubleSide
      }));
    this.floorPlane.visible = false;
    this.floorPlane.rotation.set(Math.PI / 2, 0, 0);
    (this.floorPlane as any).room = this; // js monkey patch
  }

  private cycleIndex(index: number) {
    if (index < 0) {
      return index += this.corners.length;
    } else {
      return index % this.corners.length;
    }
  }

  private updateInteriorCorners() {
    if (!this.edgePointer) {
      return;
    }
    let edge: HalfEdge = this.edgePointer;
    while (true) {
      if (edge) {
        this.interiorCorners.push(edge.interiorStart() as Corner); // TODO patlama ihtimali çok yüksek
        edge.generatePlane();
        if (edge.next === this.edgePointer) {
          break;
        } else {
          edge = edge.next;
        }
      }
    }
  }

  /**
   * Populates each wall's half edge relating to this room
   * this creates a fancy doubly connected edge list (DCEL)
   */
  private updateWalls() {

    let prevEdge: HalfEdge | null = null;
    let firstEdge: HalfEdge | null = null;

    for (let i = 0; i < this.corners.length; i++) {

      let firstCorner = this.corners[i];
      let secondCorner = this.corners[(i + 1) % this.corners.length];

      // find if wall is heading in that direction
      let wallTo = firstCorner.wallTo(secondCorner);
      let wallFrom = firstCorner.wallFrom(secondCorner);
      let edge: HalfEdge | null = null;

      if (wallTo) {
        edge = new HalfEdge(this, wallTo, true);
      } else if (wallFrom) {
        edge = new HalfEdge(this, wallFrom, false);
      } else {
        // something horrible has happened
        console.log("corners arent connected by a wall, uh oh");
      }

      if (edge) {
        if (i === 0) {
          firstEdge = edge;
        } else {
          if (prevEdge) {
            edge.prev = prevEdge;
            prevEdge.next = edge;
          }
          if (i + 1 === this.corners.length) {
            if (firstEdge) {
              firstEdge.prev = edge;
              edge.next = firstEdge;
            }
          }
        }
      }

      prevEdge = edge;
    }

    // hold on to an edge reference
    this.edgePointer = firstEdge;
  }
}
