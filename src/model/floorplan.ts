import {Mesh, Vector3} from 'three';
import {Wall} from './wall';
import {Corner} from './corner';
import {Room} from './room';
import HalfEdge from './half_edge';
import Utils from '../core/utils';

/** */
const defaultFloorPlanTolerance = 10.0;

/**
 * A Floorplan represents a number of Walls, Corners and Rooms.
 */
export class Floorplan {

  /** */
  public roomLoadedCallbacks = $.Callbacks();

  /** */
  private walls: Wall[] = [];

  /** */
  private corners: Corner[] = [];

  /** */
  private rooms: Room[] = [];

  /** */
  private newWallCallbacks = $.Callbacks();

  /** */
  private newCornerCallbacks = $.Callbacks();

  /** */
  private redrawCallbacks = $.Callbacks();

  /** */
  private updatedRooms = $.Callbacks();


  /**
   * Floor textures are owned by the floorplan, because room objects are
   * destroyed and created each time we change the floorplan.
   * floorTextures is a map of room UUIDs (string) to a object with
   * url and scale attributes.
   */
  private floorTextures: any = {};

  /** Constructs a floorplan. */
  constructor() {
  }

  // hack
  public wallEdges(): HalfEdge[] {
    let edges: HalfEdge[] = [];

    this.walls.forEach((wall) => {
      if (wall.frontEdge) {
        edges.push(wall.frontEdge);
      }
      if (wall.backEdge) {
        edges.push(wall.backEdge);
      }
    });
    return edges;
  }

  // hack
  public wallEdgePlanes(): Mesh[] {
    let planes: Mesh[] = []
    this.walls.forEach((wall) => {
      if (wall.frontEdge && wall.frontEdge.plane) {
        planes.push(wall.frontEdge.plane);
      }
      if (wall.backEdge && wall.backEdge.plane) {
        planes.push(wall.backEdge.plane);
      }
    });
    return planes;
  }

  public fireOnNewWall(callback: any) {
    this.newWallCallbacks.add(callback);
  }

  public fireOnNewCorner(callback: any) {
    this.newCornerCallbacks.add(callback);
  }

  public fireOnRedraw(callback: any) {
    this.redrawCallbacks.add(callback);
  }

  public fireOnUpdatedRooms(callback: any) {
    this.updatedRooms.add(callback);
  }

  /**
   * Creates a new wall.
   * @param start The start corner.
   * @param end he end corner.
   * @returns The new wall.
   */
  public newWall(start: Corner, end: Corner): Wall {
    let wall = new Wall(start, end);
    this.walls.push(wall)
    let scope = this;
    wall.fireOnDelete(() => {
      scope.removeWall(wall);
    });
    this.newWallCallbacks.fire(wall);
    this.update();
    return wall;
  }

  /**
   * Creates a new corner.
   * @param x The x coordinate.
   * @param y The y coordinate.
   * @param id An optional id. If unspecified, the id will be created internally.
   * @returns The new corner.
   */
  public newCorner(x: number, y: number, id?: string): Corner {
    let corner = new Corner(this, x, y, id);
    this.corners.push(corner);
    corner.fireOnDelete(this.removeCorner); // TODO Burkay Test
    this.newCornerCallbacks.fire(corner);
    return corner;
  }


  /** Gets the walls. */
  public getWalls(): Wall[] {
    return this.walls;
  }

  /** Gets the corners. */
  public getCorners(): Corner[] {
    return this.corners;
  }

  /** Gets the rooms. */
  public getRooms(): Room[] {
    return this.rooms;
  }

  public overlappedCorner(x: number, y: number, tolerance?: number): Corner | null {
    tolerance = tolerance || defaultFloorPlanTolerance;
    for (let i = 0; i < this.corners.length; i++) {
      if (this.corners[i].distanceFrom(x, y) < tolerance) {
        return this.corners[i];
      }
    }
    return null;
  }

  public overlappedWall(x: number, y: number, tolerance?: number): Wall | null {
    tolerance = tolerance || defaultFloorPlanTolerance;
    for (let i = 0; i < this.walls.length; i++) {
      if (this.walls[i].distanceFrom(x, y) < tolerance) {
        return this.walls[i];
      }
    }
    return null;
  }

  // import and export -- cleanup

  public saveFloorplan() {
    let floorplan: any = {
      corners: {},
      walls: [],
      wallTextures: [],
      floorTextures: {},
      newFloorTextures: {}
    };

    this.corners.forEach((corner) => {
      if (corner.id) {
        floorplan.corners[corner.id] = {
          'x': corner.x,
          'y': corner.y
        };
      }
    });

    this.walls.forEach((wall) => {
      floorplan.walls.push({
        'corner1': wall.getStart().id,
        'corner2': wall.getEnd().id,
        'frontTexture': wall.frontTexture,
        'backTexture': wall.backTexture
      });
    });
    floorplan.newFloorTextures = this.floorTextures;
    return floorplan;
  }

  public loadFloorplan(floorplan: any) {
    this.reset();

    let corners: any = {};
    if (floorplan == null || !('corners' in floorplan) || !('walls' in floorplan)) {
      return
    }
    for (let id in floorplan.corners) {
      let corner = floorplan.corners[id];
      corners[id] = this.newCorner(corner.x, corner.y, id);
    }
    let scope = this;
    floorplan.walls.forEach((wall: any) => {
      let newWall = scope.newWall(
        corners[wall.corner1], corners[wall.corner2]);
      if (wall.frontTexture) {
        newWall.frontTexture = wall.frontTexture;
      }
      if (wall.backTexture) {
        newWall.backTexture = wall.backTexture;
      }
    });

    if ('newFloorTextures' in floorplan) {
      this.floorTextures = floorplan.newFloorTextures;
    }

    this.update();
    this.roomLoadedCallbacks.fire();
  }

  public getFloorTexture(uuid: string) {
    if (uuid in this.floorTextures) {
      return this.floorTextures[uuid];
    } else {
      return null;
    }
  }

  public setFloorTexture(uuid: string, url: string, scale: number) {
    this.floorTextures[uuid] = {
      url: url,
      scale: scale
    }
  }


  /**
   * Update rooms
   */
  public update() {
    this.walls.forEach((wall) => {
      wall.resetFrontBack();
    });

    let roomCorners = this.findRooms(this.corners);
    this.rooms = [];
    let scope = this;
    roomCorners.forEach((corners) => {
      scope.rooms.push(new Room(scope, corners));
    });
    this.assignOrphanEdges();

    this.updateFloorTextures();
    this.updatedRooms.fire();
  }

  /**
   * Returns the center of the floorplan in the y plane
   */
  public getCenter(): Vector3 {
    return this.getDimensions(true);
  }

  public getSize(): Vector3 {
    return this.getDimensions(false);
  }

  public getDimensions(center: boolean): Vector3 {
    center = center || false; // otherwise, get size

    let xMin = Infinity;
    let xMax = -Infinity;
    let zMin = Infinity;
    let zMax = -Infinity;
    this.corners.forEach((corner) => {
      if (corner.x < xMin) xMin = corner.x;
      if (corner.x > xMax) xMax = corner.x;
      if (corner.y < zMin) zMin = corner.y;
      if (corner.y > zMax) zMax = corner.y;
    });
    let ret;
    if (xMin === Infinity || xMax === -Infinity || zMin === Infinity || zMax === -Infinity) {
      ret = new Vector3();
    } else {
      if (center) {
        // center
        ret = new Vector3((xMin + xMax) * 0.5, 0, (zMin + zMax) * 0.5);
      } else {
        // size
        ret = new Vector3((xMax - xMin), 0, (zMax - zMin));
      }
    }
    return ret;
  }

  /*
   * Find the "rooms" in our planar straight-line graph.
   * Rooms are set of the smallest (by area) possible cycles in this graph.
   * @param corners The corners of the floorplan.
   * @returns The rooms, each room as an array of corners.
   */
  public findRooms(corners: Corner[]): Corner[][] {

    function _calculateTheta(previousCorner: Corner, currentCorner: Corner, nextCorner: Corner) {
      let theta = Utils.angle2pi(
        previousCorner.x - currentCorner.x,
        previousCorner.y - currentCorner.y,
        nextCorner.x - currentCorner.x,
        nextCorner.y - currentCorner.y);
      return theta;
    }

    function _removeDuplicateRooms(roomArray: Corner[][]): Corner[][] {
      let results: Corner[][] = [];
      let lookup: any = {};
      let hashFunc = function (corner: any) {
        return corner.id
      };
      let sep = '-';
      for (let i = 0; i < roomArray.length; i++) {
        // rooms are cycles, shift it around to check uniqueness
        let add = true;
        let room = roomArray[i];
        let str;
        for (let j = 0; j < room.length; j++) {
          let roomShift = Utils.cycle(room, j);
          str = Utils.map(roomShift, hashFunc).join(sep);
          if (lookup.hasOwnProperty(str)) {
            add = false;
          }
        }
        if (add && str) {
          results.push(roomArray[i]);
          lookup[str] = true;
        }
      }
      return results;
    }

    function _findTightestCycle(firstCorner: Corner, secondCorner: Corner): Corner[] {
      let stack: {
        corner: Corner,
        previousCorners: Corner[]
      }[] = [];

      let next: any = {
        corner: secondCorner,
        previousCorners: [firstCorner]
      } ;
      let visited: any = {};
      if (firstCorner.id) {
        visited[firstCorner.id] = true;
      }

      while (next) {
        // update previous corners, current corner, and visited corners
        let currentCorner = next.corner;
        if(currentCorner.id) {
          visited[currentCorner.id] = true;
        }

        // did we make it back to the startCorner?
        if (next.corner === firstCorner && currentCorner !== secondCorner) {
          return next.previousCorners;
        }

        let addToStack: Corner[] = [];
        let adjacentCorners = next.corner.adjacentCorners();
        for (let i = 0; i < adjacentCorners.length; i++) {
          let nextCorner = adjacentCorners[i];

          // is this where we came from?
          // give an exception if its the first corner and we aren't at the second corner
          if (nextCorner.id && nextCorner.id in visited && !(nextCorner === firstCorner && currentCorner !== secondCorner)) {
            continue;
          }

          // nope, throw it on the queue
          addToStack.push(nextCorner);
        }

        let previousCorners = next.previousCorners.slice(0);
        previousCorners.push(currentCorner);
        if (addToStack.length > 1) {
          // visit the ones with smallest theta first
          let previousCorner = next.previousCorners[next.previousCorners.length - 1];
          addToStack.sort(function (a, b) {
            return (_calculateTheta(previousCorner, currentCorner, b) -
              _calculateTheta(previousCorner, currentCorner, a));
          });
        }

        if (addToStack.length > 0) {
          // add to the stack
          addToStack.forEach((corner) => {
            stack.push({
              corner: corner,
              previousCorners: previousCorners
            });
          });
        }

        // pop off the next one
        next = stack.pop();
      }
      return [];
    }

    // find tightest loops, for each corner, for each adjacent
    // TODO: optimize this, only check corners with > 2 adjacents, or isolated cycles
    let loops: Corner[][] = [];

    corners.forEach((firstCorner) => {
      firstCorner.adjacentCorners().forEach((secondCorner) => {
        loops.push(_findTightestCycle(firstCorner, secondCorner));
      });
    });

    // remove duplicates
    let uniqueLoops = _removeDuplicateRooms(loops);
    // remove CW loops
    let uniqueCCWLoops = Utils.removeIf(uniqueLoops, Utils.isClockwise);

    return uniqueCCWLoops;
  }

  public floorPlanes(): Mesh[] {
    return Utils.map(this.rooms, (room: Room) => {
      return room.floorPlane;
    });
  }

  /** Removes a corner.
   * @param corner The corner to be removed.
   */
  private removeCorner(corner: Corner) {
    Utils.removeValue(this.corners, corner);
  }



  /** Removes a wall.
   * @param wall The wall to be removed.
   */
  private removeWall(wall: Wall) {
    Utils.removeValue(this.walls, wall);
    this.update();
  }

  /** clear out obsolete floor textures */
  private updateFloorTextures() {
    let uuids = Utils.map(this.rooms, function (room: any) {
      return room.getUuid();
    });
    for (let uuid in this.floorTextures) {
      if (!Utils.hasValue(uuids, uuid)) {
        delete this.floorTextures[uuid]
      }
    }
  }

  /** */
  private reset() {
    let tmpCorners = this.corners.slice(0);
    let tmpWalls = this.walls.slice(0);
    tmpCorners.forEach((corner) => {
      corner.remove();
    });
    tmpWalls.forEach((wall) => {
      wall.remove();
    });
    this.corners = [];
    this.walls = [];
  }

  private assignOrphanEdges() {
    // kinda hacky
    // find orphaned wall segments (i.e. not part of rooms) and
    // give them edges
    let orphanWalls: Wall[] = [];
    this.walls.forEach((wall) => {
      if (!wall.backEdge && !wall.frontEdge) {
        wall.orphan = true;
        let back = new HalfEdge(null, wall, false);
        back.generatePlane();
        let front = new HalfEdge(null, wall, true);
        front.generatePlane();
        orphanWalls.push(wall);
      }
    });

  }

}
