/** */
abstract class InWallFloorItem extends InWallItem {
  constructor(model: Model.Model, metadata: Metadata, geometry: THREE.Geometry, material: THREE.MeshFaceMaterial, position: THREE.Vector3, rotation: number, scale: THREE.Vector3) {
    super(model, metadata, geometry, material, position, rotation, scale);
    this.boundToFloor = true;
  };
}

export default InWallFloorItem;
