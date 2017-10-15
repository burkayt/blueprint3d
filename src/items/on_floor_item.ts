import FloorItem from './floor_item';
import {Geometry, MultiMaterial, Vector3} from 'three';
import Metadata from './metadata';
import Model from '../model/model';

/** */
abstract class OnFloorItem extends FloorItem {
  constructor(model: Model, metadata: Metadata, geometry: Geometry, material: MultiMaterial, position: Vector3, rotation: number, scale: Vector3) {
    super(model, metadata, geometry, material, position, rotation, scale);
    this.obstructFloorMoves = false;
    this.receiveShadow = true;
  };
}

export default OnFloorItem;
