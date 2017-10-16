/** */
import {Model} from "../model/model";
import {Metadata} from './metadata';
import {Geometry, MultiMaterial, Vector3} from 'three';
import {InWallItem} from './in_wall_item';

export abstract class InWallFloorItem extends InWallItem {
  constructor(model: Model, metadata: Metadata, geometry: Geometry, material: MultiMaterial, position: Vector3, rotation: number, scale: Vector3) {
    super(model, metadata, geometry, material, position, rotation, scale);
    this.boundToFloor = true;
  };
}

