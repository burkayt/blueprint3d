import * as THREE from 'three';
import {Geometry, JSONLoader, Material, Mesh, MultiMaterial, Vector3} from 'three';
import {Factory} from "../items/factory";
import Item from '../items/item';
import Model from './model';
import Utils from '../core/utils';
import Metadata from '../items/metadata';


/**
 * The Scene is a manager of Items and also links to a ThreeJS scene.
 */
class Scene {

  /** Item */
  public itemLoadedCallbacks = $.Callbacks();

  /** Item */
  public itemRemovedCallbacks = $.Callbacks();

  /** The associated ThreeJS scene. */
  private scene: THREE.Scene;

  /** */
  private items: Item[] = [];

  /** */
  public needsUpdate = false;

  /** The Json loader. */
  private loader: JSONLoader;

  /** */
  private itemLoadingCallbacks = $.Callbacks();



  /**
   * Constructs a scene.
   * @param model The associated model.
   * @param textureDir The directory from which to load the textures.
   */
  constructor(private model: Model, private textureDir: string) {
    this.scene = new THREE.Scene();

    // init item loader
    this.loader = new JSONLoader();
    this.loader.crossOrigin = "";
  }

  /** Adds a non-item, basically a mesh, to the scene.
   * @param mesh The mesh to be added.
   */
  public add(mesh: Mesh) {
    this.scene.add(mesh);
  }

  /** Removes a non-item, basically a mesh, from the scene.
   * @param mesh The mesh to be removed.
   */
  public remove(mesh: Mesh) {
    this.scene.remove(mesh);
    Utils.removeValue(this.items, mesh);
  }

  /** Gets the scene.
   * @returns The scene.
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /** Gets the items.
   * @returns The items.
   */
  public getItems(): Item[] {
    return this.items;
  }

  /** Gets the count of items.
   * @returns The count.
   */
  public itemCount(): number {
    return this.items.length
  }

  /** Removes all items. */
  public clearItems() {
    let itemsCopy = this.items;
    let scope = this;
    this.items.forEach((item) => {
      scope.removeItem(item, true);
    });
    this.items = []
  }

  /**
   * Removes an item.
   * @param item The item to be removed.
   * @param dontRemove If not set, also remove the item from the items list.
   */
  public removeItem(item: Item, dontRemove?: boolean) {
    dontRemove = dontRemove || false;
    // use this for item meshes
    this.itemRemovedCallbacks.fire(item);
    item.removed();
    this.scene.remove(item);
    if (!dontRemove) {
      Utils.removeValue(this.items, item);
    }
  }

  /**
   * Creates an item and adds it to the scene.
   * @param itemType The type of the item given by an enumerator.
   * @param fileName The name of the file to load.
   * @param metadata TODO
   * @param position The initial position.
   * @param rotation The initial rotation around the y axis.
   * @param scale The initial scaling.
   * @param fixed True if fixed.
   */
  public addItem(itemType: number, fileName: string, metadata: Metadata, position: Vector3, rotation: number, scale: Vector3, fixed: boolean) {
    itemType = itemType || 1;
    let scope = this;
    let loaderCallback = function (geometry: Geometry, materials: Material[]) {
      let item = new (Factory.getClass(itemType))(
        scope.model,
        metadata,
        geometry,
        new MultiMaterial(materials),
        position,
        rotation,
        scale
      );
      item.fixed = fixed || false;
      scope.items.push(item);
      scope.add(item);
      item.initObject();
      scope.itemLoadedCallbacks.fire(item);
    };

    this.itemLoadingCallbacks.fire();
    this.loader.load(
      fileName,
      loaderCallback,
      undefined // TODO_Ekki
    );
  }
}

export default Scene;
