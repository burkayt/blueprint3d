/**
 * A Model connects a Floorplan and a Scene.
 */
import {Floorplan} from './floorplan';
import {Scene} from './scene';
import {Vector3} from 'three';

export class Model {

  /** */
  public floorplan: Floorplan;

  /** */
  public scene: Scene;

  /** */
  private roomLoadingCallbacks = $.Callbacks();

  /** */
  private roomLoadedCallbacks = $.Callbacks();

  /** name */
  private roomSavedCallbacks = $.Callbacks();

  /** success (bool), copy (bool) */
  private roomDeletedCallbacks = $.Callbacks();

  /** Constructs a new model.
   * @param textureDir The directory containing the textures.
   */
  constructor(textureDir: string) {
    this.floorplan = new Floorplan();
    this.scene = new Scene(this, textureDir);
  }

  private loadSerialized(json: string) {
    // TODO: better documentation on serialization format.
    // TODO: a much better serialization format.
    this.roomLoadingCallbacks.fire();

    let data = JSON.parse(json)
    this.newRoom(
      data.floorplan,
      data.items
    );

    this.roomLoadedCallbacks.fire();
  }

  private exportSerialized(): string {
    let itemsArr = [];
    let objects = this.scene.getItems();
    for (let i = 0; i < objects.length; i++) {
      let object = objects[i];
      itemsArr[i] = {
        item_name: object.metadata.itemName,
        item_type: object.metadata.itemType,
        model_url: object.metadata.modelUrl,
        xpos: object.position.x,
        ypos: object.position.y,
        zpos: object.position.z,
        rotation: object.rotation.y,
        scale_x: object.scale.x,
        scale_y: object.scale.y,
        scale_z: object.scale.z,
        fixed: object.fixed
      };
    }

    let room = {
      floorplan: (this.floorplan.saveFloorplan()),
      items: itemsArr
    };

    return JSON.stringify(room);
  }

  private newRoom(floorplan: string, items: any) {
    this.scene.clearItems();
    this.floorplan.loadFloorplan(floorplan);
    items.forEach((item: any) => {
      let position = new Vector3(
        item.xpos, item.ypos, item.zpos);
      let metadata = {
        itemName: item.item_name,
        resizable: item.resizable,
        itemType: item.item_type,
        modelUrl: item.model_url
      };
      let scale = new Vector3(
        item.scale_x,
        item.scale_y,
        item.scale_z
      );
      this.scene.addItem(
        item.item_type,
        item.model_url,
        metadata,
        position,
        item.rotation,
        scale,
        item.fixed);
    });
  }
}


