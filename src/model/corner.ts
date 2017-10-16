/** */
import {Wall} from './wall';
import {Floorplan} from './floorplan';
import {Utils} from '../core/utils';

const cornerTolerance: number = 20;

/**
 * Corners are used to define Walls.
 */
export class Corner {

  /** Array of start walls. */
  private wallStarts: Wall[] = [];

  /** Array of end walls. */
  private wallEnds: Wall[] = [];

  /** Callbacks to be fired on movement. */
  private movedCallbacks = $.Callbacks();

  /** Callbacks to be fired on removal. */
  private deletedCallbacks = $.Callbacks();

  /** Callbacks to be fired in case of action. */
  private actionCallbacks = $.Callbacks();

  /** Constructs a corner.
   * @param floorplan The associated floorplan.
   * @param x X coordinate.
   * @param y Y coordinate.
   * @param id An optional unique id. If not set, created internally.
   */
  constructor(private floorplan: Floorplan, public x: number, public y: number, public id?: string) {
    this.id = id || Utils.guid();
  }

  /** Add function to moved callbacks.
   * @param func The function to be added.
   */
  public fireOnMove(func: any) {
    this.movedCallbacks.add(func);
  }

  /** Add function to deleted callbacks.
   * @param func The function to be added.
   */
  public fireOnDelete(func: any) {
    this.deletedCallbacks.add(func);
  }

  /** Add function to action callbacks.
   * @param func The function to be added.
   */
  public fireOnAction(func: any) {
    this.actionCallbacks.add(func);
  }

  /**
   * @returns
   * @deprecated
   */
  public getX(): number {
    return this.x;
  }

  /**
   * @returns
   * @deprecated
   */
  public getY(): number {
    return this.y;
  }

  /**
   *
   */
  public snapToAxis(tolerance: number): { x: boolean, y: boolean } {
    // try to snap this corner to an axis
    let snapped = {
      x: false,
      y: false
    };

    let scope = this;

    this.adjacentCorners().forEach((corner) => {
      if (Math.abs(corner.x - scope.x) < tolerance) {
        scope.x = corner.x;
        snapped.x = true;
      }
      if (Math.abs(corner.y - scope.y) < tolerance) {
        scope.y = corner.y;
        snapped.y = true;
      }
    });
    return snapped;
  }

  /** Moves corner relatively to new position.
   * @param dx The delta x.
   * @param dy The delta y.
   */
  public relativeMove(dx: number, dy: number) {
    this.move(this.x + dx, this.y + dy);
  }

  /** Remove callback. Fires the delete callbacks. */
  public remove() {
    this.deletedCallbacks.fire(this);
  }

  /** Removes all walls. */
  public removeAll() {
    for (let i = 0; i < this.wallStarts.length; i++) {
      this.wallStarts[i].remove();
    }
    for (let i = 0; i < this.wallEnds.length; i++) {
      this.wallEnds[i].remove();
    }
    this.remove()
  }

  /** Moves corner to new position.
   * @param newX The new x position.
   * @param newY The new y position.
   */
  public move(newX: number, newY: number) {
    this.x = newX;
    this.y = newY;
    this.mergeWithIntersected();
    this.movedCallbacks.fire(this.x, this.y);

    this.wallStarts.forEach((wall) => {
      wall.fireMoved();
    });

    this.wallEnds.forEach((wall) => {
      wall.fireMoved();
    });
  }

  /** Gets the adjacent corners.
   * @returns Array of corners.
   */
  public adjacentCorners(): Corner[] {
    let retArray = [];
    for (let i = 0; i < this.wallStarts.length; i++) {
      retArray.push(this.wallStarts[i].getEnd());
    }
    for (let i = 0; i < this.wallEnds.length; i++) {
      retArray.push(this.wallEnds[i].getStart());
    }
    return retArray;
  }

  /**
   *
   */
  public distanceFrom(x: number, y: number): number {
    let distance = Utils.distance(x, y, this.x, this.y);
    // console.log('x,y ' + x + ',' + y + ' to ' + this.getX() + ',' + this.getY() + ' is ' + distance);
    return distance;
  }

  /** Gets the distance from a wall.
   * @param wall A wall.
   * @returns The distance.
   */
  public distanceFromWall(wall: Wall): number {
    return wall.distanceFrom(this.x, this.y);
  }

  /** Gets the distance from a corner.
   * @param corner A corner.
   * @returns The distance.
   */
  public distanceFromCorner(corner: Corner): number {
    return this.distanceFrom(corner.x, corner.y);
  }

  /** Detaches a wall.
   * @param wall A wall.
   */
  public detachWall(wall: Wall) {
    Utils.removeValue(this.wallStarts, wall);
    Utils.removeValue(this.wallEnds, wall);
    if (this.wallStarts.length === 0 && this.wallEnds.length === 0) {
      this.remove();
    }
  }

  /** Attaches a start wall.
   * @param wall A wall.
   */
  public attachStart(wall: Wall) {
    this.wallStarts.push(wall)
  }

  /** Attaches an end wall.
   * @param wall A wall.
   */
  public attachEnd(wall: Wall) {
    this.wallEnds.push(wall)
  }

  /** Get wall to corner.
   * @param corner A corner.
   * @return The associated wall or null.
   */
  public wallTo(corner: Corner): Wall | null {
    for (let i = 0; i < this.wallStarts.length; i++) {
      if (this.wallStarts[i].getEnd() === corner) {
        return this.wallStarts[i];
      }
    }
    return null;
  }

  /** Get wall from corner.
   * @param corner A corner.
   * @return The associated wall or null.
   */
  public wallFrom(corner: Corner): Wall | null {
    for (let i = 0; i < this.wallEnds.length; i++) {
      if (this.wallEnds[i].getStart() === corner) {
        return this.wallEnds[i];
      }
    }
    return null;
  }

  /** Get wall to or from corner.
   * @param corner A corner.
   * @return The associated wall or null.
   */
  public wallToOrFrom(corner: Corner): Wall | null {
    return this.wallTo(corner) || this.wallFrom(corner);
  }

  public mergeWithIntersected(): boolean {
    // console.log('mergeWithIntersected for object: ' + this.type);
    // check corners
    for (let i = 0; i < this.floorplan.getCorners().length; i++) {
      let corner = this.floorplan.getCorners()[i];
      if (this.distanceFromCorner(corner) < cornerTolerance && corner !== this) {
        this.combineWithCorner(corner);
        return true;
      }
    }
    // check walls
    for (let i = 0; i < this.floorplan.getWalls().length; i++) {
      let wall = this.floorplan.getWalls()[i];
      if (this.distanceFromWall(wall) < cornerTolerance && !this.isWallConnected(wall)) {
        // update position to be on wall
        let intersection = Utils.closestPointOnLine(this.x, this.y,
          wall.getStart().x, wall.getStart().y,
          wall.getEnd().x, wall.getEnd().y);
        this.x = intersection.x;
        this.y = intersection.y;
        // merge this corner into wall by breaking wall into two parts
        this.floorplan.newWall(this, wall.getEnd());
        wall.setEnd(this);
        this.floorplan.update();
        return true;
      }
    }
    return false;
  }

  /**
   *
   */
  private combineWithCorner(corner: Corner) {
    // update position to other corner's
    this.x = corner.x;
    this.y = corner.y;
    // absorb the other corner's wallStarts and wallEnds
    for (let i = corner.wallStarts.length - 1; i >= 0; i--) {
      corner.wallStarts[i].setStart(this);
    }
    for (let i = corner.wallEnds.length - 1; i >= 0; i--) {
      corner.wallEnds[i].setEnd(this);
    }
    // delete the other corner
    corner.removeAll();
    this.removeDuplicateWalls();
    this.floorplan.update();
  }

  private fireAction(action: any[]) {
    this.actionCallbacks.fire(action)
  }

  /** Checks if a wall is connected.
   * @param wall A wall.
   * @returns True in case of connection.
   */
  private isWallConnected(wall: Wall): boolean {
    for (let i = 0; i < this.wallStarts.length; i++) {
      if (this.wallStarts[i] === wall) {
        return true;
      }
    }
    for (let i = 0; i < this.wallEnds.length; i++) {
      if (this.wallEnds[i] === wall) {
        return true;
      }
    }
    return false;
  }

  /** Ensure we do not have duplicate walls (i.e. same start and end points) */
  private removeDuplicateWalls() {
    // delete the wall between these corners, if it exists
    let wallEndPoints: any = {};
    let wallStartPoints: any = {};

    for (let i = this.wallStarts.length - 1; i >= 0; i--) {
      if (this.wallStarts[i].getEnd() === this) {
        // remove zero length wall
        this.wallStarts[i].remove();
      } else if (this.wallStarts[i].getEnd().id! in wallEndPoints) {
        // remove duplicated wall
        this.wallStarts[i].remove();
      } else {
        wallEndPoints[this.wallStarts[i].getEnd().id!] = true;
      }
    }
    for (let i = this.wallEnds.length - 1; i >= 0; i--) {
      if (this.wallEnds[i].getStart() === this) {
        // removed zero length wall
        this.wallEnds[i].remove();
      } else if (this.wallEnds[i].getStart().id! in wallStartPoints) {
        // removed duplicated wall
        this.wallEnds[i].remove();
      } else {
        wallStartPoints[this.wallEnds[i].getStart().id!] = true;
      }
    }
  }
}

