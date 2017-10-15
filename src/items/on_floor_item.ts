/** */
abstract class OnFloorItem extends FloorItem {
  constructor(model: Model.Model, metadata: Metadata, geometry: THREE.Geometry, material: THREE.MeshFaceMaterial, position: THREE.Vector3, rotation: number, scale: THREE.Vector3) {
    super(model, metadata, geometry, material, position, rotation, scale);
    this.obstructFloorMoves = false;
    this.receiveShadow = true;
  };
}

export default OnFloorItem;
