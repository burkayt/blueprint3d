import {Corner} from './corner';
import Utils from '../core/utils';
import {Configuration, configWallHeight, configWallThickness} from '../core/configuration';
import Item from '../items/item';
import HalfEdge from './half_edge';

/** The default wall texture. */
const defaultWallTexture = {
  url: "rooms/textures/wallmap.png",
  stretch: true,
  scale: 0
}

/**
 * A Wall is the basic element to create Rooms.
 *
 * Walls consists of two half edges.
 */
export class Wall {

  /** Front is the plane from start to end. */
  public frontEdge?: HalfEdge;

  /** Back is the plane from end to start. */
  public backEdge?: HalfEdge;

  /** */
  public orphan = false;

  /** Items attached to this wall */
  public items: Item[] = [];

  /** */
  public onItems: Item[] = [];

  /** The front-side texture. */
  public frontTexture = defaultWallTexture;

  /** The back-side texture. */
  public backTexture = defaultWallTexture;

  /** Wall thickness. */
  public thickness = Configuration.getNumericValue(configWallThickness);

  /** Wall height. */
  public height = Configuration.getNumericValue(configWallHeight);

  /** The unique id of each wall. */
  private id: string;

  /** Actions to be applied after movement. */
  private movedCallbacks = $.Callbacks();

  /** Actions to be applied on removal. */
  private deletedCallbacks = $.Callbacks();

  /** Actions to be applied explicitly. */
  private actionCallbacks = $.Callbacks();

  /**
   * Constructs a new wall.
   * @param start Start corner.
   * @param end End corner.
   */
  constructor(private start: Corner, private end: Corner) {
    this.id = this.getUuid();

    this.start.attachStart(this)
    this.end.attachEnd(this);
  }

  public resetFrontBack() {
    this.frontEdge = undefined;
    this.backEdge = undefined;
    this.orphan = false;
  }

  public snapToAxis(tolerance: number) {
    // order here is important, but unfortunately arbitrary
    this.start.snapToAxis(tolerance);
    this.end.snapToAxis(tolerance);
  }

  public fireOnMove(func: any) {
    this.movedCallbacks.add(func);
  }

  public fireOnDelete(func: any) {
    this.deletedCallbacks.add(func);
  }

  public dontFireOnDelete(func: any) {
    this.deletedCallbacks.remove(func);
  }

  public fireOnAction(func: any) {
    this.actionCallbacks.add(func)
  }

  public fireAction(action: any) {
    this.actionCallbacks.fire(action)
  }

  public relativeMove(dx: number, dy: number) {
    this.start.relativeMove(dx, dy);
    this.end.relativeMove(dx, dy);
  }

  public fireMoved() {
    this.movedCallbacks.fire();
  }

  public fireRedraw() {
    if (this.frontEdge) {
      this.frontEdge.redrawCallbacks.fire();
    }
    if (this.backEdge) {
      this.backEdge.redrawCallbacks.fire();
    }
  }

  public getStart(): Corner {
    return this.start;
  }

  public getEnd(): Corner {
    return this.end;
  }

  public getStartX(): number {
    return this.start.getX();
  }

  public getEndX(): number {
    return this.end.getX();
  }

  public getStartY(): number {
    return this.start.getY();
  }

  public getEndY(): number {
    return this.end.getY();
  }

  public remove() {
    this.start.detachWall(this);
    this.end.detachWall(this);
    this.deletedCallbacks.fire(this);
  }

  public setStart(corner: Corner) {
    this.start.detachWall(this);
    corner.attachStart(this);
    this.start = corner;
    this.fireMoved();
  }

  public setEnd(corner: Corner) {
    this.end.detachWall(this);
    corner.attachEnd(this);
    this.end = corner;
    this.fireMoved();
  }

  public distanceFrom(x: number, y: number): number {
    return Utils.pointDistanceFromLine(x, y,
      this.getStartX(), this.getStartY(),
      this.getEndX(), this.getEndY());
  }

  /** Return the corner opposite of the one provided.
   * @param corner The given corner.
   * @returns The opposite corner.
   */
  private oppositeCorner(corner: Corner): any | Corner {
    if (this.start === corner) {
      return this.end;
    } else if (this.end === corner) {
      return this.start;
    } else {
      console.log('Wall does not connect to corner');
    }
  }

  private getUuid(): string {
    return [this.start.id, this.end.id].join();
  }
}
