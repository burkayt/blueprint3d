/** */
import WallItem from './wall_item';
import Model from '../model/model';
import Metadata from './metadata';
import {Geometry, MultiMaterial, Vector3} from 'three';

abstract class InWallItem extends WallItem {
  constructor(model: Model, metadata: Metadata, geometry: Geometry, material: MultiMaterial, position: Vector3, rotation: number, scale: Vector3) {
    super(model, metadata, geometry, material, position, rotation, scale);
    this.addToWall = true;
  };

  /** */
  public getWallOffset() {
    // fudge factor so it saves to the right wall
    return -this.currentWallEdge.offset + 0.5;
  }
}

export default InWallItem;
