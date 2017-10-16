import {Metadata} from './metadata';
import {Model} from '../model/model';
import {WallItem} from './wall_item';
import {Geometry, MultiMaterial, Vector3} from 'three';

/** */
export abstract class WallFloorItem extends WallItem {
  constructor(model: Model, metadata: Metadata, geometry: Geometry, material: MultiMaterial, position: Vector3, rotation: number, scale: Vector3) {
    super(model, metadata, geometry, material, position, rotation, scale);
    this.boundToFloor = true;
  };
}

